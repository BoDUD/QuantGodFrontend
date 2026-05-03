import zhCN from '../locales/zh-CN.js';
import enUS from '../locales/en-US.js';

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'];
export const DEFAULT_LOCALE = 'zh-CN';

const messages = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

function readPath(source, path) {
  return String(path)
    .split('.')
    .reduce((cursor, part) => (cursor == null ? undefined : cursor[part]), source);
}

export function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function t(key, locale = DEFAULT_LOCALE, fallback = key) {
  const normalized = normalizeLocale(locale);
  return readPath(messages[normalized], key) ?? readPath(messages[DEFAULT_LOCALE], key) ?? fallback;
}

export function getMessages(locale = DEFAULT_LOCALE) {
  return messages[normalizeLocale(locale)];
}
