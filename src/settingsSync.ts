import React, { useEffect } from 'react';
import { THEMES, FONT_MAP, applyThemeStyle } from './theme';

export function applySettingsToDOM() {
  const fs = localStorage.getItem('lv_fontSize') || '15';
  const fw = localStorage.getItem('lv_fontWeight') || '400';
  const lh = localStorage.getItem('lv_lineHeight') || '1.8';
  const ls = localStorage.getItem('lv_letterSpacing') || '0';
  const cp = localStorage.getItem('lv_cardPadding') || '24';
  const cr = localStorage.getItem('lv_cardRadius') || '16';
  const mg = localStorage.getItem('lv_msgGap') || '16';
  const hs = parseInt(localStorage.getItem('lv_headingSize') || '48');
  const sp = localStorage.getItem('lv_pagePad') || '56';

  document.querySelectorAll('.msg-body, #plain-text, #edit-area').forEach(el => {
    const e = el as HTMLElement;
    e.style.fontSize = fs + 'px';
    e.style.fontWeight = fw;
    e.style.lineHeight = lh;
    e.style.letterSpacing = ls + 'px';
  });

  document.querySelectorAll('.msg-body, #plain-text').forEach(el => {
    const e = el as HTMLElement;
    e.style.padding = cp + 'px ' + Math.round(parseInt(cp) * 1.2) + 'px';
    e.style.borderRadius = cr + 'px';
  });

  const msgs = document.getElementById('messages');
  if (msgs) msgs.style.gap = mg + 'px';

  document.documentElement.style.setProperty('--sidebar-title-size', (localStorage.getItem('lv_sbTitleSize') || '13') + 'px');
  document.documentElement.style.setProperty('--heading-font-size', hs + 'px');
  document.documentElement.style.setProperty('--heading-letter-spacing', hs >= 56 ? '-2px' : hs >= 48 ? '-1px' : '0px');
  document.documentElement.style.setProperty('--sb-width', (localStorage.getItem('lv_sbWidth') || '280') + 'px');
  document.documentElement.style.setProperty('--content-max-width', (localStorage.getItem('lv_contentWidth') || '900') + 'px');
  
  const contentArea = document.getElementById('content-area');
  if (contentArea) contentArea.style.padding = `48px ${sp}px 40px`;
  
  const footer = document.getElementById('footer');
  if (footer) footer.style.padding = `12px ${sp}px`;
  
  const fontKey = localStorage.getItem('lv_font') || 'hiragino';
  const fontVal = FONT_MAP[fontKey] || FONT_MAP.hiragino;
  document.documentElement.style.setProperty('--font-body', fontVal);
  const searchBox = document.getElementById('search-box');
  if (searchBox) searchBox.style.fontFamily = fontVal;

  applyThemeStyle(localStorage.getItem('lv_theme') || 'mono');
}

export function initSettings() {
  const defs: Record<string, string> = {
    lv_fontSize: '15', lv_fontWeight: '400', lv_lineHeight: '1.8', lv_letterSpacing: '0',
    lv_sbTitleSize: '13', lv_headingSize: '48', lv_sbWidth: '280', lv_contentWidth: '900',
    lv_cardPadding: '24', lv_cardRadius: '16', lv_msgGap: '16', lv_pagePad: '56',
    lv_theme: 'mono', lv_font: 'hiragino'
  };
  Object.entries(defs).forEach(([k, v]) => {
    if (!localStorage.getItem(k)) localStorage.setItem(k, v);
  });
}
