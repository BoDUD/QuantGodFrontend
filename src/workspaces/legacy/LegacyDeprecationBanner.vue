<template>
  <section class="legacy-freeze-banner" aria-label="Legacy workbench freeze notice">
    <div>
      <p class="legacy-freeze-banner__eyebrow">Legacy fallback · frozen</p>
      <h2>旧完整工作台已冻结，仅作为回退入口保留</h2>
      <p>
        6 个运营业务域与 Phase 1/2/3 工作区已经迁移到 <code>src/workspaces/*</code>。
        后续新增功能应进入对应 workspace，不再扩展 LegacyWorkbench。
      </p>
    </div>
    <dl>
      <div>
        <dt>Structured domains</dt>
        <dd>{{ counts.structured }}/6</dd>
      </div>
      <div>
        <dt>Feature workspaces</dt>
        <dd>{{ counts.feature }}/3</dd>
      </div>
      <div>
        <dt>Default entry</dt>
        <dd>{{ status.defaultWorkspace }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup>
import { LEGACY_MIGRATION_STATUS, legacyMigrationCounts } from './legacyMigrationManifest.js';

const status = LEGACY_MIGRATION_STATUS;
const counts = legacyMigrationCounts();
</script>
