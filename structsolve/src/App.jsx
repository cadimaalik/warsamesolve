import React, { useRef, useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS } from './constants/brand.js';
import { realDistance, getMemberLength } from './utils/geometry.js';
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
import MemberActionBar from './components/popups/MemberActionBar.jsx';
import PointLoadInput from './components/popups/PointLoadInput.jsx';
import DistributedLoadInput from './components/popups/DistributedLoadInput.jsx';
import AnalysisPage from './components/AnalysisPage.jsx';
import SolverPage from './components/SolverPage.jsx';

export default function App() {
  const {
    structure, undo, addMember, connectNodes, removeNode, removeMember,
    setNodeSupport, setNodeLoads, updateMember, clearAll, createInitialBeam,
    addDistributedLoad, updateDistributedLoad, removeDistributedLoad, splitMemberAtPoint, setGlobalAxialMode,
    canUndo,
  } = useStructure();
  const {
    ui, selectNode, selectMember, openPopup, closePopup,
    startConnect, cancelConnect, reset, hideStartOverlay, showStartOverlay, setDirection,
  } = useUI();

  // View switching: 'builder' | 'analyze' | 'solver'
  const [currentView, setCurrentView] = useState('builder');
  const [solverMethod, setSolverMethod] = useState('');
  const [solverResults, setSolverResults] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const svgRef = useRef(null);
  const { viewBox, panning, svgProps, fitToNodes, zoomIn, zoomOut } = usePanZoom();
  const { nodes, members, settings } = structure;

  // Connect flow state
  const [connectTarget, setConnectTarget] = useState(null);
  const [connectAutoLen, setConnectAutoLen] = useState(0);

  // Fit view when nodes change
  useEffect(() => {
    if (nodes.length > 0) fitToNodes(nodes);
  }, [nodes.length]);

  // Clear validation error after 4 seconds
  useEffect(() => {
    if (validationError) {
      const t = setTimeout(() => setValidationError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [validationError]);

  // --- Analyze handler ---
  const handleAnalyze = useCallback(() => {
    if (nodes.length < 2) {
      setValidationError('Cannot analyze: need at least 2 nodes');
      return;
    }
    if (members.length < 1) {
      setValidationError('Cannot analyze: need at least 1 member');
      return;
    }
    const hasSupport = nodes.some(n => !!n.support);
    if (!hasSupport) {
      setValidationError('Cannot analyze: no supports defined');
      return;
    }
    const hasLoad = nodes.some(n => n.loads && (n.loads.fx || n.loads.fy || n.loads.moment))
      || members.some(m => m.distributedLoads && m.distributedLoads.length > 0);
    if (!hasLoad) {
      setValidationError('Cannot analyze: no loads applied');
      return;
    }

    setValidationError(null);
    reset();
    setCurrentView('analyze');
  }, [nodes, members, reset]);

  const handleBackToBuilder = useCallback(() => {
    setCurrentView('builder');
  }, []);

  const handleLaunchMethod = useCallback((methodName, results) => {
    setSolverMethod(methodName);
    setSolverResults(results);
    setCurrentView('solver');
  }, []);

  const handleBackToMethods = useCallback(() => {
    setCurrentView('analyze');
  }, []);

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

  // --- Member Action Bar handler ---
  const handleMemberAction = useCallback((action) => {
    if (action === 'properties') {
      closePopup();
    } else if (action === 'point-load') {
      openPopup('point-load');
    } else if (action === 'distributed-load') {
      openPopup('distributed-load');
    } else if (action === 'delete') {
      if (ui.activeMemberId) {
        removeMember(ui.activeMemberId);
        reset();
      }
    }
  }, [ui.activeMemberId, openPopup, closePopup, removeMember, reset]);

  // --- Point Load handler ---
  const handlePointLoadApply = useCallback((distance, loads) => {
    if (ui.activeMemberId) {
      splitMemberAtPoint(ui.activeMemberId, distance, loads);
      reset();
    }
  }, [ui.activeMemberId, splitMemberAtPoint, reset]);

  // --- Distributed Load handler ---
  const handleDistLoadApply = useCallback((loadData) => {
    if (ui.activeMemberId) {
      addDistributedLoad(ui.activeMemberId, loadData);
      reset();
    }
  }, [ui.activeMemberId, addDistributedLoad, reset]);

  // --- Delete existing DL from popup ---
  const handleDistLoadDelete = useCallback(() => {
    if (ui.activeMemberId) {
      const m = members.find(mem => mem.id === ui.activeMemberId);
      if (m && m.distributedLoads && m.distributedLoads.length > 0) {
        removeDistributedLoad(ui.activeMemberId, m.distributedLoads[0].id);
      }
      reset();
    }
  }, [ui.activeMemberId, members, removeDistributedLoad, reset]);

  // --- Keyboard ---
  useKeyboard({
    onUndo: undo,
    onDelete: useCallback(() => {
      if (ui.activeMemberId) { removeMember(ui.activeMemberId); reset(); }
      else if (ui.activeNodeId) { removeNode(ui.activeNodeId); reset(); }
    }, [ui.activeMemberId, ui.activeNodeId, removeMember, removeNode, reset]),
    onEscape: useCallback(() => {
      if (currentView !== 'builder') { setCurrentView('builder'); return; }
      if (ui.connectMode) { setConnectTarget(null); cancelConnect(); }
      closePopup();
    }, [currentView, ui.connectMode, cancelConnect, closePopup]),
    onFit: useCallback(() => { if (nodes.length > 0) fitToNodes(nodes); }, [nodes, fitToNodes]),
  });

  // --- Active node for popups ---
  const activeNode = ui.activeNodeId ? nodes.find(n => n.id === ui.activeNodeId) : null;
  const connectFromNode = ui.connectFromId ? nodes.find(n => n.id === ui.connectFromId) : null;
  const activeMember = ui.activeMemberId ? members.find(m => m.id === ui.activeMemberId) : null;

  // --- Popup content ---
  function renderPopup() {
    if (!ui.activePopup) return null;

    // Node popups
    if (activeNode) {
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

    // Member popups
    if (activeMember) {
      const sn = nodes.find(n => n.id === activeMember.startNodeId);
      const en = nodes.find(n => n.id === activeMember.endNodeId);
      if (!sn || !en) return null;

      const midX = (sn.x + en.x) / 2;
      const midY = (sn.y + en.y) / 2;
      const memberLen = getMemberLength(activeMember);
      const memberLabel = `${sn.id}\u2192${en.id}`;
      const isTruss = activeMember.type === 'truss';

      // Check if member is inclined (not purely horizontal or vertical)
      const isInclined = Math.abs(activeMember.realDx) > 0.01 && Math.abs(activeMember.realDy) > 0.01;

      // Existing DL for edit mode
      const existingDL = (activeMember.distributedLoads && activeMember.distributedLoads.length > 0)
        ? activeMember.distributedLoads[0] : null;

      let content = null;
      switch (ui.activePopup) {
        case 'member-actions':
          content = (
            <MemberActionBar
              memberLabel={memberLabel}
              isTruss={isTruss}
              onAction={handleMemberAction}
            />
          );
          break;
        case 'point-load':
          content = (
            <PointLoadInput
              member={activeMember}
              startNodeId={sn.id}
              endNodeId={en.id}
              memberLength={memberLen}
              onApply={handlePointLoadApply}
              onCancel={() => openPopup('member-actions')}
            />
          );
          break;
        case 'distributed-load':
          content = (
            <DistributedLoadInput
              member={activeMember}
              startNodeId={sn.id}
              endNodeId={en.id}
              memberLength={memberLen}
              isInclined={isInclined}
              onApply={handleDistLoadApply}
              onCancel={() => openPopup('member-actions')}
              existingLoad={existingDL}
              onDelete={existingDL ? handleDistLoadDelete : undefined}
            />
          );
          break;
        default:
          return null;
      }

      return (
        <PopupAt svgRef={svgRef} nodeX={midX} nodeY={midY} viewBox={viewBox}>
          {content}
        </PopupAt>
      );
    }

    return null;
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
      <Header
        onClear={handleClear} onUndo={undo} canUndo={canUndo} nodeCount={nodes.length}
        axialMode={settings.axialMode} onAxialModeChange={setGlobalAxialMode}
        onAnalyze={handleAnalyze}
        currentView={currentView}
        onBackToBuilder={handleBackToBuilder}
      />

      {/* Validation error toast */}
      {validationError && (
        <div style={{
          background: '#7f1d1d', color: '#fca5a5', padding: '8px 16px',
          fontSize: 12, fontFamily: FONTS.mono, fontWeight: 600,
          textAlign: 'center',
        }}>
          {validationError}
        </div>
      )}

      {/* View switching */}
      {currentView === 'builder' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: COLORS.canvasBg }}>
          <SidePanel
            nodes={nodes} members={members}
            activeNodeId={ui.activeNodeId} activeMemberId={ui.activeMemberId}
            onSelectNode={selectNode} onSelectMember={selectMember}
            onDeleteNode={handleDeleteNode} onDeleteMember={handleDeleteMember}
            onUpdateMember={updateMember}
            globalAxialMode={settings.axialMode}
            onRemoveDL={removeDistributedLoad}
            onUpdateDL={updateDistributedLoad}
          />

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: COLORS.canvasBg }}>
            <Canvas
              nodes={nodes} members={members} ui={ui}
              svgRef={svgRef} viewBox={viewBox} svgProps={svgProps} panning={panning}
              onSelectNode={selectNode} onSelectMember={selectMember}
              onCanvasClick={reset} onConnectTarget={handleConnectTarget}
              onZoomIn={zoomIn} onZoomOut={zoomOut}
              onFit={() => { if (nodes.length > 0) fitToNodes(nodes); }}
              globalAxialMode={settings.axialMode}
            />

            {ui.showStartOverlay && nodes.length === 0 && (
              <StartOverlay onCreate={handleCreateBeam} />
            )}

            {renderPopup()}
            {renderConnectFlow()}
          </div>
        </div>
      )}

      {currentView === 'analyze' && (
        <AnalysisPage
          nodes={nodes} members={members}
          structure={structure}
          onEdit={handleBackToBuilder}
          onLaunchMethod={handleLaunchMethod}
        />
      )}

      {currentView === 'solver' && (
        <SolverPage
          nodes={nodes} members={members}
          methodName={solverMethod}
          solverResults={solverResults}
          onBack={handleBackToMethods}
          onEdit={handleBackToBuilder}
        />
      )}
    </div>
  );
}
