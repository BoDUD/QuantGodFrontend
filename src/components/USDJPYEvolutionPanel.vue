<template>
  <section class="qg-usdjpy-evolution">
    <header class="qg-usdjpy-evolution__header">
      <div>
        <p class="qg-usdjpy-evolution__eyebrow">USDJPY 自学习闭环</p>
        <h2>数据集、回放、Walk-forward 与自主治理</h2>
        <p>每天把 EA 守门、错失机会、过早出场和参数候选整理成证据；无需人工审批，但必须通过机器硬风控和自动回滚。</p>
      </div>
      <div class="qg-usdjpy-evolution__actions">
        <button type="button" :disabled="loading" @click="load">刷新</button>
        <button type="button" :disabled="loading" @click="runCausalReplay">生成因果回放</button>
        <button type="button" :disabled="loading" @click="runAutonomousGovernance">运行自主治理</button>
        <button type="button" :disabled="loading" @click="runDailyAutopilotV2">生成自动日报</button>
        <button type="button" :disabled="loading" @click="runFullEvolution">生成复盘闭环</button>
      </div>
    </header>

    <div v-if="loading" class="qg-usdjpy-evolution__state">正在读取 USDJPY 自学习证据...</div>
    <div v-else-if="error" class="qg-usdjpy-evolution__state qg-usdjpy-evolution__state--error">{{ error }}</div>
    <div v-else class="qg-usdjpy-evolution__grid">
      <article class="qg-usdjpy-evolution__card">
        <span>运行数据集</span>
        <strong>{{ datasetSummary.sampleCount || 0 }}</strong>
        <p>准入 {{ datasetSummary.readySignalCount || 0 }} / 实盘 {{ datasetSummary.actualEntryCount || 0 }} / 阻断 {{ datasetSummary.blockedCount || 0 }}</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>回放复盘</span>
        <strong>{{ replayStatus }}</strong>
        <p>错失 {{ replaySummary.missedOpportunityCount || 0 }} / 过早出场 {{ replaySummary.earlyExitCount || 0 }}</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>参数候选</span>
        <strong>{{ tuningSummary.candidateCount || 0 }}</strong>
        <p>{{ tuning?.statusZh || '等待回放数据生成候选' }}</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>自主治理 Agent</span>
        <strong>{{ autonomousAgent?.stageZh || autonomousAgent?.stage || proposal?.statusZh || '等待治理门' }}</strong>
        <p>{{ patchWritable ? '已允许写入受控 patch' : '未放行 patch' }}；不会改源码或 live preset。</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>美分账户</span>
        <strong>{{ centAccount.accountMode || 'cent' }} / {{ centAccount.accountCurrencyUnit || 'USC' }}</strong>
        <p>加速 {{ centAccount.centAccountAcceleration ? '开启' : '关闭' }}；最大 {{ centAccount.maxLot ?? 2 }} 是上限，不是固定仓位。</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>MT5 模拟车道</span>
        <strong>{{ mt5ShadowSummary.routeCount || 0 }} 条路线</strong>
        <p>快速模拟 {{ mt5ShadowSummary.fastShadow || 0 }} / 测试器 {{ mt5ShadowSummary.testerOnly || 0 }} / 暂停 {{ mt5ShadowSummary.paused || 0 }}</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>Polymarket 模拟车道</span>
        <strong>{{ polymarketShadow.stageZh || polymarketShadow.stage || '模拟观察' }}</strong>
        <p>模拟 PF {{ polymarketSummary.shadowProfitFactor ?? 0 }}；真实钱包和下单永远关闭。</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>EA 对账</span>
        <strong>{{ eaRepro.statusZh || '等待对账' }}</strong>
        <p>源码 / ex5 / preset hash 只读校验；Watchlist 期望 USDJPY-only。</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>Daily Autopilot 2.0</span>
        <strong>{{ dailyAutopilot?.titleZh || '等待自动日报' }}</strong>
        <p>{{ dailyAutopilot?.morningPlan?.liveLane?.stageZh || '自动生成早盘计划和夜盘复盘。' }}</p>
      </article>
    </div>

    <section v-if="lanes" class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--lanes">
      <div class="qg-usdjpy-evolution__section-head">
        <div>
          <h3>三车道自主生命周期</h3>
          <p>实盘要窄，模拟要宽，升降级要快，回滚要硬。</p>
        </div>
        <strong>{{ autonomousLifecycle?.singleSourceOfTruth || 'USDJPY_LIVE_LOOP_WITH_AUTONOMOUS_LIFECYCLE' }}</strong>
      </div>
      <div class="qg-usdjpy-evolution__scenario-grid">
        <article>
          <span>Live Lane</span>
          <strong>{{ liveLane.strategy || 'RSI_Reversal' }} / {{ directionZh(liveLane.direction || 'LONG') }}</strong>
          <p>只允许 USDJPYc 买入路线进入 MICRO_LIVE / LIVE_LIMITED。</p>
        </article>
        <article>
          <span>MT5 Shadow Lane</span>
          <strong>{{ mt5ShadowSummary.topShadowStrategy || '多策略观察' }}</strong>
          <p>模拟池包含 RSI、MA、BB、MACD、S/R、东京突破、夜盘回归和 H4 回调。</p>
        </article>
        <article>
          <span>Polymarket Shadow Lane</span>
          <strong>{{ polymarketShadow.stageZh || polymarketShadow.stage || '模拟观察' }}</strong>
          <p>{{ polymarketShadow.reasonZh || '只做模拟账本、跟单研究和事件风险上下文。' }}</p>
        </article>
        <article>
          <span>自动回滚</span>
          <strong>{{ rollbackBlockers.length ? '已触发' : '待命' }}</strong>
          <p>{{ rollbackBlockers[0] || '连续亏损、日亏损、快通道、runtime、点差和新闻是不可放宽硬门禁。' }}</p>
        </article>
      </div>
      <p class="qg-usdjpy-evolution__note">MT5 Shadow 第一名不会抢实盘路线；Polymarket 永远不接真钱钱包；DeepSeek 只解释，不批准越权。</p>
    </section>

    <section v-if="autonomousAgent" class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--agent">
      <div class="qg-usdjpy-evolution__section-head">
        <div>
          <h3>自主治理 Agent</h3>
          <p>取消人工审批不等于取消风控：Agent 只能写受控 patch，硬风控失败会自动回滚或暂停。</p>
        </div>
        <strong>{{ autonomousAgent.stageZh || autonomousAgent.stage || '等待状态' }}</strong>
      </div>
      <div class="qg-usdjpy-evolution__scenario-grid">
        <article>
          <span>当前阶段</span>
          <strong>{{ autonomousAgent.stageZh || autonomousAgent.stage || '—' }}</strong>
          <p>USDJPY-only / RSI_Reversal LONG 主线</p>
        </article>
        <article>
          <span>受控 patch</span>
          <strong>{{ patchWritable ? '已放行' : '未放行' }}</strong>
          <p>{{ patchChangeText }}</p>
        </article>
        <article>
          <span>自动回滚</span>
          <strong>{{ rollbackBlockers.length ? `${rollbackBlockers.length} 项` : '未触发' }}</strong>
          <p>{{ rollbackBlockers[0] || '连续亏损、日亏损、快通道、runtime、点差和新闻仍是硬门禁。' }}</p>
        </article>
        <article>
          <span>仓位上限</span>
          <strong>{{ agentLimits.stageMaxLot ?? 0 }} / {{ agentLimits.maxLot ?? 2 }}</strong>
          <p>当前阶段 / 系统上限；最大 2.0 只是上限，不是固定仓位。</p>
        </article>
      </div>
      <p class="qg-usdjpy-evolution__note">DeepSeek 只解释晋级和回滚原因，不能批准 live、不能取消回滚、不能提高最大仓位、不能放宽新闻/点差/runtime 门禁。</p>
    </section>

    <section v-if="dailyAutopilot" class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--daily">
      <div class="qg-usdjpy-evolution__section-head">
        <div>
          <h3>Daily Autopilot 2.0</h3>
          <p>自动中文早盘计划和夜盘复盘；不再把已完成事项留给人工回灌。</p>
        </div>
        <strong>{{ dailyAutopilot.autonomousAgent?.stageZh || dailyAutopilot.autonomousAgent?.stage || '自主评估' }}</strong>
      </div>
      <div class="qg-usdjpy-evolution__scenario-grid">
        <article>
          <span>早盘作战计划</span>
          <strong>{{ dailyAutopilot.morningPlan?.liveLane?.strategy || 'RSI_Reversal' }}</strong>
          <p>
            {{ dailyAutopilot.morningPlan?.liveLane?.symbol || 'USDJPYc' }}
            {{ directionZh(dailyAutopilot.morningPlan?.liveLane?.direction || 'LONG') }}；
            阶段仓位 {{ dailyAutopilot.morningPlan?.liveLane?.stageMaxLot ?? 0 }} /
            上限 {{ dailyAutopilot.morningPlan?.liveLane?.maxLot ?? 2 }}
          </p>
        </article>
        <article>
          <span>MT5 模拟日报</span>
          <strong>{{ dailyAutopilot.eveningReview?.mt5ShadowLane?.routeCount || mt5ShadowSummary.routeCount || 0 }} 条路线</strong>
          <p>晋级/强化 {{ dailyAutopilot.eveningReview?.mt5ShadowLane?.promotedCount || 0 }}，暂停 {{ dailyAutopilot.eveningReview?.mt5ShadowLane?.pausedCount || 0 }}，淘汰 {{ dailyAutopilot.eveningReview?.mt5ShadowLane?.rejectedCount || 0 }}</p>
        </article>
        <article>
          <span>Polymarket 日报</span>
          <strong>{{ dailyAutopilot.morningPlan?.polymarketShadowLane?.stageZh || '模拟观察' }}</strong>
          <p>只做模拟账本和事件风险；不连接真钱钱包。</p>
        </article>
        <article>
          <span>今日硬禁止</span>
          <strong>{{ dailyAutopilot.morningPlan?.todayForbiddenZh?.length || 0 }} 项</strong>
          <p>{{ dailyAutopilot.morningPlan?.todayForbiddenZh?.[0] || '新闻、点差、runtime 和快通道门禁不可放宽。' }}</p>
        </article>
      </div>
    </section>

    <section v-if="barReplay" class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--causal">
      <div class="qg-usdjpy-evolution__section-head">
        <div>
          <h3>因果 bar/tick 回放</h3>
          <p>只用当时已存在的 RSI、时段、点差、新闻、冷却和守门状态；未来后验只评分，不触发。</p>
        </div>
        <strong>{{ barReplayStatus }}</strong>
      </div>
      <div class="qg-usdjpy-evolution__scenario-grid">
        <article>
          <span>当前规则</span>
          <strong>{{ causalMetric('entry', 0, 'sampleCount') }} 次</strong>
          <p>净值 {{ causalMetric('entry', 0, 'netR') }}R / 最大不利 {{ causalMetric('entry', 0, 'maxAdverseR') }}R</p>
        </article>
        <article>
          <span>放宽 RSI 一档</span>
          <strong>{{ causalMetric('entry', 1, 'entryCountDelta') }} 次增量</strong>
          <p>净变化 {{ signedMetric(causalMetric('entry', 1, 'netRDelta')) }}R / 结论 {{ conclusionZh(causalMetric('entry', 1, 'conclusion')) }}</p>
        </article>
        <article>
          <span>当前出场</span>
          <strong>{{ ratioMetric(causalMetric('exit', 0, 'profitCaptureRatio')) }}</strong>
          <p>利润捕获率 / 样本 {{ causalMetric('exit', 0, 'sampleCount') }} 次</p>
        </article>
        <article>
          <span>盈利多拿一段</span>
          <strong>{{ ratioMetric(causalMetric('exit', 1, 'profitCaptureRatio')) }}</strong>
          <p>净变化 {{ signedMetric(causalMetric('exit', 1, 'netRDelta')) }}R / 结论 {{ conclusionZh(causalMetric('exit', 1, 'conclusion')) }}</p>
        </article>
      </div>
      <p class="qg-usdjpy-evolution__note">{{ barReplay?.causalReplay?.explanationZh || '后验窗口只能用于评分，不能决定当时是否入场。' }}</p>
    </section>

    <section v-if="scenarioItems.length" class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--scenarios">
      <h3>回放候选对比</h3>
      <div class="qg-usdjpy-evolution__scenario-grid">
        <article v-for="item in scenarioItems" :key="item.scenario">
          <span>{{ item.labelZh || item.scenario }}</span>
          <strong>{{ formatScenarioDelta(item) }}</strong>
          <p>样本 {{ item.sampleCount || 0 }} / {{ item.verdict === 'shadow_only' ? '只进入影子验证' : scenarioVerdictZh(item.verdict) }}</p>
        </article>
      </div>
      <p class="qg-usdjpy-evolution__note">{{ unitPolicy.note || '回放主口径使用 R 倍数，pips 辅助；USC 只作为账面参考。' }}</p>
    </section>

    <section v-if="walkForward" class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--walk-forward">
      <div class="qg-usdjpy-evolution__section-head">
        <div>
          <h3>Walk-forward 稳定性筛选</h3>
          <p>按 train / validation / forward 三段筛掉不稳定候选；后验数据只评分，不能反推当时入场。</p>
        </div>
        <strong>{{ walkForward.statusZh || walkForward.status || '等待筛选' }}</strong>
      </div>
      <div class="qg-usdjpy-evolution__scenario-grid">
        <article v-for="item in walkForwardCandidates" :key="item.variant">
          <span>{{ item.labelZh || item.variant }}</span>
          <strong>{{ conclusionZh(item.conclusion) }}</strong>
          <p>总净变化 {{ signedMetric(item.summary?.netRDelta ?? '—') }}R / forward {{ signedMetric(item.summary?.forwardNetRDelta ?? '—') }}R</p>
        </article>
      </div>
    </section>

    <section v-if="candidateItems.length" class="qg-usdjpy-evolution__list">
      <h3>下一轮 tester-only 参数候选</h3>
      <article v-for="item in candidateItems.slice(0, 4)" :key="item.param">
        <strong>{{ item.param }}</strong>
        <span>{{ item.current }} → {{ item.proposed }}</span>
        <p>{{ item.reason }}</p>
        <p>预期影响：{{ item.expectedImpact || '等待回放补证' }}</p>
        <p>风险变化：{{ item.riskDelta || '未知，禁止直接改实盘' }}</p>
      </article>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  fetchUSDJPYAutonomousAgent,
  fetchUSDJPYAutonomousLanes,
  fetchUSDJPYAutonomousLifecycle,
  fetchUSDJPYBarReplayStatus,
  fetchUSDJPYDailyAutopilotV2,
  fetchUSDJPYEaReproducibility,
  fetchUSDJPYEvolutionStatus,
  fetchUSDJPYMt5ShadowLane,
  fetchUSDJPYPolymarketShadowLane,
  fetchUSDJPYWalkForwardStatus,
  runUSDJPYAutonomousAgent,
  runUSDJPYBarReplayBuild,
  runUSDJPYDailyAutopilotV2,
  runUSDJPYEvolutionBuild,
  runUSDJPYConfigProposal,
  runUSDJPYParamTuning,
  runUSDJPYReplayReport,
  runUSDJPYWalkForwardBuild,
} from '../services/usdjpyStrategyLabApi.js';

