import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { FileObj, PhysicalFolder, CategoryObj } from './types';
import { loadFolderHandle, saveFolderHandle, saveFallbackData, loadFallbackData, parseFilename } from './utils';
import { THEMES, getPaperSettingsForTheme, setPaperModeForTheme, setPaperColorForTheme, getMainBgWhiteForTheme, setMainBgWhiteForTheme } from './theme';
import { applySettingsToDOM } from './settingsSync';
import { migrateFolderVisualSettings } from './folderVisuals';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warn';
}

export interface AppState {
  dirHandle: any | null;
  isFallbackMode: boolean;
  allFiles: FileObj[];
  allCategories: CategoryObj[];
  physicalFolders: PhysicalFolder[];
  searchQueries: string[];
  currentFileObj: FileObj | null;
  currentContent: string;
  isEditing: boolean;
  selectedFiles: Set<string>;
  selectedFileMap: Map<string, FileObj>;
  isSelectMode: boolean;
  settingsOpen: boolean;
  isHighlightOff: boolean;
  categoryOpenState: Record<string, boolean>;
  movePanelState: { isOpen: boolean, type: 'single'|'bulk'|'folder', mode?: 'move'|'shortcut'|'duplicate', triggerRect?: any } | null;
  setMovePanelMode: (mode: 'move'|'shortcut'|'duplicate') => void;
  loading: boolean;
  refreshing: boolean;
  sortMode: 'date' | 'name' | 'custom';
  sortDirection: 'asc' | 'desc';
  viewMode: 'reader' | 'explorer';
  setViewMode: (mode: 'reader' | 'explorer') => void;
  explorerCategory: string | null;
  setExplorerCategory: (cat: string | null) => void;
  openExplorer: (catName?: string | null) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  goBackExplorer: () => void;
  goForwardExplorer: () => void;

  setSortMode: (mode: 'date' | 'name' | 'custom') => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
  customFileOrders: Record<string, string[]>;
  saveFolderCustomOrder: (folderKey: string, filenames: string[]) => void;
  resetFolderCustomOrder: (folderKey: string) => void;
  customFolderOrders: Record<string, string[]>;
  saveFolderCustomFolderOrder: (parentKey: string, folderNames: string[]) => void;
  resetFolderCustomFolderOrder: (parentKey: string) => void;
  openFolder: () => Promise<void>;
  reopenFolder: () => Promise<void>;
  refreshFolder: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  removeSearchQuery: (query: string) => void;
  selectFile: (f: FileObj) => void;
  toggleEdit: () => void;
  saveFile: (content: string) => Promise<void>;
  toggleSelectMode: () => void;
  toggleFileSelection: (f: FileObj) => void;
  selectFileRange: (targetFile: FileObj, orderedFiles: FileObj[], forceSelect?: boolean) => void;
  selectAllFiles: (files: FileObj[]) => void;
  deselectAllFiles: (files: FileObj[]) => void;
  clearFileSelection: () => void;
  toggleHighlight: () => void;
  toggleSettings: () => void;
  setCategoryOpen: (key: string, open: boolean) => void;
  expandAllGroups: () => void;
  collapseAllGroups: () => void;
  
  openMovePanel: (e: React.MouseEvent, type: 'single'|'bulk'|'folder', defaultMode?: 'move'|'shortcut'|'duplicate') => void;
  closeMovePanels: () => void;
  execBulkMove: (files: FileObj[], destHandle: any | null, destCatName: string | null) => Promise<void>;
  moveToNewFolder: (folderName: string, isBulk: boolean) => Promise<void>;
  createShortcut: (file: FileObj, targetCatName: string | null) => Promise<void>;
  removeShortcut: (file: FileObj) => Promise<void>;
  execBulkShortcut: (files: FileObj[], destCatName: string | null) => Promise<void>;
  duplicateFile: (file: FileObj, destCatName?: string | null) => Promise<void>;
  execBulkDuplicate: (files: FileObj[], destHandle: any | null, destCatName: string | null) => Promise<void>;
  fileShortcuts: Record<string, string[]>;
  toast: ToastMessage | null;
  showToast: (message: string, type?: 'success' | 'info' | 'warn') => void;
  bulkDeleteFiles: () => Promise<void>;
  deleteCurrentFile: () => Promise<void>;
  renameCurrentFile: (newName: string) => Promise<void>;
  renameFolder: (oldName: string, folderHandle?: any, explicitNewName?: string) => Promise<boolean>;
  deleteFolder: (name: string, folderHandle: any) => Promise<void>;
  createNewFolder: (parentFolderHandle?: any, parentPath?: string | null, explicitFolderName?: string) => Promise<boolean>;
  createNewFile: (folderHandle: any) => Promise<void>;
  importExistingFiles: (targetFolderHandle: any, targetCategory?: string) => Promise<void>;
  lang: 'en' | 'ja';
  setLang: (lang: 'en' | 'ja') => void;
  t: any;
  speakerModeEnabled: boolean;
  setSpeakerMode: (val: boolean) => void;
  ttsSettings: TTSSettings;
  updateTtsSettings: (updates: Partial<TTSSettings>) => void;
  voiceRates: { ichiro: number; haruka: number };
  voices: SpeechSynthesisVoice[];
  writingMode: 'horizontal' | 'vertical';
  setWritingMode: (mode: 'horizontal' | 'vertical') => void;
  currentTheme: string;
  setTheme: (themeKey: string) => void;
  cycleTheme: () => void;
  paperMode: boolean;
  paperColor: 'beige' | 'white';
  setPaperColor: (color: 'beige' | 'white') => void;
  setPaperMode: (val: boolean) => void;
  togglePaperMode: () => void;
  loadPaperForTheme: (themeKey: string) => void;
  mainBgWhite: boolean;
  setMainBgWhite: (val: boolean) => void;
  toggleMainBgWhite: () => void;
  sidebarPosition: 'left' | 'right';
  setSidebarPosition: (pos: 'left' | 'right') => void;
  toggleSidebarPosition: () => void;
  fileMarks: Record<string, string>;
  setFileMark: (filename: string, mark: string) => void;
  setBulkFileMarks: (filenames: string[], mark: string) => void;
  hasPrevFile: boolean;
  hasNextFile: boolean;
  goToPrevFile: () => void;
  goToNextFile: () => void;
  isResuming: boolean;
  pendingResumeHandle: any;
  resumeSavedFolder: () => Promise<void>;
}

export interface TTSSettings {
  rate: number;
  volume: number;
  pitch: number;
  voiceURI: string;
}

const AppContext = createContext<AppState | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

