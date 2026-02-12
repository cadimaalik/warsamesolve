import { useState, useCallback, useRef } from 'react';
import { nextNodeLabel, findOverlappingNode, realDistance } from '../utils/geometry.js';
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

  const addMember = useCallback((fromNodeId, direction, length, type, eiFactor, newNodeSupport, startHinge = false) => {
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
        // Connect to existing node instead of creating new one
        const autoLen = realDistance(fromNodeId, overlap.id, prev.nodes, prev.members) || length;
        const newMem = createMember(fromNodeId, overlap.id, autoLen, type, eiFactor);
        newMem.startHinge = startHinge;
        return { ...prev, members: [...prev.members, newMem] };
      }

      const newId = nextNodeLabel(prev.nodes.map(n => n.id));
      const newNode = createNode(newId, newX, newY, newNodeSupport || null);
      const newMem = createMember(fromNodeId, newId, length, type, eiFactor);
      newMem.startHinge = startHinge;

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
      const newMem = createMember(fromId, toId, length, type, eiFactor);
      newMem.startHinge = startHinge;
      newMem.endHinge = endHinge;
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
    setStructure(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== memberId),
    }));
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

  const createInitialBeam = useCallback((length) => {
    const nodeA = createNode('A', 200, 300, 'pin');
    const nodeB = createNode('B', 200 + MEMBER_SPACING, 300, null);
    const mem = createMember('A', 'B', length);
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
