import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { THEMES, FONT_MAP, applyThemeStyle } from '../theme';
import { applySettingsToDOM } from '../settingsSync';

export const SettingsPanel = () => {
  const { settingsOpen, t, lang, speakerModeEnabled, setSpeakerMode, ttsSettings, updateTtsSettings, voices, writingMode } = useAppContext();
  const [tab, setTab] = useState<'text' | 'layout' | 'theme' | 'audio'>('text');
  const panelRef = useRef<HTMLDivElement>(null);

  const [vals, setVals] = useState({
    fontSize: '15', fontWeight: '400', lineHeight: '1.8', letterSpacing: '0',
    sbTitleSize: '13', headingSize: '48', sbWidth: '280', contentWidth: '900',
    verticalHeight: '100',
    cardPadding: '24', cardRadius: '16', msgGap: '16', pagePad: '120',
    theme: 'mono', font: 'meiryo',
    sbCatSize: '10', folderColor: '#FBBF24'
  });

  useEffect(() => {
    setVals({
      fontSize: localStorage.getItem('lv_fontSize') || '15',
      fontWeight: localStorage.getItem('lv_fontWeight') || '400',
      lineHeight: localStorage.getItem('lv_lineHeight') || '1.8',
      letterSpacing: localStorage.getItem('lv_letterSpacing') || '0',
      sbTitleSize: localStorage.getItem('lv_sbTitleSize') || '13',
      headingSize: localStorage.getItem('lv_headingSize') || '48',
      sbWidth: localStorage.getItem('lv_sbWidth') || '280',
      contentWidth: localStorage.getItem('lv_contentWidth') || '900',
      verticalHeight: localStorage.getItem('lv_verticalHeight') || '100',
      cardPadding: localStorage.getItem('lv_cardPadding') || '24',
      cardRadius: localStorage.getItem('lv_cardRadius') || '16',
      msgGap: localStorage.getItem('lv_msgGap') || '16',
      pagePad: localStorage.getItem('lv_pagePad') || '120',
      theme: localStorage.getItem('lv_theme') || 'mono',
      font: localStorage.getItem('lv_font') || 'meiryo',
      sbCatSize: localStorage.getItem('lv_sbCatSize') || '10',
      folderColor: localStorage.getItem('lv_folderColor') || '#FBBF24'
    });
  }, [settingsOpen]);

  const updateSetting = (key: string, val: string) => {
    localStorage.setItem(`lv_${key}`, val);
    setVals(prev => ({ ...prev, [key]: val }));
    applySettingsToDOM();
  };

  if (!settingsOpen) return null;

  return (
    <div id="settings-panel" ref={panelRef} className="open" onClick={e => e.stopPropagation()}>
      <div className="panel-tabs">
        <button className={`panel-tab ${tab === 'text' ? 'active' : ''}`} onClick={() => setTab('text')}>{t.settings.textOpen}</button>
        <button className={`panel-tab ${tab === 'layout' ? 'active' : ''}`} onClick={() => setTab('layout')}>{t.settings.layoutOpen}</button>
        <button className={`panel-tab ${tab === 'theme' ? 'active' : ''}`} onClick={() => setTab('theme')}>{t.settings.themeOpen}</button>
        <button className={`panel-tab ${tab === 'audio' ? 'active' : ''}`} onClick={() => setTab('audio')}>{t.settings.audioOpen}</button>
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
                  borderRadius: '7px',
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
              <div className="setting-label">{t.settings.sbWidth} <span id="sb-width-val">{vals.sbWidth}px</span></div>
              <input className="setting-slider" type="range" min="180" max="540" step="10" value={vals.sbWidth} onChange={e => updateSetting('sbWidth', e.target.value)} />
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.contentWidth} <span id="content-width-val">{vals.contentWidth}px</span></div>
              <input className="setting-slider" type="range" min="480" max="1400" step="20" value={vals.contentWidth} onChange={e => updateSetting('contentWidth', e.target.value)} />
            </div>
            {writingMode === 'vertical' && (
              <div className="setting-row">
                <div className="setting-label">{lang === 'en' ? 'Vertical Card Height' : '縦書きカードの高さ'} <span id="vertical-height-val">{vals.verticalHeight}%</span></div>
                <input className="setting-slider" type="range" min="40" max="100" step="5" value={vals.verticalHeight} onChange={e => updateSetting('verticalHeight', e.target.value)} />
              </div>
            )}
            <div className="setting-row">
              <div className="setting-label">{t.settings.cardPadding} <span id="card-padding-val">{vals.cardPadding}px</span></div>
              <input className="setting-slider" type="range" min="10" max="48" step="2" value={vals.cardPadding} onChange={e => updateSetting('cardPadding', e.target.value)} />
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.cardRadius} <span id="card-radius-val">{vals.cardRadius}px</span></div>
              <input className="setting-slider" type="range" min="0" max="32" step="2" value={vals.cardRadius} onChange={e => updateSetting('cardRadius', e.target.value)} />
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.msgGap} <span id="msg-gap-val">{vals.msgGap}px</span></div>
              <input className="setting-slider" type="range" min="4" max="40" step="2" value={vals.msgGap} onChange={e => updateSetting('msgGap', e.target.value)} />
            </div>
            <div className="setting-row">
              <div className="setting-label">{t.settings.pagePad} <span id="page-pad-val">{vals.pagePad}px</span></div>
              <input className="setting-slider" type="range" min="16" max="120" step="4" value={vals.pagePad} onChange={e => updateSetting('pagePad', e.target.value)} />
            </div>
          </div>
        )}

        {tab === 'theme' && (
          <div className="tab-section active">
            <div className="setting-row">
              <div className="setting-label" style={{marginBottom:'14px'}}>{t.settings.theme}</div>
              <div className="theme-grid">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button key={key} className={`theme-btn ${vals.theme === key ? 'active' : ''}`} onClick={() => updateSetting('theme', key)}>
                    <div className="theme-preview">
                      <div className="theme-preview-sb" style={{background: t.sbBg}}></div>
                      <div className="theme-preview-main" style={{background: t.mainBg}}></div>
                    </div>
                    <div className="theme-preview-label">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-row" style={{marginTop: '20px'}}>
              <div className="setting-label">{lang === 'en' ? 'Folder Icon Color' : 'フォルダーアイコン色'}</div>
              <div style={{display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center'}}>
                {['#FBBF24', '#60A5FA', '#34D399', '#F87171', '#A78BFA', '#9CA3AF', '#FFF'].map(col => (
                  <button 
                    key={col} 
                    onClick={() => updateSetting('folderColor', col)}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%', background: col,
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
                  style={{ width: '28px', height: '28px', padding: 0, border: '1px solid var(--panel-border)', cursor: 'pointer', background: 'transparent', borderRadius: '4px' }}
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
                  const u = new SpeechSynthesisUtterance("音声機能のテストです。");
                  const v = voices.find(v => v.voiceURI === ttsSettings.voiceURI);
                  if (v) u.voice = v;
                  u.rate = ttsSettings.rate;
                  u.volume = ttsSettings.volume;
                  u.pitch = ttsSettings.pitch;
                  window.speechSynthesis.speak(u);
                }}
              >
                ▶ 再生
              </button>
              <button
                className="tool-btn"
                style={{ flex: 1, justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: 'var(--panel-muted)', border: '1px solid var(--panel-item-border)' }}
                onClick={() => window.speechSynthesis.cancel()}
              >
                ■ 停止
              </button>
            </div>
            
            <div className="setting-row">
              <div className="setting-label">速度 (SPEED) <span>{ttsSettings.rate.toFixed(1)}x</span></div>
              <input className="setting-slider" type="range" min="0.5" max="3.0" step="0.1" value={ttsSettings.rate} onChange={e => updateTtsSettings({ rate: parseFloat(e.target.value) })} />
            </div>
            <div className="setting-row">
              <div className="setting-label">音量 (VOL) <span>{Math.round(ttsSettings.volume * 100)}%</span></div>
              <input className="setting-slider" type="range" min="0" max="1" step="0.05" value={ttsSettings.volume} onChange={e => updateTtsSettings({ volume: parseFloat(e.target.value) })} />
            </div>
            <div className="setting-row">
              <div className="setting-label">音程 (PITCH) <span>{ttsSettings.pitch.toFixed(1)}</span></div>
              <input className="setting-slider" type="range" min="0" max="2" step="0.1" value={ttsSettings.pitch} onChange={e => updateTtsSettings({ pitch: parseFloat(e.target.value) })} />
            </div>
            <div className="setting-row">
              <div className="setting-label">ボイス (VOICE)</div>
              <select
                style={{ width: '100%', background: vals.theme === 'midnight' || vals.theme === 'obsidian' || vals.theme === 'rose' || vals.theme === 'ocean' ? 'rgba(0,0,0,0.2)' : 'var(--panel-item-bg)', color: vals.theme === 'midnight' || vals.theme === 'obsidian' ? '#FFF' : 'var(--panel-text)', border: '1px solid var(--panel-item-border)', borderRadius: '8px', padding: '8px', fontSize: '11px', outline: 'none' }}
                value={ttsSettings.voiceURI}
                onChange={e => updateTtsSettings({ voiceURI: e.target.value })}
              >
                {voices.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI} style={{ background: vals.theme === 'midnight' ? '#0f172a' : vals.theme === 'obsidian' ? '#0A0A0A' : '#FFF', color: vals.theme === 'midnight' || vals.theme === 'obsidian' ? '#FFF' : '#000' }}>{v.name} ({v.lang})</option>
                ))}
              </select>
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
