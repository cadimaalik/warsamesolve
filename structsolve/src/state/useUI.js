import { useState, useCallback } from 'react';

export default function useUI() {
  const [ui, setUI] = useState({
    activeNodeId: null,
    activeMemberId: null,
    activePopup: null,
    // 'actions'|'compass'|'length'|'support'|'load'|'connect'|'settings'|null
    pendingDirection: null,
    connectMode: false,
    connectFromId: null,
    showStartOverlay: true,
  });

  const selectNode = useCallback((nodeId) => {
    setUI(u => ({ ...u, activeNodeId: nodeId, activeMemberId: null, activePopup: 'actions', pendingDirection: null }));
  }, []);

  const selectMember = useCallback((memberId) => {
    setUI(u => ({ ...u, activeMemberId: memberId, activeNodeId: null, activePopup: null }));
  }, []);

  const openPopup = useCallback((name) => {
    setUI(u => ({ ...u, activePopup: name }));
  }, []);

  const closePopup = useCallback(() => {
    setUI(u => ({ ...u, activePopup: null, pendingDirection: null }));
  }, []);

  const startConnect = useCallback((fromNodeId) => {
    setUI(u => ({ ...u, activePopup: null, connectMode: true, connectFromId: fromNodeId }));
  }, []);

  const cancelConnect = useCallback(() => {
    setUI(u => ({ ...u, connectMode: false, connectFromId: null }));
  }, []);

  const reset = useCallback(() => {
    setUI(u => ({
      ...u, activeNodeId: null, activeMemberId: null, activePopup: null,
      pendingDirection: null, connectMode: false, connectFromId: null,
    }));
  }, []);

  const hideStartOverlay = useCallback(() => {
    setUI(u => ({ ...u, showStartOverlay: false }));
  }, []);

  const setDirection = useCallback((dir) => {
    setUI(u => ({ ...u, pendingDirection: dir, activePopup: 'length' }));
  }, []);

  return { ui, selectNode, selectMember, openPopup, closePopup, startConnect, cancelConnect, reset, hideStartOverlay, setDirection };
}