import { translations, Language } from './i18n';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [dirHandle, setDirHandle] = useState<any | null>(null);
  const [rawFiles, setRawFiles] = useState<FileObj[]>([]);
  const [fileShortcuts, setFileShortcutsState] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('lv_file_shortcuts');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const fileShortcutsRef = useRef<Record<string, string[]>>(fileShortcuts);
  const setFileShortcuts = (updater: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) => {
    setFileShortcutsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      fileShortcutsRef.current = next;
      return next;
    });
  };

  const buildAllFiles = (physical: FileObj[], shortcuts: Record<string, string[]>, pFolders: PhysicalFolder[]): FileObj[] => {
    const pFolderMap = new Map<string, any>();
    pFolders.forEach(pf => pFolderMap.set(pf.name, pf.handle));

    const virtualShortcuts: FileObj[] = [];

    physical.forEach(rf => {
      const key = (rf.category || '') + '::' + rf.filename;
      const targets = shortcuts[key] || [];
      targets.forEach(targetCat => {
        if (targetCat === (rf.category || '')) return;
        virtualShortcuts.push({
          filename: rf.filename,
          handle: rf.handle,
          category: targetCat || null,
          folderHandle: targetCat ? (pFolderMap.get(targetCat) || null) : null,
          date: rf.date,
          time: rf.time,
          title: rf.title,
          dateSource: rf.dateSource,
          content: rf.content,
          isShortcut: true,
          originalCategory: rf.category,
          originalFilename: rf.filename
        });
      });
    });

    return [...physical, ...virtualShortcuts];
  };

  const [allFiles, setAllFiles] = useState<FileObj[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryObj[]>([]);
  const [physicalFolders, setPhysicalFolders] = useState<PhysicalFolder[]>([]);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  
  const [currentFileObj, setCurrentFileObj] = useState<FileObj | null>(null);
  const [currentContent, setCurrentContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFileMap, setSelectedFileMap] = useState<Map<string, FileObj>>(new Map());
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isHighlightOff, setIsHighlightOff] = useState(() => localStorage.getItem('lv_highlightOff') === '1');
  const [speakerModeEnabled, setSpeakerModeEnabled] = useState(() => localStorage.getItem('lv_speakerMode') === '1');
  
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const [sortMode, setSortModeState] = useState<'date' | 'name' | 'custom'>(
    () => (localStorage.getItem('lv_sortMode') as 'date' | 'name' | 'custom') || 'date'
  );
  const [sortDirection, setSortDirectionState] = useState<'asc' | 'desc'>(
    () => (localStorage.getItem('lv_sortDirection') as 'asc' | 'desc') || 'desc'
  );

  const [customFileOrders, setCustomFileOrders] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('lv_custom_file_orders');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const saveFolderCustomOrder = (folderKey: string, filenames: string[]) => {
    const key = folderKey || '__root__';
    setCustomFileOrders(prev => {
      const next = { ...prev, [key]: filenames };
      localStorage.setItem('lv_custom_file_orders', JSON.stringify(next));
      return next;
    });
  };

  const resetFolderCustomOrder = (folderKey: string) => {
    const key = folderKey || '__root__';
    setCustomFileOrders(prev => {
      const next = { ...prev };
      delete next[key];
      localStorage.setItem('lv_custom_file_orders', JSON.stringify(next));
      return next;
    });
    setCustomFolderOrders(prev => {
      const next = { ...prev };
      delete next[key];
      localStorage.setItem('lv_custom_folder_orders', JSON.stringify(next));
      return next;
    });
  };

  const [customFolderOrders, setCustomFolderOrders] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('lv_custom_folder_orders');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const saveFolderCustomFolderOrder = (parentKey: string, folderNames: string[]) => {
    const key = parentKey || '__root__';
    setCustomFolderOrders(prev => {
      const next = { ...prev, [key]: folderNames };
      localStorage.setItem('lv_custom_folder_orders', JSON.stringify(next));
      return next;
    });
  };

  const resetFolderCustomFolderOrder = (parentKey: string) => {
    const key = parentKey || '__root__';
    setCustomFolderOrders(prev => {
      const next = { ...prev };
      delete next[key];
      localStorage.setItem('lv_custom_folder_orders', JSON.stringify(next));
      return next;
    });
  };

  const [viewMode, setViewMode] = useState<'reader' | 'explorer'>('explorer');
  const [explorerCategory, setExplorerCategory] = useState<string | null>(null);

  // フォルダー階層＆ファイル閲覧の統合移動履歴（Undo / Redo / Back / Next）
  type NavItem = 
    | { type: 'explorer'; category: string | null }
    | { type: 'file'; filename: string; category: string | null; fileObj?: FileObj };

  const isSameNavItem = (a: NavItem | undefined, b: NavItem): boolean => {
    if (!a) return false;
    if (a.type !== b.type) return false;
    if (a.type === 'explorer' && b.type === 'explorer') {
      return a.category === b.category;
    }
    if (a.type === 'file' && b.type === 'file') {
      return a.filename === b.filename && a.category === b.category;
    }
    return false;
  };

  const [navState, setNavState] = useState<{ history: NavItem[]; index: number }>({
    history: [{ type: 'explorer', category: null }],
    index: 0
  });

  const pushNav = (item: NavItem) => {
    setNavState(prev => {
      const current = prev.history[prev.index];
      if (isSameNavItem(current, item)) {
        return prev;
      }
      const newHistory = prev.history.slice(0, prev.index + 1);
      newHistory.push(item);
      return {
        history: newHistory,
        index: newHistory.length - 1
      };
    });
  };

  const openExplorer = (catName: string | null = null, fromNav = false) => {
    setExplorerCategory(catName);
    setViewMode('explorer');
    try {
      localStorage.setItem('lv_lastLocation', JSON.stringify({ type: 'explorer', category: catName || null }));
    } catch (e) {}
    if (!fromNav) {
      pushNav({ type: 'explorer', category: catName });
    }
  };

  const applyNavItem = (item: NavItem) => {
    if (item.type === 'explorer') {
      setExplorerCategory(item.category);
      setViewMode('explorer');
      try {
        localStorage.setItem('lv_lastLocation', JSON.stringify({ type: 'explorer', category: item.category || null }));
      } catch (e) {}
    } else if (item.type === 'file') {
      const target = item.fileObj || allFiles.find(
        f => f.filename === item.filename && (item.category ? f.category === item.category : true)
      );
      if (target) {
        setCurrentFileObj(target);
        setCurrentContent(target.content);
        setIsEditing(false);
        setViewMode('reader');
        if (target.category) {
          setExplorerCategory(target.category);
        }
        try {
          localStorage.setItem('lv_lastLocation', JSON.stringify({ type: 'file', filename: target.filename, category: target.category || null }));
          localStorage.setItem('lv_lastFile', JSON.stringify({ filename: target.filename, category: target.category || null }));
        } catch (e) {}
      } else {
        setExplorerCategory(item.category);
        setViewMode('explorer');
        try {
          localStorage.setItem('lv_lastLocation', JSON.stringify({ type: 'explorer', category: item.category || null }));
        } catch (e) {}
      }
    }
  };

  const canGoBack = navState.index > 0;
  const canGoForward = navState.index < navState.history.length - 1;

  const goBack = () => {
    if (navState.index > 0) {
      const newIndex = navState.index - 1;
      const target = navState.history[newIndex];
      setNavState(prev => ({ ...prev, index: newIndex }));
      applyNavItem(target);
    }
  };

  const goForward = () => {
    if (navState.index < navState.history.length - 1) {
      const newIndex = navState.index + 1;
      const target = navState.history[newIndex];
      setNavState(prev => ({ ...prev, index: newIndex }));
      applyNavItem(target);
    }
  };

  const goBackExplorer = goBack;
  const goForwardExplorer = goForward;

  const restoreLastLocation = (files: FileObj[], pFolders: PhysicalFolder[]) => {
    try {
      const lastLocRaw = localStorage.getItem('lv_lastLocation');
      if (lastLocRaw) {
        const lastLoc = JSON.parse(lastLocRaw);
        if (lastLoc.type === 'explorer') {
          const cat = lastLoc.category;
          if (!cat) {
            openExplorer(null, true);
            return;
          }
          const catExists = pFolders.some(pf => pf.name === cat) || files.some(f => f.category === cat);
          if (catExists) {
            openExplorer(cat, true);
            return;
          } else {
            openExplorer(null, true);
            return;
          }
        } else if (lastLoc.type === 'file') {
          const target = files.find(
            f => f.filename === lastLoc.filename && (lastLoc.category ? f.category === lastLoc.category : true)
          );
          if (target) {
            selectFile(target, true);
            return;
          } else if (lastLoc.category) {
            openExplorer(lastLoc.category, true);
            return;
          }
        }
      }

      // 従来の lv_lastFile フォールバック
      const lastFileRaw = localStorage.getItem('lv_lastFile');
      if (lastFileRaw) {
        const lastFileInfo = JSON.parse(lastFileRaw);
        const target = files.find(
          f => f.filename === lastFileInfo.filename && (lastFileInfo.category ? f.category === lastFileInfo.category : true)
        );
        if (target) {
          selectFile(target, true);
          return;
        }
      }

      // デフォルト: ALL DATA エクスプローラー
      openExplorer(null, true);
    } catch (e) {
      console.warn('Failed to restore last location:', e);
      openExplorer(null, true);
    }
  };

  // キーボードショートカット（Alt+←で戻る、Alt+→で進む）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((e.altKey && e.key === 'ArrowLeft') || ((e.metaKey || e.ctrlKey) && e.key === '[')) {
        if (canGoBack) {
          e.preventDefault();
          goBack();
        }
      } else if ((e.altKey && e.key === 'ArrowRight') || ((e.metaKey || e.ctrlKey) && e.key === ']')) {
        if (canGoForward) {
          e.preventDefault();
          goForward();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoBack, canGoForward, navState, allFiles]);

  const [writingMode, setWritingModeState] = useState<'horizontal' | 'vertical'>(
    () => (localStorage.getItem('lv_writingMode') as 'horizontal' | 'vertical') || 'horizontal'
  );

  const setWritingMode = (mode: 'horizontal' | 'vertical') => {
    setWritingModeState(mode);
    localStorage.setItem('lv_writingMode', mode);
  };

  const getActiveThemeKey = () => {
    const t = localStorage.getItem('lv_theme');
    return (t === 'ocean' || t === 'dark' ? 'black' : t) || 'mono';
  };

  const [paperMode, setPaperModeState] = useState<boolean>(() => {
    const theme = (localStorage.getItem('lv_theme') === 'ocean' || localStorage.getItem('lv_theme') === 'dark' ? 'black' : localStorage.getItem('lv_theme')) || 'mono';
    return getPaperSettingsForTheme(theme).mode;
  });

  const [paperColor, setPaperColorState] = useState<'beige' | 'white'>(() => {
    const theme = (localStorage.getItem('lv_theme') === 'ocean' || localStorage.getItem('lv_theme') === 'dark' ? 'black' : localStorage.getItem('lv_theme')) || 'mono';
    return getPaperSettingsForTheme(theme).color;
  });

  const setPaperColor = (color: 'beige' | 'white') => {
    setPaperColorState(color);
    const theme = getActiveThemeKey();
    setPaperColorForTheme(theme, color);
  };

  const setPaperMode = (val: boolean) => {
    setPaperModeState(val);
    const theme = getActiveThemeKey();
    setPaperModeForTheme(theme, val);
  };

  const togglePaperMode = () => {
    setPaperModeState(prev => {
      const next = !prev;
      const theme = getActiveThemeKey();
      setPaperModeForTheme(theme, next);
      return next;
    });
  };

  const loadPaperForTheme = (themeKey: string) => {
    const ps = getPaperSettingsForTheme(themeKey);
    setPaperModeState(ps.mode);
    setPaperColorState(ps.color);
  };

  const [mainBgWhite, setMainBgWhiteState] = useState<boolean>(() => {
    const theme = (localStorage.getItem('lv_theme') === 'ocean' || localStorage.getItem('lv_theme') === 'dark' ? 'black' : localStorage.getItem('lv_theme')) || 'mono';
    return getMainBgWhiteForTheme(theme);
  });

  const setMainBgWhite = (val: boolean) => {
    setMainBgWhiteState(val);
    const theme = getActiveThemeKey();
    setMainBgWhiteForTheme(theme, val);
    applySettingsToDOM();
    window.dispatchEvent(new Event('settingsChanged'));
  };

  const toggleMainBgWhite = () => {
    const theme = getActiveThemeKey();
    const next = !getMainBgWhiteForTheme(theme);
    setMainBgWhiteState(next);
    setMainBgWhiteForTheme(theme, next);
    applySettingsToDOM();
    window.dispatchEvent(new Event('settingsChanged'));
  };

  const [currentTheme, setCurrentThemeState] = useState<string>(() => getActiveThemeKey());

  const setTheme = (themeKey: string) => {
    const finalKey = (themeKey === 'ocean' || themeKey === 'dark' ? 'black' : themeKey) || 'mono';
    localStorage.setItem('lv_theme', finalKey);
    setCurrentThemeState(finalKey);
    const ps = getPaperSettingsForTheme(finalKey);
    setPaperModeState(ps.mode);
    setPaperColorState(ps.color);
    setMainBgWhiteState(getMainBgWhiteForTheme(finalKey));
    applySettingsToDOM();
    window.dispatchEvent(new Event('settingsChanged'));
  };

  const cycleTheme = () => {
    const themeKeys = Object.keys(THEMES);
    const cur = getActiveThemeKey();
    const curIdx = themeKeys.indexOf(cur);
    const nextIdx = curIdx >= 0 ? (curIdx + 1) % themeKeys.length : 0;
    setTheme(themeKeys[nextIdx]);
  };

  // テーマ切り替え時に、そのテーマ専用の設定（ペーパー設定、メイン白背景）へ自動切り替え
  useEffect(() => {
    const syncThemeSettings = () => {
      const theme = getActiveThemeKey();
      setCurrentThemeState(theme);
      const ps = getPaperSettingsForTheme(theme);
      setPaperModeState(ps.mode);
      setPaperColorState(ps.color);
      setMainBgWhiteState(getMainBgWhiteForTheme(theme));
    };
    window.addEventListener('settingsChanged', syncThemeSettings);
    return () => window.removeEventListener('settingsChanged', syncThemeSettings);
  }, []);

  useEffect(() => {
    document.body.classList.remove('paper-mode', 'paper-mode-beige', 'paper-mode-white');
    if (paperMode) {
      document.body.classList.add('paper-mode');
      if (paperColor === 'white') {
        document.body.classList.add('paper-mode-white');
      } else {
        document.body.classList.add('paper-mode-beige');
      }
    }
  }, [paperMode, paperColor]);

  const [fileMarks, setFileMarks] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('lv_file_marks');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const setFileMark = (filename: string, mark: string) => {
    setFileMarks(prev => {
      const next = { ...prev };
      if (!mark) {
        delete next[filename];
      } else {
        next[filename] = mark;
      }
      localStorage.setItem('lv_file_marks', JSON.stringify(next));
      return next;
    });
  };

  const setBulkFileMarks = (filenames: string[], mark: string) => {
    setFileMarks(prev => {
      const next = { ...prev };
      filenames.forEach(fn => {
        if (!mark) {
          delete next[fn];
        } else {
          next[fn] = mark;
        }
      });
      localStorage.setItem('lv_file_marks', JSON.stringify(next));
      return next;
    });
  };

  const setSortMode = (mode: 'date' | 'name' | 'custom') => {
    setSortModeState(mode);
    localStorage.setItem('lv_sortMode', mode);
  };

  const setSortDirection = (dir: 'asc' | 'desc') => {
    setSortDirectionState(dir);
    localStorage.setItem('lv_sortDirection', dir);
  };
  
  const detectVoiceKey = (nameOrUri: string): 'ichiro' | 'haruka' => {
    const lower = (nameOrUri || '').toLowerCase();
    if (lower.includes('haruka') || lower.includes('遥') || lower.includes('はるか')) {
      return 'haruka';
    }
    return 'ichiro';
  };

  const [voiceRates, setVoiceRates] = useState<{ ichiro: number; haruka: number }>(() => {
    const savedIchiro = localStorage.getItem('lv_ttsRate_ichiro');
    const savedHaruka = localStorage.getItem('lv_ttsRate_haruka');
    const legacyRate = localStorage.getItem('lv_ttsRate');
    const defaultRate = legacyRate ? parseFloat(legacyRate) : 1.0;
    return {
      ichiro: savedIchiro ? parseFloat(savedIchiro) : defaultRate,
      haruka: savedHaruka ? parseFloat(savedHaruka) : defaultRate
    };
  });

  const [ttsSettings, setTtsSettings] = useState<TTSSettings>(() => {
    const savedVoiceURI = localStorage.getItem('lv_ttsVoiceURI') || '';
    const vKey = detectVoiceKey(savedVoiceURI);
    const savedIchiro = localStorage.getItem('lv_ttsRate_ichiro');
    const savedHaruka = localStorage.getItem('lv_ttsRate_haruka');
    const legacyRate = localStorage.getItem('lv_ttsRate');
    const defaultRate = legacyRate ? parseFloat(legacyRate) : 1.0;
    const initialRate = vKey === 'haruka'
      ? (savedHaruka ? parseFloat(savedHaruka) : defaultRate)
      : (savedIchiro ? parseFloat(savedIchiro) : defaultRate);

    return {
      rate: initialRate,
      volume: parseFloat(localStorage.getItem('lv_ttsVolume') || '1.0'),
      pitch: parseFloat(localStorage.getItem('lv_ttsPitch') || '1.0'),
      voiceURI: savedVoiceURI
    };
  });

  useEffect(() => {
    const loadVoices = () => {
      let v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        // Google の音声は除外
        const nonGoogle = v.filter(voice => !voice.name.toLowerCase().includes('google'));
        
        // 「一郎」と「遥」のみを優先抽出（あゆみ・さやかは除外）
        const ichiroVoices = nonGoogle.filter(voice => 
          voice.name.toLowerCase().includes('ichiro') || voice.name.includes('一郎')
        );
        const harukaVoices = nonGoogle.filter(voice => 
          voice.name.toLowerCase().includes('haruka') || voice.name.includes('遥') || voice.name.includes('はるか')
        );

        let finalVoices: SpeechSynthesisVoice[] = [];
        if (ichiroVoices.length > 0 || harukaVoices.length > 0) {
          if (ichiroVoices[0]) finalVoices.push(ichiroVoices[0]);
          if (harukaVoices[0]) finalVoices.push(harukaVoices[0]);
        } else {
          // もしシステムに一郎・遥が存在しない環境（Mac等）のためのフォールバック（最大2音声）
          const jaVoices = nonGoogle.filter(voice => voice.lang.toLowerCase().startsWith('ja'));
          finalVoices = jaVoices.length > 0 ? jaVoices.slice(0, 2) : nonGoogle.slice(0, 2);
        }

        setVoices(finalVoices);

        const currentSavedURI = localStorage.getItem('lv_ttsVoiceURI') || '';
        const currentSelected = finalVoices.find(voice => voice.voiceURI === currentSavedURI);

        if (currentSelected) {
          const vKey = detectVoiceKey(currentSelected.name + ' ' + currentSelected.voiceURI);
          const activeRate = vKey === 'haruka' ? voiceRates.haruka : voiceRates.ichiro;
          setTtsSettings(prev => ({
            ...prev,
            voiceURI: currentSelected.voiceURI,
            rate: activeRate
          }));
        } else {
          // 以前のあゆみ・さやか等や未設定の場合：一郎を優先選択
          const defaultVoice = finalVoices.find(voice => 
            voice.name.toLowerCase().includes('ichiro') || voice.name.includes('一郎')
          ) || finalVoices[0];

          if (defaultVoice) {
            const vKey = detectVoiceKey(defaultVoice.name + ' ' + defaultVoice.voiceURI);
            const activeRate = vKey === 'haruka' ? voiceRates.haruka : voiceRates.ichiro;
            setTtsSettings(prev => ({
              ...prev,
              voiceURI: defaultVoice.voiceURI,
              rate: activeRate
            }));
            localStorage.setItem('lv_ttsVoiceURI', defaultVoice.voiceURI);
            localStorage.setItem('lv_ttsRate', activeRate.toString());
          }
        }
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [voiceRates.ichiro, voiceRates.haruka]);

  const updateTtsSettings = (updates: Partial<TTSSettings>) => {
    setTtsSettings(prev => {
      let nextVoiceURI = updates.voiceURI !== undefined ? updates.voiceURI : prev.voiceURI;
      let nextRate = updates.rate !== undefined ? updates.rate : prev.rate;

      // ボイスが切り替えられた場合：そのボイス（一郎 or 遥）に保持されている個別速度へ自動切り替え
      if (updates.voiceURI !== undefined && updates.voiceURI !== prev.voiceURI) {
        const targetVoice = voices.find(v => v.voiceURI === updates.voiceURI);
        const vKey = detectVoiceKey((targetVoice ? targetVoice.name : '') + ' ' + updates.voiceURI);
        nextRate = vKey === 'haruka' ? voiceRates.haruka : voiceRates.ichiro;
      }

      // 速度が変更された場合：現在選択されているボイス専用の速度として保存
      if (updates.rate !== undefined) {
        const currentVoice = voices.find(v => v.voiceURI === nextVoiceURI);
        const vKey = detectVoiceKey((currentVoice ? currentVoice.name : '') + ' ' + nextVoiceURI);
        if (vKey === 'haruka') {
          setVoiceRates(vr => {
            const nextVr = { ...vr, haruka: updates.rate! };
            localStorage.setItem('lv_ttsRate_haruka', updates.rate!.toString());
            return nextVr;
          });
        } else {
          setVoiceRates(vr => {
            const nextVr = { ...vr, ichiro: updates.rate! };
            localStorage.setItem('lv_ttsRate_ichiro', updates.rate!.toString());
            return nextVr;
          });
        }
      }

      const next = {
        ...prev,
        ...updates,
        rate: nextRate,
        voiceURI: nextVoiceURI
      };

      localStorage.setItem('lv_ttsRate', next.rate.toString());
      localStorage.setItem('lv_ttsVolume', next.volume.toString());
      localStorage.setItem('lv_ttsPitch', next.pitch.toString());
      localStorage.setItem('lv_ttsVoiceURI', next.voiceURI);
      return next;
    });
  };

  const [lang, setLangState] = useState<Language>(() => (localStorage.getItem('lv_lang') as Language) || 'ja');
  
  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('lv_lang', l);
  };
  
  const t = translations[lang];

  const [sidebarPosition, setSidebarPositionState] = useState<'left' | 'right'>(() => {
    return (localStorage.getItem('lv_sidebarPosition') as 'left' | 'right') || 'left';
  });

  const setSidebarPosition = (pos: 'left' | 'right') => {
    setSidebarPositionState(pos);
    localStorage.setItem('lv_sidebarPosition', pos);
    window.dispatchEvent(new Event('settingsChanged'));
  };

  const toggleSidebarPosition = () => {
    setSidebarPosition(sidebarPosition === 'left' ? 'right' : 'left');
  };

  const [categoryOpenState, setCategoryOpenState] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('lv_categoryOpenState');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('lv_categoryOpenState', JSON.stringify(categoryOpenState));
    } catch (e) {}
  }, [categoryOpenState]);
  
  const [movePanelState, setMovePanelState] = useState<{isOpen: boolean, type: 'single'|'bulk'|'folder', mode?: 'move'|'shortcut'|'duplicate', triggerRect?: any} | null>(null);
  const setMovePanelMode = (mode: 'move'|'shortcut'|'duplicate') => {
    setMovePanelState(prev => prev ? { ...prev, mode } : null);
  };
  
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = React.useRef<any>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warn' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: String(Date.now()), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2800);
  };
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [pendingResumeHandle, setPendingResumeHandle] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem('lv_highlightOff', isHighlightOff ? '1' : '0');
    if (isHighlightOff) {
      document.body.classList.add('highlight-off');
    } else {
      document.body.classList.remove('highlight-off');
    }
  }, [isHighlightOff]);

  useEffect(() => {
    if (isSelectMode) {
      document.body.classList.add('select-mode');
    } else {
      document.body.classList.remove('select-mode');
    }
  }, [isSelectMode]);

  const resumeSavedFolder = async () => {
    if (!pendingResumeHandle) return;
    try {
      setIsResuming(true);
      const perm = await (pendingResumeHandle as any).requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        setDirHandle(pendingResumeHandle);
        setLoading(true);
        await loadFiles(pendingResumeHandle);
        setLoading(false);
        setPendingResumeHandle(null);
      }
    } catch(e) {
      console.warn('Resume request failed:', e);
    } finally {
      setIsResuming(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      let fallbackData = await loadFallbackData();
      if (!fallbackData && !window.showDirectoryPicker) {
        const sampleContent = `# AI Search 検索ログ & Markdown再現テスト

AI Searchから出力されたリサーチ結果のMarkdownデータです。
外枠やマス目のある**枠線付きテーブル（表）**、**太字**、# 見出し、箇条書き（リスト）が綺麗に整形表示されます。

## 機能比較テーブル

| 機能名 | 従来表示 | アップデート後 | 対応状況 |
| :--- | :--- | :--- | :--- |
| テーブル（表）枠線 | 記号のまま | 外枠・マス目付きテーブル | 完了 |
| 縦組み（VERT） | 一部崩れ | 縦書き列構造で完全再現 | 完了 |
| 太字・見出し装飾 | アスタリスク | 本来のタイポグラフィ | 完了 |
| LH・SIZE連動 | 固定 | ツールバー＆設定と完全追従 | 完了 |

### 今後のスケジュール
- **Phase 1**: マークダウンパーサーの実装
- **Phase 2**: 縦組みモードおよびテーブルレスポンシブ対応
- **Phase 3**: ツールバーのLH/SIZE同期の最適化

> 本文エリアをダブルクリックすると「編集（EDIT）」モードへ瞬時に切り替わります。
`;
        const sampleFile: FileObj = {
          handle: null,
          filename: '2025-05-18_14-30_「AI Search 検索ログ & Markdownサンプル」.md',
          category: 'AI Research',
          date: '2025-05-18',
          time: '14:30',
          title: 'AI Search 検索ログ & Markdownサンプル',
          dateSource: 'filename',
          folderHandle: null,
          content: sampleContent
        };
        fallbackData = {
          rootFolderName: 'AI Search Logs',
          pFolders: [{ name: 'AI Research', handle: null }],
          fileObjs: [sampleFile]
        };
        await saveFallbackData(fallbackData);
      }

      if (!window.showDirectoryPicker) {
        if (fallbackData) {
          setDirHandle({ name: fallbackData.rootFolderName, isFallback: true });
          setIsFallbackMode(true);
          setRawFiles(fallbackData.fileObjs);
          const merged = buildAllFiles(fallbackData.fileObjs, fileShortcuts, fallbackData.pFolders);
          setAllFiles(merged);
          setPhysicalFolders(fallbackData.pFolders);
          updateFilter(merged, fallbackData.pFolders, searchQueries);
          restoreLastLocation(merged, fallbackData.pFolders);
        }
      } else {
        const handle = await loadFolderHandle();
        if (handle) {
          setIsResuming(true);
          try {
            const perm = typeof (handle as any).queryPermission === 'function'
              ? await (handle as any).queryPermission({ mode: 'readwrite' })
              : 'prompt';

            if (perm === 'granted') {
              setDirHandle(handle);
              setLoading(true);
              await loadFiles(handle);
              setLoading(false);
            } else {
              setPendingResumeHandle(handle);
            }
          } catch(e) {
            console.warn('Resume check failed:', e);
            setPendingResumeHandle(handle);
          } finally {
            setIsResuming(false);
          }
        }
      }
    };
    init();
  }, []);

  // 階層パス（例: "親フォルダー/子フォルダー"）から DirectoryHandle を再帰的に作成・取得する
  const getDirectoryHandleByPath = async (rootDirHandle: any, pathStr: string, create = true) => {
    if (!rootDirHandle || !pathStr) return rootDirHandle;
    const parts = pathStr.split('/').filter(p => p.trim().length > 0);
    let current = rootDirHandle;
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create });
    }
    return current;
  };

  const loadFiles = async (handle: any, overrideShortcuts?: Record<string, string[]>) => {
    const entries: {handle: any, category: string | null, folderHandle: any | null}[] = [];
    const pFolders: PhysicalFolder[] = [];
    
    async function collect(dirH: any, currentCat: string | null) {
      if (!dirH.values) return;
      for await (const item of dirH.values()) {
        if (item.kind === 'file' && (item.name.endsWith('.txt') || item.name.endsWith('.md'))) {
          entries.push({ handle: item, category: currentCat, folderHandle: currentCat ? dirH : null });
        } else if (item.kind === 'directory') {
          if (item.name.startsWith('.')) continue; // ignore hidden folders like .git
          const nextCat = currentCat ? `${currentCat}/${item.name}` : item.name;
          pFolders.push({ name: nextCat, handle: item });
          await collect(item, nextCat);
        }
      }
    }
    await collect(handle, null);
    
    pFolders.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    
    const files = await Promise.all(entries.map(async entry => {
      const p = parseFilename(entry.handle.name);
      const file = await entry.handle.getFile();
      const content = await file.text();
      let d = p.date, t = p.time, src = '';
      if (!d) {
        const lm = new Date(file.lastModified);
        d = `${lm.getFullYear()}-${String(lm.getMonth()+1).padStart(2,'0')}-${String(lm.getDate()).padStart(2,'0')}`;
        t = `${String(lm.getHours()).padStart(2,'0')}:${String(lm.getMinutes()).padStart(2,'0')}:${String(lm.getSeconds()).padStart(2,'0')}`;
        src = 'os';
      }
      return { 
        filename: entry.handle.name, handle: entry.handle, 
        category: entry.category, folderHandle: entry.folderHandle, 
        date: d, time: t, title: p.title || entry.handle.name.replace(/\.[^.]+$/,''), 
        dateSource: src, content 
      };
    }));
    
    files.sort((a, b) => {
      const dtA = (a.date || '') + (a.time || '');
      const dtB = (b.date || '') + (b.time || '');
      return dtB.localeCompare(dtA);
    });

    setRawFiles(files);
    
    // ディスク上の _shortcuts.json が存在する場合は読み込み同期
    let shortcutsToUse = overrideShortcuts || fileShortcutsRef.current;
    try {
      if (handle && !isFallbackMode) {
        const sf = await handle.getFileHandle('_shortcuts.json', { create: false });
        const file = await sf.getFile();
        const text = await file.text();
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object') {
            shortcutsToUse = { ...shortcutsToUse, ...parsed };
            localStorage.setItem('lv_file_shortcuts', JSON.stringify(shortcutsToUse));
            fileShortcutsRef.current = shortcutsToUse;
            setFileShortcutsState(shortcutsToUse);
          }
        }
      }
    } catch (e) {}

    const merged = buildAllFiles(files, shortcutsToUse, pFolders);
    setAllFiles(merged);
    setPhysicalFolders(pFolders);
    updateFilter(merged, pFolders, searchQueries);

    // レジューム機能: 最後に開いていた場所（ファイル／フォルダー／ALL DATA）を復元
    restoreLastLocation(merged, pFolders);
  };

  const updateFilter = (files: FileObj[], pFolders: PhysicalFolder[], queries: string[]) => {
    let filtered = files;
    if (queries.length > 0) {
      filtered = files.filter(f => {
        const target = (f.title + ' ' + f.filename + ' ' + (f.category||'') + ' ' + (f.date||'') + ' ' + f.content).toLowerCase();
        return queries.every(q => target.includes(q.toLowerCase()));
      });
    }

    const getSortableName = (filename: string) => {
      if (/^\d{8}_\d{4}_/.test(filename)) {
        return filename.slice(14);
      }
      return filename;
    };

    filtered = [...filtered].sort((a, b) => {
      if (sortMode === 'date') {
        const dtA = (a.date || '') + (a.time || '');
        const dtB = (b.date || '') + (b.time || '');
        return sortDirection === 'asc' ? dtA.localeCompare(dtB) : dtB.localeCompare(dtA);
      } else if (sortMode === 'name') {
        const nameA = getSortableName(a.filename);
        const nameB = getSortableName(b.filename);
        const cmp = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      } else {
        // sortMode === 'custom'
        const catKeyA = a.category || '__root__';
        const catKeyB = b.category || '__root__';
        if (catKeyA === catKeyB) {
          const list = customFileOrders[catKeyA] || [];
          const idxA = list.indexOf(a.filename);
          const idxB = list.indexOf(b.filename);
          const posA = idxA >= 0 ? idxA : 999999;
          const posB = idxB >= 0 ? idxB : 999999;
          if (posA !== posB) return posA - posB;
        }
        // fallback to date desc
        const dtA = (a.date || '') + (a.time || '');
        const dtB = (b.date || '') + (b.time || '');
        return dtB.localeCompare(dtA);
      }
    });

    const catMap = new Map();
    if (queries.length === 0) {
      pFolders.forEach(pf => {
        catMap.set(pf.name, { name: pf.name, handle: pf.handle, files: [] });
      });
    }

    filtered.forEach(f => {
      if(f.category) {
        if(!catMap.has(f.category)) catMap.set(f.category, { name: f.category, handle: f.folderHandle, files: [] });
        catMap.get(f.category).files.push(f);
      }
    });

    setAllCategories(Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ja')));
  };

  useEffect(() => {
    updateFilter(allFiles, physicalFolders, searchQueries);
  }, [sortMode, sortDirection, allFiles, physicalFolders, searchQueries, customFileOrders]);

  const openFolderFallback = () => {
    const input = document.createElement("input");
    input.type = "file";
    (input as any).webkitdirectory = true;
    (input as any).directory = true;

    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (!target.files || target.files.length === 0) return;

      const filesArr = Array.from(target.files);
      setLoading(true);

      const pFoldersMap = new Map<string, any>();

      const fileObjs = await Promise.all(
        filesArr
          .filter(f => f.name.endsWith('.txt') || f.name.endsWith('.md'))
          .map(async file => {
            const parts = (file as any).webkitRelativePath.split('/');
            let category: string | null = null;
            if (parts.length > 2) {
               for (let i = 1; i < parts.length - 1; i++) {
                 const catPath = parts.slice(1, i + 1).join('/');
                 pFoldersMap.set(catPath, { name: catPath, handle: null });
               }
               category = parts.slice(1, -1).join('/');
            }
            
            const p = parseFilename(file.name);
            const content = await file.text();
            let d = p.date, t = p.time, src = '';
            if (!d) {
              const lm = new Date(file.lastModified);
              d = `${lm.getFullYear()}-${String(lm.getMonth()+1).padStart(2,'0')}-${String(lm.getDate()).padStart(2,'0')}`;
              t = `${String(lm.getHours()).padStart(2,'0')}:${String(lm.getMinutes()).padStart(2,'0')}`;
              src = 'os';
            }
            
            return { 
              filename: file.name, handle: null, category, folderHandle: null, 
              date: d, time: t, title: p.title || file.name.replace(/\.[^.]+$/,''), 
              dateSource: src, content 
            } as FileObj;
          })
      );

      fileObjs.sort((a, b) => {
        const dtA = (a.date || '') + (a.time || '');
        const dtB = (b.date || '') + (b.time || '');
        return dtB.localeCompare(dtA);
      });

      const pFolders = Array.from(pFoldersMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
      
      const rootFolderName = (filesArr[0] as any).webkitRelativePath.split('/')[0] || 'Selected Folder';
      setDirHandle({ name: rootFolderName, isFallback: true });
      setIsFallbackMode(true);
      
      setRawFiles(fileObjs);
      const merged = buildAllFiles(fileObjs, fileShortcuts, pFolders);
      setAllFiles(merged);
      setPhysicalFolders(pFolders);
      updateFilter(merged, pFolders, searchQueries);
      await saveFallbackData({ fileObjs, pFolders, rootFolderName });
      setLoading(false);
    };
    input.click();
  };

  const openFolder = async () => {
    try {
      if (!window.showDirectoryPicker) {
        openFolderFallback();
        return;
      }
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      setDirHandle(handle);
      setIsFallbackMode(false);
      await saveFolderHandle(handle);
      setLoading(true);
      await loadFiles(handle);
      setLoading(false);
    } catch(e: any) {
      if (e.name !== 'AbortError') {
        openFolderFallback();
      }
    }
  };

  const reopenFolder = async () => {
    if (!window.showDirectoryPicker) {
      const fallbackData = await loadFallbackData();
      if (fallbackData) {
        setDirHandle({ name: fallbackData.rootFolderName, isFallback: true });
        setIsFallbackMode(true);
        setAllFiles(fallbackData.fileObjs);
        setPhysicalFolders(fallbackData.pFolders);
        updateFilter(fallbackData.fileObjs, fallbackData.pFolders, searchQueries);
      }
      return;
    }
    const handle = await loadFolderHandle();
    if (!handle) return;
    try {
      if (await (handle as any).requestPermission({ mode: 'readwrite' }) !== 'granted') return;
      setDirHandle(handle);
      setLoading(true);
      await loadFiles(handle);
      setLoading(false);
    } catch(e) { console.warn(e); }
  };

  const refreshFolder = async () => {
    if (!dirHandle) return;
    setRefreshing(true);
    await loadFiles(dirHandle);
    setRefreshing(false);
  };

  const setSearchQuery = (query: string) => {
    const qStr = query.trim();
    const queries = qStr ? qStr.split(/[\s　]+/).filter(s=>s) : [];
    setSearchQueries(queries);
    updateFilter(allFiles, physicalFolders, queries);
  };

  const clearSearch = () => setSearchQuery("");

  const removeSearchQuery = (query: string) => {
    const newVal = searchQueries.filter(q => q !== query).join(' ');
    setSearchQuery(newVal);
  };

  const selectFile = (f: FileObj, fromNav = false) => {
    setCurrentFileObj(f);
    setCurrentContent(f.content);
    setIsEditing(false);
    setViewMode('reader');
    if (f.category) {
      setExplorerCategory(f.category);
    }
    try {
      localStorage.setItem('lv_lastLocation', JSON.stringify({ type: 'file', filename: f.filename, category: f.category || null }));
      localStorage.setItem('lv_lastFile', JSON.stringify({ filename: f.filename, category: f.category || null }));
    } catch (e) {}
    if (!fromNav) {
      pushNav({ type: 'file', filename: f.filename, category: f.category || null, fileObj: f });
    }
  };

  const toggleEdit = () => setIsEditing(!isEditing);

  const saveFile = async (newContent: string) => {
    if (!currentFileObj) return;
    try {
      if (!currentFileObj.handle) {
        // Fallback: trigger download
        const blob = new Blob([newContent], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = currentFileObj.filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const w = await currentFileObj.handle.createWritable();
        await w.write(newContent);
        await w.close();
      }
      const origCat = currentFileObj.isShortcut ? (currentFileObj.originalCategory || '') : (currentFileObj.category || '');
      const origName = currentFileObj.isShortcut ? (currentFileObj.originalFilename || currentFileObj.filename) : currentFileObj.filename;

      const updated = { ...currentFileObj, content: newContent };
      setCurrentFileObj(updated);
      setCurrentContent(newContent);

      const nextRaw = rawFiles.map(f => {
        if ((f.category || '') === origCat && f.filename === origName) {
          return { ...f, content: newContent };
        }
        return f;
      });
      setRawFiles(nextRaw);

      const merged = buildAllFiles(nextRaw, fileShortcuts, physicalFolders);
      setAllFiles(merged);
      updateFilter(merged, physicalFolders, searchQueries);

      if (isFallbackMode) {
        await saveFallbackData({ fileObjs: nextRaw, pFolders: physicalFolders, rootFolderName: dirHandle?.name || 'Selected Folder' });
      }
      setIsEditing(false);
    } catch(e: any) {
      alert(e.message);
    }
  };

  const [lastSelectedKey, setLastSelectedKey] = useState<string | null>(null);

  const toggleSelectMode = () => {
    const next = !isSelectMode;
    setIsSelectMode(next);
    if (!next) {
      setSelectedFiles(new Set());
      setSelectedFileMap(new Map());
      setMovePanelState(null);
      setLastSelectedKey(null);
    }
  };

  const toggleFileSelection = (f: FileObj) => {
    const key = (f.category||'')+'::'+f.filename;
    const newSet = new Set(selectedFiles);
    const newMap = new Map(selectedFileMap);
    if (newSet.has(key)) {
      newSet.delete(key);
      newMap.delete(key);
    } else {
      newSet.add(key);
      newMap.set(key, f);
    }
    setSelectedFiles(newSet);
    setSelectedFileMap(newMap);
    if (newSet.size === 0) setMovePanelState(null);
    setLastSelectedKey(key);
  };

  const selectFileRange = (targetFile: FileObj, orderedFiles: FileObj[], forceSelect?: boolean) => {
    const targetKey = (targetFile.category || '') + '::' + targetFile.filename;
    
    // アンカーが無い、またはファイル一覧が空の場合は単一トグルとして処理
    if (!lastSelectedKey || orderedFiles.length === 0) {
      toggleFileSelection(targetFile);
      setLastSelectedKey(targetKey);
      return;
    }

    const anchorIdx = orderedFiles.findIndex(f => ((f.category || '') + '::' + f.filename) === lastSelectedKey);
    const targetIdx = orderedFiles.findIndex(f => ((f.category || '') + '::' + f.filename) === targetKey);

    if (anchorIdx === -1 || targetIdx === -1) {
      toggleFileSelection(targetFile);
      setLastSelectedKey(targetKey);
      return;
    }

    const start = Math.min(anchorIdx, targetIdx);
    const end = Math.max(anchorIdx, targetIdx);
    const rangeFiles = orderedFiles.slice(start, end + 1);

    const newSet = new Set(selectedFiles);
    const newMap = new Map(selectedFileMap);

    // 範囲内の全ファイルが既に選択されている場合は「範囲解除」、それ以外は「範囲選択」
    const allSelected = rangeFiles.every(f => newSet.has((f.category || '') + '::' + f.filename));
    const shouldSelect = forceSelect !== undefined ? forceSelect : !allSelected;

    rangeFiles.forEach(f => {
      const k = (f.category || '') + '::' + f.filename;
      if (shouldSelect) {
        newSet.add(k);
        newMap.set(k, f);
      } else {
        newSet.delete(k);
        newMap.delete(k);
      }
    });

    setSelectedFiles(newSet);
    setSelectedFileMap(newMap);
    if (newSet.size === 0) setMovePanelState(null);
    setLastSelectedKey(targetKey);
  };

  const selectAllFiles = (files: FileObj[]) => {
    const newSet = new Set(selectedFiles);
    const newMap = new Map(selectedFileMap);
    files.forEach(f => {
      const key = (f.category || '') + '::' + f.filename;
      newSet.add(key);
      newMap.set(key, f);
    });
    setSelectedFiles(newSet);
    setSelectedFileMap(newMap);
  };

  const deselectAllFiles = (files: FileObj[]) => {
    const newSet = new Set(selectedFiles);
    const newMap = new Map(selectedFileMap);
    files.forEach(f => {
      const key = (f.category || '') + '::' + f.filename;
      newSet.delete(key);
      newMap.delete(key);
    });
    setSelectedFiles(newSet);
    setSelectedFileMap(newMap);
    if (newSet.size === 0) setMovePanelState(null);
  };

  const clearFileSelection = () => {
    setSelectedFiles(new Set());
    setSelectedFileMap(new Map());
    setIsSelectMode(false);
    setMovePanelState(null);
  };

  const toggleHighlight = () => setIsHighlightOff(!isHighlightOff);
  const toggleSettings = () => setSettingsOpen(!settingsOpen);
  
  const setCategoryOpen = (key: string, open: boolean) => {
    setCategoryOpenState(prev => ({...prev, [key]: open}));
  };

  const setSpeakerMode = (val: boolean) => {
    setSpeakerModeEnabled(val);
    localStorage.setItem('lv_speakerMode', val ? '1' : '0');
  };
  
  const expandAllGroups = () => {
    const newState: Record<string, boolean> = {};
    allCategories.forEach(cat => { newState['cat:' + cat.name] = true; });
    allFiles.filter(f => !f.category).forEach(f => {
      const dKey = f.date || '__nodate__';
      if (dKey !== '__nodate__') {
        newState['month:' + dKey.slice(0, 7)] = true;
        newState['date:' + dKey] = true;
      }
    });
    setCategoryOpenState(newState);
  };
  
  const collapseAllGroups = () => {
    const newState: Record<string, boolean> = {};
    allCategories.forEach(cat => { newState['cat:' + cat.name] = false; });
    allFiles.filter(f => !f.category).forEach(f => {
      const dKey = f.date || '__nodate__';
      if (dKey !== '__nodate__') {
        newState['month:' + dKey.slice(0, 7)] = false;
        newState['date:' + dKey] = false;
      }
    });
    setCategoryOpenState(newState);
  };

  const openMovePanel = (e: React.MouseEvent, type: 'single'|'bulk'|'folder', defaultMode: 'move'|'shortcut'|'duplicate' = 'move') => {
    setMovePanelState({ isOpen: true, type, mode: defaultMode, triggerRect: e.currentTarget.getBoundingClientRect() });
    e.stopPropagation();
  };
  const closeMovePanels = () => setMovePanelState(null);

  const createShortcut = async (file: FileObj, targetCatName: string | null) => {
    const origCat = file.isShortcut ? (file.originalCategory || '') : (file.category || '');
    const origName = file.isShortcut ? (file.originalFilename || file.filename) : file.filename;
    const key = origCat + '::' + origName;
    const dest = targetCatName || '';
    if (dest === origCat) {
      showToast(lang === 'en' ? 'Cannot create shortcut in the same folder as original' : '原本と同じフォルダーにはショートカットを作成できません', 'warn');
      return;
    }

    setFileShortcuts(prev => {
      const current = prev[key] || [];
      if (current.includes(dest)) {
        showToast(lang === 'en' ? 'Shortcut already exists in target folder' : '指定フォルダーには既にショートカットが存在します', 'info');
        return prev;
      }
      const next = { ...prev, [key]: [...current, dest] };
      localStorage.setItem('lv_file_shortcuts', JSON.stringify(next));
      const merged = buildAllFiles(rawFiles, next, physicalFolders);
      setAllFiles(merged);
      updateFilter(merged, physicalFolders, searchQueries);
      showToast(lang === 'en' ? `✓ Created shortcut in 「${dest || 'Root'}」` : `✓ 「${dest || 'ALL DATA (ルート)'}」にショートカットを作成しました`, 'success');
      return next;
    });
  };

  const removeShortcut = async (file: FileObj) => {
    if (!file.isShortcut) return;
    const origCat = file.originalCategory || '';
    const origName = file.originalFilename || file.filename;
    const key = origCat + '::' + origName;
    const currentCat = file.category || '';

    setFileShortcuts(prev => {
      const current = prev[key] || [];
      const updated = current.filter(c => c !== currentCat);
      const next = { ...prev };
      if (updated.length > 0) {
        next[key] = updated;
      } else {
        delete next[key];
      }
      localStorage.setItem('lv_file_shortcuts', JSON.stringify(next));
      const merged = buildAllFiles(rawFiles, next, physicalFolders);
      setAllFiles(merged);
      updateFilter(merged, physicalFolders, searchQueries);
      showToast(lang === 'en' ? '✓ Shortcut removed (Original preserved)' : '✓ ショートカットを解除しました（原本は安全に残っています）', 'info');
      return next;
    });

    if (currentFileObj && currentFileObj.filename === file.filename && currentFileObj.category === file.category) {
      setCurrentFileObj(null);
      setCurrentContent('');
    }
  };

  const execBulkShortcut = async (files: FileObj[], destCatName: string | null) => {
    let addedCount = 0;
    setFileShortcuts(prev => {
      const next = { ...prev };
      files.forEach(f => {
        const origCat = f.isShortcut ? (f.originalCategory || '') : (f.category || '');
        const origName = f.isShortcut ? (f.originalFilename || f.filename) : f.filename;
        const key = origCat + '::' + origName;
        const dest = destCatName || '';
        if (dest === origCat) return;
        const current = next[key] || [];
        if (!current.includes(dest)) {
          next[key] = [...current, dest];
          addedCount++;
        }
      });
      localStorage.setItem('lv_file_shortcuts', JSON.stringify(next));
      const merged = buildAllFiles(rawFiles, next, physicalFolders);
      setAllFiles(merged);
      updateFilter(merged, physicalFolders, searchQueries);
      showToast(lang === 'en' ? `✓ Created ${addedCount} shortcut(s) in 「${destCatName || 'Root'}」` : `✓ 「${destCatName || 'ALL DATA (ルート)'}」に${addedCount}件のショートカットを作成しました`, 'success');
      return next;
    });
    if (isSelectMode) toggleSelectMode();
    else clearFileSelection();
  };

  const duplicateFile = async (file: FileObj, destCatName?: string | null) => {
    const targetCat = destCatName !== undefined ? destCatName : (file.isShortcut ? (file.originalCategory || null) : file.category);
    const dotIdx = file.filename.lastIndexOf('.');
    const baseName = dotIdx !== -1 ? file.filename.slice(0, dotIdx) : file.filename;
    const ext = dotIdx !== -1 ? file.filename.slice(dotIdx) : '.txt';
    
    // 現在の最新日時を取得して新しいタイムスタンプを作成（日付順で一番上に来るように秒まで設定）
    const now = new Date();
    const curDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const curTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const nowPrefix = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}_`;

    let baseNameWithoutDate = baseName;
    let hasDatePrefix = false;
    if (/^\d{8}_\d{4}_/.test(baseName)) {
      baseNameWithoutDate = baseName.slice(14);
      hasDatePrefix = true;
    } else if (/^\d{4}-\d{2}-\d{2}_/.test(baseName)) {
      baseNameWithoutDate = baseName.slice(11);
      hasDatePrefix = true;
    }

    // Check existing names in target folder
    const existing = new Set(rawFiles.filter(f => (f.category || null) === targetCat).map(f => f.filename));
    let newFilename = hasDatePrefix 
      ? `${nowPrefix}${baseNameWithoutDate}_copy${ext}`
      : `${baseName}_copy${ext}`;
    let counter = 2;
    while (existing.has(newFilename)) {
      newFilename = hasDatePrefix 
        ? `${nowPrefix}${baseNameWithoutDate}_copy${counter}${ext}`
        : `${baseName}_copy${counter}${ext}`;
      counter++;
    }

    const parsed = parseFilename(newFilename);

    // カスタム並び順（手動並び順）でもフォルダーの一番先頭（最上部）に配置
    const catKey = targetCat || '__root__';
    setCustomFileOrders(prev => {
      const existingList = prev[catKey] ? [...prev[catKey]] : rawFiles.filter(rf => (rf.category || null) === targetCat).map(rf => rf.filename);
      const updatedList = [newFilename, ...existingList.filter(n => n !== newFilename)];
      localStorage.setItem('lv_custom_file_orders', JSON.stringify({ ...prev, [catKey]: updatedList }));
      return { ...prev, [catKey]: updatedList };
    });

    if (isFallbackMode || !dirHandle) {
      const newFile: FileObj = {
        filename: newFilename,
        handle: null,
        category: targetCat,
        folderHandle: null,
        date: curDate,
        time: curTime,
        title: (file.title || baseNameWithoutDate) + ' (コピー)',
        dateSource: 'custom',
        content: file.content
      };
      const nextRaw = [newFile, ...rawFiles];
      setRawFiles(nextRaw);
      const merged = buildAllFiles(nextRaw, fileShortcutsRef.current, physicalFolders);
      setAllFiles(merged);
      updateFilter(merged, physicalFolders, searchQueries);
      await saveFallbackData({ fileObjs: nextRaw, pFolders: physicalFolders, rootFolderName: dirHandle?.name || 'Selected Folder' });
      showToast(lang === 'en' ? `✓ Duplicated: ${newFilename}` : `✓ 複製しました: ${newFilename}`, 'success');
    } else {
      try {
        const targetHandle = targetCat ? await getDirectoryHandleByPath(dirHandle, targetCat, true) : dirHandle;
        const nf = await targetHandle.getFileHandle(newFilename, { create: true });
        const w = await nf.createWritable();
        await w.write(file.content);
        await w.close();

        // 楽観的即時UI更新（タイムラグ0で一番上に反映）
        const newFile: FileObj = {
          filename: newFilename,
          handle: nf,
          category: targetCat,
          folderHandle: targetCat ? targetHandle : null,
          date: curDate,
          time: curTime,
          title: parsed.title || newFilename.replace(/\.[^.]+$/, ''),
          dateSource: 'custom',
          content: file.content
        };
        const nextRaw = [newFile, ...rawFiles];
        setRawFiles(nextRaw);
        const merged = buildAllFiles(nextRaw, fileShortcutsRef.current, physicalFolders);
        setAllFiles(merged);
        updateFilter(merged, physicalFolders, searchQueries);

        showToast(lang === 'en' ? `✓ Duplicated: ${newFilename}` : `✓ 複製しました: ${newFilename}`, 'success');
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const execBulkDuplicate = async (files: FileObj[], destHandle: any | null, destCatName: string | null) => {
    for (const f of files) {
      await duplicateFile(f, destCatName);
    }
    if (isSelectMode) toggleSelectMode();
    else clearFileSelection();
  };

  const execBulkMove = async (files: FileObj[], destHandle: any | null, destCatName: string | null) => {
    if (isFallbackMode) {
      alert(t.main.fallbackMoveError);
      return;
    }
    const targetFolderHandle = destHandle || (destCatName ? await getDirectoryHandleByPath(dirHandle, destCatName, true) : dirHandle);
    
    // 1. ショートカットファイルの移動処理（ショートカット先フォルダーの更新）
    let shortcutsUpdated = false;
    const nextShortcuts = { ...fileShortcutsRef.current };

    files.forEach(f => {
      if (f.isShortcut) {
        const origCat = f.originalCategory || '';
        const origName = f.originalFilename || f.filename;
        const origKey = origCat + '::' + origName;
        const currentTargetCat = f.category || '';
        const newDestCat = destCatName || '';
        
        const curTargets = nextShortcuts[origKey] || [];
        const filtered = curTargets.filter(c => c !== currentTargetCat);
        // 原本と異なるフォルダーであれば移動先（ルート''含む）を追加
        if (newDestCat !== origCat && !filtered.includes(newDestCat)) {
          filtered.push(newDestCat);
        }
        if (filtered.length > 0) {
          nextShortcuts[origKey] = filtered;
        } else {
          delete nextShortcuts[origKey];
        }
        shortcutsUpdated = true;
      }
    });

    // 2. 実体ファイルの移動処理に伴う原本ショートカットキーの追従
    const physicalFiles = files.filter(f => !f.isShortcut);
    physicalFiles.forEach(f => {
      const oldOrigKey = (f.category || '') + '::' + f.filename;
      const newOrigKey = (destCatName || '') + '::' + f.filename;
      if (oldOrigKey !== newOrigKey && nextShortcuts[oldOrigKey]) {
        const targets = nextShortcuts[oldOrigKey].filter(t => t !== (destCatName || ''));
        delete nextShortcuts[oldOrigKey];
        if (targets.length > 0) {
          nextShortcuts[newOrigKey] = targets;
        }
        shortcutsUpdated = true;
      }
    });

    if (shortcutsUpdated) {
      localStorage.setItem('lv_file_shortcuts', JSON.stringify(nextShortcuts));
      setFileShortcuts(nextShortcuts);
      fileShortcutsRef.current = nextShortcuts;
    }

    // 3. 実体ファイルの移動処理（楽観的即時更新）
    const movedFilenames = new Set(physicalFiles.map(f => (f.category || '') + '::' + f.filename));

    const nextRaw = rawFiles.map(rf => {
      const key = (rf.category || '') + '::' + rf.filename;
      if (movedFilenames.has(key)) {
        return { ...rf, category: destCatName, folderHandle: destCatName ? targetFolderHandle : null };
      }
      return rf;
    });
    setRawFiles(nextRaw);
    const merged = buildAllFiles(nextRaw, shortcutsUpdated ? nextShortcuts : fileShortcutsRef.current, physicalFolders);
    setAllFiles(merged);
    updateFilter(merged, physicalFolders, searchQueries);

    if (currentFileObj) {
      if (currentFileObj.isShortcut) {
        if (files.some(f => f.filename === currentFileObj.filename && f.category === currentFileObj.category)) {
          setCurrentFileObj({ ...currentFileObj, category: destCatName });
        }
      } else if (movedFilenames.has((currentFileObj.category || '') + '::' + currentFileObj.filename)) {
        setCurrentFileObj({ ...currentFileObj, category: destCatName, folderHandle: destCatName ? targetFolderHandle : null });
      }
    }

    showToast(lang === 'en' ? `✓ Moved ${files.length} file(s) to 「${destCatName || 'Root'}」` : `✓ ${files.length}件を「${destCatName || 'ALL DATA (ルート)'}」へ移動しました`, 'success');

    // 4. 物理ディスク書き込み（実体ファイルのみ実行）
    for (const f of physicalFiles) {
      try {
        if (f.category === destCatName) continue;
        const target = targetFolderHandle;
        const nf = await target.getFileHandle(f.filename, {create:true});
        const w = await nf.createWritable();
        await w.write(f.content);
        await w.close();
        
        if (f.folderHandle) await f.folderHandle.removeEntry(f.filename);
        else await dirHandle.removeEntry(f.filename);
      } catch(e) { console.warn(e); }
    }

    if(isSelectMode) toggleSelectMode();
    else clearFileSelection();
  };

  const moveToNewFolder = async (folderName: string, isBulk: boolean) => {
    if (!folderName) return;
    try {
      const trimmed = folderName.trim();
      const nh = await getDirectoryHandleByPath(dirHandle, trimmed, true);
      const files = isBulk ? Array.from(selectedFileMap.values()) : (currentFileObj ? [currentFileObj] : []);
      await execBulkMove(files, nh, trimmed);
    } catch(e: any) { alert(e.message); }
  };

  const bulkDeleteFiles = async () => {
    if(!selectedFileMap.size || !confirm(`${selectedFileMap.size}${t.main.confirmDeleteBulk}`)) return;
    let dc = false;
    const nextShortcuts = { ...fileShortcuts };
    let shortcutsChanged = false;

    for (const f of selectedFileMap.values()) {
      try {
        if (f.isShortcut) {
          const origCat = f.originalCategory || '';
          const origName = f.originalFilename || f.filename;
          const key = origCat + '::' + origName;
          const cur = nextShortcuts[key] || [];
          nextShortcuts[key] = cur.filter(c => c !== (f.category || ''));
          shortcutsChanged = true;
          if (currentFileObj && currentFileObj.filename === f.filename && currentFileObj.category === f.category) dc = true;
        } else {
          if(f.folderHandle) await f.folderHandle.removeEntry(f.filename);
          else if (dirHandle && !isFallbackMode) await dirHandle.removeEntry(f.filename);
          
          const origKey = (f.category || '') + '::' + f.filename;
          if (nextShortcuts[origKey]) {
            delete nextShortcuts[origKey];
            shortcutsChanged = true;
          }
          if(currentFileObj && currentFileObj.filename === f.filename) dc = true;
        }
      } catch(e){}
    }

    if (shortcutsChanged) {
      localStorage.setItem('lv_file_shortcuts', JSON.stringify(nextShortcuts));
      setFileShortcuts(nextShortcuts);
    }

    if (dc) setCurrentFileObj(null);
    if (!isFallbackMode && dirHandle) {
      await loadFiles(dirHandle);
    } else {
      const remainingRaw = rawFiles.filter(rf => !selectedFileMap.has((rf.category||'')+'::'+rf.filename));
      setRawFiles(remainingRaw);
      const merged = buildAllFiles(remainingRaw, nextShortcuts, physicalFolders);
      setAllFiles(merged);
      updateFilter(merged, physicalFolders, searchQueries);
    }
    if(isSelectMode) toggleSelectMode();
    else clearFileSelection();
  };

  const deleteCurrentFile = async () => {
    if (!currentFileObj) return;
    if (currentFileObj.isShortcut) {
      if (!confirm(lang === 'en' ? 'Remove this shortcut? (Original file will not be deleted)' : 'このショートカットを解除しますか？（原本ファイルは削除されません）')) return;
      await removeShortcut(currentFileObj);
      return;
    }
    if (isFallbackMode) {
      alert(t.main.fallbackDeleteError);
      return;
    }
    if(!confirm(t.main.confirmDeleteFile)) return;
    try {
      if(currentFileObj.folderHandle) await currentFileObj.folderHandle.removeEntry(currentFileObj.filename);
      else await dirHandle.removeEntry(currentFileObj.filename);
      
      const origKey = (currentFileObj.category || '') + '::' + currentFileObj.filename;
      if (fileShortcuts[origKey]) {
        const nextShortcuts = { ...fileShortcuts };
        delete nextShortcuts[origKey];
        localStorage.setItem('lv_file_shortcuts', JSON.stringify(nextShortcuts));
        setFileShortcuts(nextShortcuts);
      }
      setCurrentFileObj(null);
      await loadFiles(dirHandle);
    } catch(e:any) { alert(e.message); }
  };

  const renameCurrentFile = async (newName: string) => {
    if (isFallbackMode) {
      alert(t.main.fallbackRenameError);
      return;
    }
    if(!currentFileObj || !newName || newName === currentFileObj.filename) return;
    try {
      const th = currentFileObj.folderHandle || dirHandle;
      const nf = await th.getFileHandle(newName, {create: true});
      const w = await nf.createWritable();
      await w.write(currentFileObj.content);
      await w.close();
      await th.removeEntry(currentFileObj.filename);

      // ショートカットキーの追従
      const oldKey = (currentFileObj.category || '') + '::' + currentFileObj.filename;
      const newKey = (currentFileObj.category || '') + '::' + newName;
      if (fileShortcutsRef.current[oldKey]) {
        const nextShortcuts = { ...fileShortcutsRef.current };
        nextShortcuts[newKey] = nextShortcuts[oldKey];
        delete nextShortcuts[oldKey];
        localStorage.setItem('lv_file_shortcuts', JSON.stringify(nextShortcuts));
        setFileShortcuts(nextShortcuts);
        fileShortcutsRef.current = nextShortcuts;
      }

      setCurrentFileObj({...currentFileObj, filename: newName, handle: nf});
      await loadFiles(dirHandle);
    } catch(e:any) { alert(e.message); }
  };

  const renameFolder = async (oldCategoryPath: string, folderHandle?: any, explicitNewName?: string): Promise<boolean> => {
    const oldParts = oldCategoryPath.split('/');
    const oldShortName = oldParts[oldParts.length - 1];
    const parentPath = oldParts.length > 1 ? oldParts.slice(0, -1).join('/') : null;

    const newShortNameRaw = explicitNewName !== undefined 
      ? explicitNewName 
      : prompt(`${t.main.renameFolderPrompt || 'フォルダー名を変更:'} ${oldShortName}\n\n${t.main.renamePrompt || '新しい名前を入力してください:'}`, oldShortName);
    if (!newShortNameRaw || newShortNameRaw.trim() === '' || newShortNameRaw.trim() === oldShortName) return false;
    const newShortName = newShortNameRaw.trim();
    const newCategoryPath = parentPath ? `${parentPath}/${newShortName}` : newShortName;

    // ショートカットの移行処理マップ（フォルダー名変更に同期追従）
    const nextShortcuts: Record<string, string[]> = {};
    let shortcutsChanged = false;
    Object.entries(fileShortcutsRef.current).forEach(([key, rawTargets]) => {
      const targets = rawTargets as string[];
      let newKey = key;
      const [catPart, fname] = key.split('::');
      if (catPart === oldCategoryPath) {
        newKey = `${newCategoryPath}::${fname}`;
        shortcutsChanged = true;
      } else if (catPart.startsWith(oldCategoryPath + '/')) {
        const suffix = catPart.slice(oldCategoryPath.length);
        newKey = `${newCategoryPath}${suffix}::${fname}`;
        shortcutsChanged = true;
      }

      const newTargets = targets.map(target => {
        if (target === oldCategoryPath) {
          shortcutsChanged = true;
          return newCategoryPath;
        } else if (target.startsWith(oldCategoryPath + '/')) {
          shortcutsChanged = true;
          return newCategoryPath + target.slice(oldCategoryPath.length);
        }
        return target;
      });

      nextShortcuts[newKey] = newTargets;
    });

    if (shortcutsChanged) {
      localStorage.setItem('lv_file_shortcuts', JSON.stringify(nextShortcuts));
      setFileShortcuts(nextShortcuts);
      fileShortcutsRef.current = nextShortcuts;
    }

    // カスタム並び順の移行
    setCustomFileOrders(prev => {
      const nextOrders = { ...prev };
      if (nextOrders[oldCategoryPath]) {
        nextOrders[newCategoryPath] = nextOrders[oldCategoryPath];
        delete nextOrders[oldCategoryPath];
      }
      localStorage.setItem('lv_custom_file_orders', JSON.stringify(nextOrders));
      return nextOrders;
    });

    // フォールバックモードの場合
    if (isFallbackMode) {
      const updatedFiles = rawFiles.map(f => {
        if (!f.category) return f;
        if (f.category === oldCategoryPath) {
          return { ...f, category: newCategoryPath };
        } else if (f.category.startsWith(oldCategoryPath + '/')) {
          const suffix = f.category.slice(oldCategoryPath.length);
          return { ...f, category: newCategoryPath + suffix };
        }
        return f;
      });
      const updatedFolders = physicalFolders.map(p => {
        if (p.name === oldCategoryPath) {
          return { ...p, name: newCategoryPath };
        } else if (p.name.startsWith(oldCategoryPath + '/')) {
          const suffix = p.name.slice(oldCategoryPath.length);
          return { ...p, name: newCategoryPath + suffix };
        }
        return p;
      });
      setRawFiles(updatedFiles);
      setPhysicalFolders(updatedFolders);
      const merged = buildAllFiles(updatedFiles, nextShortcuts, updatedFolders);
      setAllFiles(merged);
      updateFilter(merged, updatedFolders, searchQueries);
      await saveFallbackData({
        rootFolderName: dirHandle?.name || 'Local Logs',
        pFolders: updatedFolders,
        fileObjs: updatedFiles
      });
      if (explorerCategory === oldCategoryPath) {
        setExplorerCategory(newCategoryPath);
      } else if (explorerCategory && explorerCategory.startsWith(oldCategoryPath + '/')) {
        setExplorerCategory(newCategoryPath + explorerCategory.slice(oldCategoryPath.length));
      }
      migrateFolderVisualSettings(oldCategoryPath, newCategoryPath);
      return true;
    }

    // 通常の File System Access API モード
    try {
      // 1. 親フォルダーのハンドルを取得
      const parentHandle = parentPath ? await getDirectoryHandleByPath(dirHandle, parentPath, false) : dirHandle;
      
      // 2. 元のフォルダーハンドルを取得
      let srcHandle = folderHandle;
      if (!srcHandle) {
        srcHandle = await getDirectoryHandleByPath(dirHandle, oldCategoryPath, false);
      }

      // 3. 親フォルダー内に新しい名前でフォルダーを作成
      const newDirHandle = await parentHandle.getDirectoryHandle(newShortName, { create: true });

      // 4. 再帰的に中身（ファイルおよびサブフォルダー）をコピー
      const copyRecursively = async (src: any, dest: any) => {
        if (!src || !src.values) return;
        for await (const entry of src.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            const text = await file.text();
            const newFileHandle = await dest.getFileHandle(entry.name, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(text);
            await writable.close();
          } else if (entry.kind === 'directory') {
            const newSubDir = await dest.getDirectoryHandle(entry.name, { create: true });
            await copyRecursively(entry, newSubDir);
          }
        }
      };
      await copyRecursively(srcHandle, newDirHandle);

      // 5. 元のフォルダーを親フォルダーから再帰削除
      await parentHandle.removeEntry(oldShortName, { recursive: true });

      // 6. 現在開いているファイルやエクスプローラーの表示位置を更新
      if (currentFileObj && (currentFileObj.category === oldCategoryPath || currentFileObj.category?.startsWith(oldCategoryPath + '/'))) {
        const newCat = currentFileObj.category === oldCategoryPath 
          ? newCategoryPath 
          : newCategoryPath + currentFileObj.category.slice(oldCategoryPath.length);
        setCurrentFileObj({ ...currentFileObj, category: newCat });
      }
      if (explorerCategory === oldCategoryPath) {
        setExplorerCategory(newCategoryPath);
      } else if (explorerCategory && explorerCategory.startsWith(oldCategoryPath + '/')) {
        setExplorerCategory(newCategoryPath + explorerCategory.slice(oldCategoryPath.length));
      }

      migrateFolderVisualSettings(oldCategoryPath, newCategoryPath);
      closeMovePanels();
      await loadFiles(dirHandle, nextShortcuts);
      return true;
    } catch (e: any) {
      alert(`フォルダー名変更に失敗しました: ${e.message}`);
      return false;
    }
  };

  const syncShortcutsToDisk = async (shortcuts: Record<string, string[]>, targetDirHandle?: any) => {
    const dh = targetDirHandle || dirHandle;
    if (!dh || isFallbackMode) return;
    try {
      const fileHandle = await dh.getFileHandle('_shortcuts.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(shortcuts, null, 2));
      await writable.close();
    } catch(e) {
      console.warn('Could not sync _shortcuts.json to disk', e);
    }
  };

  const deleteFolder = async (name: string, folderHandle?: any) => {
    const parts = name.split('/');
    const shortName = parts[parts.length - 1];
    const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : null;

    // 削除確認メッセージの作成（内部ファイル数集計）
    let count = 0;
    let srcHandle = folderHandle;
    if (!isFallbackMode && dirHandle) {
      try {
        if (!srcHandle) srcHandle = await getDirectoryHandleByPath(dirHandle, name, false);
        if (srcHandle && srcHandle.values) {
          for await (const item of srcHandle.values()) {
            if (item.kind === 'file') count++;
          }
        }
      } catch (e) {}
    } else {
      count = rawFiles.filter(f => f.category === name || (f.category && f.category.startsWith(name + '/'))).length;
    }

    const msg = count > 0 
      ? (lang === 'en' ? `Delete folder 「${shortName}」?\n⚠️ Warning: Contains ${count} files (All contents will be deleted)` : `「${shortName}」フォルダーを削除しますか？\n⚠️ 警告: このフォルダーには ${count} 件のファイルが含まれており、中身もすべて削除されます`)
      : (lang === 'en' ? `Delete folder 「${shortName}」?` : `「${shortName}」フォルダーを削除しますか？`);
    if (!confirm(msg)) return;

    // 削除フォルダーに属するショートカットをクリーンアップ
    const nextShortcuts: Record<string, string[]> = {};
    let shortcutsChanged = false;

    Object.entries(fileShortcutsRef.current).forEach(([key, rawTargets]) => {
      const targets = rawTargets as string[];
      const [catPart] = key.split('::');
      if (catPart === name || catPart.startsWith(name + '/')) {
        shortcutsChanged = true;
        return;
      }
      const filteredTargets = targets.filter(t => t !== name && !t.startsWith(name + '/'));
      if (filteredTargets.length !== targets.length) {
        shortcutsChanged = true;
      }
      if (filteredTargets.length > 0) {
        nextShortcuts[key] = filteredTargets;
      }
    });

    if (shortcutsChanged) {
      localStorage.setItem('lv_file_shortcuts', JSON.stringify(nextShortcuts));
      setFileShortcuts(nextShortcuts);
      fileShortcutsRef.current = nextShortcuts;
      await syncShortcutsToDisk(nextShortcuts);
    }

    // カスタム並び順のクリーンアップ
    setCustomFileOrders(prev => {
      const next = { ...prev };
      delete next[name];
      localStorage.setItem('lv_custom_file_orders', JSON.stringify(next));
      return next;
    });

    // 1. フォールバックモードの場合
    if (isFallbackMode) {
      const remainingRaw = rawFiles.filter(f => f.category !== name && !(f.category && f.category.startsWith(name + '/')));
      const remainingFolders = physicalFolders.filter(p => p.name !== name && !p.name.startsWith(name + '/'));
      setRawFiles(remainingRaw);
      setPhysicalFolders(remainingFolders);
      const merged = buildAllFiles(remainingRaw, nextShortcuts, remainingFolders);
      setAllFiles(merged);
      updateFilter(merged, remainingFolders, searchQueries);
      await saveFallbackData({
        rootFolderName: dirHandle?.name || 'Local Logs',
        pFolders: remainingFolders,
        fileObjs: remainingRaw
      });
      if (currentFileObj && (currentFileObj.category === name || currentFileObj.category?.startsWith(name + '/'))) {
        setCurrentFileObj(null);
      }
      if (explorerCategory === name || explorerCategory?.startsWith(name + '/')) {
        setExplorerCategory(parentPath);
      }
      closeMovePanels();
      showToast(lang === 'en' ? `✓ Deleted folder 「${shortName}」` : `✓ フォルダー「${shortName}」を削除しました`, 'info');
      return;
    }

    // 2. 通常の File System Access API モード
    try {
      const parentHandle = parentPath ? await getDirectoryHandleByPath(dirHandle, parentPath, false) : dirHandle;
      if (parentHandle) {
        try {
          await parentHandle.removeEntry(shortName, { recursive: true });
        } catch (removeErr: any) {
          // 実フォルダーがディスク上にまだ無い場合（ショートカットのみの仮想フォルダー等）はNotFoundを許容
          if (removeErr.name !== 'NotFoundError') {
            console.warn('Could not remove physical entry:', removeErr);
          }
        }
      }

      if (currentFileObj && (currentFileObj.category === name || currentFileObj.category?.startsWith(name + '/'))) {
        setCurrentFileObj(null);
      }
      if (explorerCategory === name || explorerCategory?.startsWith(name + '/')) {
        setExplorerCategory(parentPath);
      }
      closeMovePanels();
      await loadFiles(dirHandle, nextShortcuts);
      showToast(lang === 'en' ? `✓ Deleted folder 「${shortName}」` : `✓ フォルダー「${shortName}」を削除しました`, 'info');
    } catch(e: any){ 
      alert(`フォルダー削除に失敗しました: ${e.message}`); 
    }
  };

  const createNewFolder = async (parentFolderHandle?: any, parentPath?: string | null, explicitFolderName?: string): Promise<boolean> => {
    if (isFallbackMode) return false;
    let folderName = explicitFolderName;
    if (!folderName) {
      const promptMsg = parentPath 
        ? `【${parentPath}】${lang === 'en' ? ' - Subfolder name:' : ' の中に作成する新しいフォルダー名:'}`
        : (t.main.newFolderPrompt || "新しいフォルダー名:");
      folderName = prompt(promptMsg) || undefined;
    }
    if (!folderName || !folderName.trim()) return false;
    const trimmed = folderName.trim();

    try {
      if (parentFolderHandle && parentFolderHandle !== dirHandle) {
        // 親フォルダーのDirectoryHandleが直接渡されている場合
        await parentFolderHandle.getDirectoryHandle(trimmed, { create: true });
      } else if (parentPath && parentPath.trim()) {
        // 親パスが指定されている場合（ルートから辿って確実に作成）
        const fullPath = `${parentPath.trim()}/${trimmed}`;
        await getDirectoryHandleByPath(dirHandle, fullPath, true);
      } else {
        // 最上位（ルート）に作成
        await dirHandle.getDirectoryHandle(trimmed, { create: true });
      }
      await loadFiles(dirHandle);
      return true;
    } catch (e: any) {
      alert(e.message);
      return false;
    }
  };

  const createNewFile = async (folderHandle: any) => {
    if (isFallbackMode || !folderHandle) return;
    const fileName = prompt(t.main.newFilePrompt || "新しいファイル名:");
    if (!fileName || !fileName.trim()) return;
    let name = fileName.trim();
    if (!name.endsWith('.md') && !name.endsWith('.txt')) name += '.md';
    try {
      const fh = await folderHandle.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      await w.write("");
      await w.close();
      await loadFiles(dirHandle);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const importExistingFiles = async (targetFolderHandle: any, targetCategory?: string) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.txt,.md,.markdown,.log,.json,.csv,.text,text/*';
      
      input.onchange = async () => {
        if (!input.files || input.files.length === 0) return;
        const files = Array.from(input.files);
        
        if (dirHandle && targetFolderHandle) {
          for (const file of files) {
            try {
              const fileContent = await file.text();
              const fh = await targetFolderHandle.getFileHandle(file.name, { create: true });
              const w = await fh.createWritable();
              await w.write(fileContent);
              await w.close();
            } catch (err: any) {
              console.error(`Error saving ${file.name}:`, err);
            }
          }
          await loadFiles(dirHandle);
        } else if (isFallbackMode) {
          const newLoadedFiles: any[] = [];
          for (const file of files) {
            const content = await file.text();
            const ext = file.name.split('.').pop() || 'txt';
            newLoadedFiles.push({
              fileHandle: null,
              filename: file.name,
              category: targetCategory || '',
              content: content,
              title: file.name.replace(/\.[^/.]+$/, ''),
              digest: content.slice(0, 160).replace(/[#*`\n\r]/g, ' ').trim(),
              charCount: content.length,
              lineCount: content.split('\n').length,
              lastModified: file.lastModified,
              fileSize: file.size,
              extension: ext
            });
          }
          setAllFiles(prev => [...prev, ...newLoadedFiles]);
        }
      };
      
      input.click();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const currentFileIndex = allFiles.findIndex(f => 
    f.filename === currentFileObj?.filename && f.category === currentFileObj?.category
  );
  const hasPrevFile = currentFileIndex > 0;
  const hasNextFile = currentFileIndex >= 0 && currentFileIndex < allFiles.length - 1;

  const goToPrevFile = () => {
    if (currentFileIndex > 0) {
      selectFile(allFiles[currentFileIndex - 1]);
    }
  };

  const goToNextFile = () => {
    if (currentFileIndex >= 0 && currentFileIndex < allFiles.length - 1) {
      selectFile(allFiles[currentFileIndex + 1]);
    }
  };

  window.__draggedFiles = isSelectMode ? Array.from(selectedFileMap.values()) : (currentFileObj ? [currentFileObj] : null);

  return (
    <AppContext.Provider value={{
      dirHandle, isFallbackMode, allFiles, allCategories, physicalFolders, searchQueries,
      currentFileObj, currentContent, isEditing, selectedFiles, selectedFileMap, isSelectMode,
      settingsOpen, isHighlightOff, categoryOpenState, movePanelState, loading, refreshing,
      sortMode, sortDirection, setSortMode, setSortDirection,
      customFileOrders, saveFolderCustomOrder, resetFolderCustomOrder,
      customFolderOrders, saveFolderCustomFolderOrder, resetFolderCustomFolderOrder,
      viewMode, setViewMode, explorerCategory, setExplorerCategory, openExplorer,
      canGoBack, canGoForward, goBack, goForward, goBackExplorer, goForwardExplorer,
      openFolder, reopenFolder, refreshFolder, setSearchQuery, clearSearch, removeSearchQuery,
      selectFile, toggleEdit, saveFile, toggleSelectMode, toggleFileSelection, selectFileRange, selectAllFiles, deselectAllFiles, clearFileSelection, toggleHighlight,
      toggleSettings, setCategoryOpen, expandAllGroups, collapseAllGroups,
      openMovePanel, closeMovePanels, setMovePanelMode, execBulkMove, moveToNewFolder,
      createShortcut, removeShortcut, execBulkShortcut, duplicateFile, execBulkDuplicate, fileShortcuts,
      toast, showToast,
      bulkDeleteFiles, deleteCurrentFile,
      renameCurrentFile, renameFolder, deleteFolder, createNewFolder, createNewFile, importExistingFiles, lang, setLang, t, speakerModeEnabled, setSpeakerMode,
      ttsSettings, updateTtsSettings, voiceRates, voices, writingMode, setWritingMode,
      currentTheme, setTheme, cycleTheme,
      paperMode, paperColor, setPaperColor, setPaperMode, togglePaperMode, loadPaperForTheme,
      mainBgWhite, setMainBgWhite, toggleMainBgWhite,
      sidebarPosition, setSidebarPosition, toggleSidebarPosition,
      fileMarks, setFileMark, setBulkFileMarks, hasPrevFile, hasNextFile, goToPrevFile, goToNextFile,
      isResuming, pendingResumeHandle, resumeSavedFolder
    }}>
      {children}
    </AppContext.Provider>
  );
};
