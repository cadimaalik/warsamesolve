import { useState, useCallback, useRef } from 'react';
import { nextNodeLabel, findOverlappingNode, computeRealCoordinates } from '../utils/geometry.js';
import { DIRECTIONS, MEMBER_SPACING, PIXELS_PER_METER } from '../constants/directions.js';

function createNode(id, x, y, support = null) {
  return { id, x, y, support, loads: { fx: 0, fy: 0, moment: 0 }, hinge: false };
}

function createMember(startNodeId, endNodeId, type = 'frame', eiFactor = 1) {
  return {
    id: 'mem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    startNodeId, endNodeId,
    type, EI_factor: eiFactor,
    startHinge: false, endHinge: false,
    realDx: 0, realDy: 0,
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
      // Calculate pixel offset from REAL displacement (to-scale rendering)
      const rdx = realDx || 0;
      const rdy = realDy || 0;
      const pixelDx = rdx * PIXELS_PER_METER;
      const pixelDy = rdy * PIXELS_PER_METER;

      const newX = fromNode.x + pixelDx;
      const newY = fromNode.y + pixelDy;

      // Check overlap with existing node
      const overlap = findOverlappingNode(newX, newY, prev.nodes);
      if (overlap) {
        // Verify the real-world displacement to overlapping node matches user intent
        const coords = computeRealCoordinates(prev.nodes, prev.members);
        const intendedRdx = realDx || 0;
        const intendedRdy = realDy || 0;
        let useOverlap = false;
        let rdx, rdy;

        if (coords[fromNodeId] && coords[overlap.id]) {
          rdx = coords[overlap.id].x - coords[fromNodeId].x;
          rdy = coords[overlap.id].y - coords[fromNodeId].y;
          // Only connect to existing node if real-world displacement roughly matches
          const tol = 0.5;
          useOverlap = Math.abs(rdx - intendedRdx) < tol && Math.abs(rdy - intendedRdy) < tol;
        }

        if (useOverlap) {
          const newMem = createMember(fromNodeId, overlap.id, type, eiFactor);
          newMem.startHinge = startHinge;
          newMem.realDx = rdx;
          newMem.realDy = rdy;
          return { ...prev, members: [...prev.members, newMem] };
        }
      }

      const newId = nextNodeLabel(prev.nodes.map(n => n.id));
      // Nudge pixel position if it collides with an existing node
      let finalX = newX, finalY = newY;
      if (findOverlappingNode(finalX, finalY, prev.nodes)) {
        // Nudge by 1 meter in the direction of the member
        const nudgeX = rdx !== 0 ? (rdx > 0 ? 1 : -1) * PIXELS_PER_METER : 0;
        const nudgeY = rdy !== 0 ? (rdy > 0 ? 1 : -1) * PIXELS_PER_METER : 0;
        finalX += nudgeX;
        finalY += nudgeY;
      }
      const newNode = createNode(newId, finalX, finalY, newNodeSupport || null);
      // Store real-world displacement — length is computed on-the-fly
      const newMem = createMember(fromNodeId, newId, type, eiFactor);
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
      // Compute realDx/realDy directly from pixel positions (to-scale)
      const fromNode = prev.nodes.find(n => n.id === fromId);
      const toNode = prev.nodes.find(n => n.id === toId);
      if (!fromNode || !toNode) return prev;

      const pixelDx = toNode.x - fromNode.x;
      const pixelDy = toNode.y - fromNode.y;
      const rdx = pixelDx / PIXELS_PER_METER;
      const rdy = pixelDy / PIXELS_PER_METER;

      const newMem = createMember(fromId, toId, type, eiFactor);
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
    // To-scale positioning: length in meters × PIXELS_PER_METER
    const pixelLength = length * PIXELS_PER_METER;
    const bx = isVert ? 200 : 200 + pixelLength;
    const by = isVert ? 300 + pixelLength : 300;
    const nodeA = createNode('A', 200, 300, supportA);
    const nodeB = createNode('B', bx, by, supportB);
    const mem = createMember('A', 'B', type);
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
