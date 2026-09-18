import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { THEMES } from '../theme';

interface ThemeQuickToggleProps {
  compact?: boolean;
}

export const ThemeQuickToggle: React.FC<ThemeQuickToggleProps> = ({ compact = false }) => {
  const { currentTheme, setTheme, cycleTheme, lang } = useAppContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const curThemeObj = THEMES[currentTheme] || THEMES.mono;
  const curLabel = curThemeObj.label || currentTheme;

  // テーマキーのリスト
  const themeKeys = Object.keys(THEMES);
  const curIndex = themeKeys.indexOf(currentTheme);
  const nextThemeKey = themeKeys[(curIndex + 1) % themeKeys.length];
  const nextThemeLabel = THEMES[nextThemeKey]?.label || nextThemeKey;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <div 
      ref={containerRef} 
      className="theme-quick-toggle-container"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'stretch',
        height: '26px',
        width: compact ? '90px' : '102px',
        boxSizing: 'border-box',
        background: 'var(--btn-bg, rgba(120, 120, 120, 0.08))',
        border: '1px solid var(--btn-border, var(--card-border, rgba(120, 120, 120, 0.25)))',
        borderRadius: '0px',
        overflow: 'visible',
        userSelect: 'none',
        flexShrink: 0
      }}
    >
      {/* メインのトグルボタン（クリックで次のテーマへ即座に切り替え） */}
      <button
        type="button"
        className="theme-quick-toggle-btn"
        onClick={(e) => {
          e.stopPropagation();
          cycleTheme();
        }}
        title={lang === 'en' ? `Click to cycle theme (Current: ${curLabel} ➔ Next: ${nextThemeLabel})` : `クリックでテーマ順次切り替え（現在: ${curLabel} ➔ 次: ${nextThemeLabel}）`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: compact ? '0 3px 0 5px' : '0 5px 0 7px',
          height: '100%',
          flex: 1,
          minWidth: 0,
          border: 'none',
          background: 'transparent',
          color: 'var(--btn-text, inherit)',
          fontSize: '10.5px',
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden'
        }}
      >
        {/* 小さなテーマプレビューカラー丸 */}
        <span 
          style={{
            display: 'inline-block',
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            background: curThemeObj.sbAccent || curThemeObj.mainText || '#888',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 0 2px rgba(0,0,0,0.3)',
            flexShrink: 0
          }}
        />
        <span 
          style={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap', 
            textAlign: 'left',
            flex: 1
          }}
        >
          {curLabel}
        </span>
      </button>

      {/* ドロップダウン開閉ボタン（全テーマ直接選択） */}
      <button
        type="button"
        className="theme-quick-dropdown-arrow"
        onClick={(e) => {
          e.stopPropagation();
          setDropdownOpen(!dropdownOpen);
        }}
        title={lang === 'en' ? 'Select theme from list' : 'テーマ一覧から直接選ぶ'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 5px',
          height: '100%',
          width: '18px',
          boxSizing: 'border-box',
          flexShrink: 0,
          border: 'none',
          borderLeft: '1px solid var(--btn-border, var(--card-border, rgba(120, 120, 120, 0.25)))',
          background: dropdownOpen ? 'var(--sb-item-active, rgba(120, 120, 120, 0.15))' : 'transparent',
          color: 'var(--btn-text, inherit)',
          fontSize: '8px',
          cursor: 'pointer',
          opacity: 0.8
        }}
      >
        ▼
      </button>

      {/* ドロップダウンパレット */}
      {dropdownOpen && (
        <div
          className="theme-quick-palette-popup"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 9999,
            minWidth: '150px',
            background: 'var(--panel-bg, #1e293b)',
            border: '1px solid var(--panel-border, rgba(255, 255, 255, 0.15))',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            borderRadius: '0px'
          }}
        >
          <div 
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 6px',
              color: 'var(--panel-muted, #94a3b8)',
              borderBottom: '1px solid var(--panel-border, rgba(255,255,255,0.1))',
              marginBottom: '2px',
              letterSpacing: '0.5px'
            }}
          >
            🎨 {lang === 'en' ? 'QUICK THEME' : 'テーマ切り替え'}
          </div>
          {Object.entries(THEMES).map(([key, t]) => {
            const isSelected = currentTheme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTheme(key);
                  setDropdownOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 8px',
                  fontSize: '11px',
                  fontWeight: isSelected ? 700 : 500,
                  border: 'none',
                  background: isSelected ? 'var(--sb-item-active, rgba(255, 255, 255, 0.12))' : 'transparent',
                  color: isSelected ? 'var(--sb-accent, #60a5fa)' : 'var(--panel-text, #e2e8f0)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: '0px',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div 
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: t.sbBg,
                      border: `2px solid ${t.sbAccent || t.mainText || '#888'}`,
                      flexShrink: 0
                    }}
                  />
                  <span>{t.label}</span>
                </div>
                {isSelected && <span style={{ fontSize: '10px' }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