const payload = ref(null);
const barReplay = ref(null);
const walkForward = ref(null);
const autonomousAgent = ref(null);
const lifecyclePayload = ref(null);
const lanesPayload = ref(null);
const mt5ShadowPayload = ref(null);
const polymarketShadowPayload = ref(null);
const eaReproPayload = ref(null);
const dailyAutopilot = ref(null);
const loading = ref(false);
const error = ref('');

const dataset = computed(() => payload.value?.dataset || {});
const replay = computed(() => payload.value?.replay || {});
const tuning = computed(() => payload.value?.tuning || {});
const proposal = computed(() => payload.value?.proposal || {});
const datasetSummary = computed(() => dataset.value?.summary || {});
const replaySummary = computed(() => replay.value?.summary || {});
const tuningSummary = computed(() => tuning.value?.summary || {});
const candidateItems = computed(() => (Array.isArray(tuning.value?.candidates) ? tuning.value.candidates : []));
const scenarioItems = computed(() => (Array.isArray(replay.value?.scenarioComparisons) ? replay.value.scenarioComparisons : []));
const unitPolicy = computed(() => replay.value?.unitPolicy || {});
const replayStatus = computed(() => replay.value?.statusZh || replay.value?.status || '等待回放');
const barReplayStatus = computed(() => barReplay.value?.statusZh || barReplay.value?.status || '等待因果回放');
const walkForwardCandidates = computed(() => (Array.isArray(walkForward.value?.candidates) ? walkForward.value.candidates : []));
const agentPatch = computed(() => autonomousAgent.value?.currentPatch || {});
const agentLimits = computed(() => agentPatch.value?.limits || {});
const patchWritable = computed(() => Boolean(autonomousAgent.value?.patchWritable ?? autonomousAgent.value?.patchAllowed));
const autonomousLifecycle = computed(() => lifecyclePayload.value || autonomousAgent.value?.autonomousLifecycle || {});
const centAccount = computed(() => autonomousAgent.value?.centAccount || autonomousLifecycle.value?.centAccount || {});
const lanes = computed(() => lanesPayload.value?.lanes || autonomousAgent.value?.lanes || autonomousLifecycle.value?.lanes || null);
const liveLane = computed(() => lanes.value?.live || {});
const mt5Shadow = computed(() => mt5ShadowPayload.value || lanes.value?.mt5Shadow || {});
const polymarketShadow = computed(() => polymarketShadowPayload.value || lanes.value?.polymarketShadow || {});
const mt5ShadowSummary = computed(() => mt5Shadow.value?.summary || {});
const polymarketSummary = computed(() => polymarketShadow.value?.summary || {});
const eaRepro = computed(() => eaReproPayload.value || autonomousAgent.value?.eaReproducibility || autonomousLifecycle.value?.eaReproducibility || {});
const rollbackBlockers = computed(() => {
  const rollback = agentPatch.value?.rollback || {};
  return Array.isArray(rollback.hardBlockers) ? rollback.hardBlockers : [];
});
const patchChangeText = computed(() => {
  const changes = agentPatch.value?.changes || {};
  const entries = Object.entries(changes);
  if (!entries.length) return '没有可写入变更；继续 shadow/tester/paper 观察。';
  return entries.map(([key, value]) => `${key}=${value}`).join(' / ');
});

