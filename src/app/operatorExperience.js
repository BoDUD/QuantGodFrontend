import { t } from '../i18n/index.js';

const THEME_KEY = 'quantgod.ui.theme';
const LOCALE_KEY = 'quantgod.ui.locale';
const THEMES = ['dark', 'light', 'hc'];
const LOCALES = ['zh-CN', 'en-US'];

const WORKSPACES = [
  { key: 'dashboard', hotkey: 'd', zh: '总览', en: 'Dashboard' },
  { key: 'mt5', hotkey: 'm', zh: 'MT5 复核', en: 'MT5 Monitor' },
  { key: 'governance', hotkey: 'g', zh: '治理', en: 'Governance' },
  { key: 'paramlab', hotkey: 'p', zh: '参数实验室', en: 'ParamLab' },
  { key: 'research', hotkey: 'r', zh: '研究', en: 'Research' },
  { key: 'polymarket', hotkey: 'o', zh: 'Polymarket', en: 'Polymarket' },
  { key: 'phase3', hotkey: 'v', zh: 'AI / Vibe', en: 'AI / Vibe' },
];

function safeGet(key, fallback) {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch (_) {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_) {
    // Local storage is optional. UI controls continue to work for the current session.
  }
}

function currentTheme() {
  const value = safeGet(THEME_KEY, 'dark');
  return THEMES.includes(value) ? value : 'dark';
}

function currentLocale() {
  const value = safeGet(LOCALE_KEY, 'zh-CN');
  return LOCALES.includes(value) ? value : 'zh-CN';
}

function applyTheme(theme) {
  const next = THEMES.includes(theme) ? theme : 'dark';
  document.documentElement.dataset.theme = next;
  safeSet(THEME_KEY, next);
  return next;
}

function applyLocale(locale) {
  const next = LOCALES.includes(locale) ? locale : 'zh-CN';
  document.documentElement.dataset.locale = next;
  document.documentElement.lang = next;
  safeSet(LOCALE_KEY, next);
  return next;
}

function navigateWorkspace(key) {
  const url = new URL(window.location.href);
  url.searchParams.set('workspace', key);
  window.history.pushState({ workspace: key }, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate', { state: { workspace: key } }));
}

function createButton(label, title, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.title = title;
  button.addEventListener('click', onClick);
  return button;
}

function workspaceLabel(workspace, locale) {
  return locale === 'en-US' ? workspace.en : workspace.zh;
}

function updateControlsText(root, locale, theme) {
  const searchButton = root.querySelector('[data-qg-control="search"]');
  const themeButton = root.querySelector('[data-qg-control="theme"]');
  const localeButton = root.querySelector('[data-qg-control="locale"]');
  const helpButton = root.querySelector('[data-qg-control="help"]');
  if (searchButton) searchButton.textContent = t('operator.searchShort', locale);
  if (themeButton) themeButton.textContent = `${t('operator.theme', locale)} ${t(`theme.${theme}`, locale)}`;
  if (localeButton) localeButton.textContent = locale === 'zh-CN' ? '中文' : 'EN';
  if (helpButton) helpButton.textContent = '?';
}

function createPalette() {
  const palette = document.createElement('div');
  palette.className = 'qg-command-palette';
  palette.hidden = true;
  palette.innerHTML = `
    <div class="qg-command-palette__panel" role="dialog" aria-modal="true" aria-label="QuantGod command palette">
      <div class="qg-command-palette__header">
        <div>
          <strong data-qg-palette-title></strong>
          <p class="qg-text-muted" data-qg-palette-help style="margin:4px 0 0"></p>
        </div>
        <button type="button" data-qg-palette-close>Esc</button>
      </div>
      <input data-qg-palette-input type="search" autocomplete="off" />
      <div class="qg-command-palette__list" data-qg-palette-list></div>
    </div>
  `;
  document.body.appendChild(palette);
  return palette;
}

function renderPalette(palette, query = '') {
  const locale = currentLocale();
  const input = palette.querySelector('[data-qg-palette-input]');
  const list = palette.querySelector('[data-qg-palette-list]');
  const title = palette.querySelector('[data-qg-palette-title]');
  const help = palette.querySelector('[data-qg-palette-help]');
  title.textContent = t('operator.paletteTitle', locale);
  help.textContent = t('operator.paletteHelp', locale);
  input.placeholder = t('operator.palettePlaceholder', locale);
  list.innerHTML = '';

  const normalized = String(query || '').trim().toLowerCase();
  const matches = WORKSPACES.filter((workspace) => {
    const haystack = `${workspace.key} ${workspace.zh} ${workspace.en} ${workspace.hotkey}`.toLowerCase();
    return !normalized || haystack.includes(normalized);
  });

  for (const workspace of matches) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'qg-command-palette__item';
    item.innerHTML = `
      <span>
        <strong>${workspaceLabel(workspace, locale)}</strong>
        <small>${t('operator.openWorkspace', locale)} · ${workspace.key}</small>
      </span>
      <kbd>g ${workspace.hotkey}</kbd>
    `;
    item.addEventListener('click', () => {
      navigateWorkspace(workspace.key);
      closePalette(palette);
    });
    list.appendChild(item);
  }

  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'qg-state-card';
    empty.innerHTML = `<strong>${t('operator.noCommand', locale)}</strong><p>${t('operator.noCommandHint', locale)}</p>`;
    list.appendChild(empty);
  }
}

