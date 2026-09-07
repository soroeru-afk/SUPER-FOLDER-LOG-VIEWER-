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

  document.documentElement.style.setProperty('--text-font-size', fs + 'px');
  document.documentElement.style.setProperty('--text-font-weight', fw);
  document.documentElement.style.setProperty('--text-line-height', lh);
  document.documentElement.style.setProperty('--text-letter-spacing', ls + 'px');
  
  document.documentElement.style.setProperty('--card-padding-v', cp + 'px');
  document.documentElement.style.setProperty('--card-padding-h', Math.round(parseInt(cp) * 1.2) + 'px');
  document.documentElement.style.setProperty('--card-radius', cr + 'px');
  document.documentElement.style.setProperty('--msg-gap', mg + 'px');

  document.documentElement.style.setProperty('--sidebar-title-size', (localStorage.getItem('lv_sbTitleSize') || '13') + 'px');
  document.documentElement.style.setProperty('--sb-category-size', (localStorage.getItem('lv_sbCatSize') || '10') + 'px');
  document.documentElement.style.setProperty('--sb-folder-color', localStorage.getItem('lv_folderColor') || '');
  document.documentElement.style.setProperty('--heading-font-size', hs + 'px');
  document.documentElement.style.setProperty('--heading-letter-spacing', hs >= 56 ? '-2px' : hs >= 48 ? '-1px' : '0px');
  document.documentElement.style.setProperty('--sb-width', (localStorage.getItem('lv_sbWidth') || '280') + 'px');
  document.documentElement.style.setProperty('--content-max-width', (localStorage.getItem('lv_contentWidth') || '900') + 'px');
  document.documentElement.style.setProperty('--vert-card-height', (localStorage.getItem('lv_vertCardHeight') || '600') + 'px');
  document.documentElement.style.setProperty('--page-pad', sp + 'px');
  
  const fontKey = localStorage.getItem('lv_font') || 'meiryo';
  const fontVal = FONT_MAP[fontKey] || FONT_MAP.hiragino;
  document.documentElement.style.setProperty('--font-body', fontVal);
  const searchBox = document.getElementById('search-box');
  if (searchBox) searchBox.style.fontFamily = fontVal;

  applyThemeStyle(localStorage.getItem('lv_theme') || 'mono');
}

export function initSettings() {
  const defs: Record<string, string> = {
    lv_fontSize: '15', lv_fontWeight: '400', lv_lineHeight: '1.8', lv_letterSpacing: '0',
    lv_sbTitleSize: '13', lv_sbCatSize: '10', lv_headingSize: '48', lv_sbWidth: '280', lv_contentWidth: '900', lv_vertCardHeight: '600',
    lv_cardPadding: '24', lv_cardRadius: '16', lv_msgGap: '16', lv_pagePad: '56',
    lv_theme: 'mono', lv_font: 'meiryo', lv_folderColor: '#FBBF24'
  };
  Object.entries(defs).forEach(([k, v]) => {
    if (!localStorage.getItem(k)) localStorage.setItem(k, v);
  });
}
