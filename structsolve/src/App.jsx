import React, { useRef, useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS } from './constants/brand.js';
import { realDistance } from './utils/geometry.js';
import useStructure from './state/useStructure.js';
import useUI from './state/useUI.js';
import usePanZoom from './hooks/usePanZoom.js';
import useKeyboard from './hooks/useKeyboard.js';
import Header from './components/Header.jsx';
import SidePanel from './components/SidePanel.jsx';
import Canvas from './components/Canvas.jsx';
import PopupAt from './components/popups/PopupAt.jsx';
import ActionBar from './components/popups/ActionBar.jsx';
import CompassPicker from './components/popups/CompassPicker.jsx';
import LengthInput from './components/popups/LengthInput.jsx';
import SupportPicker from './components/popups/SupportPicker.jsx';
import LoadInput from './components/popups/LoadInput.jsx';
import ConnectFlow from './components/popups/ConnectFlow.jsx';
import StartOverlay from './components/popups/StartOverlay.jsx';

export default function App() {
  const {
    structure, undo, addMember, connectNodes, removeNode, removeMember,
    setNodeSupport, setNodeLoads, updateMember, clearAll, createInitialBeam, canUndo,
  } = useStructure();
  const {
    ui, selectNode, selectMember, openPopup, closePopup,
    startConnect, cancelConnect, reset, hideStartOverlay, showStartOverlay, setDirection,
  } = useUI();

  const svgRef = useRef(null);
  const { viewBox, panning, svgProps, fitToNodes, zoomIn, zoomOut } = usePanZoom();
  const { nodes, members } = structure;

  // Connect flow state
  const [connectTarget, setConnectTarget] = useState(null);
  const [connectAutoLen, setConnectAutoLen] = useState(0);

  // Fit view when nodes change
  useEffect(() => {
    if (nodes.length > 0) fitToNodes(nodes);
  }, [nodes.length]);

  // --- Handlers ---

  const handleCreateBeam = useCallback((opts) => {
    createInitialBeam(opts);
    hideStartOverlay();
  }, [createInitialBeam, hideStartOverlay]);

  const handleActionBar = useCallback((action) => {
    if (action === 'compass') openPopup('compass');
    else if (action === 'support') openPopup('support');
    else if (action === 'load') openPopup('load');
  }, [openPopup]);

  const handleAddMember = useCallback((conf) => {
    addMember(ui.activeNodeId, ui.pendingDirection, conf.length, conf.type, conf.eiFactor, conf.newNodeSupport, conf.startHinge, conf.realDx, conf.realDy);
    reset();
  }, [addMember, ui.activeNodeId, ui.pendingDirection, reset]);

  const handleConnectTarget = useCallback((targetId) => {
    const autoLen = realDistance(ui.connectFromId, targetId, nodes, members) || 1;
    setConnectTarget(targetId);
    setConnectAutoLen(Math.round(autoLen * 100) / 100);
  }, [ui.connectFromId, nodes, members]);

  const handleConnectConfirm = useCallback((conf) => {
    connectNodes(ui.connectFromId, connectTarget, connectAutoLen, conf.type, conf.eiFactor, conf.startHinge, conf.endHinge);
    setConnectTarget(null);
    cancelConnect();
    reset();
  }, [connectNodes, ui.connectFromId, connectTarget, connectAutoLen, cancelConnect, reset]);

  const handleConnectCancel = useCallback(() => {
    setConnectTarget(null);
    cancelConnect();
    reset();
  }, [cancelConnect, reset]);

  const handleDeleteNode = useCallback((id) => { removeNode(id); reset(); }, [removeNode, reset]);
  const handleDeleteMember = useCallback((id) => { removeMember(id); reset(); }, [removeMember, reset]);

  const handleClear = useCallback(() => { clearAll(); reset(); showStartOverlay(); }, [clearAll, reset, showStartOverlay]);

  // --- Keyboard ---
  useKeyboard({
    onUndo: undo,
    onDelete: useCallback(() => {
      if (ui.activeMemberId) { removeMember(ui.activeMemberId); reset(); }
      else if (ui.activeNodeId) { removeNode(ui.activeNodeId); reset(); }
    }, [ui.activeMemberId, ui.activeNodeId, removeMember, removeNode, reset]),
    onEscape: useCallback(() => {
      if (ui.connectMode) { setConnectTarget(null); cancelConnect(); }
      closePopup();
    }, [ui.connectMode, cancelConnect, closePopup]),
    onFit: useCallback(() => { if (nodes.length > 0) fitToNodes(nodes); }, [nodes, fitToNodes]),
  });

  // --- Active node for popups ---
  const activeNode = ui.activeNodeId ? nodes.find(n => n.id === ui.activeNodeId) : null;
  const connectFromNode = ui.connectFromId ? nodes.find(n => n.id === ui.connectFromId) : null;

  // --- Popup content ---
  function renderPopup() {
    if (!activeNode || !ui.activePopup) return null;
    let content = null;

    switch (ui.activePopup) {
      case 'actions':
        content = <ActionBar nodeId={activeNode.id} onAction={handleActionBar} />;
        break;
      case 'compass':
        content = (
          <CompassPicker
            nodeId={activeNode.id} existingNodes={nodes}
            onSelectDirection={setDirection}
            onConnect={() => startConnect(activeNode.id)}
            onClose={closePopup}
          />
        );
        break;
      case 'length':
        content = (
          <LengthInput
            direction={ui.pendingDirection}
            onConfirm={handleAddMember}
            onCancel={() => openPopup('compass')}
          />
        );
        break;
      case 'support':
        content = (
          <SupportPicker
            nodeId={activeNode.id} currentSupport={activeNode.support}
            onSelect={(type) => setNodeSupport(activeNode.id, type)}
            onClose={closePopup}
          />
        );
        break;
      case 'load':
        content = (
          <LoadInput
            nodeId={activeNode.id} currentLoads={activeNode.loads}
            onApply={(loads) => setNodeLoads(activeNode.id, loads)}
            onClose={closePopup}
          />
        );
        break;
      default:
        return null;
    }

    return (
      <PopupAt svgRef={svgRef} nodeX={activeNode.x} nodeY={activeNode.y} viewBox={viewBox}>
        {content}
      </PopupAt>
    );
  }

  // --- Connect flow popup ---
  function renderConnectFlow() {
    if (!connectTarget || !connectFromNode) return null;
    return (
      <PopupAt svgRef={svgRef} nodeX={connectFromNode.x} nodeY={connectFromNode.y} viewBox={viewBox}>
        <ConnectFlow
          fromId={ui.connectFromId} toId={connectTarget} autoLength={connectAutoLen}
          onConfirm={handleConnectConfirm} onCancel={handleConnectCancel}
        />
      </PopupAt>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: FONTS.mono }}>
      <Header onClear={handleClear} onUndo={undo} canUndo={canUndo} nodeCount={nodes.length} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: COLORS.canvasBg }}>
        <SidePanel
          nodes={nodes} members={members}
          activeNodeId={ui.activeNodeId} activeMemberId={ui.activeMemberId}
          onSelectNode={selectNode} onSelectMember={selectMember}
          onDeleteNode={handleDeleteNode} onDeleteMember={handleDeleteMember}
          onUpdateMember={updateMember}
        />

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: COLORS.canvasBg }}>
          <Canvas
            nodes={nodes} members={members} ui={ui}
            svgRef={svgRef} viewBox={viewBox} svgProps={svgProps} panning={panning}
            onSelectNode={selectNode} onSelectMember={selectMember}
            onCanvasClick={reset} onConnectTarget={handleConnectTarget}
            onZoomIn={zoomIn} onZoomOut={zoomOut}
            onFit={() => { if (nodes.length > 0) fitToNodes(nodes); }}
          />

          {ui.showStartOverlay && nodes.length === 0 && (
            <StartOverlay onCreate={handleCreateBeam} />
          )}

          {renderPopup()}
          {renderConnectFlow()}
        </div>
      </div>
    </div>
  );
}
