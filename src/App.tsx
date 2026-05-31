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

  return (
    <AppProvider>
      <Sidebar />
      <SettingsPanel />
      <MainContent />
    </AppProvider>
  );
}
