export const THEMES: Record<string, any> = {
  midnight: { 
    label: 'Navy', 
    sbBg: '#101A2B', 
    sbMain: '#8FAFCF', 
    mainBg: '#090F1A', 
    mainCard: '#101A2B', 
    mainText: '#8FAFCF', 
    cardBorder: '#1E3557', 
    sbAccent: '#8FAFCF', 
    dateAccent: '#8FAFCF', 
    footerBg: 'rgba(16,26,43,0.95)', 
    footerBorder: '#1E3557', 
    scrollbar: 'rgba(143,175,207,0.25)', 
    summaryBg: '#132238', 
    summaryBorder: '#1E3557', 
    summaryText: '#8FAFCF', 
    summaryLabel: '#8FAFCF', 
    btnBg: '#152238', 
    btnText: '#8FAFCF', 
    btnBorder: '#1E3557', 
    btnHover: '#1C3050', 
    panelBg: '#101A2B', 
    panelBorder: '#1E3557', 
    panelText: '#8FAFCF', 
    panelMuted: '#8FAFCF', 
    panelTabActive: '#FFFFFF', 
    panelTabBorder: '#1E3557', 
    panelItemBg: '#152238', 
    panelItemBorder: '#1E3557', 
    panelSliderBg: 'rgba(143,175,207,0.20)', 
    panelScrollbar: 'rgba(143,175,207,0.20)', 
    sbItemOpacity: '0.92', 
    sbCategoryOpacity: '0.85', 
    sbMutedOverride: '#8FAFCF', 
    isDark: true, 
    defaultFolderColor: '#8FAFCF' 
  },
  light: { label: 'Light', sbBg: '#0F172A', sbMain: '#F8FAFC', mainBg: '#F8FAFC', mainCard: '#FFFFFF', mainText: '#1E293B', cardBorder: '#E2E8F0', sbAccent: '#3B82F6', dateAccent: '#60A5FA', footerBg: 'rgba(255,255,255,0.7)', footerBorder: '#E2E8F0', scrollbar: 'rgba(0,0,0,0.22)', summaryBg: '#EFF6FF', summaryBorder: '#3B82F6', summaryText: '#1E3A8A', summaryLabel: '#1D4ED8', btnBg: '#FFFFFF', btnText: '#1E293B', btnBorder: 'rgba(0,0,0,0.12)', btnHover: '#F1F5F9', panelBg: '#FFFFFF', panelBorder: 'rgba(0,0,0,0.10)', panelText: 'rgba(30,41,59,0.85)', panelMuted: 'rgba(30,41,59,0.4)', panelTabActive: '#1E293B', panelTabBorder: 'rgba(0,0,0,0.07)', panelItemBg: 'rgba(0,0,0,0.04)', panelItemBorder: 'rgba(0,0,0,0.09)', panelSliderBg: 'rgba(0,0,0,0.10)', panelScrollbar: 'rgba(0,0,0,0.10)', sbItemOpacity: '0.9', sbCategoryOpacity: '0.85', sbMutedOverride: '#94A3B8', isDark: false, defaultFolderColor: '#3B82F6' },
  sepia: { label: 'Sepia', sbBg: '#29170B', sbMain: '#F5ECD7', mainBg: '#FBF5E6', mainCard: '#FFF8EC', mainText: '#311B0D', cardBorder: '#DFD0B5', sbAccent: '#C0853A', dateAccent: '#C0853A', footerBg: 'rgba(251,245,230,0.8)', footerBorder: '#DFD0B5', scrollbar: 'rgba(49,27,13,0.22)', summaryBg: '#F4E8D0', summaryBorder: '#C0853A', summaryText: '#5C3D18', summaryLabel: '#8B5A2B', btnBg: '#FFF8EC', btnText: '#311B0D', btnBorder: '#DFD0B5', btnHover: '#F4E8D0', panelBg: '#FFF8EC', panelBorder: 'rgba(49,27,13,0.15)', panelText: 'rgba(49,27,13,0.85)', panelMuted: 'rgba(49,27,13,0.4)', panelTabActive: '#311B0D', panelTabBorder: 'rgba(49,27,13,0.10)', panelItemBg: 'rgba(49,27,13,0.05)', panelItemBorder: 'rgba(49,27,13,0.10)', panelSliderBg: 'rgba(49,27,13,0.12)', panelScrollbar: 'rgba(49,27,13,0.10)', sbItemOpacity: '0.9', sbCategoryOpacity: '0.85', sbMutedOverride: '#C4A882', isDark: false, defaultFolderColor: '#C0853A' },
  red: { label: 'Red', sbBg: '#0A0101', sbMain: '#FFFFFF', mainBg: '#140202', mainCard: '#210404', mainText: '#CCCCCC', cardBorder: '#380A0A', sbAccent: '#EF4444', dateAccent: '#FCA5A5', footerBg: 'rgba(20,2,2,0.9)', footerBorder: '#380A0A', scrollbar: 'rgba(255,255,255,0.22)', summaryBg: '#210404', summaryBorder: '#5C1010', summaryText: '#FCA5A5', summaryLabel: '#EF4444', btnBg: '#210404', btnText: '#FFFFFF', btnBorder: '#380A0A', btnHover: '#2D0606', panelBg: '#0A0101', panelBorder: 'rgba(255,255,255,0.1)', panelText: 'rgba(255,255,255,0.9)', panelMuted: 'rgba(255,255,255,0.45)', panelTabActive: '#FFFFFF', panelTabBorder: 'rgba(255,255,255,0.1)', panelItemBg: 'rgba(255,255,255,0.05)', panelItemBorder: 'rgba(255,255,255,0.1)', panelSliderBg: 'rgba(255,255,255,0.15)', panelScrollbar: 'rgba(255,255,255,0.15)', sbItemOpacity: '0.9', sbCategoryOpacity: '0.85', sbMutedOverride: '#FCA5A5', isDark: true, defaultFolderColor: '#EF4444' },
  mono: { label: 'Mono', sbBg: '#0A0A0A', sbMain: '#CCCCCC', mainBg: '#F3F4F6', mainCard: '#FFFFFF', mainText: '#111827', cardBorder: '#E5E7EB', sbAccent: '#888888', dateAccent: '#6B7280', footerBg: 'rgba(243,244,246,0.8)', footerBorder: '#E5E7EB', scrollbar: 'rgba(0,0,0,0.22)', summaryBg: '#F9FAFB', summaryBorder: '#E5E7EB', summaryText: '#111827', summaryLabel: '#4B5563', btnBg: '#FFFFFF', btnText: '#111827', btnBorder: '#E5E7EB', btnHover: '#F3F4F6', panelBg: '#FFFFFF', panelBorder: 'rgba(0,0,0,0.10)', panelText: 'rgba(17,24,39,0.85)', panelMuted: 'rgba(17,24,39,0.4)', panelTabActive: '#111827', panelTabBorder: 'rgba(0,0,0,0.07)', panelItemBg: 'rgba(0,0,0,0.04)', panelItemBorder: 'rgba(0,0,0,0.09)', panelSliderBg: 'rgba(0,0,0,0.10)', panelScrollbar: 'rgba(0,0,0,0.10)', sbItemOpacity: '0.9', sbCategoryOpacity: '0.85', sbMutedOverride: '#999999', isDark: false, defaultFolderColor: '#9CA3AF' },
  rose: { label: 'Rose', sbBg: '#1A0A10', sbMain: '#FFE4EE', mainBg: '#FFF1F5', mainCard: '#FFFFFF', mainText: '#3D0017', cardBorder: '#FBCFE8', sbAccent: '#F43F5E', dateAccent: '#FB7185', footerBg: 'rgba(255,241,245,0.8)', footerBorder: '#FBCFE8', scrollbar: 'rgba(61,0,23,0.20)', summaryBg: '#FFE4EE', summaryBorder: '#F43F5E', summaryText: '#881337', summaryLabel: '#BE123C', btnBg: '#FFFFFF', btnText: '#3D0017', btnBorder: '#FBCFE8', btnHover: '#FFE4EE', panelBg: '#FFF1F5', panelBorder: 'rgba(244,63,94,0.15)', panelText: 'rgba(61,0,23,0.85)', panelMuted: 'rgba(61,0,23,0.4)', panelTabActive: '#3D0017', panelTabBorder: 'rgba(61,0,23,0.08)', panelItemBg: 'rgba(61,0,23,0.04)', panelItemBorder: 'rgba(61,0,23,0.09)', panelSliderBg: 'rgba(61,0,23,0.10)', panelScrollbar: 'rgba(61,0,23,0.10)', sbItemOpacity: '0.9', sbCategoryOpacity: '0.85', sbMutedOverride: '#F4A7BC', isDark: false, defaultFolderColor: '#F43F5E' },
  obsidian: { label: 'Obsidian', sbBg: '#0A0A0A', sbMain: '#CCCCCC', mainBg: '#111111', mainCard: '#1A1A1A', mainText: '#CCCCCC', cardBorder: '#2A2A2A', sbAccent: '#888888', dateAccent: '#888888', footerBg: 'rgba(17,17,17,0.9)', footerBorder: '#2A2A2A', scrollbar: 'rgba(255,255,255,0.20)', summaryBg: '#1A1A2A', summaryBorder: '#555', summaryText: '#AAAACC', summaryLabel: '#888', btnBg: '#1A1A1A', btnText: '#CCCCCC', btnBorder: '#2A2A2A', btnHover: '#222222', panelBg: '#0A0A0A', panelBorder: 'rgba(255,255,255,0.08)', panelText: 'rgba(204,204,204,0.85)', panelMuted: 'rgba(204,204,204,0.35)', panelTabActive: '#CCC', panelTabBorder: 'rgba(255,255,255,0.08)', panelItemBg: 'rgba(255,255,255,0.04)', panelItemBorder: 'rgba(255,255,255,0.08)', panelSliderBg: 'rgba(255,255,255,0.10)', panelScrollbar: 'rgba(255,255,255,0.08)', sbItemOpacity: '0.9', sbCategoryOpacity: '0.85', sbMutedOverride: '#999999', isDark: true, defaultFolderColor: '#A3A3A3' },
  black: { 
    label: 'BLACK', 
    sbBg: '#14161A', 
    sbMain: '#E2E8F0', 
    mainBg: '#0B0C0D', 
    mainCard: '#14161A', 
    mainText: '#E2E8F0', 
    cardBorder: '#23272F', 
    sbAccent: '#8C939E', 
    dateAccent: '#8C939E', 
    footerBg: 'rgba(20,22,26,0.95)', 
    footerBorder: '#23272F', 
    scrollbar: 'rgba(255,255,255,0.18)', 
    summaryBg: '#14161A', 
    summaryBorder: '#23272F', 
    summaryText: '#E2E8F0', 
    summaryLabel: '#8C939E', 
    btnBg: '#191C22', 
    btnText: '#E2E8F0', 
    btnBorder: '#282D37', 
    btnHover: '#222630', 
    panelBg: '#14161A', 
    panelBorder: 'rgba(255,255,255,0.10)', 
    panelText: 'rgba(255,255,255,0.85)', 
    panelMuted: 'rgba(255,255,255,0.40)', 
    panelTabActive: '#FFFFFF', 
    panelTabBorder: 'rgba(255,255,255,0.10)', 
    panelItemBg: '#191C22', 
    panelItemBorder: '#23272F', 
    panelSliderBg: 'rgba(255,255,255,0.15)', 
    panelScrollbar: 'rgba(255,255,255,0.10)', 
    sbItemOpacity: '0.9', 
    sbCategoryOpacity: '0.85', 
    sbMutedOverride: '#8C939E', 
    isDark: true, 
    defaultFolderColor: '#E2E8F0' 
  },
  white: { 
    label: 'White', 
    sbBg: '#FFFFFF', 
    sbMain: '#111827', 
    mainBg: '#FFFFFF', 
    mainCard: '#FFFFFF', 
    mainText: '#111827', 
    cardBorder: '#D1D5DB', 
    sbAccent: '#2563EB', 
    dateAccent: '#374151', 
    footerBg: 'rgba(255,255,255,0.95)', 
    footerBorder: '#D1D5DB', 
    scrollbar: 'rgba(0,0,0,0.35)', 
    summaryBg: '#F3F4F6', 
    summaryBorder: '#CBD5E1', 
    summaryText: '#111827', 
    summaryLabel: '#1F2937', 
    btnBg: '#FFFFFF', 
    btnText: '#111827', 
    btnBorder: '#CBD5E1', 
    btnHover: '#F3F4F6', 
    panelBg: '#FFFFFF', 
    panelBorder: '#CBD5E1', 
    panelText: '#111827', 
    panelMuted: '#4B5563', 
    panelTabActive: '#111827', 
    panelTabBorder: '#CBD5E1', 
    panelItemBg: '#F8FAFC', 
    panelItemBorder: '#CBD5E1', 
    panelSliderBg: 'rgba(0,0,0,0.20)', 
    panelScrollbar: 'rgba(0,0,0,0.20)', 
    sbItemOpacity: '1', 
    sbMutedOverride: '#1F2937', 
    sbCategoryOpacity: '1',
    isDark: false,
    defaultFolderColor: '#2563EB'
  },
};

