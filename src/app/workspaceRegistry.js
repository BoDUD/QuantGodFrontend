import LegacyWorkbench from '../workspaces/legacy/LegacyWorkbench.vue';
import Phase1Workspace from '../workspaces/phase1/Phase1Workspace.vue';
import Phase2OperationsWorkspace from '../workspaces/phase2/Phase2OperationsWorkspace.vue';
import Phase3Workspace from '../workspaces/phase3/Phase3Workspace.vue';

import { DEFAULT_WORKSPACE, FLAT_WORKSPACES, findWorkspace } from './navigation.js';

export const WORKSPACE_COMPONENTS = {
  legacy: LegacyWorkbench,
  phase1: Phase1Workspace,
  phase2: Phase2OperationsWorkspace,
  phase3: Phase3Workspace,
};

export function resolveWorkspaceComponent(key) {
  return WORKSPACE_COMPONENTS[key] || WORKSPACE_COMPONENTS[DEFAULT_WORKSPACE];
}

export function workspaceMeta(key) {
  return findWorkspace(key);
}

export function workspaceExists(key) {
  return Boolean(WORKSPACE_COMPONENTS[key]) && FLAT_WORKSPACES.some((workspace) => workspace.key === key);
}