function formatScenarioDelta(item) {
  if (item.scenario === 'current') return item.netR == null ? '基准待补样本' : `${item.netR}R`;
  if (item.netRDelta == null) return '需要补回放';
  return `${item.netRDelta > 0 ? '+' : ''}${item.netRDelta}R`;
}

function scenarioVerdictZh(verdict) {
  const map = {
    baseline: '当前基准',
    needs_bar_replay: '需要 bar/tick 回放',
    no_action: '暂无动作',
  };
  return map[verdict] || verdict || '待验证';
}

function causalVariant(group, index) {
  const source = group === 'exit' ? barReplay.value?.exitComparison : barReplay.value?.entryComparison;
  const variants = Array.isArray(source?.variants) ? source.variants : [];
  return variants[index]?.metrics || {};
}

function causalMetric(group, index, key) {
  const value = causalVariant(group, index)[key];
  return value == null || value === '' ? '—' : value;
}

function signedMetric(value) {
  if (value === '—') return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return `${numeric > 0 ? '+' : ''}${numeric}`;
}

function ratioMetric(value) {
  if (value === '—') return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return `${Math.round(numeric * 100)}%`;
}

function conclusionZh(value) {
  const map = {
    REJECTED: '拒绝',
    SHADOW: '模拟观察',
    FAST_SHADOW: '快速模拟',
    SHADOW_ONLY: '只进影子',
    TESTER_ONLY: '只进测试器',
    PAPER_LIVE_SIM: '实盘行情干跑',
    MICRO_LIVE: '极小仓实盘',
    LIVE_LIMITED: '限制实盘',
    PAUSED: '暂停',
    ROLLBACK: '自动回滚',
    QUARANTINED: '隔离',
    PAPER_CONTEXT: '事件参考',
    LIVE_CONFIG_PROPOSAL_ELIGIBLE: '可进配置提案',
  };
  return map[value] || value || '待补样本';
}

