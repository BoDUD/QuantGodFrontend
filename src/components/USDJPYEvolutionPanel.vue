<template>
  <section class="qg-usdjpy-evolution">
    <header class="qg-usdjpy-evolution__header">
      <div>
        <p class="qg-usdjpy-evolution__eyebrow">USDJPY 自学习闭环</p>
        <h2>数据集、回放、Walk-forward 与自主治理</h2>
        <p>
          每天把 EA
          守门、错失机会、过早出场和参数候选整理成证据；无需人工审批，但必须通过机器硬风控和自动回滚。
        </p>
      </div>
      <div class="qg-usdjpy-evolution__actions">
        <button type="button" :disabled="loading" @click="load">刷新</button>
        <button type="button" :disabled="loading" @click="runCausalReplay">生成因果回放</button>
        <button type="button" :disabled="loading" @click="runAutonomousGovernance">运行自主治理</button>
        <button type="button" :disabled="loading" @click="runDailyAutopilotV2">生成自动日报</button>
        <button type="button" :disabled="loading" @click="runFullEvolution">生成复盘闭环</button>
        <button type="button" :disabled="loading" @click="runStrategyBacktest">运行策略回测</button>
        <button type="button" :disabled="loading" @click="runEvidenceOS">生成证据 OS</button>
        <button type="button" :disabled="loading" @click="runGAGeneration">运行 GA 一代</button>
      </div>
    </header>

    <div
      v-if="actionStatus"
      class="qg-usdjpy-evolution__action-result"
      :class="`qg-usdjpy-evolution__action-result--${actionStatus.kind}`"
      role="status"
    >
      <div>
        <strong>{{ actionStatus.title }}</strong>
        <span>{{ actionStatus.time }}</span>
      </div>
      <p>{{ actionStatus.summary }}</p>
    </div>

    <div v-if="loading" class="qg-usdjpy-evolution__state">正在读取 USDJPY 自学习证据...</div>
    <div v-else-if="error" class="qg-usdjpy-evolution__state qg-usdjpy-evolution__state--error">
      {{ error }}
    </div>
    <div v-else class="qg-usdjpy-evolution__grid">
      <article class="qg-usdjpy-evolution__card">
        <span>运行数据集</span>
        <strong>{{ datasetSummary.sampleCount || 0 }}</strong>
        <p>
          准入 {{ datasetSummary.readySignalCount || 0 }} / 实盘 {{ datasetSummary.actualEntryCount || 0 }} /
          阻断 {{ datasetSummary.blockedCount || 0 }}
        </p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>回放复盘</span>
        <strong>{{ replayStatus }}</strong>
        <p>
          错失 {{ replaySummary.missedOpportunityCount || 0 }} / 过早出场
          {{ replaySummary.earlyExitCount || 0 }}
        </p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>参数候选</span>
        <strong>{{ tuningSummary.candidateCount || 0 }}</strong>
        <p>{{ tuning?.statusZh || '等待回放数据生成候选' }}</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>自主治理 Agent</span>
        <strong>{{
          autonomousAgent?.stageZh || autonomousAgent?.stage || proposal?.statusZh || '等待治理门'
        }}</strong>
        <p>{{ patchWritable ? '已允许写入受控 patch' : '未放行 patch' }}；不会改源码或 live preset。</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>美分账户</span>
        <strong
          >{{ centAccount.accountMode || 'cent' }} / {{ centAccount.accountCurrencyUnit || 'USC' }}</strong
        >
        <p>
          加速 {{ centAccount.centAccountAcceleration ? '开启' : '关闭' }}；最大
          {{ centAccount.maxLot ?? 2 }} 是上限，不是固定仓位。
        </p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>MT5 模拟车道</span>
        <strong>{{ mt5ShadowSummary.routeCount || 0 }} 条路线</strong>
        <p>
          快速模拟 {{ mt5ShadowSummary.fastShadow || 0 }} / 测试器 {{ mt5ShadowSummary.testerOnly || 0 }} /
          暂停 {{ mt5ShadowSummary.paused || 0 }}
        </p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>Polymarket 模拟车道</span>
        <strong>{{ polymarketShadow.stageZh || polymarketShadow.stage || '模拟观察' }}</strong>
        <p>模拟 PF {{ polymarketSummary.shadowProfitFactor ?? 0 }}；真实钱包和下单永远关闭。</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>新闻门禁</span>
        <strong>{{ newsGate.riskLevel || 'UNKNOWN' }}</strong>
        <p>{{ newsGate.reasonZh || '默认 SOFT：普通新闻只降仓，高冲击新闻才阻断。' }}</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>EA 对账</span>
        <strong>{{ eaRepro.statusZh || '等待对账' }}</strong>
        <p>源码 / ex5 / preset hash 只读校验；Watchlist 期望 USDJPY-only。</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>Daily Autopilot 2.0</span>
        <strong>{{
          statusZh(agentDailyTodo?.status || dailyAutopilot?.dailyTodo?.status, '等待生成日报')
        }}</strong>
        <p>
          {{
            agentDailyTodo?.summaryZh ||
            dailyAutopilot?.dailyTodo?.summaryZh ||
            'Agent 自动生成早盘计划、今日待办和夜盘复盘。'
          }}
        </p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>下一阶段任务</span>
        <strong>{{ statusZh(nextPhaseTodos.status, '等待下一阶段') }}</strong>
        <p>Strategy JSON、GA Trace 与独立 Telegram Gateway 已接入；下一步聚焦真实样本和 parity 深化。</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>Strategy JSON 回测</span>
        <strong>{{ strategyBacktestMetrics.netR ?? 0 }}R</strong>
        <p>
          交易 {{ strategyBacktestMetrics.tradeCount ?? 0 }} / PF
          {{ strategyBacktestMetrics.profitFactor ?? 0 }} / 最大回撤
          {{ strategyBacktestMetrics.maxDrawdownR ?? 0 }}R
        </p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>真实 K线入库</span>
        <strong>{{ h1BarCount }} 根 H1</strong>
        <p>
          M15 {{ klineCounts.M15 || 0 }} / H4 {{ klineCounts.H4 || 0 }} / D1 {{ klineCounts.D1 || 0 }}；只同步
          USDJPY。
        </p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>Parity 校验</span>
        <strong>{{ parityStatus }}</strong>
        <p>Strategy JSON / Python Replay / MQL5 EA 口径审计，不通过不能晋级。</p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>执行反馈</span>
        <strong>{{ executionGateStatusZh }}</strong>
        <p>
          样本 {{ executionMetrics.feedbackRows || 0 }} / 阻断
          {{ executionBlockers.length }} / 警告 {{ executionWarnings.length }}
        </p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>Case Memory</span>
        <strong>{{ caseMemory.caseCount || 0 }}</strong>
        <p>
          {{ caseMemory.queuedForGA || 0 }} 个经验进入 GA；标准 seed hint
          {{ gaSeedHints.length }} 条。
        </p>
      </article>
      <article class="qg-usdjpy-evolution__card">
        <span>Telegram Gateway</span>
        <strong>{{ telegramGateway.pendingCount || 0 }} 待投递</strong>
        <p>
          已投递 {{ telegramGateway.deliveredCount || 0 }}；队列 {{ telegramGateway.queuedCount || 0 }}；去重、限频、
          ledger 已接入。
        </p>
      </article>
    </div>

    <section v-if="lanes" class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--lanes">
      <div class="qg-usdjpy-evolution__section-head">
        <div>
          <h3>三车道自主生命周期</h3>
          <p>实盘要窄，模拟要宽，升降级要快，回滚要硬。</p>
        </div>
        <strong>{{
          autonomousLifecycle?.singleSourceOfTruth || 'USDJPY_LIVE_LOOP_WITH_AUTONOMOUS_LIFECYCLE'
        }}</strong>
      </div>
      <div class="qg-usdjpy-evolution__scenario-grid">
        <article>
          <span>Live Lane</span>
          <strong
            >{{ liveLane.strategy || 'RSI_Reversal' }} /
            {{ directionZh(liveLane.direction || 'LONG') }}</strong
          >
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
          <p>
            {{
              rollbackBlockers[0] || '连续亏损、日亏损、快通道、runtime、点差和高冲击新闻是不可放宽硬门禁。'
            }}
          </p>
        </article>
      </div>
      <p class="qg-usdjpy-evolution__note">
        MT5 Shadow 第一名不会抢实盘路线；Polymarket 永远不接真钱钱包；DeepSeek 只解释，不批准越权。
      </p>
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
          <p>
            {{ rollbackBlockers[0] || '连续亏损、日亏损、快通道、runtime、点差和高冲击新闻仍是硬门禁。' }}
          </p>
        </article>
        <article>
          <span>仓位上限</span>
          <strong>{{ agentLimits.stageMaxLot ?? 0 }} / {{ agentLimits.maxLot ?? 2 }}</strong>
          <p>当前阶段 / 系统上限；最大 2.0 只是上限，不是固定仓位。</p>
        </article>
      </div>
      <p class="qg-usdjpy-evolution__note">
        DeepSeek 只解释晋级和回滚原因，不能批准
        live、不能取消回滚、不能提高最大仓位、不能放宽点差/runtime/高冲击新闻门禁。
      </p>
    </section>

    <section v-if="dailyAutopilot" class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--daily">
      <div class="qg-usdjpy-evolution__section-head">
        <div>
          <h3>Daily Autopilot 2.0</h3>
          <p>自动中文早盘计划、Agent 今日待办和每日复盘；已完成事项由 Agent 自动闭环。</p>
        </div>
        <strong>{{
          agentDailyTodo?.status ||
          dailyAutopilot.dailyTodo?.status ||
          dailyAutopilot.autonomousAgent?.stageZh ||
          '自主评估'
        }}</strong>
      </div>
      <div class="qg-usdjpy-evolution__scenario-grid">
        <article>
          <span>Agent 今日待办</span>
          <strong>{{
            agentDailyTodo?.completedByAgent || dailyAutopilot.dailyTodo?.completedByAgent
              ? '已自动完成'
              : '等待 Agent'
          }}</strong>
          <p>
            {{ dailyTodoItems.length }} 项；
            {{
              agentDailyTodo?.autoAppliedByAgent || dailyAutopilot.dailyTodo?.autoAppliedByAgent
                ? '已自动推动阶段/patch'
                : '无需自动推动'
            }}；
            {{
              agentDailyTodo?.rollbackTriggered || dailyAutopilot.dailyTodo?.rollbackTriggered
                ? '已触发回滚'
                : '未触发回滚'
            }}
          </p>
        </article>
        <article>
          <span>Agent 每日复盘</span>
          <strong>{{
            agentDailyReview?.completedByAgent || dailyAutopilot.dailyReview?.completedByAgent
              ? '已自动复盘'
              : '等待复盘'
          }}</strong>
          <p>
            净 R {{ metricText(dailyReviewMetrics.netR) }}； 最大不利
            {{ metricText(dailyReviewMetrics.maxAdverseR, 'R') }}； 错失
            {{ metricText(dailyReviewMetrics.missedOpportunity) }}
          </p>
        </article>
        <article>
          <span>早盘作战计划</span>
          <strong>{{ dailyAutopilot.morningPlan?.liveLane?.strategy || 'RSI_Reversal' }}</strong>
          <p>
            {{ dailyAutopilot.morningPlan?.liveLane?.symbol || 'USDJPYc' }}
            {{ directionZh(dailyAutopilot.morningPlan?.liveLane?.direction || 'LONG') }}； 阶段仓位
            {{ dailyAutopilot.morningPlan?.liveLane?.stageMaxLot ?? 0 }} / 上限
            {{ dailyAutopilot.morningPlan?.liveLane?.maxLot ?? 2 }}
          </p>
        </article>
        <article>
          <span>MT5 模拟日报</span>
          <strong
            >{{
              dailyAutopilot.eveningReview?.mt5ShadowLane?.routeCount || mt5ShadowSummary.routeCount || 0
            }}
            条路线</strong
          >
          <p>
            晋级/强化 {{ dailyAutopilot.eveningReview?.mt5ShadowLane?.promotedCount || 0 }}，暂停
            {{ dailyAutopilot.eveningReview?.mt5ShadowLane?.pausedCount || 0 }}，淘汰
            {{ dailyAutopilot.eveningReview?.mt5ShadowLane?.rejectedCount || 0 }}
          </p>
        </article>
        <article>
          <span>Polymarket 日报</span>
          <strong>{{ dailyAutopilot.morningPlan?.polymarketShadowLane?.stageZh || '模拟观察' }}</strong>
          <p>只做模拟账本和事件风险；不连接真钱钱包。</p>
        </article>
        <article>
          <span>今日硬禁止</span>
          <strong>{{ dailyAutopilot.morningPlan?.todayForbiddenZh?.length || 0 }} 项</strong>
          <p>
            {{
              dailyAutopilot.morningPlan?.todayForbiddenZh?.[0] ||
              '高冲击新闻、点差、runtime 和快通道门禁不可放宽。'
            }}
          </p>
        </article>
        <article>
          <span>新闻门禁日报</span>
          <strong>{{ dailyAutopilot.morningPlan?.newsGate?.mode || newsGate.mode || 'SOFT' }}</strong>
          <p>
            {{
              dailyAutopilot.morningPlan?.newsGate?.reasonZh ||
              newsGate.reasonZh ||
              '普通新闻不阻断，只降仓；高冲击新闻硬阻断。'
            }}
          </p>
        </article>
        <article>
          <span>下一阶段任务</span>
          <strong>{{ statusZh(nextPhaseTodos.status, 'Agent 已接入') }}</strong>
          <p>Strategy JSON / GA Evolution / Telegram Gateway 已接入；后续继续补真实样本、parity 和执行质量。</p>
        </article>
      </div>
      <div v-if="dailyTodoItems.length" class="qg-usdjpy-evolution__mini-list">
        <article v-for="item in dailyTodoItems.slice(0, 6)" :key="item.id">
          <span>{{ item.laneZh || item.lane }}</span>
          <strong>{{ statusZh(item.status) }}</strong>
          <p>{{ item.summaryZh }}</p>
        </article>
      </div>
      <div v-if="nextPhaseItems.length" class="qg-usdjpy-evolution__mini-list">
        <article v-for="item in nextPhaseItems" :key="item.id">
          <span>{{ item.titleZh || item.id }}</span>
          <strong>{{ statusZh(item.status) }}</strong>
          <p>{{ item.summaryZh }}</p>
        </article>
      </div>
    </section>

    <section v-if="barReplay" class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--causal">
      <div class="qg-usdjpy-evolution__section-head">
        <div>
          <h3>因果 bar/tick 回放</h3>
          <p>只用当时已存在的 RSI、时段、点差、新闻风险、冷却和守门状态；未来后验只评分，不触发。</p>
        </div>
        <strong>{{ barReplayStatus }}</strong>
      </div>
      <div class="qg-usdjpy-evolution__scenario-grid">
        <article>
          <span>当前规则</span>
          <strong>{{ causalMetric('entry', 0, 'sampleCount') }} 次</strong>
          <p>
            净值 {{ causalMetric('entry', 0, 'netR') }}R / 最大不利
            {{ causalMetric('entry', 0, 'maxAdverseR') }}R
          </p>
        </article>
        <article>
          <span>放宽 RSI 一档</span>
          <strong>{{ causalMetric('entry', 1, 'entryCountDelta') }} 次增量</strong>
          <p>
            净变化 {{ signedMetric(causalMetric('entry', 1, 'netRDelta')) }}R / 结论
            {{ conclusionZh(causalMetric('entry', 1, 'conclusion')) }}
          </p>
        </article>
        <article>
          <span>当前出场</span>
          <strong>{{ ratioMetric(causalMetric('exit', 0, 'profitCaptureRatio')) }}</strong>
          <p>利润捕获率 / 样本 {{ causalMetric('exit', 0, 'sampleCount') }} 次</p>
        </article>
        <article>
          <span>盈利多拿一段</span>
          <strong>{{ ratioMetric(causalMetric('exit', 1, 'profitCaptureRatio')) }}</strong>
          <p>
            净变化 {{ signedMetric(causalMetric('exit', 1, 'netRDelta')) }}R / 结论
            {{ conclusionZh(causalMetric('exit', 1, 'conclusion')) }}
          </p>
        </article>
      </div>
      <p class="qg-usdjpy-evolution__note">
        {{ barReplay?.causalReplay?.explanationZh || '后验窗口只能用于评分，不能决定当时是否入场。' }}
      </p>
    </section>

    <section v-if="newsGateReplay" class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--news">
      <div class="qg-usdjpy-evolution__section-head">
        <div>
          <h3>新闻门禁回放</h3>
          <p>比较普通新闻硬挡、软降仓、只挡高冲击和影子忽略新闻；不自动修改实盘 preset。</p>
        </div>
        <strong>{{ newsGateReplay.recommendationZh || '默认 SOFT' }}</strong>
      </div>
      <div class="qg-usdjpy-evolution__mini-list">
        <article v-for="variant in newsGateVariants" :key="variant.variant">
          <span>{{ variant.labelZh || variant.variant }}</span>
          <strong>{{ variant.recommendation || '待评估' }}</strong>
          <p>
            净 R 变化 {{ signedMetric(variant.netRDelta ?? 0) }}；最大不利变化
            {{ signedMetric(variant.maxAdverseRDelta ?? 0) }}
          </p>
        </article>
      </div>
    </section>

    <section class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--evidence-os">
      <div class="qg-usdjpy-evolution__section-head">
        <div>
          <h3>执行反馈、Case Memory 与下一代 GA</h3>
          <p>
            真实成交、拒单、滑点、延迟和 policy 偏离会先进入执行反馈晋级门；异常再转成 Case Memory，
            最后喂给下一代 Strategy JSON GA。
          </p>
        </div>
        <strong>{{ executionGateStatusZh }}</strong>
      </div>
      <div class="qg-usdjpy-evolution__scenario-grid">
        <article>
          <span>三方 Parity</span>
          <strong>{{ deepParityStatusZh }}</strong>
          <p>
            {{
              deepParity.reasonZh ||
              parityReport.reasonZh ||
              '等待 Strategy JSON / Python Replay / MQL5 EA 三方证据。'
            }}
          </p>
        </article>
        <article>
          <span>Strategy JSON</span>
          <strong>{{ deepStrategySummary }}</strong>
          <p>{{ deepStrategyGateSummary }}</p>
        </article>
        <article>
          <span>Python Replay</span>
          <strong>{{ deepReplaySummary }}</strong>
          <p>{{ deepReplayGateSummary }}</p>
        </article>
        <article>
          <span>MQL5 EA</span>
          <strong>{{ deepEaSummary }}</strong>
          <p>{{ deepEaGateSummary }}</p>
        </article>
        <article>
          <span>执行晋级门</span>
          <strong>{{ executionPromotionAllowed ? '允许作为晋级证据' : '不允许扩大阶段' }}</strong>
          <p>{{ executionGate.reasonZh || '等待 EA 输出标准化 LiveExecutionFeedback。' }}</p>
        </article>
        <article>
          <span>Agent 动作</span>
          <strong>{{ executionAgentActionZh }}</strong>
          <p>{{ executionFeedback.nextActionZh || '等待真实执行反馈后再评估。' }}</p>
        </article>
        <article>
          <span>执行质量</span>
          <strong>{{ executionMetrics.feedbackQuality || 'MISSING' }}</strong>
          <p>
            拒单 {{ executionMetrics.rejectCount || 0 }} / 滑点
            {{ executionMetrics.avgAbsSlippagePips || 0 }} pips / 延迟
            {{ executionMetrics.avgLatencyMs || 0 }} ms
          </p>
        </article>
        <article>
          <span>Case → GA</span>
          <strong>{{ caseMemoryToGA.queuedHintCount || gaSeedHints.length || 0 }} 条 seed hint</strong>
          <p>{{ caseMemoryToGA.nextActionZh || '等待 Case Memory 生成下一代 Strategy JSON 线索。' }}</p>
        </article>
      </div>
      <div
        v-if="deepParityHardMismatches.length || deepParityMissingOptional.length"
        class="qg-usdjpy-evolution__mini-list"
      >
        <article v-for="item in deepParityHardMismatches.slice(0, 6)" :key="`parity-hard-${item}`">
          <span>Parity 硬差异</span>
          <strong>{{ item }}</strong>
          <p>该差异会阻断策略晋级，直到 Strategy JSON / Python Replay / MQL5 EA 口径重新一致。</p>
        </article>
        <article v-for="item in deepParityMissingOptional.slice(0, 6)" :key="`parity-missing-${item}`">
          <span>Parity 缺字段</span>
          <strong>{{ item }}</strong>
          <p>这是审计提醒，不会单独阻断；建议后续让 EA 或 replay 输出补齐。</p>
        </article>
      </div>
      <div v-if="executionBlockers.length || executionWarnings.length" class="qg-usdjpy-evolution__mini-list">
        <article v-for="item in executionBlockers.slice(0, 4)" :key="`block-${item.code}`">
          <span>执行阻断</span>
          <strong>{{ item.code }}</strong>
          <p>{{ item.reasonZh }}</p>
        </article>
        <article v-for="item in executionWarnings.slice(0, 4)" :key="`warn-${item.code}`">
          <span>执行警告</span>
          <strong>{{ item.code }}</strong>
          <p>{{ item.reasonZh }}</p>
        </article>
      </div>
      <div v-if="gaSeedHints.length" class="qg-usdjpy-evolution__table-wrap">
        <table class="qg-usdjpy-evolution__table qg-usdjpy-evolution__table--compact">
          <thead>
            <tr>
              <th>Case</th>
              <th>类型</th>
              <th>优先级</th>
              <th>下一代 GA 变异提示</th>
              <th>原因</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in gaSeedHints.slice(0, 10)" :key="item.caseId || item.mutationHint">
              <td>{{ item.caseId || 'CASE_MEMORY' }}</td>
              <td>{{ item.caseType || 'UNKNOWN' }}</td>
              <td>{{ item.priority || 'MEDIUM' }}</td>
              <td>{{ mutationHintZh(item.mutationHint) }}</td>
              <td>{{ item.reasonZh || '进入下一代 GA shadow 候选。' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="qg-usdjpy-evolution__note">
        这里不下单、不改 live preset；它只决定执行证据是否能支持晋级，以及下一代 GA 该优先修哪类执行或策略问题。
      </p>
    </section>

    <section class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--ga">
      <div class="qg-usdjpy-evolution__section-head">
        <div>
          <h3>GA 全过程审计</h3>
          <p>
            Strategy JSON 种子、generation、fitness、阻断、elite 和下一代路径全部可追踪；只进入 MT5 Shadow /
            Tester / Paper-live-sim。
          </p>
        </div>
        <strong>{{ gaStatus.status || '等待第一代' }}</strong>
      </div>
      <div class="qg-usdjpy-evolution__scenario-grid">
        <article>
          <span>当前代数</span>
          <strong>第 {{ gaStatus.currentGeneration || 0 }} 代</strong>
          <p>种群 {{ gaStatus.populationSize || 0 }} / Elite {{ gaStatus.eliteCount || 0 }}</p>
        </article>
        <article>
          <span>最佳 fitness</span>
          <strong>{{ gaStatus.bestFitness ?? 0 }}</strong>
          <p>{{ gaStatus.bestSeedId || '等待种子评分' }}</p>
        </article>
        <article>
          <span>阻断候选</span>
          <strong>{{ gaStatus.blockedCandidates || 0 }}</strong>
          <p>{{ topGABlocker?.reasonZh || '暂无阻断摘要' }}</p>
        </article>
        <article>
          <span>下一步</span>
          <strong>{{ gaStatus.nextAction ? '已规划' : '等待运行' }}</strong>
          <p>{{ gaStatus.nextAction || '点击“运行 GA 一代”生成全过程 trace。' }}</p>
        </article>
      </div>
      <div v-if="gaPathItems.length" class="qg-usdjpy-evolution__ga-timeline">
        <article v-for="item in gaPathItems.slice(-8)" :key="item.generationId || item.generation">
          <span>第 {{ item.generation }} 代</span>
          <strong>{{ item.bestFitness }}</strong>
          <p>avg {{ item.avgFitness }} / elite {{ item.eliteCount }} / 阻断 {{ item.blockedCount }}</p>
        </article>
      </div>
      <div v-if="gaCandidateItems.length" class="qg-usdjpy-evolution__table-wrap">
        <table class="qg-usdjpy-evolution__table">
          <thead>
            <tr>
              <th>种子</th>
              <th>策略族</th>
              <th>来源</th>
              <th>Fitness</th>
              <th>PF</th>
              <th>胜率</th>
              <th>最大回撤</th>
              <th>Sharpe / Sortino</th>
              <th>交易数</th>
              <th>Parity / 执行</th>
              <th>Rank</th>
              <th>阶段</th>
              <th>阻断原因</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in gaCandidateItems.slice(0, 12)"
              :key="item.seedId"
              :class="`qg-usdjpy-evolution__candidate--${String(item.status || '').toLowerCase()}`"
              @click="selectGASeed(item)"
            >
              <td>{{ item.seedId }}</td>
              <td>{{ item.strategyFamily }} / {{ directionZh(item.direction) }}</td>
              <td>{{ item.source }}</td>
              <td>{{ item.fitness }}</td>
              <td>{{ gaBacktestMetric(item, 'profitFactor') }}</td>
              <td>{{ gaBacktestWinRate(item) }}</td>
              <td>{{ gaBacktestDrawdown(item) }}</td>
              <td>{{ gaBacktestSharpeSortino(item) }}</td>
              <td>{{ gaBacktestMetric(item, 'tradeCount', 0) }}</td>
              <td>{{ gaEvidenceGateSummary(item) }}</td>
              <td>{{ item.rank }}</td>
              <td>{{ statusZh(item.status) }}</td>
              <td>{{ item.blockerZh || '通过' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="selectedGASeed" class="qg-usdjpy-evolution__seed-detail">
        <div
          v-if="selectedGASeedLoading || selectedGASeedError"
          class="qg-usdjpy-evolution__seed-detail-state"
        >
          <span>{{ selectedGASeedLoading ? '正在加载候选完整审计' : '候选审计加载失败' }}</span>
          <p>{{ selectedGASeedError || '正在读取 equity curve、lineage、mutation/crossover 与完整证据链。' }}</p>
        </div>
        <div>
          <span>Seed Detail / 完整审计</span>
          <strong>{{ selectedGASeed.seedId }} / {{ selectedGASeed.strategyId }}</strong>
          <p>{{ gaSourceTrace(selectedGASeed).reasonZh || '等待来源审计。' }}</p>
        </div>
        <div>
          <span>Fitness 分解</span>
          <p>
            netR {{ selectedGASeed.fitnessBreakdown?.netR ?? 0 }}； max adverse
            {{ selectedGASeed.fitnessBreakdown?.maxAdverseR ?? 0 }}； 样本
            {{ selectedGASeed.fitnessBreakdown?.sampleCount ?? 0 }}； 过拟合惩罚
            {{ selectedGASeed.fitnessBreakdown?.overfitPenalty ?? 0 }}
          </p>
        </div>
        <div class="qg-usdjpy-evolution__seed-audit-grid">
          <article class="qg-usdjpy-evolution__equity-card">
            <span>Equity Curve / 权益曲线</span>
            <strong>{{ gaBacktestMetric(selectedGASeed, 'netR') }}R</strong>
            <svg
              v-if="gaEquityPolyline(selectedGASeed)"
              viewBox="0 0 240 72"
              role="img"
              aria-label="GA seed equity curve"
            >
              <polyline :points="gaEquityPolyline(selectedGASeed)" />
            </svg>
            <p v-else>等待候选专属回测 equity curve。</p>
            <p>
              点数 {{ gaBacktestAudit(selectedGASeed).equityPointCount || gaEquityPoints(selectedGASeed).length || 0 }}；
              交易 {{ gaBacktestAudit(selectedGASeed).tradeCount || gaBacktestMetric(selectedGASeed, 'tradeCount', 0) }}
            </p>
          </article>
          <article>
            <span>Lineage / 父代路径</span>
            <strong>{{ gaLineageSummary(selectedGASeed) }}</strong>
            <p>{{ gaLineageAudit(selectedGASeed).reasonZh || '等待 lineage。' }}</p>
            <p>{{ gaLineageParentsText(selectedGASeed) }}</p>
          </article>
          <article>
            <span>Mutation / Crossover 来源</span>
            <strong>{{ gaSourceTrace(selectedGASeed).source || selectedGASeed.source || 'LLM_SEED' }}</strong>
            <p>
              {{ mutationHintZh(gaSourceTrace(selectedGASeed).mutationHint) }}；
              Case {{ gaSourceTrace(selectedGASeed).caseId || '—' }}
            </p>
          </article>
        </div>
        <div
          v-if="gaLineageTreeNodes(selectedGASeed).length"
          class="qg-usdjpy-evolution__lineage-tree"
        >
          <div class="qg-usdjpy-evolution__lineage-tree-head">
            <div>
              <span>Lineage Tree / 进化树</span>
              <strong>{{ gaLineageTreeSummary(selectedGASeed) }}</strong>
              <p>
                Elite path 高亮；默认折叠远端旁支。
                {{ gaLineageTree(selectedGASeed).reasonZh || '展示父代、当前 seed 和子代的 mutation / crossover 路径。' }}
              </p>
            </div>
            <button
              v-if="gaLineageTreeHiddenCount(selectedGASeed)"
              type="button"
              class="qg-usdjpy-evolution__lineage-toggle"
              @click="lineageTreeExpanded = !lineageTreeExpanded"
            >
              {{ lineageTreeExpanded ? '折叠旁支' : `展开全部 lineage（隐藏 ${gaLineageTreeHiddenCount(selectedGASeed)}）` }}
            </button>
          </div>
          <div class="qg-usdjpy-evolution__lineage-levels">
            <article
              v-for="level in gaLineageTreeLevels(selectedGASeed)"
              :key="level.depth"
              class="qg-usdjpy-evolution__lineage-level"
            >
              <span>{{ gaLineageLevelTitle(level.depth) }}</span>
              <div
                v-for="node in level.nodes"
                :key="node.seedId"
                class="qg-usdjpy-evolution__lineage-node"
                :class="{
                  'qg-usdjpy-evolution__lineage-node--selected': node.selected,
                  'qg-usdjpy-evolution__lineage-node--external': node.external,
                  'qg-usdjpy-evolution__lineage-node--elite-path': node.onElitePath,
                  'qg-usdjpy-evolution__lineage-node--elite': node.eliteSelected,
                }"
              >
                <strong>{{ node.seedId }}</strong>
                <p>{{ gaLineageNodeMeta(node) }}</p>
                <em>{{ statusZh(node.status, node.external ? '外部线索' : '等待评分') }}</em>
              </div>
            </article>
          </div>
          <div v-if="gaLineageTreeEdges(selectedGASeed).length" class="qg-usdjpy-evolution__lineage-edges">
            <span>Mutation / Crossover 路径</span>
            <article
              v-for="edge in gaLineageTreeEdges(selectedGASeed)"
              :key="`${edge.from}-${edge.to}-${edge.type}`"
              :class="{ 'qg-usdjpy-evolution__lineage-edge--elite-path': edge.onElitePath }"
            >
              <strong>{{ edge.from }} → {{ edge.to }}</strong>
              <p>{{ lineageEdgeTypeZh(edge.type) }}；{{ edge.reasonZh || 'GA lineage 关联。' }}</p>
            </article>
          </div>
        </div>
        <div class="qg-usdjpy-evolution__seed-metrics">
          <article>
            <span>Strategy JSON 回测证据</span>
            <strong>{{ gaSeedBacktestStatus(selectedGASeed) }}</strong>
            <p>
              PF {{ gaBacktestMetric(selectedGASeed, 'profitFactor') }} / 胜率
              {{ gaBacktestWinRate(selectedGASeed) }} / 交易
              {{ gaBacktestMetric(selectedGASeed, 'tradeCount', 0) }}
            </p>
          </article>
          <article>
            <span>收益与回撤</span>
            <strong>{{ gaBacktestMetric(selectedGASeed, 'netR') }}R</strong>
            <p>
              最大回撤 {{ gaBacktestDrawdown(selectedGASeed) }}；最大不利
              {{ metricText(selectedGASeed.fitnessBreakdown?.maxAdverseR, 'R') }}
            </p>
          </article>
          <article>
            <span>稳定性</span>
            <strong>{{ gaBacktestSharpeSortino(selectedGASeed) }}</strong>
            <p>
              PF 奖励 {{ metricText(selectedGASeed.fitnessBreakdown?.profitFactorBonus) }}；胜率奖励
              {{ metricText(selectedGASeed.fitnessBreakdown?.winRateBonus) }}
            </p>
          </article>
          <article>
            <span>晋级证据</span>
            <strong>{{ gaEvidenceGateSummary(selectedGASeed) }}</strong>
            <p>
              Parity {{ gaSeedParityStatus(selectedGASeed) }}；执行反馈
              {{ gaSeedExecutionStatus(selectedGASeed) }}；Case 惩罚
              {{ metricText(selectedGASeed.fitnessBreakdown?.caseMemory?.penalty) }}
            </p>
          </article>
        </div>
        <div class="qg-usdjpy-evolution__evidence-chain">
          <span>完整证据链</span>
          <article v-for="item in gaEvidenceChain(selectedGASeed)" :key="item.step">
            <strong>{{ item.step }}</strong>
            <em>{{ item.status }}</em>
            <p>{{ item.reasonZh }}</p>
          </article>
        </div>
        <div v-if="gaAuditTrades(selectedGASeed).length" class="qg-usdjpy-evolution__table-wrap">
          <table class="qg-usdjpy-evolution__table qg-usdjpy-evolution__table--compact">
            <thead>
              <tr>
                <th>回测交易</th>
                <th>方向</th>
                <th>入场</th>
                <th>出场</th>
                <th>profitR</th>
                <th>MFE / MAE</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="trade in gaAuditTrades(selectedGASeed).slice(-8)" :key="trade.tradeId">
                <td>{{ trade.tradeId }}</td>
                <td>{{ directionZh(trade.direction) }}</td>
                <td>{{ trade.entryTime }}</td>
                <td>{{ trade.exitReason || trade.exitTime }}</td>
                <td>{{ metricText(trade.profitR, 'R') }}</td>
                <td>{{ metricText(trade.mfeR, 'R') }} / {{ metricText(trade.maeR, 'R') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <pre>{{ strategyJsonPreview(selectedGASeed.strategyJson) }}</pre>
      </div>
      <p class="qg-usdjpy-evolution__note">
        GA 不能直接实盘、不能 MICRO_LIVE、不能修改 live preset、不能提高 maxLot、不能绕过 news / spread /
        runtime / fastlane。
      </p>
    </section>

    <section
      v-if="strategyBacktestReport"
      class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--strategy-backtest"
    >
      <div class="qg-usdjpy-evolution__section-head">
        <div>
          <h3>Strategy JSON 高保真回测</h3>
          <p>
            统一 Strategy JSON 契约读取 USDJPY SQLite K线，输出交易、权益曲线和 GA 可读 fitness evidence。
          </p>
        </div>
        <strong>{{ strategyBacktestReport.evidenceQuality || 'LOW' }}</strong>
      </div>
      <div class="qg-usdjpy-evolution__scenario-grid">
        <article>
          <span>回测策略</span>
          <strong
            >{{ strategyBacktestReport.strategyFamily || 'RSI_Reversal' }} /
            {{ directionZh(strategyBacktestReport.direction || 'LONG') }}</strong
          >
          <p>{{ strategyBacktestReport.strategyId || 'Strategy JSON seed' }}</p>
        </article>
        <article>
          <span>净收益</span>
          <strong>{{ strategyBacktestMetrics.netR ?? 0 }}R</strong>
          <p>
            {{ strategyBacktestMetrics.netPips ?? 0 }} pips / {{ strategyBacktestMetrics.tradeCount ?? 0 }} 笔
          </p>
        </article>
        <article>
          <span>稳定性</span>
          <strong>{{ strategyBacktestMetrics.profitFactor ?? 0 }} PF</strong>
          <p>
            胜率 {{ strategyBacktestMetrics.winRate ?? 0 }}% / 最大回撤
            {{ strategyBacktestMetrics.maxDrawdownR ?? 0 }}R
          </p>
        </article>
        <article>
          <span>风险捕获</span>
          <strong>{{ strategyBacktestMetrics.profitCaptureRatio ?? 0 }}</strong>
          <p>
            Sharpe {{ strategyBacktestMetrics.sharpe ?? 0 }} / Sortino
            {{ strategyBacktestMetrics.sortino ?? 0 }}
          </p>
        </article>
        <article>
          <span>Runner 覆盖</span>
          <strong>{{ backtestCoverageZh }}</strong>
          <p>
            主周期 {{ strategyBacktestEngine.primaryTimeframe || strategyBacktestReport.timeframe || 'H1' }} /
            信号 {{ strategyBacktestEngine.signalCount ?? 0 }}
          </p>
        </article>
        <article>
          <span>交易成本</span>
          <strong>{{ backtestCost.roundTurnPips ?? 0 }} pips</strong>
          <p>
            点差 {{ backtestCost.spreadPips ?? 0 }} / 滑点 {{ backtestCost.slippagePips ?? 0 }} /
            手续 {{ backtestCost.commissionPips ?? 0 }}
          </p>
        </article>
      </div>
      <p class="qg-usdjpy-evolution__note">
        本模块只写 runtime/backtest 的 SQLite、JSON 和 CSV；已覆盖 USDJPY shadow 策略族并向 GA 提供逐 seed
        fitness evidence；不会下单、不会平仓、不会撤单、不会修改 live preset。
      </p>
    </section>

    <section
      v-if="scenarioItems.length"
      class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--scenarios"
    >
      <h3>回放候选对比</h3>
      <div class="qg-usdjpy-evolution__scenario-grid">
        <article v-for="item in scenarioItems" :key="item.scenario">
          <span>{{ item.labelZh || item.scenario }}</span>
          <strong>{{ formatScenarioDelta(item) }}</strong>
          <p>
            样本 {{ item.sampleCount || 0 }} /
            {{ item.verdict === 'shadow_only' ? '只进入影子验证' : scenarioVerdictZh(item.verdict) }}
          </p>
        </article>
      </div>
      <p class="qg-usdjpy-evolution__note">
        {{ unitPolicy.note || '回放主口径使用 R 倍数，pips 辅助；USC 只作为账面参考。' }}
      </p>
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
          <p>
            总净变化 {{ signedMetric(item.summary?.netRDelta ?? '—') }}R / forward
            {{ signedMetric(item.summary?.forwardNetRDelta ?? '—') }}R
          </p>
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
  fetchUSDJPYAgentDailyReview,
  fetchUSDJPYAgentDailyTodo,
  fetchUSDJPYBarReplayStatus,
  fetchUSDJPYDailyAutopilotV2,
  fetchUSDJPYEaReproducibility,
  fetchUSDJPYEvidenceOSStatus,
  fetchUSDJPYEvolutionStatus,
  fetchUSDJPYGABlockers,
  fetchUSDJPYGACandidate,
  fetchUSDJPYGACandidates,
  fetchUSDJPYGAEvolutionPath,
  fetchUSDJPYGAStatus,
  fetchUSDJPYMt5ShadowLane,
  fetchUSDJPYPolymarketShadowLane,
  fetchUSDJPYStrategyBacktestStatus,
  fetchUSDJPYTelegramGatewayStatus,
  fetchUSDJPYWalkForwardStatus,
  runUSDJPYAutonomousAgent,
  runUSDJPYBarReplayBuild,
  runUSDJPYAgentDailyReview,
  runUSDJPYAgentDailyTodo,
  runUSDJPYDailyAutopilotV2,
  runUSDJPYEvidenceOS,
  runUSDJPYEvolutionBuild,
  runUSDJPYGAGeneration,
  runUSDJPYConfigProposal,
  runUSDJPYParamTuning,
  runUSDJPYReplayReport,
  runUSDJPYStrategyBacktest,
  runUSDJPYWalkForwardBuild,
  syncUSDJPYStrategyBacktestKlines,
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
const agentDailyTodo = ref(null);
const agentDailyReview = ref(null);
const gaPayload = ref(null);
const gaCandidatesPayload = ref(null);
const gaPathPayload = ref(null);
const gaBlockersPayload = ref(null);
const strategyBacktestPayload = ref(null);
const evidenceOSPayload = ref(null);
const telegramGatewayPayload = ref(null);
const selectedGASeed = ref(null);
const selectedGASeedLoading = ref(false);
const selectedGASeedError = ref('');
const lineageTreeExpanded = ref(false);
const loading = ref(false);
const error = ref('');
const actionStatus = ref(null);

const dataset = computed(() => payload.value?.dataset || {});
const replay = computed(() => payload.value?.replay || {});
const tuning = computed(() => payload.value?.tuning || {});
const proposal = computed(() => payload.value?.proposal || {});
const datasetSummary = computed(() => dataset.value?.summary || {});
const replaySummary = computed(() => replay.value?.summary || {});
const tuningSummary = computed(() => tuning.value?.summary || {});
const candidateItems = computed(() =>
  Array.isArray(tuning.value?.candidates) ? tuning.value.candidates : [],
);
const scenarioItems = computed(() =>
  Array.isArray(replay.value?.scenarioComparisons) ? replay.value.scenarioComparisons : [],
);
const unitPolicy = computed(() => replay.value?.unitPolicy || {});
const replayStatus = computed(() => replay.value?.statusZh || replay.value?.status || '等待回放');
const barReplayStatus = computed(
  () => barReplay.value?.statusZh || barReplay.value?.status || '等待因果回放',
);
const walkForwardCandidates = computed(() =>
  Array.isArray(walkForward.value?.candidates) ? walkForward.value.candidates : [],
);
const agentPatch = computed(() => autonomousAgent.value?.currentPatch || {});
const agentLimits = computed(() => agentPatch.value?.limits || {});
const patchWritable = computed(() => Boolean(autonomousAgent.value?.patchWritable));
const autonomousLifecycle = computed(
  () => lifecyclePayload.value || autonomousAgent.value?.autonomousLifecycle || {},
);
const centAccount = computed(
  () => autonomousAgent.value?.centAccount || autonomousLifecycle.value?.centAccount || {},
);
const lanes = computed(
  () => lanesPayload.value?.lanes || autonomousAgent.value?.lanes || autonomousLifecycle.value?.lanes || null,
);
const liveLane = computed(() => lanes.value?.live || {});
const mt5Shadow = computed(() => mt5ShadowPayload.value || lanes.value?.mt5Shadow || {});
const polymarketShadow = computed(() => polymarketShadowPayload.value || lanes.value?.polymarketShadow || {});
const mt5ShadowSummary = computed(() => mt5Shadow.value?.summary || {});
const polymarketSummary = computed(() => polymarketShadow.value?.summary || {});
const newsGate = computed(
  () => dailyAutopilot.value?.newsGate || payload.value?.policy?.newsGate || barReplay.value?.newsGate || {},
);
const newsGateReplay = computed(() => barReplay.value?.newsGateReplay || null);
const newsGateVariants = computed(() => {
  const variants = newsGateReplay.value?.variants || [];
  return Array.isArray(variants) ? variants : [];
});
const gaStatus = computed(() => gaPayload.value?.status || {});
const gaCandidateItems = computed(() => {
  const rows = gaCandidatesPayload.value?.candidates || [];
  return Array.isArray(rows) ? rows : [];
});
const gaPathItems = computed(() => {
  const rows = gaPathPayload.value?.generations || gaPayload.value?.evolutionPath?.generations || [];
  return Array.isArray(rows) ? rows : [];
});
const gaBlockerItems = computed(() => {
  const rows = gaBlockersPayload.value?.summary || gaPayload.value?.blockers?.summary || [];
  return Array.isArray(rows) ? rows : [];
});
const topGABlocker = computed(
  () => gaBlockerItems.value.find((item) => item?.blockerCode !== 'PASSED') || null,
);
const strategyBacktestReport = computed(
  () => strategyBacktestPayload.value?.latestReport || strategyBacktestPayload.value || null,
);
const strategyBacktestMetrics = computed(() => strategyBacktestReport.value?.metrics || {});
const strategyBacktestEngine = computed(() => strategyBacktestReport.value?.engine || {});
const backtestCost = computed(() => strategyBacktestEngine.value?.costModel || {});
const backtestCoverageZh = computed(() =>
  strategyBacktestEngine.value?.coverage === 'ALL_SUPPORTED_USDJPY_SHADOW_FAMILIES'
    ? '全策略族'
    : '等待覆盖',
);
const klineCounts = computed(() => strategyBacktestPayload.value?.barCounts || {});
const h1BarCount = computed(() => klineCounts.value.H1 || strategyBacktestReport.value?.barCount || 0);
const evidenceOS = computed(() => evidenceOSPayload.value || {});
const parityReport = computed(() => evidenceOS.value?.parity || {});
const deepParity = computed(() => parityReport.value?.deepParity || {});
const parityStatus = computed(() => parityReport.value?.status || '等待校验');
const deepParityStatus = computed(() => deepParity.value?.status || parityStatus.value);
const deepParityStatusZh = computed(() => parityStatusZh(deepParityStatus.value));
const deepParityHardMismatches = computed(() => {
  const rows = deepParity.value?.hardMismatches || [];
  return Array.isArray(rows) ? rows : [];
});
const deepParityMissingOptional = computed(() => {
  const rows = deepParity.value?.missingOptionalFields || [];
  return Array.isArray(rows) ? rows : [];
});
const deepStrategyJson = computed(() => deepParity.value?.strategyJson || {});
const deepPythonReplay = computed(() => deepParity.value?.pythonReplay || {});
const deepMql5Ea = computed(() => deepParity.value?.mql5Ea || {});
const deepStrategySummary = computed(() => {
  const rsi = deepStrategyJson.value?.rsi || {};
  const family = deepStrategyJson.value?.strategyFamily || '等待策略';
  const direction = directionZh(deepStrategyJson.value?.direction || 'LONG');
  return `${family} / ${direction} / RSI ${metricText(rsi.period)}`;
});
const deepStrategyGateSummary = computed(() => {
  const gates = deepStrategyJson.value?.entryGateExpectations || {};
  const active = Object.entries(gates)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)
    .join(' / ');
  return active ? `入场契约包含：${active}` : '等待 Strategy JSON entry gate 契约。';
});
const deepReplaySummary = computed(() =>
  deepPythonReplay.value?.posteriorMayAffectTrigger === false ? '因果回放通过' : '等待因果回放',
);
const deepReplayGateSummary = computed(() => {
  const gates = deepPythonReplay.value?.hardGatesNeverRelaxed || [];
  const gateText = Array.isArray(gates) && gates.length ? gates.join(' / ') : '等待 hard gate 列表';
  return `未来后验不参与触发；硬门禁：${gateText}`;
});
const deepEaSummary = computed(() => {
  const route = deepMql5Ea.value?.route || {};
  const rsi = deepMql5Ea.value?.rsi || {};
  return `${deepMql5Ea.value?.state || '等待 EA'} / ${route.timeframe || 'H1'} / RSI ${metricText(rsi.period)}`;
});
const deepEaGateSummary = computed(() => {
  const guards = deepMql5Ea.value?.guards || {};
  return `session ${boolZh(guards.sessionOpen)} / spread ${boolZh(guards.spreadAllowed)} / newsBlocked ${boolZh(guards.newsBlocked)}`;
});
const executionFeedback = computed(() => evidenceOS.value?.executionFeedback || {});
const executionMetrics = computed(() => evidenceOS.value?.executionFeedback?.metrics || {});
const executionGate = computed(() => executionFeedback.value?.promotionGate || {});
const executionGateStatus = computed(() => executionGate.value?.status || 'WAITING_FEEDBACK');
const executionBlockers = computed(() => {
  const rows = executionGate.value?.blockers || [];
  return Array.isArray(rows) ? rows : [];
});
const executionWarnings = computed(() => {
  const rows = executionGate.value?.warnings || [];
  return Array.isArray(rows) ? rows : [];
});
const executionPromotionAllowed = computed(() => Boolean(executionGate.value?.promotionAllowed));
const executionGateStatusZh = computed(() => executionGateZh(executionGateStatus.value));
const executionAgentActionZh = computed(() =>
  agentActionZh(executionFeedback.value?.agentAction?.action),
);
const caseMemory = computed(() => evidenceOS.value?.caseMemory || {});
const caseMemoryToGA = computed(() => caseMemory.value?.caseMemoryToGA || {});
const gaSeedHints = computed(() => {
  const rows = caseMemory.value?.gaSeedHints || [];
  return Array.isArray(rows) ? rows : [];
});
const telegramGateway = computed(() => telegramGatewayPayload.value || evidenceOS.value?.telegramGateway || {});
const eaRepro = computed(
  () =>
    eaReproPayload.value ||
    autonomousAgent.value?.eaReproducibility ||
    autonomousLifecycle.value?.eaReproducibility ||
    {},
);
const rollbackBlockers = computed(() => {
  const rollback = agentPatch.value?.rollback || {};
  return Array.isArray(rollback.hardBlockers) ? rollback.hardBlockers : [];
});
const dailyTodoItems = computed(() => {
  const items = agentDailyTodo.value?.items || dailyAutopilot.value?.dailyTodo?.items || [];
  return Array.isArray(items) ? items : [];
});
const nextPhaseTodos = computed(
  () => dailyAutopilot.value?.nextPhaseTodos || agentDailyTodo.value?.nextPhaseTodos || {},
);
const nextPhaseItems = computed(() => {
  const items = nextPhaseTodos.value?.items || [];
  return Array.isArray(items) ? items : [];
});
const dailyReviewMetrics = computed(
  () => agentDailyReview.value?.metrics || dailyAutopilot.value?.dailyReview?.metrics || {},
);
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

function metricText(value, suffix = '') {
  if (value == null || value === '') return '—';
  return `${value}${suffix}`;
}

function statusZh(value, fallback = '等待 Agent 处理') {
  const map = {
    COMPLETED_BY_AGENT: 'Agent 已完成',
    AUTO_APPLIED_BY_AGENT: 'Agent 已推动',
    WAITING_NEXT_PHASE: '等待下一阶段',
    PENDING: '等待 Agent',
    PROMOTED: '已晋级',
    MICRO_LIVE: '极小仓实盘',
    LIVE_LIMITED: '限制实盘',
    ROLLBACK: '已回滚',
    PAUSED: '已暂停',
    REJECTED: '已淘汰',
    ELITE_SELECTED: 'Elite 保留',
    PROMOTED_TO_SHADOW: '进入影子',
    NEEDS_MORE_DATA: '需要样本',
    SAFETY_REJECTED: '安全拒绝',
  };
  const key = String(value || '').toUpperCase();
  return map[key] || value || fallback;
}

function parityStatusZh(value) {
  const key = String(value || '').toUpperCase();
  if (key.includes('PASS')) return '三方口径一致';
  if (key.includes('FAIL')) return '三方口径不一致';
  if (key.includes('WARN')) return '三方口径待补证据';
  if (key.includes('MISSING')) return '等待三方证据';
  return value || '等待三方证据';
}

function boolZh(value) {
  if (value === true) return '通过';
  if (value === false) return '未通过';
  return '待同步';
}

function executionGateZh(value) {
  const map = {
    PASS: '执行反馈通过',
    WATCH: '执行风险观察',
    BLOCKED: '执行反馈阻断',
    WAITING_FEEDBACK: '等待执行反馈',
    MISSING: '等待执行反馈',
    UNKNOWN: '等待执行反馈',
  };
  const key = String(value || '').toUpperCase();
  return map[key] || value || '等待执行反馈';
}

function agentActionZh(value) {
  const map = {
    BLOCK_PROMOTION_AND_QUEUE_CASE_MEMORY: '阻断晋级并写入 Case',
    KEEP_SHADOW_AND_MONITOR_EXECUTION: '继续影子观察',
    ALLOW_EXECUTION_FEEDBACK_TO_SUPPORT_PROMOTION: '允许支持晋级',
    WAIT_FOR_LIVE_EXECUTION_FEEDBACK: '等待执行反馈',
  };
  const key = String(value || '').toUpperCase();
  return map[key] || value || '等待执行反馈';
}

function mutationHintZh(value) {
  const map = {
    relax_rsi_crossback: '放宽 RSI crossback',
    let_profit_run: '延后保本 / 多拿盈利',
    tighten_entry_filter: '收紧入场过滤',
    tighten_execution_filter: '收紧执行窗口 / 降仓',
    inspect_execution_quality: '检查拒单和执行质量',
    reduce_execution_latency: '降低执行延迟',
    verify_execution_ack_fill_sync: '核对 accepted/fill 回执同步',
    verify_ea_policy_sync: '核对 EA 与 policy 同步',
    verify_live_lane_strategy_lock: '核对实盘策略锁',
    keep_soft_news_gate: '保持软新闻门禁',
    reject_unstable_seed: '淘汰不稳定 seed',
    reduce_mutation_rate: '降低 GA mutation 幅度',
  };
  return map[value] || value || '观察型 seed';
}

function gaBacktest(item) {
  const summary = item?.fitnessBreakdown?.strategyBacktest || {};
  const audit = item?.audit?.backtest || {};
  const metrics = audit.metrics || {};
  if (!audit.present) return summary;
  return {
    ...summary,
    ...metrics,
    required: summary.required ?? true,
    present: true,
    ok: audit.ok ?? summary.ok,
    tradeCount: audit.tradeCount ?? metrics.tradeCount ?? summary.tradeCount,
    evidenceQuality: audit.evidenceQuality ?? summary.evidenceQuality,
    reasonZh: audit.reasonZh ?? summary.reasonZh,
  };
}

function gaBacktestMetric(item, key, digits = 2) {
  const value = gaBacktest(item)[key];
  if (value == null || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  if (Number.isInteger(numeric)) return String(numeric);
  return String(Number(numeric.toFixed(digits)));
}

function gaBacktestWinRate(item) {
  const value = gaBacktest(item).winRate;
  if (value == null || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return `${Number(numeric.toFixed(1))}%`;
}

function gaBacktestDrawdown(item) {
  const value = gaBacktest(item).maxDrawdownR;
  if (value == null || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return `${Number(numeric.toFixed(3))}R`;
}

function gaBacktestSharpeSortino(item) {
  const backtest = gaBacktest(item);
  return `${gaBacktestMetric({ fitnessBreakdown: { strategyBacktest: backtest } }, 'sharpe')} / ${gaBacktestMetric(
    { fitnessBreakdown: { strategyBacktest: backtest } },
    'sortino',
  )}`;
}

function gaSeedBacktestStatus(item) {
  const backtest = gaBacktest(item);
  if (!backtest.required) return '未要求';
  if (!backtest.present) return '缺少回测';
  if (!backtest.ok) return '回测失败';
  return backtest.evidenceQuality || '已回测';
}

function gaSeedParityStatus(item) {
  const parity = item?.fitnessBreakdown?.parity || {};
  if (!parity.present) return '等待';
  return parity.promotionGateStatus || parity.status || '已同步';
}

function gaSeedExecutionStatus(item) {
  const execution = item?.fitnessBreakdown?.executionFeedback || {};
  if (!execution.present) return '等待';
  return execution.promotionGateStatus || execution.fieldCompletenessStatus || '已同步';
}

function gaBacktestAudit(item) {
  return item?.audit?.backtest || {};
}

function gaEquityPoints(item) {
  const points = gaBacktestAudit(item).equityCurve;
  return Array.isArray(points) ? points : [];
}

function gaEquityPolyline(item) {
  const points = gaEquityPoints(item);
  if (points.length < 2) return '';
  const xs = points.map((point) => Number(point.index));
  const ys = points.map((point) => Number(point.equityR));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(0.0001, maxY - minY);
  return points
    .map((point) => {
      const x = ((Number(point.index) - minX) / spanX) * 232 + 4;
      const y = 68 - ((Number(point.equityR) - minY) / spanY) * 60;
      return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`;
    })
    .join(' ');
}

function gaLineageAudit(item) {
  return item?.audit?.lineage || {};
}

function gaLineageTree(item) {
  return item?.audit?.lineageTree || gaLineageAudit(item).tree || {};
}

function gaLineageTreeNodes(item) {
  const nodes = gaLineageTree(item).nodes;
  return Array.isArray(nodes) ? nodes : [];
}

function gaVisibleLineageTreeNodes(item) {
  const nodes = gaLineageTreeNodes(item);
  if (lineageTreeExpanded.value) return nodes;
  return nodes.filter((node) => !node.foldedByDefault || node.selected || node.onElitePath || node.eliteSelected);
}

function gaLineageTreeEdges(item) {
  const edges = gaLineageTree(item).edges;
  if (!Array.isArray(edges)) return [];
  const visibleIds = new Set(gaVisibleLineageTreeNodes(item).map((node) => String(node.seedId || '')));
  return edges.filter((edge) => {
    const from = String(edge.from || '');
    const to = String(edge.to || '');
    return visibleIds.has(from) && visibleIds.has(to);
  });
}

function gaLineageTreeLevels(item) {
  const grouped = new Map();
  for (const node of gaVisibleLineageTreeNodes(item)) {
    const depth = Number(node.relativeDepth || 0);
    if (!grouped.has(depth)) grouped.set(depth, []);
    grouped.get(depth).push(node);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left - right)
    .map(([depth, nodes]) => ({
      depth,
      nodes: nodes.sort((left, right) => String(left.seedId || '').localeCompare(String(right.seedId || ''))),
    }));
}

function gaLineageTreeSummary(item) {
  const tree = gaLineageTree(item);
  if (!tree.nodeCount) return '等待 lineage tree';
  const hidden = gaLineageTreeHiddenCount(item);
  const elitePath = tree.elitePathCount ? ` / elite path ${tree.elitePathCount}` : '';
  const hiddenText = hidden && !lineageTreeExpanded.value ? ` / 折叠 ${hidden}` : '';
  return `${tree.nodeCount} 节点 / ${tree.edgeCount || 0} 边${elitePath}${hiddenText}`;
}

function gaLineageTreeHiddenCount(item) {
  const nodes = gaLineageTreeNodes(item);
  return nodes.filter((node) => node.foldedByDefault && !node.selected && !node.onElitePath && !node.eliteSelected).length;
}

function gaLineageLevelTitle(depth) {
  const numeric = Number(depth || 0);
  if (numeric < 0) return `祖先 ${Math.abs(numeric)} 层`;
  if (numeric > 0) return `子代 +${numeric}`;
  return '当前 Seed';
}

function gaLineageNodeMeta(node) {
  const generation = node.generation == null ? '外部' : `第 ${node.generation} 代`;
  const source = node.source || 'UNKNOWN';
  const family = node.strategyFamily || 'Strategy';
  const fitness = node.fitness == null ? '—' : node.fitness;
  return `${generation} / ${family} / ${source} / fitness ${fitness}`;
}

function lineageEdgeTypeZh(value) {
  const map = {
    MUTATION: '参数变异',
    CROSSOVER: '同族交叉',
    CASE_MEMORY: 'Case Memory 线索',
    LINK: '关联',
  };
  const key = String(value || 'LINK').toUpperCase();
  return map[key] || value || '关联';
}

function gaSourceTrace(item) {
  return item?.audit?.sourceTrace || {};
}

function gaLineageSummary(item) {
  const audit = gaLineageAudit(item);
  return `父代 ${audit.parentCount || 0} / 子代 ${audit.childCount || 0}`;
}

function gaLineageParentsText(item) {
  const parents = gaLineageAudit(item).parents;
  if (!Array.isArray(parents) || !parents.length) return '父代：—';
  return `父代：${parents.map((parent) => `${parent.seedId || 'unknown'}(${parent.type || 'LINK'})`).join(' / ')}`;
}

function gaEvidenceChain(item) {
  const chain = item?.audit?.evidenceChain;
  if (Array.isArray(chain) && chain.length) return chain;
  return [
    {
      step: 'Strategy JSON 校验',
      status: item?.validation?.valid ? 'PASS' : 'WAITING',
      reasonZh: item?.validation?.reasonZh || '等待点击候选加载完整审计。',
    },
    {
      step: 'USDJPY SQLite 回测',
      status: gaSeedBacktestStatus(item),
      reasonZh: gaBacktest(item).reasonZh || '列表只展示摘要，点击后加载完整回测证据。',
    },
    {
      step: 'Fitness / 晋级',
      status: item?.status || 'WAITING',
      reasonZh: item?.blockerZh || '等待完整候选审计。',
    },
  ];
}

function gaAuditTrades(item) {
  const trades = gaBacktestAudit(item).trades;
  return Array.isArray(trades) ? trades : [];
}

function gaEvidenceGateSummary(item) {
  return `${gaSeedParityStatus(item)} / ${gaSeedExecutionStatus(item)}`;
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

function strategyJsonPreview(value) {
  if (!value) return '{}';
  try {
    return JSON.stringify(value, null, 2).slice(0, 1800);
  } catch (_err) {
    return '{}';
  }
}

function actionTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

function setActionStatus(kind, title, summary) {
  actionStatus.value = { kind, title, summary, time: actionTime() };
}

function setActionRunning(title, summary = '正在写入本地证据并刷新页面，请稍等。') {
  setActionStatus('running', title, summary);
}

function setActionSuccess(title, summary) {
  setActionStatus('success', title, summary);
}

function setActionError(title, err, fallback) {
  setActionStatus('error', title, err?.message || fallback);
}

function barReplaySummary() {
  const summary = barReplay.value?.summary || {};
  const entryVariants = barReplay.value?.entryComparison?.variants?.length || 0;
  const exitVariants = barReplay.value?.exitComparison?.variants?.length || 0;
  const sampleCount = summary.sampleCount ?? summary.samples ?? 0;
  return `已生成因果回放：样本 ${sampleCount}；入场候选 ${entryVariants} 组；出场候选 ${exitVariants} 组。`;
}

function governanceSummary() {
  const stage = statusZh(
    autonomousAgent.value?.executionStage ||
      autonomousAgent.value?.stage ||
      lifecyclePayload.value?.executionStage,
    '等待治理门',
  );
  const liveStage = statusZh(liveLane.value?.executionStage || liveLane.value?.stage, '实盘车道等待');
  const mt5Count = mt5ShadowSummary.value?.totalRoutes ?? mt5ShadowSummary.value?.routeCount ?? 0;
  return `自主治理已运行：Agent 阶段 ${stage}；实盘车道 ${liveStage}；MT5 模拟车道 ${mt5Count} 条路线。`;
}

function dailySummary() {
  const todoCount = dailyTodoItems.value.length;
  const nextCount = nextPhaseItems.value.length;
  const reviewState = statusZh(
    agentDailyReview.value?.status || dailyAutopilot.value?.dailyReview?.status,
    '复盘已刷新',
  );
  return `自动日报已生成：今日待办 ${todoCount} 条；下一阶段任务 ${nextCount} 条；每日复盘 ${reviewState}。`;
}

function gaSummary() {
  const status = gaStatus.value;
  return `GA 已运行：第 ${status.currentGeneration || 0} 代；种群 ${status.populationSize || 0}；Elite ${status.eliteCount || 0}；阻断 ${status.blockedCandidates || 0}。`;
}

function strategyBacktestSummary() {
  const metrics = strategyBacktestMetrics.value;
  return `策略回测已完成：交易 ${metrics.tradeCount || 0} 笔；净 R ${metrics.netR ?? 0}；PF ${metrics.profitFactor ?? 0}。`;
}

function evidenceOSSummary() {
  return `证据 OS 已生成：Parity ${parityStatus.value}；${executionGateStatusZh.value}；Case ${caseMemory.value.caseCount || 0} 个，GA seed hint ${gaSeedHints.value.length} 条。`;
}

function evolutionSummary() {
  const samples = datasetSummary.value?.sampleCount ?? datasetSummary.value?.totalSamples ?? 0;
  const candidates = candidateItems.value.length;
  const agentStage = statusZh(
    autonomousAgent.value?.executionStage || autonomousAgent.value?.stage,
    '等待 Agent',
  );
  return `复盘闭环已生成：运行样本 ${samples}；参数候选 ${candidates} 个；Agent 阶段 ${agentStage}。`;
}

async function selectGASeed(item) {
  if (!item?.seedId) return;
  lineageTreeExpanded.value = false;
  selectedGASeed.value = item;
  selectedGASeedLoading.value = true;
  selectedGASeedError.value = '';
  try {
    const payload = await fetchUSDJPYGACandidate(item.seedId);
    selectedGASeed.value = payload?.candidate || item;
  } catch (err) {
    selectedGASeedError.value = err?.message || 'GA 候选完整审计读取失败';
  } finally {
    selectedGASeedLoading.value = false;
  }
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
  agentDailyTodo.value = results.dailyTodoState || results.dailyState?.dailyTodo || null;
  agentDailyReview.value = results.dailyReviewState || results.dailyState?.dailyReview || null;
  gaPayload.value = results.gaState;
  gaCandidatesPayload.value = results.gaCandidates;
  gaPathPayload.value = results.gaPath;
  gaBlockersPayload.value = results.gaBlockers;
  strategyBacktestPayload.value = results.strategyBacktestState;
  evidenceOSPayload.value = results.evidenceOSState;
  telegramGatewayPayload.value = results.telegramGatewayState;
  if (!selectedGASeed.value) {
    selectedGASeed.value = results.gaCandidates?.candidates?.[0] || null;
  }
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
    dailyTodoState,
    dailyReviewState,
    gaState,
    gaCandidates,
    gaPath,
    gaBlockers,
    strategyBacktestState,
    evidenceOSState,
    telegramGatewayState,
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
    fetchUSDJPYAgentDailyTodo(),
    fetchUSDJPYAgentDailyReview(),
    fetchUSDJPYGAStatus(),
    fetchUSDJPYGACandidates(),
    fetchUSDJPYGAEvolutionPath(),
    fetchUSDJPYGABlockers(),
    fetchUSDJPYStrategyBacktestStatus(),
    fetchUSDJPYEvidenceOSStatus(),
    fetchUSDJPYTelegramGatewayStatus(),
  ]);
  assignLoaded({
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
    dailyTodoState,
    dailyReviewState,
    gaState,
    gaCandidates,
    gaPath,
    gaBlockers,
    strategyBacktestState,
    evidenceOSState,
    telegramGatewayState,
  });
}

async function load({ silent = false } = {}) {
  loading.value = true;
  error.value = '';
  if (!silent) setActionRunning('正在刷新页面证据', '正在读取数据集、回放、治理、三车道和日报状态。');
  try {
    await loadAll();
    if (!silent) setActionSuccess('刷新完成', evolutionSummary());
  } catch (err) {
    error.value = err?.message || 'USDJPY 自学习闭环加载失败';
    if (!silent) setActionError('刷新失败', err, 'USDJPY 自学习闭环加载失败');
  } finally {
    loading.value = false;
  }
}

async function runAutonomousGovernance() {
  loading.value = true;
  error.value = '';
  setActionRunning('正在运行自主治理', '正在执行 Walk-forward、Agent 治理门和三车道刷新。');
  try {
    await runUSDJPYWalkForwardBuild();
    autonomousAgent.value = await runUSDJPYAutonomousAgent();
    await loadAll();
    setActionSuccess('自主治理已完成', governanceSummary());
  } catch (err) {
    error.value = err?.message || 'USDJPY 自主治理运行失败';
    setActionError('自主治理失败', err, 'USDJPY 自主治理运行失败');
  } finally {
    loading.value = false;
  }
}

async function runDailyAutopilotV2() {
  loading.value = true;
  error.value = '';
  setActionRunning('正在生成自动日报', 'Agent 正在生成今日待办、每日复盘和下一阶段任务。');
  try {
    dailyAutopilot.value = await runUSDJPYDailyAutopilotV2();
    agentDailyTodo.value = await runUSDJPYAgentDailyTodo();
    agentDailyReview.value = await runUSDJPYAgentDailyReview();
    await loadAll();
    setActionSuccess('自动日报已完成', dailySummary());
  } catch (err) {
    error.value = err?.message || 'USDJPY 自动日报生成失败';
    setActionError('自动日报失败', err, 'USDJPY 自动日报生成失败');
  } finally {
    loading.value = false;
  }
}

async function runGAGeneration() {
  loading.value = true;
  error.value = '';
  setActionRunning(
    '正在运行 GA 一代',
    '正在生成 Strategy JSON 种子、评分 fitness、选择 elite 并写入全过程 trace。',
  );
  try {
    gaPayload.value = await runUSDJPYGAGeneration();
    await loadAll();
    setActionSuccess('GA 一代已完成', gaSummary());
  } catch (err) {
    error.value = err?.message || 'USDJPY GA 一代运行失败';
    setActionError('GA 运行失败', err, 'USDJPY GA 一代运行失败');
  } finally {
    loading.value = false;
  }
}

async function runStrategyBacktest() {
  loading.value = true;
  error.value = '';
  setActionRunning(
    '正在运行策略回测',
    '正在用 Strategy JSON 读取 USDJPY SQLite K线，并生成交易、权益曲线和 GA evidence。',
  );
  try {
    await syncUSDJPYStrategyBacktestKlines();
    strategyBacktestPayload.value = await runUSDJPYStrategyBacktest();
    await loadAll();
    setActionSuccess('策略回测已完成', strategyBacktestSummary());
  } catch (err) {
    error.value = err?.message || 'USDJPY Strategy JSON 回测失败';
    setActionError('策略回测失败', err, 'USDJPY Strategy JSON 回测失败');
  } finally {
    loading.value = false;
  }
}

async function runEvidenceOS() {
  loading.value = true;
  error.value = '';
  setActionRunning(
    '正在生成证据 OS',
    '正在同步真实 USDJPY K线、运行 Strategy JSON 回测、Parity、执行反馈和 Case Memory。',
  );
  try {
    await syncUSDJPYStrategyBacktestKlines();
    strategyBacktestPayload.value = await runUSDJPYStrategyBacktest();
    evidenceOSPayload.value = await runUSDJPYEvidenceOS();
    await loadAll();
    setActionSuccess('证据 OS 已完成', evidenceOSSummary());
  } catch (err) {
    error.value = err?.message || 'USDJPY 证据 OS 生成失败';
    setActionError('证据 OS 失败', err, 'USDJPY 证据 OS 生成失败');
  } finally {
    loading.value = false;
  }
}

async function runCausalReplay() {
  loading.value = true;
  error.value = '';
  setActionRunning('正在生成因果回放', '正在运行 causal replay；未来后验只用于评分，不用于触发。');
  try {
    barReplay.value = await runUSDJPYBarReplayBuild();
    await loadAll();
    setActionSuccess('因果回放已完成', barReplaySummary());
  } catch (err) {
    error.value = err?.message || 'USDJPY 因果回放生成失败';
    setActionError('因果回放失败', err, 'USDJPY 因果回放生成失败');
  } finally {
    loading.value = false;
  }
}

async function runFullEvolution() {
  loading.value = true;
  error.value = '';
  setActionRunning('正在生成复盘闭环', '正在按顺序生成数据集、回放、参数候选、自主治理和日报。');
  try {
    await runUSDJPYEvolutionBuild();
    await runUSDJPYReplayReport();
    await runUSDJPYBarReplayBuild();
    await syncUSDJPYStrategyBacktestKlines();
    await runUSDJPYStrategyBacktest();
    await runUSDJPYEvidenceOS();
    await runUSDJPYWalkForwardBuild();
    await runUSDJPYParamTuning();
    await runUSDJPYConfigProposal();
    await runUSDJPYAutonomousAgent();
    await runUSDJPYDailyAutopilotV2();
    await loadAll();
    setActionSuccess('复盘闭环已完成', evolutionSummary());
  } catch (err) {
    error.value = err?.message || 'USDJPY 自学习闭环生成失败';
    setActionError('复盘闭环失败', err, 'USDJPY 自学习闭环生成失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => load({ silent: true }));
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

.qg-usdjpy-evolution__action-result {
  border: 1px solid rgba(126, 203, 255, 0.35);
  border-radius: 14px;
  background: rgba(7, 22, 38, 0.86);
  padding: 12px 14px;
  margin: 0 0 16px;
}

.qg-usdjpy-evolution__action-result div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.qg-usdjpy-evolution__action-result strong {
  font-size: 15px;
}

.qg-usdjpy-evolution__action-result span,
.qg-usdjpy-evolution__action-result p {
  color: #aebbd0;
}

.qg-usdjpy-evolution__action-result p {
  margin-top: 6px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.qg-usdjpy-evolution__action-result--running {
  border-color: rgba(126, 203, 255, 0.55);
}

.qg-usdjpy-evolution__action-result--success {
  border-color: rgba(103, 232, 149, 0.45);
}

.qg-usdjpy-evolution__action-result--error {
  border-color: rgba(248, 113, 113, 0.55);
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
  font-size: clamp(22px, 2.4vw, 30px);
  line-height: 1.1;
  overflow-wrap: anywhere;
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

.qg-usdjpy-evolution__mini-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.qg-usdjpy-evolution__mini-list article {
  padding: 12px;
}

.qg-usdjpy-evolution__mini-list strong,
.qg-usdjpy-evolution__list article strong {
  overflow-wrap: anywhere;
}

.qg-usdjpy-evolution__ga-timeline {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}

.qg-usdjpy-evolution__ga-timeline article {
  padding: 12px;
}

.qg-usdjpy-evolution__table-wrap {
  overflow-x: auto;
  border: 1px solid rgba(145, 170, 210, 0.22);
  border-radius: 14px;
}

.qg-usdjpy-evolution__table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
}

.qg-usdjpy-evolution__table th,
.qg-usdjpy-evolution__table td {
  border-bottom: 1px solid rgba(145, 170, 210, 0.16);
  padding: 10px 12px;
  text-align: left;
  color: #dce8f8;
  white-space: nowrap;
}

.qg-usdjpy-evolution__table th {
  color: #9fb3cc;
  font-weight: 800;
}

.qg-usdjpy-evolution__table tbody tr {
  cursor: pointer;
}

.qg-usdjpy-evolution__candidate--elite_selected td {
  color: #86efac;
}

.qg-usdjpy-evolution__candidate--rejected td,
.qg-usdjpy-evolution__candidate--safety_rejected td {
  color: #fca5a5;
}

.qg-usdjpy-evolution__seed-detail {
  display: grid;
  gap: 10px;
  border: 1px solid rgba(126, 203, 255, 0.3);
  border-radius: 14px;
  padding: 14px;
  background: rgba(2, 11, 24, 0.55);
}

.qg-usdjpy-evolution__seed-detail-state {
  padding: 10px 12px;
  border: 1px solid rgba(126, 203, 255, 0.24);
  border-radius: 12px;
  background: rgba(14, 42, 72, 0.34);
}

.qg-usdjpy-evolution__seed-audit-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) repeat(2, minmax(190px, 1fr));
  gap: 10px;
}

.qg-usdjpy-evolution__seed-audit-grid article,
.qg-usdjpy-evolution__evidence-chain article {
  padding: 12px;
  border: 1px solid rgba(145, 170, 210, 0.18);
  border-radius: 12px;
  background: rgba(10, 25, 48, 0.68);
}

.qg-usdjpy-evolution__equity-card svg {
  width: 100%;
  height: 72px;
  margin: 8px 0;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(5, 15, 31, 0.96), rgba(9, 26, 48, 0.8));
}

.qg-usdjpy-evolution__equity-card polyline {
  fill: none;
  stroke: #67e8f9;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.6;
}

.qg-usdjpy-evolution__lineage-tree {
  display: grid;
  gap: 14px;
  padding: 14px;
  border: 1px solid rgba(72, 101, 145, 0.65);
  border-radius: 12px;
  background: rgba(8, 16, 32, 0.42);
}

.qg-usdjpy-evolution__lineage-tree-head span,
.qg-usdjpy-evolution__lineage-edges > span {
  display: block;
  color: #8fbdf0;
  font-size: 0.78rem;
  font-weight: 900;
  text-transform: uppercase;
}

.qg-usdjpy-evolution__lineage-tree-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
}

.qg-usdjpy-evolution__lineage-tree-head strong {
  display: block;
  margin-top: 4px;
  color: #f4f8ff;
  font-size: 1.05rem;
}

.qg-usdjpy-evolution__lineage-toggle {
  min-height: 34px;
  padding: 7px 10px;
  border: 1px solid rgba(83, 180, 255, 0.7);
  border-radius: 999px;
  background: rgba(18, 61, 97, 0.42);
  color: #e8f3ff;
  font-size: 0.74rem;
  font-weight: 900;
  cursor: pointer;
}

.qg-usdjpy-evolution__lineage-levels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: stretch;
}

.qg-usdjpy-evolution__lineage-level {
  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(55, 84, 126, 0.7);
  border-radius: 10px;
  background: rgba(10, 20, 39, 0.72);
}

.qg-usdjpy-evolution__lineage-level > span {
  color: #9fb0c8;
  font-size: 0.75rem;
  font-weight: 900;
}

.qg-usdjpy-evolution__lineage-node {
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid rgba(69, 100, 145, 0.8);
  border-radius: 9px;
  background: rgba(16, 28, 51, 0.82);
}

.qg-usdjpy-evolution__lineage-node--selected {
  border-color: rgba(94, 234, 212, 0.95);
  box-shadow: 0 0 0 1px rgba(94, 234, 212, 0.2);
}

.qg-usdjpy-evolution__lineage-node--elite-path {
  border-color: rgba(250, 204, 21, 0.92);
  background: linear-gradient(135deg, rgba(67, 51, 13, 0.58), rgba(16, 28, 51, 0.82));
}

.qg-usdjpy-evolution__lineage-node--elite {
  box-shadow: inset 0 0 0 1px rgba(250, 204, 21, 0.3);
}

.qg-usdjpy-evolution__lineage-node--external {
  border-style: dashed;
  opacity: 0.82;
}

.qg-usdjpy-evolution__lineage-node strong {
  display: block;
  color: #eef5ff;
  font-size: 0.78rem;
  overflow-wrap: anywhere;
}

.qg-usdjpy-evolution__lineage-node em {
  display: inline-block;
  margin-top: 5px;
  color: #ffe58a;
  font-size: 0.72rem;
  font-style: normal;
  font-weight: 900;
}

.qg-usdjpy-evolution__lineage-edges {
  display: grid;
  gap: 8px;
}

.qg-usdjpy-evolution__lineage-edges article {
  padding: 9px 10px;
  border: 1px solid rgba(55, 84, 126, 0.6);
  border-radius: 9px;
  background: rgba(8, 16, 32, 0.58);
}

.qg-usdjpy-evolution__lineage-edge--elite-path {
  border-color: rgba(250, 204, 21, 0.8) !important;
  background: rgba(70, 54, 16, 0.46) !important;
}

.qg-usdjpy-evolution__lineage-edges strong {
  display: block;
  color: #e8f2ff;
  overflow-wrap: anywhere;
}

.qg-usdjpy-evolution__evidence-chain {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.qg-usdjpy-evolution__evidence-chain > span {
  grid-column: 1 / -1;
  color: #9fb3cc;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.qg-usdjpy-evolution__evidence-chain em {
  display: inline-block;
  margin: 4px 0;
  color: #fde68a;
  font-style: normal;
  font-weight: 900;
}

.qg-usdjpy-evolution__seed-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
}

.qg-usdjpy-evolution__seed-metrics article {
  padding: 12px;
}

.qg-usdjpy-evolution__seed-detail pre {
  max-height: 320px;
  overflow: auto;
  margin: 0;
  padding: 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.32);
  color: #bfe7ff;
  font-size: 12px;
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

@media (max-width: 900px) {
  .qg-usdjpy-evolution__seed-audit-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .qg-usdjpy-evolution__header {
    flex-direction: column;
  }
}
</style>
