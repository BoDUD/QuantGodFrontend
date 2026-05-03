const DEFAULT_LOCALE = 'zh-CN';

function resolveCurrencyCode(options = {}) {
  if (typeof options.currency === 'string' && options.currency.trim()) {
    return options.currency.trim().toUpperCase();
  }
  if (typeof options.currencyCode === 'string' && options.currencyCode.trim()) {
    return options.currencyCode.trim().toUpperCase();
  }
  return 'USD';
}

export function formatNumber(value, options = {}) {
  if (value === undefined || value === null || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const digits = options.maximumFractionDigits ?? 2;
  return new Intl.NumberFormat(options.locale || DEFAULT_LOCALE, {
    maximumFractionDigits: digits,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    notation: options.notation || 'standard',
  }).format(numeric);
}

export function formatCurrency(value, options = {}) {
  if (value === undefined || value === null || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const currency = resolveCurrencyCode(options);
  try {
    return new Intl.NumberFormat(options.locale || DEFAULT_LOCALE, {
      style: 'currency',
      currency,
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
    }).format(numeric);
  } catch (_) {
    return `${formatNumber(numeric, {
      ...options,
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
      minimumFractionDigits: options.minimumFractionDigits ?? 2,
    })} ${currency}`;
  }
}

export function formatPercent(value, options = {}) {
  if (value === undefined || value === null || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const normalized = Math.abs(numeric) > 1 ? numeric / 100 : numeric;
  return new Intl.NumberFormat(options.locale || DEFAULT_LOCALE, {
    style: 'percent',
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(normalized);
}

export function formatPnl(value, options = {}) {
  if (value === undefined || value === null || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const magnitude = Math.abs(numeric);
  const formatted = options.currency ? formatCurrency(magnitude, options) : formatNumber(magnitude, options);
  if (numeric > 0) return `+${formatted}`;
  if (numeric < 0) return `-${formatted}`;
  return formatted;
}

export function numberTone(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) return 'neutral';
  return numeric > 0 ? 'positive' : 'negative';
}

export function numberToneClass(value) {
  const tone = numberTone(value);
  if (tone === 'positive') return 'qg-text-positive';
  if (tone === 'negative') return 'qg-text-negative';
  return 'qg-text-muted';
}

export function useNumberFormat(options = {}) {
  return {
    formatNumber: (value, localOptions = {}) => formatNumber(value, { ...options, ...localOptions }),
    formatCurrency: (value, localOptions = {}) => formatCurrency(value, { ...options, ...localOptions }),
    formatPercent: (value, localOptions = {}) => formatPercent(value, { ...options, ...localOptions }),
    formatPnl: (value, localOptions = {}) => formatPnl(value, { ...options, ...localOptions }),
    numberTone,
    numberToneClass,
  };
}
