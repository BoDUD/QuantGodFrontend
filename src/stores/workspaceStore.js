import { computed, reactive } from 'vue';
import { DEFAULT_WORKSPACE, FLAT_WORKSPACES } from '../app/navigation.js';
import { workspaceExists } from '../app/workspaceRegistry.js';
import {
  buildWorkspaceUrl,
  readWorkspaceFromUrl,
  workspaceShareUrl,
  writeWorkspaceToUrl,
} from '../app/workspaceUrl.js';

const STORAGE_KEY = 'quantgod.activeWorkspace';

function safeLocalStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_) {
    // Local storage is optional; workspace navigation still works in memory.
  }
}

function readInitialWorkspace() {
  const fromUrl = readWorkspaceFromUrl();
  if (fromUrl && workspaceExists(fromUrl)) {
    return fromUrl;
  }

  const stored = safeLocalStorageGet(STORAGE_KEY);
  if (stored && workspaceExists(stored)) {
    return stored;
  }

  return DEFAULT_WORKSPACE;
}

const state = reactive({
  activeWorkspace: readInitialWorkspace(),
  lastUrl: null,
});

let urlSyncInitialized = false;

function applyWorkspace(key, options = {}) {
  const next = workspaceExists(key) ? key : DEFAULT_WORKSPACE;
  state.activeWorkspace = next;

  if (options.persist !== false) {
    safeLocalStorageSet(STORAGE_KEY, next);
  }

  if (options.syncUrl !== false) {
    state.lastUrl = writeWorkspaceToUrl(next, { replace: Boolean(options.replaceUrl) });
  }

  return next;
}

export function initializeWorkspaceUrlSync() {
  if (typeof window === 'undefined' || urlSyncInitialized) {
    return;
  }
  urlSyncInitialized = true;

  const fromUrl = readWorkspaceFromUrl();
  if (fromUrl && workspaceExists(fromUrl)) {
    applyWorkspace(fromUrl, { replaceUrl: true, persist: true, syncUrl: true });
  } else {
    state.lastUrl = writeWorkspaceToUrl(state.activeWorkspace, { replace: true });
  }

  window.addEventListener('popstate', () => {
    const next = readWorkspaceFromUrl() || DEFAULT_WORKSPACE;
    applyWorkspace(next, { syncUrl: false, persist: true });
  });
}

export function useWorkspaceStore() {
  function setActiveWorkspace(key, options = {}) {
    return applyWorkspace(key, options);
  }

  function workspaceUrl(key = state.activeWorkspace) {
    return buildWorkspaceUrl(key);
  }

  function workspaceShareLink(key = state.activeWorkspace) {
    return workspaceShareUrl(key);
  }

  async function copyWorkspaceLink(key = state.activeWorkspace) {
    const link = workspaceShareLink(key);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(link);
      return true;
    }
    return false;
  }

  return {
    activeWorkspace: computed(() => state.activeWorkspace),
    lastUrl: computed(() => state.lastUrl),
    workspaces: FLAT_WORKSPACES,
    setActiveWorkspace,
    workspaceUrl,
    workspaceShareLink,
    copyWorkspaceLink,
    initializeWorkspaceUrlSync,
  };
}
