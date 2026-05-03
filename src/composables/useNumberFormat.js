const DEFAULT_LOCALE = 'zh-CN';

export function formatNumber(value, options = {}) {
  if (value === undefined || value === null || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const digits = options.maximumFractionDigits ?? (Math.abs(numeric) >= 100 ? 1 : 2);
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
  return new Intl.NumberFormat(options.locale || DEFAULT_LOCALE, {
    style: 'currency',
    currency: options.currency || 'USD',
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(numeric);
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
  const formatted = options.currency ? formatCurrency(numeric, options) : formatNumber(Math.abs(numeric), options);
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
