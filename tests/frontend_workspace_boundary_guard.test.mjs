import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { runWorkspaceBoundaryGuard } from '../scripts/frontend_workspace_boundary_guard.mjs';

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-frontend-workspace-boundary-'));
  fs.mkdirSync(path.join(root, 'src', 'app'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'components'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'workspaces', 'phase1'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'workspaces', 'phase2'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'workspaces', 'phase3'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'workspaces', 'phase1', 'Phase1Workspace.vue'), '<template></template>');
  fs.writeFileSync(path.join(root, 'src', 'workspaces', 'phase2', 'Phase2OperationsWorkspace.vue'), '<template></template>');
  fs.writeFileSync(path.join(root, 'src', 'workspaces', 'phase3', 'Phase3Workspace.vue'), '<template></template>');
  fs.writeFileSync(
    path.join(root, 'src', 'app', 'workspaceRegistry.js'),
    [
      "import Phase1Workspace from '../workspaces/phase1/Phase1Workspace.vue';",
      "import Phase2OperationsWorkspace from '../workspaces/phase2/Phase2OperationsWorkspace.vue';",
      "import Phase3Workspace from '../workspaces/phase3/Phase3Workspace.vue';",
    ].join('\n'),
  );
  return root;
}

test('workspace boundary guard accepts phase workspaces under src/workspaces', () => {
  const root = makeFixture();
  assert.deepEqual(runWorkspaceBoundaryGuard(root), []);
});

test('workspace boundary guard rejects src/components/phase directories', () => {
  const root = makeFixture();
  fs.mkdirSync(path.join(root, 'src', 'components', 'phase1'), { recursive: true });
  const errors = runWorkspaceBoundaryGuard(root);
  assert.ok(errors.some((error) => error.includes('src/components/phase1')));
});

test('workspace boundary guard rejects old registry imports', () => {
  const root = makeFixture();
  fs.writeFileSync(
    path.join(root, 'src', 'app', 'workspaceRegistry.js'),
    "import Phase1Workspace from '../components/phase1/Phase1Workspace.vue';\n",
  );
  const errors = runWorkspaceBoundaryGuard(root);
  assert.ok(errors.some((error) => error.includes('workspaceRegistry.js')));
});
