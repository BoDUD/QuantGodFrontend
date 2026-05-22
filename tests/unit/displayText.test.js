import { describe, expect, it } from 'vitest';

import { humanizeStatus } from '../../src/utils/displayText.js';

describe('displayText', () => {
  it('keeps full Chinese reason text that mentions shadow/replay', () => {
    const reason = '高冲击新闻窗口：Tracking next USDJPY event，暂停 live，shadow / replay 继续。';

    expect(humanizeStatus(reason)).toBe(reason);
  });

  it('still translates compact status tokens', () => {
    expect(humanizeStatus('SHADOW_ONLY')).toBe('模拟观察');
    expect(humanizeStatus('BLOCKED_HIGH_IMPACT_NEWS')).toBe('已阻断');
  });
});
