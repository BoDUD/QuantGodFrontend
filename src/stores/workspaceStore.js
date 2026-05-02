import { computed, reactive } from 'vue';

import { DEFAULT_WORKSPACE, FLAT_WORKSPACES } from '../app/navigation.js';
import { workspaceExists } from '../app/workspaceRegistry.js';

const STORAGE_KEY = 'quantgod.activeWorkspace';

function readInitialWorkspace() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && workspaceExists(stored)) {
      return stored;
    }
  } catch (_) {
    // Ignore localStorage errors in restricted browsers and tests.
  }
  return DEFAULT_WORKSPACE;
}

const state = reactive({
  activeWorkspace: readInitialWorkspace(),
});

export function useWorkspaceStore() {
  function setActiveWorkspace(key) {
    const next = workspaceExists(key) ? key : DEFAULT_WORKSPACE;
    state.activeWorkspace = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch (_) {
      // Local storage is optional; the workspace still changes in memory.
    }
  }

  return {
    activeWorkspace: computed(() => state.activeWorkspace),
    workspaces: FLAT_WORKSPACES,
    setActiveWorkspace,
  };
}