export const FONT_MAP: Record<string, string> = {
  hiragino: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif",
  yugothic: "'Yu Gothic UI', '游ゴシック UI', '游ゴシック', 'YuGothic', sans-serif",
  meiryo: "'Meiryo UI', 'Meiryo', 'メイリオ', sans-serif",
  noto: "'Noto Sans JP', 'Noto Sans', sans-serif",
  mono: "'Menlo', 'Consolas', 'Courier New', monospace",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export function hexToRgba(hex: string, alpha: number) {
  if (!hex || hex.startsWith('rgba') || hex.startsWith('rgb(')) return hex;
  let h = hex.replace('#',''); if (h.length === 3) h = h.split('').map(c=>c+c).join('');
  return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${alpha})`;
}

export function getFolderColorForTheme(themeKey: string): string {
  if (themeKey === 'ocean' || themeKey === 'dark') themeKey = 'black';
  const saved = localStorage.getItem(`lv_folderColor_${themeKey}`);
  // blackテーマの場合、以前の青色(#60A5FA / #3B82F6)が残っていれば新しい白抜きデフォルト(#E2E8F0)に移行
  if (themeKey === 'black' && (saved === '#60A5FA' || saved === '#3B82F6')) {
    localStorage.setItem('lv_folderColor_black', '#E2E8F0');
    return '#E2E8F0';
  }
  if (saved) return saved;
  const t = THEMES[themeKey] || THEMES.mono;
  return t?.defaultFolderColor || localStorage.getItem('lv_folderColor') || (themeKey === 'black' ? '#E2E8F0' : '#FBBF24');
}

export function setFolderColorForTheme(themeKey: string, color: string) {
  if (themeKey === 'ocean' || themeKey === 'dark') themeKey = 'black';
  localStorage.setItem(`lv_folderColor_${themeKey}`, color);
  localStorage.setItem('lv_folderColor', color);
}

export function getPaperSettingsForTheme(themeKey: string): { mode: boolean; color: 'beige' | 'white' } {
  if (themeKey === 'ocean' || themeKey === 'dark') themeKey = 'black';
  const savedMode = localStorage.getItem(`lv_paperMode_${themeKey}`);
  const savedColor = localStorage.getItem(`lv_paperColor_${themeKey}`);

  // 各テーマ個別の設定があればそれを適用。未設定のテーマは必ずペーパーOFF（通常テーマ色）で開始
  const mode = savedMode !== null ? savedMode === '1' : false;
  const color = (savedColor === 'white' || savedColor === 'beige') ? (savedColor as 'beige' | 'white') : 'beige';

  return { mode, color };
}

export function setPaperModeForTheme(themeKey: string, mode: boolean) {
  if (themeKey === 'ocean' || themeKey === 'dark') themeKey = 'black';
  localStorage.setItem(`lv_paperMode_${themeKey}`, mode ? '1' : '0');
  localStorage.setItem('lv_paperMode', mode ? '1' : '0');
}

export function setPaperColorForTheme(themeKey: string, color: 'beige' | 'white') {
  if (themeKey === 'ocean' || themeKey === 'dark') themeKey = 'black';
  localStorage.setItem(`lv_paperColor_${themeKey}`, color);
  localStorage.setItem('lv_paperColor', color);
}

export function setPaperSettingsForTheme(themeKey: string, mode: boolean, color?: 'beige' | 'white') {
  setPaperModeForTheme(themeKey, mode);
  if (color) {
    setPaperColorForTheme(themeKey, color);
  }
}

export function applyThemeStyle(key: string) {
  if (key === 'ocean' || key === 'dark') key = 'black';
  const t = THEMES[key] || THEMES.mono;
  if (!t) return;
  const r = document.documentElement.style;
  const isDark = Boolean(t.isDark);
  r.colorScheme = isDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme-dark', isDark ? 'true' : 'false');

  const folderColor = getFolderColorForTheme(key);
  r.setProperty('--sb-folder-color', folderColor);

  r.setProperty('--sb-bg', t.sbBg); r.setProperty('--sb-text', t.sbMain); r.setProperty('--sb-accent', t.sbAccent);
  if (key === 'white') {
    r.setProperty('--sb-border', 'rgba(0,0,0,0.08)');
    r.setProperty('--sb-muted', '#4B5563');
    r.setProperty('--sb-item-hover', 'rgba(0,0,0,0.04)');
    r.setProperty('--sb-item-active', 'rgba(0,0,0,0.08)');
    r.setProperty('--sb-input-bg', 'rgba(0,0,0,0.03)');
    r.setProperty('--sb-input-border', 'rgba(0,0,0,0.10)');
    r.setProperty('--input-bg', '#ffffff');
    r.setProperty('--input-border', '#E2E8F0');
    r.setProperty('--input-placeholder', '#94A3B8');
  } else if (key === 'black') {
    r.setProperty('--sb-border', '#23272F');
    r.setProperty('--sb-muted', '#8C939E');
    r.setProperty('--sb-item-hover', '#191C22');
    r.setProperty('--sb-item-active', '#222630');
    r.setProperty('--sb-input-bg', '#191C22');
    r.setProperty('--sb-input-border', '#23272F');
    r.setProperty('--input-bg', '#181A20');
    r.setProperty('--input-border', '#23272F');
    r.setProperty('--input-placeholder', '#6B7280');
  } else if (key === 'midnight') {
    r.setProperty('--sb-border', '#1E3557');
    r.setProperty('--sb-muted', '#8FAFCF');
    r.setProperty('--sb-item-hover', '#152238');
    r.setProperty('--sb-item-active', '#1C3050');
    r.setProperty('--sb-input-bg', '#090F1A');
    r.setProperty('--sb-input-border', '#1E3557');
    r.setProperty('--input-bg', '#090F1A');
    r.setProperty('--input-border', '#1E3557');
    r.setProperty('--input-placeholder', 'rgba(143,175,207,0.6)');
  } else {
    const sbHover = hexToRgba(t.sbMain, 0.05);
    const sbBorderSubtle = hexToRgba(t.sbMain, 0.10);
    r.setProperty('--sb-item-hover', sbHover); 
    r.setProperty('--sb-item-active', hexToRgba(t.sbMain, 0.10));
    r.setProperty('--sb-border', sbBorderSubtle); 
    r.setProperty('--sb-muted', hexToRgba(t.sbMain, 0.40));
    r.setProperty('--sb-input-bg', sbHover);
    r.setProperty('--sb-input-border', sbBorderSubtle);
    r.setProperty('--input-bg', t.mainCard || (isDark ? 'rgba(0,0,0,0.2)' : '#ffffff'));
    r.setProperty('--input-border', t.cardBorder || hexToRgba(t.sbMain, 0.15));
    r.setProperty('--input-placeholder', hexToRgba(t.sbMain, 0.45));
  }
  r.setProperty('--main-bg', t.mainBg); r.setProperty('--main-text', t.mainText); r.setProperty('--main-muted', hexToRgba(t.mainText, 0.35));
  r.setProperty('--card-bg', t.mainCard); r.setProperty('--card-border', t.cardBorder); r.setProperty('--footer-bg', t.footerBg); r.setProperty('--footer-border', t.footerBorder);
  r.setProperty('--scrollbar-thumb', t.scrollbar);
  r.setProperty('--scrollbar-track', isDark ? 'rgba(0,0,0,0.2)' : 'transparent');
  r.setProperty('--scrollbar-thumb-hover', isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)');
  r.setProperty('--heading-color', t.mainText); r.setProperty('--speaker-color', hexToRgba(t.mainText, 0.4));
  r.setProperty('--date-accent', t.dateAccent); r.setProperty('--summary-bg', t.summaryBg); r.setProperty('--summary-border', t.summaryBorder);
  r.setProperty('--summary-text', t.summaryText); r.setProperty('--summary-label', t.summaryLabel); r.setProperty('--btn-bg', t.btnBg);
  r.setProperty('--btn-text', t.btnText); r.setProperty('--btn-border', t.btnBorder); r.setProperty('--btn-hover', t.btnHover);
  r.setProperty('--panel-bg', t.panelBg); r.setProperty('--panel-border', t.panelBorder);
  r.setProperty('--panel-text', t.panelText || 'rgba(255,255,255,0.85)');
  r.setProperty('--panel-muted', t.panelMuted || 'rgba(255,255,255,0.35)');
  r.setProperty('--panel-tab-active', t.panelTabActive || '#fff');
  r.setProperty('--panel-tab-border', t.panelTabBorder || 'rgba(255,255,255,0.08)');
  r.setProperty('--panel-item-bg', t.panelItemBg || 'rgba(255,255,255,0.06)');
  r.setProperty('--panel-item-border', t.panelItemBorder || 'rgba(255,255,255,0.10)');
  r.setProperty('--panel-slider-bg', t.panelSliderBg || 'rgba(255,255,255,0.15)');
  r.setProperty('--panel-scrollbar', t.panelScrollbar || 'rgba(255,255,255,0.10)');
  r.setProperty('--sb-item-opacity', t.sbItemOpacity || '0.85');
  r.setProperty('--sb-category-opacity', t.sbCategoryOpacity || '0.85');
  r.setProperty('--sb-category-color', t.sbMutedOverride || t.sbMain || '');

  // PWA/ブラウザのヘッダー色（theme-color）の設定
  // Whiteテーマ時のみ白（#FFFFFF）、それ以外のテーマはすべて黒（#000000）に固定
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    const headerColor = key === 'white' ? '#FFFFFF' : '#000000';
    metaThemeColor.setAttribute('content', headerColor);
  }
}

