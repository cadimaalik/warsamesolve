import { useState, useCallback, useRef } from 'react';
import { nextNodeLabel, findOverlappingNode, computeRealCoordinates } from '../utils/geometry.js';
import { DIRECTIONS, MEMBER_SPACING } from '../constants/directions.js';

function createNode(id, x, y, support = null) {
  return { id, x, y, support, loads: { fx: 0, fy: 0, moment: 0 }, hinge: false };
}

function createMember(startNodeId, endNodeId, length, type = 'frame', eiFactor = 1) {
  return {
    id: 'mem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    startNodeId, endNodeId, length,
    type, EI_factor: eiFactor,
    startHinge: false, endHinge: false,
  };
}

export default function useStructure() {
  const [structure, setStructure] = useState({
    nodes: [], members: [],
    settings: { units: 'kN-m', stiffnessMode: 'relative', baseEI: null },
  });
  const historyRef = useRef([]);

  function pushHistory() {
    historyRef.current.push(JSON.parse(JSON.stringify(structure)));
    if (historyRef.current.length > 30) historyRef.current.shift();
  }

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    setStructure(historyRef.current.pop());
  }, []);

  const addMember = useCallback((fromNodeId, direction, length, type, eiFactor, newNodeSupport, startHinge = false, realDx, realDy) => {
    pushHistory();
    setStructure(prev => {
      const fromNode = prev.nodes.find(n => n.id === fromNodeId);
      if (!fromNode) return prev;

      const dir = DIRECTIONS[direction];
      let dx = dir.dx * MEMBER_SPACING;
      let dy = dir.dy * MEMBER_SPACING;
      if (dir.dx !== 0 && dir.dy !== 0) { dx *= 0.7; dy *= 0.7; }

      const newX = fromNode.x + dx;
      const newY = fromNode.y + dy;

      // Check overlap with existing node
      const overlap = findOverlappingNode(newX, newY, prev.nodes);
      if (overlap) {
        // Connect to existing node — compute length from BFS real coordinates
        const coords = computeRealCoordinates(prev.nodes, prev.members);
        let rdx, rdy;
        if (coords[fromNodeId] && coords[overlap.id]) {
          rdx = coords[overlap.id].x - coords[fromNodeId].x;
          rdy = coords[overlap.id].y - coords[fromNodeId].y;
        } else {
          rdx = realDx || 0;
          rdy = realDy || 0;
        }
        // Always compute length from real-world displacement
        const autoLen = Math.round(Math.sqrt(rdx * rdx + rdy * rdy) * 100) / 100;
        const newMem = createMember(fromNodeId, overlap.id, autoLen, type, eiFactor);
        newMem.startHinge = startHinge;
        newMem.realDx = rdx;
        newMem.realDy = rdy;
        return { ...prev, members: [...prev.members, newMem] };
      }

      const newId = nextNodeLabel(prev.nodes.map(n => n.id));
      const newNode = createNode(newId, newX, newY, newNodeSupport || null);
      // Always compute length from real-world displacement to avoid pixel-based errors
      const rdx = realDx || 0;
      const rdy = realDy || 0;
      const computedLength = Math.round(Math.sqrt(rdx * rdx + rdy * rdy) * 100) / 100;
      const newMem = createMember(fromNodeId, newId, computedLength, type, eiFactor);
      newMem.startHinge = startHinge;
      newMem.realDx = rdx;
      newMem.realDy = rdy;

      return { ...prev, nodes: [...prev.nodes, newNode], members: [...prev.members, newMem] };
    });
  }, [structure]);

  const connectNodes = useCallback((fromId, toId, length, type, eiFactor, startHinge = false, endHinge = false) => {
    pushHistory();
    setStructure(prev => {
      const dup = prev.members.find(m =>
        (m.startNodeId === fromId && m.endNodeId === toId) ||
        (m.startNodeId === toId && m.endNodeId === fromId)
      );
      if (dup) return prev;
      // Compute realDx/realDy from BFS coordinates of existing nodes
      const coords = computeRealCoordinates(prev.nodes, prev.members);
      const rdx = (coords[toId]?.x ?? 0) - (coords[fromId]?.x ?? 0);
      const rdy = (coords[toId]?.y ?? 0) - (coords[fromId]?.y ?? 0);
      // Always compute length from real-world displacement
      const computedLength = Math.round(Math.sqrt(rdx * rdx + rdy * rdy) * 100) / 100;
      const newMem = createMember(fromId, toId, computedLength, type, eiFactor);
      newMem.startHinge = startHinge;
      newMem.endHinge = endHinge;
      newMem.realDx = rdx;
      newMem.realDy = rdy;
      return { ...prev, members: [...prev.members, newMem] };
    });
  }, [structure]);

  const removeNode = useCallback((nodeId) => {
    pushHistory();
    setStructure(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      members: prev.members.filter(m => m.startNodeId !== nodeId && m.endNodeId !== nodeId),
    }));
  }, [structure]);

  const removeMember = useCallback((memberId) => {
    pushHistory();
    setStructure(prev => {
      const member = prev.members.find(m => m.id === memberId);
      const remainingMembers = prev.members.filter(m => m.id !== memberId);
      if (!member) return { ...prev, members: remainingMembers };

      // Find orphan nodes (endpoints with no remaining connections)
      const orphanIds = [member.startNodeId, member.endNodeId].filter(nid => {
        return !remainingMembers.some(m => m.startNodeId === nid || m.endNodeId === nid);
      });
      const remainingNodes = prev.nodes.filter(n => !orphanIds.includes(n.id));
      return { ...prev, nodes: remainingNodes, members: remainingMembers };
    });
  }, [structure]);

  const setNodeSupport = useCallback((nodeId, supportType) => {
    pushHistory();
    setStructure(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, support: supportType } : n),
    }));
  }, [structure]);

  const setNodeLoads = useCallback((nodeId, loads) => {
    pushHistory();
    setStructure(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, loads: { ...n.loads, ...loads } } : n),
    }));
  }, [structure]);

  const updateMember = useCallback((memberId, updates) => {
    pushHistory();
    setStructure(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === memberId ? { ...m, ...updates } : m),
    }));
  }, [structure]);

  const clearAll = useCallback(() => {
    pushHistory();
    setStructure({ nodes: [], members: [], settings: structure.settings });
  }, [structure]);

  const createInitialBeam = useCallback(({ length, orientation = 'horizontal', type = 'frame', supportA = 'pin', supportB = null }) => {
    const isVert = orientation === 'vertical';
    const bx = isVert ? 200 : 200 + MEMBER_SPACING;
    const by = isVert ? 300 + MEMBER_SPACING : 300;
    const nodeA = createNode('A', 200, 300, supportA);
    const nodeB = createNode('B', bx, by, supportB);
    const mem = createMember('A', 'B', length, type);
    mem.realDx = isVert ? 0 : length;
    mem.realDy = isVert ? length : 0;
    setStructure(prev => ({
      ...prev,
      nodes: [nodeA, nodeB],
      members: [mem],
    }));
  }, []);

  return {
    structure, undo, addMember, connectNodes, removeNode, removeMember,
    setNodeSupport, setNodeLoads, updateMember, clearAll, createInitialBeam,
    canUndo: historyRef.current.length > 0,
  };
}