function openPalette(palette) {
  palette.hidden = false;
  renderPalette(palette, '');
  const input = palette.querySelector('[data-qg-palette-input]');
  window.setTimeout(() => input?.focus(), 0);
}

function closePalette(palette) {
  palette.hidden = true;
}

function isTypingTarget(target) {
  const tag = target?.tagName?.toLowerCase?.();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
}

function installKeyboard(palette, controls) {
  let pendingG = false;
  let timer = null;

  function clearPending() {
    pendingG = false;
    if (timer) window.clearTimeout(timer);
    timer = null;
  }

  window.addEventListener('keydown', (event) => {
    if (isTypingTarget(event.target)) return;

    if (event.key === 'Escape' && !palette.hidden) {
      event.preventDefault();
      closePalette(palette);
      return;
    }

    if (event.key === '/') {
      event.preventDefault();
      openPalette(palette);
      return;
    }

    if (event.key === '?') {
      event.preventDefault();
      openPalette(palette);
      return;
    }

    const key = event.key.toLowerCase();
    if (pendingG) {
      const workspace = WORKSPACES.find((item) => item.hotkey === key);
      clearPending();
      if (workspace) {
        event.preventDefault();
        navigateWorkspace(workspace.key);
      }
      return;
    }

    if (key === 'g') {
      pendingG = true;
      controls.dataset.pendingShortcut = 'g';
      timer = window.setTimeout(() => {
        controls.dataset.pendingShortcut = '';
        clearPending();
      }, 1400);
    }
  });

  palette.querySelector('[data-qg-palette-input]')?.addEventListener('input', (event) => {
    renderPalette(palette, event.target.value);
  });

  palette.querySelector('[data-qg-palette-close]')?.addEventListener('click', () => closePalette(palette));
  palette.addEventListener('click', (event) => {
    if (event.target === palette) closePalette(palette);
  });
}

export function installOperatorExperience() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (document.querySelector('[data-qg-operator-experience]')) return;

  const initialTheme = applyTheme(currentTheme());
  const initialLocale = applyLocale(currentLocale());

  const controls = document.createElement('div');
  controls.className = 'qg-operator-controls';
  controls.dataset.qgOperatorExperience = 'true';

  const search = createButton(t('operator.searchShort', initialLocale), t('operator.searchHelp', initialLocale), () => openPalette(palette));
  search.dataset.qgControl = 'search';

  const theme = createButton('', t('operator.themeHelp', initialLocale), () => {
    const next = THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length];
    const applied = applyTheme(next);
    updateControlsText(controls, currentLocale(), applied);
  });
  theme.dataset.qgControl = 'theme';

  const locale = createButton('', t('operator.localeHelp', initialLocale), () => {
    const next = LOCALES[(LOCALES.indexOf(currentLocale()) + 1) % LOCALES.length];
    const applied = applyLocale(next);
    updateControlsText(controls, applied, currentTheme());
    renderPalette(palette, palette.querySelector('[data-qg-palette-input]')?.value || '');
  });
  locale.dataset.qgControl = 'locale';

  const help = createButton('?', t('operator.helpHelp', initialLocale), () => openPalette(palette));
  help.dataset.qgControl = 'help';

  controls.append(search, theme, locale, help);
  document.body.appendChild(controls);

  const palette = createPalette();
  updateControlsText(controls, initialLocale, initialTheme);
  installKeyboard(palette, controls);
}
