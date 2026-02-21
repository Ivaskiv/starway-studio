const THEME_STORAGE_KEY = 'starway_ui_theme';
export type UiTheme = 'dark' | 'light';

const isUiTheme = (value: string | null): value is UiTheme => value === 'dark' || value === 'light';

export function normalizeUiTheme(value?: string | null): UiTheme {
  const v = String(value || '').toLowerCase();
  if (v === 'light' || v === 'glass-light') return 'light';
  return 'dark';
}

export function applyUiTheme(theme: UiTheme) {
  // fix code_x: explicit global theme attribute to let background switch between black/light modes.
  document.documentElement.setAttribute('data-ui-theme', theme);
}

export function saveUiTheme(theme: UiTheme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyUiTheme(theme);
}

export function loadUiTheme(): UiTheme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isUiTheme(stored) ? stored : 'dark';
}
