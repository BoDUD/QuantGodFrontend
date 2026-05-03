import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import KpiCard from '../../src/components/KpiCard.vue';

describe('KpiCard', () => {
  it('renders neutral currency without forcing a PnL sign', () => {
    const wrapper = mount(KpiCard, {
      props: {
        title: '账户净值',
        value: 10003.02,
        currency: true,
      },
    });

    expect(wrapper.text()).toContain('账户净值');
    expect(wrapper.find('.qg-kpi-card__value').text()).not.toMatch(/^\+/);
  });

  it('renders PnL currency with one directional sign', () => {
    const wrapper = mount(KpiCard, {
      props: {
        title: '今日 PnL',
        value: -2.33,
        pnl: true,
        currency: true,
      },
    });

    const value = wrapper.find('.qg-kpi-card__value').text();
    expect(value).toMatch(/^-/);
    expect(value).not.toMatch(/^--/);
  });
});