function directionZh(value) {
  const text = String(value || '').toUpperCase();
  if (text === 'LONG' || text === 'BUY') return '买入';
  if (text === 'SHORT' || text === 'SELL') return '卖出';
  return value || '—';
}

function assignLoaded(results) {
  payload.value = results.evolutionPayload;
  barReplay.value = results.causalPayload;
  walkForward.value = results.walkForwardPayload;
  autonomousAgent.value = results.autonomousPayload;
  lifecyclePayload.value = results.lifecycle;
  lanesPayload.value = results.lanesState;
  mt5ShadowPayload.value = results.mt5ShadowState;
  polymarketShadowPayload.value = results.polymarketShadowState;
  eaReproPayload.value = results.eaReproState;
  dailyAutopilot.value = results.dailyState;
}

async function loadAll() {
  const [
    evolutionPayload,
    causalPayload,
    walkForwardPayload,
    autonomousPayload,
    lifecycle,
    lanesState,
    mt5ShadowState,
    polymarketShadowState,
    eaReproState,
    dailyState,
  ] = await Promise.all([
    fetchUSDJPYEvolutionStatus(),
    fetchUSDJPYBarReplayStatus(),
    fetchUSDJPYWalkForwardStatus(),
    fetchUSDJPYAutonomousAgent(),
    fetchUSDJPYAutonomousLifecycle(),
    fetchUSDJPYAutonomousLanes(),
    fetchUSDJPYMt5ShadowLane(),
    fetchUSDJPYPolymarketShadowLane(),
    fetchUSDJPYEaReproducibility(),
    fetchUSDJPYDailyAutopilotV2(),
  ]);
  assignLoaded({ evolutionPayload, causalPayload, walkForwardPayload, autonomousPayload, lifecycle, lanesState, mt5ShadowState, polymarketShadowState, eaReproState, dailyState });
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    await loadAll();
  } catch (err) {
    error.value = err?.message || 'USDJPY 自学习闭环加载失败';
  } finally {
    loading.value = false;
  }
}

