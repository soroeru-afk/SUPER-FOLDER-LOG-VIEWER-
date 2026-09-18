import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { THEMES, FONT_MAP, applyThemeStyle, getFolderColorForTheme, setFolderColorForTheme, getPaperSettingsForTheme, getMainBgWhiteForTheme, setMainBgWhiteForTheme, resetThemeToDefault, resetAllThemesToDefault, setAllThemesMainBgWhite } from '../theme';
import { applySettingsToDOM } from '../settingsSync';
import { loadFolderVisualSettings, saveFolderVisualSettings, FolderVisualSettings, FolderCoverStyle, FolderCoverLayout, FolderCoverPosition, parsePositionPercent, getCategoryTheme } from '../folderVisuals';

export const SettingsPanel = () => {
  const { settingsOpen, toggleSettings, t, lang, speakerModeEnabled, setSpeakerMode, ttsSettings, updateTtsSettings, voiceRates, voices, paperMode, setPaperMode, paperColor, setPaperColor, loadPaperForTheme, sidebarPosition, setSidebarPosition } = useAppContext();
  const [tab, setTab] = useState<'text' | 'layout' | 'theme' | 'folder' | 'audio'>('text');
  const panelRef = useRef<HTMLDivElement>(null);

  const [visualSettings, setVisualSettings] = useState<FolderVisualSettings>(loadFolderVisualSettings);

  const [vals, setVals] = useState({
    fontSize: '15', fontWeight: '400', lineHeight: '1.8', letterSpacing: '0',
    sbTitleSize: '13', sbCatSize: '10', headingSize: '48', sbWidth: '280', contentWidth: '900', vertCardHeight: '600',
    cardPadding: '24', cardRadius: '0', msgGap: '16', pagePad: '56',
    cardDigestSize: '13',
    theme: 'mono', font: 'meiryo', folderColor: '#FBBF24',
    mainBgWhite: false
  });

  useEffect(() => {
    const loadSettings = () => {
      const currentTheme = (localStorage.getItem('lv_theme') === 'ocean' || localStorage.getItem('lv_theme') === 'dark' ? 'black' : localStorage.getItem('lv_theme')) || 'mono';
      setVals({
        fontSize: localStorage.getItem('lv_fontSize') || '15',
        fontWeight: localStorage.getItem('lv_fontWeight') || '400',
        lineHeight: localStorage.getItem('lv_lineHeight') || '1.8',
        letterSpacing: localStorage.getItem('lv_letterSpacing') || '0',
        sbTitleSize: localStorage.getItem('lv_sbTitleSize') || '13',
        sbCatSize: localStorage.getItem('lv_sbCatSize') || '10',
        headingSize: localStorage.getItem('lv_headingSize') || '48',
        sbWidth: localStorage.getItem('lv_sbWidth') || '280',
        contentWidth: localStorage.getItem('lv_contentWidth') || '900',
        vertCardHeight: localStorage.getItem('lv_vertCardHeight') || '600',
        cardPadding: localStorage.getItem('lv_cardPadding') || '24',
        cardRadius: localStorage.getItem('lv_cardRadius') ?? '0',
        msgGap: localStorage.getItem('lv_msgGap') || '16',
        pagePad: localStorage.getItem('lv_pagePad') || '56',
        cardDigestSize: localStorage.getItem('lv_cardDigestSize') || '13',
        theme: currentTheme,
        font: localStorage.getItem('lv_font') || 'meiryo',
        folderColor: getFolderColorForTheme(currentTheme),
        mainBgWhite: getMainBgWhiteForTheme(currentTheme)
      });
      setVisualSettings(loadFolderVisualSettings());
    };
    loadSettings();
    window.addEventListener('settingsChanged', loadSettings);
    window.addEventListener('folderVisualSettingsChanged', loadSettings);
    return () => {
      window.removeEventListener('settingsChanged', loadSettings);
      window.removeEventListener('folderVisualSettingsChanged', loadSettings);
    };
  }, [settingsOpen]);

  const updateVisualSettings = (updates: Partial<FolderVisualSettings>) => {
    const next = { ...visualSettings, ...updates };
    setVisualSettings(next);
    saveFolderVisualSettings(next);
  };

  const updateSetting = (key: string, val: string) => {
    if (key === 'theme') {
      localStorage.setItem('lv_theme', val);
      const themeColor = getFolderColorForTheme(val);
      const isWhite = getMainBgWhiteForTheme(val);
      setVals(prev => ({ ...prev, theme: val, folderColor: themeColor, mainBgWhite: isWhite }));
      applySettingsToDOM();
      loadPaperForTheme(val);
      window.dispatchEvent(new Event('settingsChanged'));
      return;
    }
    if (key === 'folderColor') {
      setFolderColorForTheme(vals.theme, val);
      setVals(prev => ({ ...prev, folderColor: val }));
      applySettingsToDOM();
      window.dispatchEvent(new Event('settingsChanged'));
      return;
    }
    localStorage.setItem(`lv_${key}`, val);
    setVals(prev => ({ ...prev, [key]: val }));
    applySettingsToDOM();
    window.dispatchEvent(new Event('settingsChanged'));
  };

  const updateMainBgWhite = (val: boolean) => {
    setMainBgWhiteForTheme(vals.theme, val);
    setVals(prev => ({ ...prev, mainBgWhite: val }));
    applySettingsToDOM();
    window.dispatchEvent(new Event('settingsChanged'));
  };

  const handleResetCurrentTheme = () => {
    resetThemeToDefault(vals.theme);
    const themeColor = getFolderColorForTheme(vals.theme);
    const isWhite = getMainBgWhiteForTheme(vals.theme);
    setVals(prev => ({ ...prev, folderColor: themeColor, mainBgWhite: isWhite }));
    setPaperMode(false);
    applySettingsToDOM();
    window.dispatchEvent(new Event('settingsChanged'));
  };

  const handleResetAllThemes = () => {
    resetAllThemesToDefault();
    const themeColor = getFolderColorForTheme(vals.theme);
    const isWhite = getMainBgWhiteForTheme(vals.theme);
    setVals(prev => ({ ...prev, folderColor: themeColor, mainBgWhite: isWhite }));
    setPaperMode(false);
    applySettingsToDOM();
    window.dispatchEvent(new Event('settingsChanged'));
  };

  const handleSetAllWhite = () => {
    setAllThemesMainBgWhite(true);
    setVals(prev => ({ ...prev, mainBgWhite: true }));
    applySettingsToDOM();
    window.dispatchEvent(new Event('settingsChanged'));
  };

  if (!settingsOpen) return null;

  return (
    <div id="settings-panel" ref={panelRef} className="open" onClick={e => e.stopPropagation()}>
      <div className="panel-tabs">
        <button className={`panel-tab ${tab === 'text' ? 'active' : ''}`} onClick={() => setTab('text')}>{t.settings.textOpen}</button>
        <button className={`panel-tab ${tab === 'layout' ? 'active' : ''}`} onClick={() => setTab('layout')}>{t.settings.layoutOpen}</button>
        <button className={`panel-tab ${tab === 'theme' ? 'active' : ''}`} onClick={() => setTab('theme')}>{t.settings.themeOpen}</button>
        <button className={`panel-tab ${tab === 'folder' ? 'active' : ''}`} onClick={() => setTab('folder')}>{t.settings.folderOpen}</button>
        <button className={`panel-tab ${tab === 'audio' ? 'active' : ''}`} onClick={() => setTab('audio')}>{t.settings.audioOpen}</button>
        <button
          className="panel-close-btn"
          onClick={toggleSettings}
          title={lang === 'en' ? 'Close Settings' : '設定を閉じる'}
          aria-label={lang === 'en' ? 'Close' : '閉じる'}
        >
          ✕
        </button>
      </div>
      <div className="panel-body">
        
        {tab === 'text' && (
          <div className="tab-section active">
            <div className="setting-row">
              <div className="setting-label">{t.settings.font}</div>
              <div className="font-grid">
                {[
                  {k: 'hiragino', n: lang === 'en' ? 'Hiragino' : 'ヒラギノ', s: lang === 'en' ? 'macOS Default' : 'macOS標準'},
                  {k: 'yugothic', n: lang === 'en' ? 'YuGothic' : '游ゴシック', s: 'Win/Mac'},
                  {k: 'meiryo', n: lang === 'en' ? 'Meiryo' : 'メイリオ', s: 'Windows'},
                  {k: 'noto', n: 'Noto Sans', s: 'Google'},
                  {k: 'mono', n: lang === 'en' ? 'Mono' : '等幅', s: 'Monospace'},
                  {k: 'system', n: lang === 'en' ? 'System' : 'システム', s: lang === 'en' ? 'Default' : '既定'},
                ].map(f => (
                  <button key={f.k} className={`font-btn ${vals.font === f.k ? 'active' : ''}`} onClick={() => updateSetting('font', f.k)}>
                    {f.n}<br/><span style={{fontSize:'9px',opacity:0.6}}>{f.s}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.fontSize} <span id="font-size-val">{vals.fontSize}px</span></div>
              <input className="setting-slider" type="range" min="11" max="26" step="1" value={vals.fontSize} onChange={e => updateSetting('fontSize', e.target.value)} />
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.fontWeight}</div>
              <div className="weight-btns">
                {['300', '400', '500', '700', '900'].map(w => {
                  const label = lang === 'en' 
                    ? (w === '300' ? 'Light' : w === '400' ? 'Normal' : w === '500' ? 'Medium' : w === '700' ? 'Bold' : 'Black')
                    : (w === '300' ? '細' : w === '400' ? '普通' : w === '500' ? '中' : w === '700' ? '太' : '極太');
                  return (
                    <button key={w} className={`weight-btn ${vals.fontWeight === w ? 'active' : ''}`} onClick={() => updateSetting('fontWeight', w)}>{label}</button>
                  );
                })}
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.lineHeight} <span id="line-height-val">{parseFloat(vals.lineHeight).toFixed(1)}</span></div>
              <input className="setting-slider" type="range" min="1.2" max="3.0" step="0.1" value={vals.lineHeight} onChange={e => updateSetting('lineHeight', e.target.value)} />
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.letterSpacing} <span id="letter-spacing-val">{parseFloat(vals.letterSpacing).toFixed(1)}px</span></div>
              <input className="setting-slider" type="range" min="-1" max="5" step="0.5" value={vals.letterSpacing} onChange={e => updateSetting('letterSpacing', e.target.value)} />
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.sbTitleSize} <span id="sb-title-size-val">{vals.sbTitleSize}px</span></div>
              <input className="setting-slider" type="range" min="9" max="20" step="1" value={vals.sbTitleSize} onChange={e => updateSetting('sbTitleSize', e.target.value)} />
            </div>
            <div className="setting-row">
              <div className="setting-label">{lang === 'en' ? 'Category Text Size' : 'カテゴリー文字サイズ'} <span id="sb-cat-size-val">{vals.sbCatSize}px</span></div>
              <input className="setting-slider" type="range" min="8" max="18" step="1" value={vals.sbCatSize} onChange={e => updateSetting('sbCatSize', e.target.value)} />
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.headingSize} <span id="heading-size-val">{vals.headingSize}px</span></div>
              <input className="setting-slider" type="range" min="36" max="72" step="2" value={vals.headingSize} onChange={e => updateSetting('headingSize', e.target.value)} />
            </div>
            <div className="setting-row">
              <div className="setting-label">
                {lang === 'en' ? 'Card / List Text Size' : 'カード・リスト文字サイズ'}{' '}
                <span id="card-digest-size-val">{vals.cardDigestSize}px</span>
              </div>
              <input 
                className="setting-slider" 
                type="range" 
                min="10" 
                max="18" 
                step="1" 
                value={vals.cardDigestSize} 
                onChange={e => updateSetting('cardDigestSize', e.target.value)} 
              />
            </div>
          </div>
        )}

        {tab === 'layout' && (
          <div className="tab-section active">
            <div className="setting-row" style={{ paddingBottom: '4px' }}>
              <div className="setting-label" style={{ marginBottom: '8px', fontSize: '11px', display: 'block' }}>
                {lang === 'en' ? 'Speaker Mode' : '話者モード（スピーカー表示）'}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: '0px',
                  overflow: 'hidden',
                  border: '1px solid var(--panel-item-border)',
                  background: 'var(--panel-item-bg)',
                  flexShrink: 0,
                  fontFamily: 'var(--font-body)',
                }}
              >
                <button
                  onClick={() => setSpeakerMode(true)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: speakerModeEnabled ? 'var(--panel-tab-active)' : 'transparent',
                    color: speakerModeEnabled ? 'var(--panel-bg)' : 'var(--panel-muted)',
                  }}
                >
                  ON
                </button>
                <button
                  onClick={() => setSpeakerMode(false)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: !speakerModeEnabled ? 'var(--panel-tab-active)' : 'transparent',
                    color: !speakerModeEnabled ? 'var(--panel-bg)' : 'var(--panel-muted)',
                  }}
                >
                  OFF
                </button>
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{lang === 'en' ? 'Sidebar Position' : 'サイドバー配置'}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setSidebarPosition('left')}
                    style={{
                      padding: '2px 10px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      border: '1px solid var(--panel-item-border)',
                      background: sidebarPosition === 'left' ? 'var(--sb-accent)' : 'var(--panel-item-bg)',
                      color: sidebarPosition === 'left' ? '#ffffff' : 'var(--panel-text)',
                      cursor: 'pointer',
                      borderRadius: '0px',
                    }}
                  >
                    {lang === 'en' ? '◀ Left' : '◀ 左側'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarPosition('right')}
                    style={{
                      padding: '2px 10px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      border: '1px solid var(--panel-item-border)',
                      background: sidebarPosition === 'right' ? 'var(--sb-accent)' : 'var(--panel-item-bg)',
                      color: sidebarPosition === 'right' ? '#ffffff' : 'var(--panel-text)',
                      cursor: 'pointer',
                      borderRadius: '0px',
                    }}
                  >
                    {lang === 'en' ? 'Right ▶' : '右側 ▶'}
                  </button>
                </div>
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.sbWidth} <span id="sb-width-val">{vals.sbWidth}px</span></div>
              <input className="setting-slider" type="range" min="180" max="800" step="10" value={vals.sbWidth} onChange={e => updateSetting('sbWidth', e.target.value)} />
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.contentWidth} <span id="content-width-val">{vals.contentWidth}px</span></div>
              <input className="setting-slider" type="range" min="480" max="1400" step="20" value={vals.contentWidth} onChange={e => updateSetting('contentWidth', e.target.value)} />
            </div>
            <div className="setting-row">
              <div className="setting-label">{lang === 'en' ? 'Vertical Card Height' : '縦書きカードの高さ'} <span id="vert-card-height-val">{vals.vertCardHeight}px</span></div>
              <input className="setting-slider" type="range" min="300" max="1500" step="20" value={vals.vertCardHeight} onChange={e => updateSetting('vertCardHeight', e.target.value)} />
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.cardPadding} <span id="card-padding-val">{vals.cardPadding}px</span></div>
              <input className="setting-slider" type="range" min="10" max="48" step="2" value={vals.cardPadding} onChange={e => updateSetting('cardPadding', e.target.value)} />
            </div>
            <div className="setting-row">
              <div className="setting-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t.settings.cardRadius} <span id="card-radius-val">{vals.cardRadius}px</span></span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => updateSetting('cardRadius', '0')}
                    style={{
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      border: '1px solid var(--panel-item-border)',
                      background: vals.cardRadius === '0' ? 'var(--sb-accent)' : 'var(--panel-item-bg)',
                      color: vals.cardRadius === '0' ? '#ffffff' : 'var(--panel-text)',
                      cursor: 'pointer',
                      borderRadius: '0px',
                    }}
                  >
                    ■ {lang === 'en' ? 'Square (0px)' : 'スクエア (0px)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting('cardRadius', '12')}
                    style={{
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      border: '1px solid var(--panel-item-border)',
                      background: vals.cardRadius !== '0' ? 'var(--sb-accent)' : 'var(--panel-item-bg)',
                      color: vals.cardRadius !== '0' ? '#ffffff' : 'var(--panel-text)',
                      cursor: 'pointer',
                      borderRadius: '0px',
                    }}
                  >
                    {lang === 'en' ? 'Rounded' : '角丸'}
                  </button>
                </div>
              </div>
              <input className="setting-slider" type="range" min="0" max="32" step="2" value={vals.cardRadius} onChange={e => updateSetting('cardRadius', e.target.value)} />
              <div style={{ fontSize: '10px', opacity: 0.65, marginTop: '3px' }}>
                {lang === 'en' ? 'Applies to text reader card background only (other list cards stay square)' : 'テキスト本文の背景枠のみに適用されます（他の一覧カード等は角のまま保持）'}
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.msgGap} <span id="msg-gap-val">{vals.msgGap}px</span></div>
              <input className="setting-slider" type="range" min="4" max="40" step="2" value={vals.msgGap} onChange={e => updateSetting('msgGap', e.target.value)} />
              <div style={{ fontSize: '10px', opacity: 0.65, marginTop: '3px' }}>
                {lang === 'en' ? 'Adjusts spacing between paragraphs, message blocks, and file list rows' : '段落の空行・メッセージ・ファイル一覧行の間隔を調整'}
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.pagePad} <span id="page-pad-val">{vals.pagePad}px</span></div>
              <input className="setting-slider" type="range" min="16" max="120" step="4" value={vals.pagePad} onChange={e => updateSetting('pagePad', e.target.value)} />
            </div>
          </div>
        )}

        {tab === 'theme' && (
          <div className="tab-section active">
            {/* 1. テーマ選択グリッド（最上部） */}
            <div className="setting-row">
              <div className="setting-label" style={{marginBottom:'12px'}}>{t.settings.theme}</div>
              <div className="theme-grid">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button key={key} className={`theme-btn ${vals.theme === key ? 'active' : ''}`} onClick={() => updateSetting('theme', key)}>
                    <div className="theme-preview">
                      <div className="theme-preview-sb" style={{background: t.sbBg}}></div>
                      <div className="theme-preview-main" style={{background: (vals.theme === key ? vals.mainBgWhite : getMainBgWhiteForTheme(key)) ? '#FFFFFF' : t.mainBg}}></div>
                    </div>
                    <div className="theme-preview-label">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. メイン画面背景色（右カラム）の切り替え */}
            <div className="setting-row" style={{marginTop: '16px', paddingBottom: '4px'}}>
              <div className="setting-label" style={{marginBottom: '8px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span>{lang === 'en' ? 'Main Area Background (Right Column)' : 'メイン画面背景色（右カラム）'}</span>
                <span style={{ fontSize: '10px', opacity: 0.8, textTransform: 'none', fontWeight: 'normal' }}>
                  {vals.mainBgWhite ? (lang === 'en' ? '⚪ White (#FFFFFF)' : '⚪ 白（#FFFFFF）') : (lang === 'en' ? 'Theme Default' : 'テーマ標準色')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    borderRadius: '0px',
                    overflow: 'hidden',
                    border: '1px solid var(--panel-item-border)',
                    background: 'var(--panel-item-bg)',
                    flexShrink: 0,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => updateMainBgWhite(false)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.3px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: !vals.mainBgWhite ? 'var(--panel-tab-active)' : 'transparent',
                      color: !vals.mainBgWhite ? 'var(--panel-bg)' : 'var(--panel-muted)',
                    }}
                  >
                    {lang === 'en' ? 'Theme Default' : 'テーマ標準色'}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMainBgWhite(true)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.3px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: vals.mainBgWhite ? 'var(--panel-tab-active)' : 'transparent',
                      color: vals.mainBgWhite ? 'var(--panel-bg)' : 'var(--panel-muted)',
                    }}
                  >
                    {lang === 'en' ? '⚪ White' : '⚪ 白背景'}
                  </button>
                </div>
              </div>
            </div>

            {/* 3. コンパクト＆シンプルなリセット・一括バー */}
            <div className="setting-row" style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--panel-tab-border)' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleResetCurrentTheme}
                  title={lang === 'en' ? 'Reset current theme to standard default' : '現在選択中のテーマを標準の初期色に戻します'}
                  style={{
                    padding: '4px 10px',
                    fontSize: '10px',
                    fontWeight: 700,
                    border: '1px solid var(--panel-item-border)',
                    background: 'var(--panel-item-bg)',
                    color: 'var(--panel-text)',
                    cursor: 'pointer',
                    borderRadius: '0px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ fontSize: '11px' }}>↺</span>
                  <span>{lang === 'en' ? 'Reset Current' : '選択テーマをリセット'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAllThemes}
                  title={lang === 'en' ? 'Reset all themes to default standard colors' : '全テーマを標準色・初期設定に戻します'}
                  style={{
                    padding: '4px 10px',
                    fontSize: '10px',
                    fontWeight: 700,
                    border: '1px solid var(--panel-item-border)',
                    background: 'var(--panel-item-bg)',
                    color: 'var(--panel-text)',
                    cursor: 'pointer',
                    borderRadius: '0px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ fontSize: '11px' }}>↺</span>
                  <span>{lang === 'en' ? 'Reset All Defaults' : '全テーマ初期化'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSetAllWhite}
                  title={lang === 'en' ? 'Set main background to white for all themes' : '全テーマのメイン画面背景を白に一括設定します'}
                  style={{
                    padding: '4px 10px',
                    fontSize: '10px',
                    fontWeight: 700,
                    border: '1px solid var(--panel-item-border)',
                    background: 'var(--panel-item-bg)',
                    color: 'var(--panel-text)',
                    cursor: 'pointer',
                    borderRadius: '0px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ fontSize: '11px' }}>⚪</span>
                  <span>{lang === 'en' ? 'All White' : '全テーマ白一括'}</span>
                </button>
              </div>
            </div>

            <div className="setting-row" style={{marginTop: '20px'}}>
              <div className="setting-label">{lang === 'en' ? 'Folder Icon Color' : 'フォルダーアイコン色'}</div>
              <div style={{display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center'}}>
                {['#E2E8F0', '#8FAFCF', '#FBBF24', '#60A5FA', '#34D399', '#F87171', '#A78BFA', '#9CA3AF', '#FFF'].map(col => (
                  <button 
                    key={col} 
                    onClick={() => updateSetting('folderColor', col)}
                    style={{
                      width: '24px', height: '24px', borderRadius: '0px', background: col,
                      border: vals.folderColor === col ? '2px solid var(--panel-text)' : '2px solid transparent',
                      cursor: 'pointer'
                    }}
                  />
                ))}
                <div style={{ width: '1px', height: '20px', background: 'var(--panel-border)', margin: '0 4px' }} />
                <input 
                  type="color" 
                  value={vals.folderColor || '#FBBF24'} 
                  onChange={e => updateSetting('folderColor', e.target.value)} 
                  style={{ width: '28px', height: '28px', padding: 0, border: '1px solid var(--panel-border)', cursor: 'pointer', background: 'transparent', borderRadius: '0px' }}
                />
              </div>
            </div>

            <div className="setting-row" style={{marginTop: '20px', paddingBottom: '4px'}}>
              <div className="setting-label" style={{marginBottom: '8px', fontSize: '11px', display: 'block'}}>
                {lang === 'en' ? 'Paper Mode' : 'ペーパーモード（用紙調ビュー）'}
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    borderRadius: '0px',
                    overflow: 'hidden',
                    border: '1px solid var(--panel-item-border)',
                    background: 'var(--panel-item-bg)',
                    flexShrink: 0,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <button
                    onClick={() => setPaperMode(true)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: paperMode ? 'var(--panel-tab-active)' : 'transparent',
                      color: paperMode ? 'var(--panel-bg)' : 'var(--panel-muted)',
                    }}
                  >
                    ON
                  </button>
                  <button
                    onClick={() => setPaperMode(false)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: !paperMode ? 'var(--panel-tab-active)' : 'transparent',
                      color: !paperMode ? 'var(--panel-bg)' : 'var(--panel-muted)',
                    }}
                  >
                    OFF
                  </button>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    borderRadius: '0px',
                    overflow: 'hidden',
                    border: '1px solid var(--panel-item-border)',
                    background: 'var(--panel-item-bg)',
                    flexShrink: 0,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <button
                    onClick={() => setPaperColor('beige')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: paperColor === 'beige' ? 'var(--panel-tab-active)' : 'transparent',
                      color: paperColor === 'beige' ? 'var(--panel-bg)' : 'var(--panel-muted)',
                    }}
                    title="淡いベージュ紙調"
                  >
                    BEIGE
                  </button>
                  <button
                    onClick={() => setPaperColor('white')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: paperColor === 'white' ? 'var(--panel-tab-active)' : 'transparent',
                      color: paperColor === 'white' ? 'var(--panel-bg)' : 'var(--panel-muted)',
                    }}
                    title="ホワイト紙調（白地＆テーブル明瞭調）"
                  >
                    WHITE
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '10px', opacity: 0.65, marginTop: '5px' }}>
                {lang === 'en'
                  ? 'Paper mode (ON/OFF and color) is saved and remembered individually for each theme.'
                  : '各テーマごとにペーパーのON/OFFおよび用紙色が自動記憶・維持されます。'}
              </div>
            </div>
          </div>
        )}

        {tab === 'folder' && (
          <div className="tab-section active">
            {/* カバー表示 ON/OFF */}
            <div className="setting-row">
              <div className="setting-label">
                {lang === 'en' ? 'FOLDER COVERS (AUTO-GENERATE)' : 'フォルダーカバー画像・図絵の表示'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => updateVisualSettings({ enabled: false })}
                  style={{
                    padding: '10px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: !visualSettings.enabled ? '1.5px solid var(--sb-accent, #3b82f6)' : '1px solid var(--panel-item-border)',
                    background: !visualSettings.enabled ? 'var(--panel-tab-active)' : 'var(--panel-item-bg)',
                    color: !visualSettings.enabled ? 'var(--panel-bg)' : 'var(--panel-text)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {lang === 'en' ? 'OFF (Simple Cards)' : 'OFF (通常・シンプル)'}
                </button>
                <button
                  type="button"
                  onClick={() => updateVisualSettings({ enabled: true })}
                  style={{
                    padding: '10px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: visualSettings.enabled ? '1.5px solid var(--sb-accent, #3b82f6)' : '1px solid var(--panel-item-border)',
                    background: visualSettings.enabled ? 'var(--panel-tab-active)' : 'var(--panel-item-bg)',
                    color: visualSettings.enabled ? 'var(--panel-bg)' : 'var(--panel-text)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {lang === 'en' ? '🖼️ ON (Show Covers)' : '🖼️ ON (カバー表示)'}
                </button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--panel-muted)', opacity: 0.9, marginTop: '6px', lineHeight: 1.5 }}>
                {lang === 'en'
                  ? 'Automatically generates matching aesthetic illustrations or photo covers for each folder topic (AI, Music, Cinema, Games, Life, etc.).'
                  : 'フォルダー名（AI、音楽、映画・特撮、ゲーム、生活、投資、自己分析など）に合わせて最適な図絵・カバーを自動表示します。'}
              </div>
            </div>

            {/* 絵柄スタイル（イラスト / 写真） */}
            <div className="setting-row">
              <div className="setting-label">
                {lang === 'en' ? 'ARTWORK STYLE' : '絵柄・アートスタイル'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => updateVisualSettings({ style: 'illustration' })}
                  style={{
                    padding: '10px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: visualSettings.style === 'illustration' ? '1.5px solid var(--sb-accent, #3b82f6)' : '1px solid var(--panel-item-border)',
                    background: visualSettings.style === 'illustration' ? 'var(--panel-tab-active)' : 'var(--panel-item-bg)',
                    color: visualSettings.style === 'illustration' ? 'var(--panel-bg)' : 'var(--panel-text)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🎨 {lang === 'en' ? 'Smart Illustration' : 'スマートイラスト'}
                </button>
                <button
                  type="button"
                  onClick={() => updateVisualSettings({ style: 'photo' })}
                  style={{
                    padding: '10px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: visualSettings.style === 'photo' ? '1.5px solid var(--sb-accent, #3b82f6)' : '1px solid var(--panel-item-border)',
                    background: visualSettings.style === 'photo' ? 'var(--panel-tab-active)' : 'var(--panel-item-bg)',
                    color: visualSettings.style === 'photo' ? 'var(--panel-bg)' : 'var(--panel-text)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  📸 {lang === 'en' ? 'HD Photo / Artwork' : '高精細フォト'}
                </button>
              </div>
            </div>

            {/* レイアウト（ヘッダーバナー型 / 全面背景型） */}
            <div className="setting-row">
              <div className="setting-label">
                {lang === 'en' ? 'COVER LAYOUT' : '配置レイアウト'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => updateVisualSettings({ layout: 'banner' })}
                  style={{
                    padding: '10px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: visualSettings.layout === 'banner' ? '1.5px solid var(--sb-accent, #3b82f6)' : '1px solid var(--panel-item-border)',
                    background: visualSettings.layout === 'banner' ? 'var(--panel-tab-active)' : 'var(--panel-item-bg)',
                    color: visualSettings.layout === 'banner' ? 'var(--panel-bg)' : 'var(--panel-text)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🖼️ {lang === 'en' ? 'Header Banner' : '上部バナー型'}
                </button>
                <button
                  type="button"
                  onClick={() => updateVisualSettings({ layout: 'card-bg' })}
                  style={{
                    padding: '10px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: visualSettings.layout === 'card-bg' ? '1.5px solid var(--sb-accent, #3b82f6)' : '1px solid var(--panel-item-border)',
                    background: visualSettings.layout === 'card-bg' ? 'var(--panel-tab-active)' : 'var(--panel-item-bg)',
                    color: visualSettings.layout === 'card-bg' ? 'var(--panel-bg)' : 'var(--panel-text)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🔲 {lang === 'en' ? 'Full Background' : 'カード全面背景'}
                </button>
              </div>
            </div>

            {/* 画像表示の基準位置（上・中・下 ＆ スライダー微調整） */}
            <div className="setting-row">
              <div className="setting-label">
                {lang === 'en' ? 'DEFAULT IMAGE POSITION' : 'カバー画像の基準位置（上・中・下・微調整）'}
                <span className="setting-val">{parsePositionPercent(visualSettings.defaultPosition)}%</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                {[
                  { val: 0, label: lang === 'en' ? '⬆ Top (0%)' : '⬆ 上部 (0%)' },
                  { val: 50, label: lang === 'en' ? '⏺ Center (50%)' : '⏺ 中央 (50%)' },
                  { val: 100, label: lang === 'en' ? '⬇ Bottom (100%)' : '⬇ 下部 (100%)' },
                ].map(p => {
                  const isCur = parsePositionPercent(visualSettings.defaultPosition) === p.val;
                  return (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => updateVisualSettings({ defaultPosition: p.val })}
                      style={{
                        padding: '8px 6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: isCur ? '1.5px solid var(--sb-accent, #3b82f6)' : '1px solid var(--panel-item-border)',
                        background: isCur ? 'var(--panel-tab-active)' : 'var(--panel-item-bg)',
                        color: isCur ? 'var(--panel-bg)' : 'var(--panel-text)',
                        cursor: 'pointer',
                        borderRadius: '0px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={parsePositionPercent(visualSettings.defaultPosition)}
                onChange={e => updateVisualSettings({ defaultPosition: parseInt(e.target.value, 10) })}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* 透明度スライダー */}
            <div className="setting-row">
              <div className="setting-label">
                {lang === 'en' ? 'COVER OPACITY' : 'カバー不透明度'}
                <span className="setting-val">{Math.round((visualSettings.opacity ?? 1.0) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={visualSettings.opacity ?? 1.0}
                onChange={e => updateVisualSettings({ opacity: parseFloat(e.target.value) })}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* 明るさ・鮮やかさ（Brightness）スライダー */}
            <div className="setting-row">
              <div className="setting-label">
                {lang === 'en' ? 'COVER BRIGHTNESS' : 'カバーの明るさ（クッキリ度）'}
                <span className="setting-val">{Math.round((visualSettings.brightness ?? 1.05) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.4"
                step="0.05"
                value={visualSettings.brightness ?? 1.05}
                onChange={e => updateVisualSettings({ brightness: parseFloat(e.target.value) })}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--panel-muted)', opacity: 0.85, marginTop: '3px' }}>
                <span>70% (落ち着いたトーン)</span>
                <span>100% (標準)</span>
                <span>140% (明るく鮮明)</span>
              </div>
            </div>

            {/* フォルダーアイコン色 */}
            <div className="setting-row">
              <div className="setting-label">{lang === 'en' ? 'FOLDER ICON ACCENT' : 'フォルダーアイコン色'}</div>
              <div className="color-palette-grid">
                {[
                  { hex: '#FBBF24', name: 'Amber' },
                  { hex: '#60A5FA', name: 'Blue' },
                  { hex: '#34D399', name: 'Emerald' },
                  { hex: '#F472B6', name: 'Pink' },
                  { hex: '#A78BFA', name: 'Purple' },
                  { hex: '#FB923C', name: 'Orange' },
                  { hex: '#E879F9', name: 'Fuchsia' },
                  { hex: '#2DD4BF', name: 'Teal' },
                  { hex: '#94A3B8', name: 'Slate' },
                  { hex: '#E2E8F0', name: 'Light' }
                ].map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    className={`palette-color-btn ${vals.folderColor === c.hex ? 'active' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => updateSetting('folderColor', c.hex)}
                    title={c.name}
                  />
                ))}
                <input
                  type="color"
                  value={vals.folderColor.startsWith('#') ? vals.folderColor : '#FBBF24'}
                  onChange={e => updateSetting('folderColor', e.target.value)}
                  className="palette-custom-color"
                  title={lang === 'en' ? 'Custom Color' : 'カスタムカラー'}
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'audio' && (
          <div className="tab-section active">
            <div className="setting-row" style={{ display: 'flex', gap: '10px' }}>
              <button
                className="tool-btn"
                style={{ flex: 1, justifyContent: 'center', background: 'rgba(59,130,246,0.1)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)' }}
                onClick={() => {
                  window.speechSynthesis.cancel();
                  const currentVoice = voices.find(v => v.voiceURI === ttsSettings.voiceURI);
                  const isHaruka = currentVoice
                    ? (currentVoice.name.toLowerCase().includes('haruka') || currentVoice.name.includes('遥') || currentVoice.name.includes('はるか'))
                    : false;
                  const testText = isHaruka ? "遥の音声テストです。設定速度で読み上げています。" : "一郎の音声テストです。設定速度で読み上げています。";
                  const u = new SpeechSynthesisUtterance(testText);
                  if (currentVoice) u.voice = currentVoice;
                  u.rate = ttsSettings.rate;
                  u.volume = ttsSettings.volume;
                  u.pitch = ttsSettings.pitch;
                  window.speechSynthesis.speak(u);
                }}
              >
                ▶ 再生テスト
              </button>
              <button
                className="tool-btn"
                style={{ flex: 1, justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: 'var(--panel-muted)', border: '1px solid var(--panel-item-border)' }}
                onClick={() => window.speechSynthesis.cancel()}
              >
                ■ 停止
              </button>
            </div>

            {/* ボイス選択（一郎 / 遥） */}
            <div className="setting-row">
              <div className="setting-label">ボイス (VOICE)</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                {voices.map(v => {
                  const isSelected = v.voiceURI === ttsSettings.voiceURI;
                  const isHaruka = v.name.toLowerCase().includes('haruka') || v.name.includes('遥') || v.name.includes('はるか');
                  const label = isHaruka ? '遥 (Haruka)' : '一郎 (Ichiro)';
                  const savedRate = isHaruka ? voiceRates.haruka : voiceRates.ichiro;
                  return (
                    <button
                      key={v.voiceURI}
                      type="button"
                      onClick={() => updateTtsSettings({ voiceURI: v.voiceURI })}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: isSelected ? '1.5px solid var(--sb-accent, #3b82f6)' : '1px solid var(--panel-item-border)',
                        background: isSelected ? 'var(--panel-tab-active)' : 'var(--panel-item-bg)',
                        color: isSelected ? 'var(--panel-bg)' : 'var(--panel-text)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s',
                        borderRadius: '0px'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {isHaruka ? '👩 遥' : '👨 一郎'}
                        {isSelected && <span style={{ fontSize: '9.5px', opacity: 0.85 }}>[選択中]</span>}
                      </span>
                      <span style={{ fontSize: '10px', opacity: 0.8, fontWeight: 'normal' }}>
                        速度設定: {savedRate.toFixed(1)}x
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* セレクトボックスも設置（一郎と遥のみ表示） */}
              <select
                style={{
                  width: '100%',
                  marginTop: '8px',
                  background: vals.theme === 'midnight' || vals.theme === 'obsidian' || vals.theme === 'rose' || vals.theme === 'black' ? 'rgba(0,0,0,0.2)' : 'var(--panel-item-bg)',
                  color: vals.theme === 'midnight' || vals.theme === 'obsidian' || vals.theme === 'black' ? '#FFF' : 'var(--panel-text)',
                  border: '1px solid var(--panel-item-border)',
                  borderRadius: '0px',
                  padding: '7px 8px',
                  fontSize: '11px',
                  outline: 'none'
                }}
                value={ttsSettings.voiceURI}
                onChange={e => updateTtsSettings({ voiceURI: e.target.value })}
              >
                {voices.map(v => {
                  const isHaruka = v.name.toLowerCase().includes('haruka') || v.name.includes('遥') || v.name.includes('はるか');
                  const label = isHaruka ? '遥 (Haruka)' : '一郎 (Ichiro)';
                  const savedRate = isHaruka ? voiceRates.haruka : voiceRates.ichiro;
                  return (
                    <option
                      key={v.voiceURI}
                      value={v.voiceURI}
                      style={{
                        background: vals.theme === 'midnight' ? '#0f172a' : vals.theme === 'obsidian' ? '#0A0A0A' : vals.theme === 'black' ? '#0B0C0D' : '#FFF',
                        color: vals.theme === 'midnight' || vals.theme === 'obsidian' || vals.theme === 'black' ? '#FFF' : '#000'
                      }}
                    >
                      {label} — 速度: {savedRate.toFixed(1)}x ({v.name})
                    </option>
                  );
                })}
              </select>
            </div>
            
            <div className="setting-row">
              {(() => {
                const currentVoice = voices.find(v => v.voiceURI === ttsSettings.voiceURI);
                const isHaruka = currentVoice
                  ? (currentVoice.name.toLowerCase().includes('haruka') || currentVoice.name.includes('遥') || currentVoice.name.includes('はるか'))
                  : false;
                const currentName = isHaruka ? '遥' : '一郎';
                return (
                  <>
                    <div className="setting-label">
                      <span>速度 (SPEED) — <strong>{currentName}専用</strong></span>
                      <span>{ttsSettings.rate.toFixed(1)}x</span>
                    </div>
                    <input
                      className="setting-slider"
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={ttsSettings.rate}
                      onChange={e => updateTtsSettings({ rate: parseFloat(e.target.value) })}
                    />
                  </>
                );
              })()}
            </div>
            <div className="setting-row">
              <div className="setting-label">音量 (VOL) <span>{Math.round(ttsSettings.volume * 100)}%</span></div>
              <input className="setting-slider" type="range" min="0" max="1" step="0.05" value={ttsSettings.volume} onChange={e => updateTtsSettings({ volume: parseFloat(e.target.value) })} />
            </div>
            <div className="setting-row">
              <div className="setting-label">音程 (PITCH) <span>{ttsSettings.pitch.toFixed(1)}</span></div>
              <input className="setting-slider" type="range" min="0" max="2" step="0.1" value={ttsSettings.pitch} onChange={e => updateTtsSettings({ pitch: parseFloat(e.target.value) })} />
            </div>
            <div style={{ textAlign: 'center', fontSize: '10px', opacity: 0.5, marginTop: '20px', lineHeight: '1.5' }}>
              ※段落をクリックで<br/>その箇所から読み上げ
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
