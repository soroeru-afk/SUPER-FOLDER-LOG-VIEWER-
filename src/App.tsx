import React, { useEffect } from 'react';
import { AppProvider } from './AppContext';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { SettingsPanel } from './components/SettingsPanel';
import { applySettingsToDOM } from './settingsSync';

export default function App() {
  useEffect(() => {
    // 最初のマウント時にDOMに設定を適用
    applySettingsToDOM();
    
    // 定期的にDOM設定を上書き（Reactの再レンダリングで消えるのを防ぐため、一部のstyleが残るように。基本的にSettingsPanelが担当するが安全担保）
    const observer = new MutationObserver((mutations) => {
      // Bodyの直接設定などはここでは行わない、applySettingsToDOMが初期値を保証
    });
    observer.observe(document.body, { childList: true, subtree: false });
    return () => observer.disconnect();
  }, []);



  // ウィンドウサイズ・位置の復元と保存
  useEffect(() => {
    try {
      const savedX = localStorage.getItem('super_folder_win_x');
      const savedY = localStorage.getItem('super_folder_win_y');
      const savedW = localStorage.getItem('super_folder_win_w');
      const savedH = localStorage.getItem('super_folder_win_h');
      
      if (savedW && savedH) {
        const w = parseInt(savedW, 10);
        const h = parseInt(savedH, 10);
        window.resizeTo(w, h);
        if (savedX && savedY) {
          const x = parseInt(savedX, 10);
          const y = parseInt(savedY, 10);
          window.moveTo(x, y);
        }
      } else {
        // デフォルトサイズ: 横書き/縦書きが快適に見える広めのサイズ
        window.resizeTo(1440, 900);
      }
    } catch (e) {
      console.error('Failed to load window size', e);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      try {
        const x = window.screenX !== undefined ? window.screenX : window.screenLeft;
        const y = window.screenY !== undefined ? window.screenY : window.screenTop;
        const w = window.outerWidth;
        const h = window.outerHeight;
        if (w > 0 && h > 0) {
          localStorage.setItem('super_folder_win_x', String(x));
          localStorage.setItem('super_folder_win_y', String(y));
          localStorage.setItem('super_folder_win_w', String(w));
          localStorage.setItem('super_folder_win_h', String(h));
        }
      } catch (e) {
        console.error('Failed to save window size', e);
      }
    };
    
    window.addEventListener('resize', handleResize);
    // 位置移動を検知するために定期的に保存
    const interval = setInterval(handleResize, 1000);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, []);

  return (
    <AppProvider>
      <Sidebar />
      <SettingsPanel />
      <MainContent />
    </AppProvider>
  );
}