async function runAutonomousGovernance() {
  loading.value = true;
  error.value = '';
  try {
    await runUSDJPYWalkForwardBuild();
    autonomousAgent.value = await runUSDJPYAutonomousAgent();
    walkForward.value = await fetchUSDJPYWalkForwardStatus();
    lifecyclePayload.value = await fetchUSDJPYAutonomousLifecycle({ refresh: true });
    lanesPayload.value = await fetchUSDJPYAutonomousLanes({ refresh: true });
  } catch (err) {
    error.value = err?.message || 'USDJPY 自主治理运行失败';
  } finally {
    loading.value = false;
  }
}

async function runDailyAutopilotV2() {
  loading.value = true;
  error.value = '';
  try {
    dailyAutopilot.value = await runUSDJPYDailyAutopilotV2();
  } catch (err) {
    error.value = err?.message || 'USDJPY 自动日报生成失败';
  } finally {
    loading.value = false;
  }
}

async function runCausalReplay() {
  loading.value = true;
  error.value = '';
  try {
    barReplay.value = await runUSDJPYBarReplayBuild();
  } catch (err) {
    error.value = err?.message || 'USDJPY 因果回放生成失败';
  } finally {
    loading.value = false;
  }
}

async function runFullEvolution() {
  loading.value = true;
  error.value = '';
  try {
    await runUSDJPYEvolutionBuild();
    await runUSDJPYReplayReport();
    await runUSDJPYBarReplayBuild();
    await runUSDJPYWalkForwardBuild();
    await runUSDJPYParamTuning();
    await runUSDJPYConfigProposal();
    await runUSDJPYAutonomousAgent();
    await runUSDJPYDailyAutopilotV2();
    await loadAll();
  } catch (err) {
    error.value = err?.message || 'USDJPY 自学习闭环生成失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.qg-usdjpy-evolution {
  border: 1px solid rgba(80, 171, 255, 0.35);
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(8, 29, 53, 0.96), rgba(8, 18, 34, 0.98));
  padding: 22px;
  color: #eaf2ff;
}

