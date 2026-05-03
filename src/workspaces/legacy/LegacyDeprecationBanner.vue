<template>
  <section class="legacy-freeze-banner" aria-label="旧工作台归档说明">
    <div>
      <p class="legacy-freeze-banner__eyebrow">旧入口已归档</p>
      <h2>旧完整工作台已冻结，仅作为回退入口保留</h2>
      <p>
        MT5、Polymarket、每日复盘、通知和 AI 工具已经迁移到独立运营页面。
        后续新增功能应进入对应业务页面，不再扩展旧单体页面。
      </p>
    </div>
    <dl>
      <div>
        <dt>业务页面</dt>
        <dd>{{ counts.structured }}/6</dd>
      </div>
      <div>
        <dt>工具页面</dt>
        <dd>{{ counts.feature }}/3</dd>
      </div>
      <div>
        <dt>默认入口</dt>
        <dd>全局总览</dd>
      </div>
    </dl>
  </section>
</template>

<script setup>
import { legacyMigrationCounts } from './legacyMigrationManifest.js';

const counts = legacyMigrationCounts();
</script>
