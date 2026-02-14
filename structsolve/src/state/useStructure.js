import { useState, useCallback, useRef } from 'react';
import { nextNodeLabel, findOverlappingNode, computeRealCoordinates, getMemberLength } from '../utils/geometry.js';
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
    axialStiffness: type === 'truss' ? 'deformable' : 'rigid',
    EA_factor: 1,
    EA_absolute: null,
    EA_mode: 'relative',
    distributedLoads: [],
  };
}

export default function useStructure() {
  const [structure, setStructure] = useState({
    nodes: [], members: [],
    settings: { units: 'kN-m', stiffnessMode: 'relative', baseEI: null, axialMode: 'mixed' },
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
      const rdx = realDx || 0;
      const rdy = realDy || 0;
      const pixelDx = rdx * PIXELS_PER_METER;
      const pixelDy = rdy * PIXELS_PER_METER;

      const newX = fromNode.x + pixelDx;
      const newY = fromNode.y + pixelDy;

      const overlap = findOverlappingNode(newX, newY, prev.nodes);
      if (overlap) {
        const coords = computeRealCoordinates(prev.nodes, prev.members);
        const intendedRdx = realDx || 0;
        const intendedRdy = realDy || 0;
        let useOverlap = false;
        let rdx, rdy;

        if (coords[fromNodeId] && coords[overlap.id]) {
          rdx = coords[overlap.id].x - coords[fromNodeId].x;
          rdy = coords[overlap.id].y - coords[fromNodeId].y;
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
      let finalX = newX, finalY = newY;
      if (findOverlappingNode(finalX, finalY, prev.nodes)) {
        const nudgeX = rdx !== 0 ? (rdx > 0 ? 1 : -1) * PIXELS_PER_METER : 0;
        const nudgeY = rdy !== 0 ? (rdy > 0 ? 1 : -1) * PIXELS_PER_METER : 0;
        finalX += nudgeX;
        finalY += nudgeY;
      }
      const newNode = createNode(newId, finalX, finalY, newNodeSupport || null);
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

  const addDistributedLoad = useCallback((memberId, loadData) => {
    pushHistory();
    setStructure(prev => ({
      ...prev,
      members: prev.members.map(m => {
        if (m.id !== memberId) return m;
        const dl = {
          id: 'dl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          ...loadData,
        };
        return { ...m, distributedLoads: [...(m.distributedLoads || []), dl] };
      }),
    }));
  }, [structure]);

  const removeDistributedLoad = useCallback((memberId, loadId) => {
    pushHistory();
    setStructure(prev => ({
      ...prev,
      members: prev.members.map(m => {
        if (m.id !== memberId) return m;
        return { ...m, distributedLoads: (m.distributedLoads || []).filter(dl => dl.id !== loadId) };
      }),
    }));
  }, [structure]);

  const splitMemberAtPoint = useCallback((memberId, distance, loads) => {
    pushHistory();
    setStructure(prev => {
      const member = prev.members.find(m => m.id === memberId);
      if (!member) return prev;

      const startNode = prev.nodes.find(n => n.id === member.startNodeId);
      const endNode = prev.nodes.find(n => n.id === member.endNodeId);
      if (!startNode || !endNode) return prev;

      const totalLength = getMemberLength(member);
      if (distance <= 0 || distance >= totalLength || totalLength === 0) return prev;

      const ratio = distance / totalLength;
      const newX = startNode.x + (endNode.x - startNode.x) * ratio;
      const newY = startNode.y + (endNode.y - startNode.y) * ratio;
      const newId = nextNodeLabel(prev.nodes.map(n => n.id));
      const newNode = createNode(newId, newX, newY, null);
      if (loads) {
        newNode.loads = { fx: loads.fx || 0, fy: loads.fy || 0, moment: loads.moment || 0 };
      }

      const rdx1 = member.realDx * ratio;
      const rdy1 = member.realDy * ratio;
      const rdx2 = member.realDx * (1 - ratio);
      const rdy2 = member.realDy * (1 - ratio);

      const mem1 = createMember(member.startNodeId, newId, member.type, member.EI_factor);
      mem1.startHinge = member.startHinge;
      mem1.endHinge = false;
      mem1.realDx = Math.round(rdx1 * 100) / 100;
      mem1.realDy = Math.round(rdy1 * 100) / 100;
      mem1.axialStiffness = member.axialStiffness || 'rigid';
      mem1.EA_factor = member.EA_factor || 1;
      mem1.EA_absolute = member.EA_absolute || null;
      mem1.EA_mode = member.EA_mode || 'relative';

      const mem2 = createMember(newId, member.endNodeId, member.type, member.EI_factor);
      mem2.startHinge = false;
      mem2.endHinge = member.endHinge;
      mem2.realDx = Math.round(rdx2 * 100) / 100;
      mem2.realDy = Math.round(rdy2 * 100) / 100;
      mem2.axialStiffness = member.axialStiffness || 'rigid';
      mem2.EA_factor = member.EA_factor || 1;
      mem2.EA_absolute = member.EA_absolute || null;
      mem2.EA_mode = member.EA_mode || 'relative';

      // Redistribute distributed loads from original member to the two new members
      const origDLs = member.distributedLoads || [];
      const mem1Len = distance;
      const mem2Len = totalLength - distance;
      for (const dl of origDLs) {
        const dlStart = dl.startPos;
        const dlEnd = dl.endPos;
        // DL entirely within mem1
        if (dlEnd <= distance) {
          mem1.distributedLoads.push({ ...dl, id: 'dl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) });
        }
        // DL entirely within mem2
        else if (dlStart >= distance) {
          mem2.distributedLoads.push({ ...dl, id: 'dl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), startPos: dlStart - distance, endPos: dlEnd - distance });
        }
        // DL spans the split point — split into two
        else {
          const dlLen = dlEnd - dlStart;
          const splitT = (distance - dlStart) / dlLen;
          const midIntensity = dl.startIntensity + splitT * (dl.endIntensity - dl.startIntensity);
          const roundedMid = Math.round(midIntensity * 100) / 100;
          mem1.distributedLoads.push({
            ...dl, id: 'dl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            endPos: distance, endIntensity: roundedMid,
          });
          mem2.distributedLoads.push({
            ...dl, id: 'dl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            startPos: 0, endPos: dlEnd - distance, startIntensity: roundedMid,
          });
        }
      }

      const remainingMembers = prev.members.filter(m => m.id !== memberId);
      return {
        ...prev,
        nodes: [...prev.nodes, newNode],
        members: [...remainingMembers, mem1, mem2],
      };
    });
  }, [structure]);

  const setGlobalAxialMode = useCallback((mode) => {
    pushHistory();
    setStructure(prev => ({
      ...prev,
      settings: { ...prev.settings, axialMode: mode },
    }));
  }, [structure]);

  return {
    structure, undo, addMember, connectNodes, removeNode, removeMember,
    setNodeSupport, setNodeLoads, updateMember, clearAll, createInitialBeam,
    addDistributedLoad, removeDistributedLoad, splitMemberAtPoint, setGlobalAxialMode,
    canUndo: historyRef.current.length > 0,
  };
}