.qg-usdjpy-evolution__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.qg-usdjpy-evolution__eyebrow {
  margin: 0 0 6px;
  color: #7ecbff;
  font-size: 13px;
  font-weight: 800;
}

.qg-usdjpy-evolution h2,
.qg-usdjpy-evolution h3,
.qg-usdjpy-evolution p {
  margin: 0;
}

.qg-usdjpy-evolution__header p:not(.qg-usdjpy-evolution__eyebrow) {
  color: #aebbd0;
  margin-top: 8px;
}

.qg-usdjpy-evolution__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.qg-usdjpy-evolution button {
  border: 1px solid rgba(126, 203, 255, 0.45);
  border-radius: 12px;
  background: rgba(12, 39, 66, 0.9);
  color: #dff2ff;
  padding: 10px 14px;
  font-weight: 800;
}

.qg-usdjpy-evolution__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}

.qg-usdjpy-evolution__card,
.qg-usdjpy-evolution__list article {
  border: 1px solid rgba(145, 170, 210, 0.22);
  border-radius: 14px;
  background: rgba(6, 18, 34, 0.7);
  padding: 16px;
  min-width: 0;
}

.qg-usdjpy-evolution__card span {
  color: #aebbd0;
  font-weight: 700;
}

.qg-usdjpy-evolution__card strong {
  display: block;
  margin-top: 8px;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.1;
}

.qg-usdjpy-evolution__card p,
.qg-usdjpy-evolution__list p,
.qg-usdjpy-evolution__list span {
  color: #aebbd0;
  margin-top: 8px;
}

.qg-usdjpy-evolution__list {
  margin-top: 18px;
  display: grid;
  gap: 10px;
}

.qg-usdjpy-evolution__section-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.qg-usdjpy-evolution__section-head > strong {
  border: 1px solid rgba(126, 203, 255, 0.35);
  border-radius: 999px;
  color: #bfe7ff;
  padding: 8px 12px;
  white-space: nowrap;
}

.qg-usdjpy-evolution__section-head p {
  color: #aebbd0;
  margin-top: 6px;
}

.qg-usdjpy-evolution__scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
}

.qg-usdjpy-evolution__note {
  color: #8ea3bd;
  font-size: 14px;
}

.qg-usdjpy-evolution__state {
  border: 1px solid rgba(145, 170, 210, 0.22);
  border-radius: 14px;
  padding: 18px;
  color: #aebbd0;
}

.qg-usdjpy-evolution__state--error {
  color: #ffb3bd;
}

@media (max-width: 720px) {
  .qg-usdjpy-evolution__header {
    flex-direction: column;
  }
}
</style>
