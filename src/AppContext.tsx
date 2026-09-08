import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FileObj, PhysicalFolder, CategoryObj } from './types';
import { loadFolderHandle, saveFolderHandle, saveFallbackData, loadFallbackData, parseFilename } from './utils';
import { getPaperSettingsForTheme, setPaperModeForTheme, setPaperColorForTheme } from './theme';

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
  movePanelState: { isOpen: boolean, type: 'single'|'bulk'|'folder', triggerRect?: any } | null;
  loading: boolean;
  refreshing: boolean;
  sortMode: 'date' | 'name';
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

  setSortMode: (mode: 'date' | 'name') => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
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
  selectAllFiles: (files: FileObj[]) => void;
  deselectAllFiles: (files: FileObj[]) => void;
  clearFileSelection: () => void;
  toggleHighlight: () => void;
  toggleSettings: () => void;
  setCategoryOpen: (key: string, open: boolean) => void;
  expandAllGroups: () => void;
  collapseAllGroups: () => void;
  
  openMovePanel: (e: React.MouseEvent, type: 'single'|'bulk'|'folder') => void;
  closeMovePanels: () => void;
  execBulkMove: (files: FileObj[], destHandle: any | null, destCatName: string | null) => Promise<void>;
  moveToNewFolder: (folderName: string, isBulk: boolean) => Promise<void>;
  bulkDeleteFiles: () => Promise<void>;
  deleteCurrentFile: () => Promise<void>;
  renameCurrentFile: (newName: string) => Promise<void>;
  renameFolder: (oldName: string, folderHandle: any, explicitNewName?: string) => Promise<void>;
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
  voices: SpeechSynthesisVoice[];
  writingMode: 'horizontal' | 'vertical';
  setWritingMode: (mode: 'horizontal' | 'vertical') => void;
  paperMode: boolean;
  paperColor: 'beige' | 'white';
  setPaperColor: (color: 'beige' | 'white') => void;
  setPaperMode: (val: boolean) => void;
  togglePaperMode: () => void;
  loadPaperForTheme: (themeKey: string) => void;
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
  
  const [sortMode, setSortModeState] = useState<'date' | 'name'>(
    () => (localStorage.getItem('lv_sortMode') as 'date' | 'name') || 'date'
  );
  const [sortDirection, setSortDirectionState] = useState<'asc' | 'desc'>(
    () => (localStorage.getItem('lv_sortDirection') as 'asc' | 'desc') || 'desc'
  );

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
    if (!fromNav) {
      pushNav({ type: 'explorer', category: catName });
    }
  };

  const applyNavItem = (item: NavItem) => {
    if (item.type === 'explorer') {
      setExplorerCategory(item.category);
      setViewMode('explorer');
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
      } else {
        setExplorerCategory(item.category);
        setViewMode('explorer');
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
    return (t === 'ocean' ? 'dark' : t) || 'mono';
  };

  const [paperMode, setPaperModeState] = useState<boolean>(() => {
    const theme = (localStorage.getItem('lv_theme') === 'ocean' ? 'dark' : localStorage.getItem('lv_theme')) || 'mono';
    return getPaperSettingsForTheme(theme).mode;
  });

  const [paperColor, setPaperColorState] = useState<'beige' | 'white'>(() => {
    const theme = (localStorage.getItem('lv_theme') === 'ocean' ? 'dark' : localStorage.getItem('lv_theme')) || 'mono';
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

  // テーマ切り替え時に、そのテーマ専用のペーパー設定（ON/OFF、カラー）へ自動切り替え
  useEffect(() => {
    const syncThemePaper = () => {
      const theme = getActiveThemeKey();
      const ps = getPaperSettingsForTheme(theme);
      setPaperModeState(ps.mode);
      setPaperColorState(ps.color);
    };
    window.addEventListener('settingsChanged', syncThemePaper);
    return () => window.removeEventListener('settingsChanged', syncThemePaper);
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

  const setSortMode = (mode: 'date' | 'name') => {
    setSortModeState(mode);
    localStorage.setItem('lv_sortMode', mode);
  };

  const setSortDirection = (dir: 'asc' | 'desc') => {
    setSortDirectionState(dir);
    localStorage.setItem('lv_sortDirection', dir);
  };
  
  const [ttsSettings, setTtsSettings] = useState<TTSSettings>(() => {
    return {
      rate: parseFloat(localStorage.getItem('lv_ttsRate') || '1.0'),
      volume: parseFloat(localStorage.getItem('lv_ttsVolume') || '1.0'),
      pitch: parseFloat(localStorage.getItem('lv_ttsPitch') || '1.0'),
      voiceURI: localStorage.getItem('lv_ttsVoiceURI') || ''
    };
  });

  useEffect(() => {
    const loadVoices = () => {
      let v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        // Google の音声は除外
        const nonGoogle = v.filter(voice => !voice.name.toLowerCase().includes('google'));
        
        // Microsoft の 4 音声（一郎・あゆみ・さやか・はるか）を優先抽出
        const msKeywords = ['ichiro', 'ayumi', 'sayaka', 'haruka', '一郎', 'あゆみ', 'さやか', 'はるか'];
        const msVoices = nonGoogle.filter(voice => 
          msKeywords.some(kw => voice.name.toLowerCase().includes(kw))
        );
        
        const finalVoices = msVoices.length > 0 
          ? msVoices 
          : nonGoogle.filter(voice => voice.lang.toLowerCase().startsWith('ja'));

        const listToSet = finalVoices.length > 0 ? finalVoices : nonGoogle;
        setVoices(listToSet);

        if (!localStorage.getItem('lv_ttsVoiceURI')) {
          const defaultVoice = listToSet.find(voice => 
            voice.name.toLowerCase().includes('ichiro') || voice.name.includes('一郎')
          ) || listToSet[0];

          if (defaultVoice) {
            setTtsSettings(prev => ({ ...prev, voiceURI: defaultVoice.voiceURI }));
            localStorage.setItem('lv_ttsVoiceURI', defaultVoice.voiceURI);
          }
        }
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const updateTtsSettings = (updates: Partial<TTSSettings>) => {
    setTtsSettings(prev => {
      const next = { ...prev, ...updates };
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

  const [categoryOpenState, setCategoryOpenState] = useState<Record<string, boolean>>({});
  
  const [movePanelState, setMovePanelState] = useState<{isOpen: boolean, type: 'single'|'bulk'|'folder', triggerRect?: any} | null>(null);
  
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
          setAllFiles(fallbackData.fileObjs);
          setPhysicalFolders(fallbackData.pFolders);
          updateFilter(fallbackData.fileObjs, fallbackData.pFolders, searchQueries);
          if (fallbackData.fileObjs.length > 0) {
            selectFile(fallbackData.fileObjs[0]);
          }
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

  const loadFiles = async (handle: any) => {
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
        t = `${String(lm.getHours()).padStart(2,'0')}:${String(lm.getMinutes()).padStart(2,'0')}`;
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

    setAllFiles(files);
    setPhysicalFolders(pFolders);
    updateFilter(files, pFolders, searchQueries);

    // レジューム機能: 最後に開いていたファイルがあれば同じ場所を開く
    try {
      const lastFileRaw = localStorage.getItem('lv_lastFile');
      if (lastFileRaw) {
        const lastFileInfo = JSON.parse(lastFileRaw);
        const target = files.find(f => f.filename === lastFileInfo.filename && (lastFileInfo.category ? f.category === lastFileInfo.category : true));
        if (target) {
          selectFile(target);
        }
      }
    } catch (e) {
      console.warn('Failed to restore last opened file:', e);
    }
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
      } else {
        const nameA = getSortableName(a.filename);
        const nameB = getSortableName(b.filename);
        const cmp = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
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
  }, [sortMode, sortDirection, allFiles, physicalFolders, searchQueries]);

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
      
      setAllFiles(fileObjs);
      setPhysicalFolders(pFolders);
      updateFilter(fileObjs, pFolders, searchQueries);
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
      localStorage.setItem('lv_lastFile', JSON.stringify({ filename: f.filename, category: f.category }));
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
      const updated = { ...currentFileObj, content: newContent };
      setCurrentFileObj(updated);
      setCurrentContent(newContent);
      setAllFiles(prev => prev.map(f => f.filename === currentFileObj.filename && f.category === currentFileObj.category ? updated : f));
      setIsEditing(false);
    } catch(e: any) {
      alert(e.message);
    }
  };

  const toggleSelectMode = () => {
    const next = !isSelectMode;
    setIsSelectMode(next);
    if (!next) {
      setSelectedFiles(new Set());
      setSelectedFileMap(new Map());
      setMovePanelState(null);
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

  const openMovePanel = (e: React.MouseEvent, type: 'single'|'bulk'|'folder') => {
    setMovePanelState({ isOpen: true, type, triggerRect: e.currentTarget.getBoundingClientRect() });
    e.stopPropagation();
  };
  const closeMovePanels = () => setMovePanelState(null);

  const execBulkMove = async (files: FileObj[], destHandle: any | null, destCatName: string | null) => {
    if (isFallbackMode) {
      alert(t.main.fallbackMoveError);
      return;
    }
    for (const f of files) {
      try {
        if (f.category === destCatName) continue;
        const target = destHandle || dirHandle;
        const nf = await target.getFileHandle(f.filename, {create:true});
        const w = await nf.createWritable();
        await w.write(f.content);
        await w.close();
        
        if (f.folderHandle) await f.folderHandle.removeEntry(f.filename);
        else await dirHandle.removeEntry(f.filename);
        
        if (currentFileObj && currentFileObj.filename === f.filename && currentFileObj.category === f.category) {
          setCurrentFileObj({ ...currentFileObj, category: destCatName, folderHandle: destHandle, handle: nf });
        }
      } catch(e) { console.warn(e); }
    }
    await loadFiles(dirHandle);
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
    if (isFallbackMode) {
      alert(t.main.fallbackDeleteError);
      return;
    }
    if(!selectedFileMap.size || !confirm(`${selectedFileMap.size}${t.main.confirmDeleteBulk}`)) return;
    let dc = false;
    for (const f of selectedFileMap.values()) {
      try {
        if(f.folderHandle) await f.folderHandle.removeEntry(f.filename);
        else await dirHandle.removeEntry(f.filename);
        if(currentFileObj && currentFileObj.filename === f.filename) dc = true;
      } catch(e){}
    }
    if (dc) setCurrentFileObj(null);
    await loadFiles(dirHandle);
    if(isSelectMode) toggleSelectMode();
    else clearFileSelection();
  };

  const deleteCurrentFile = async () => {
    if (isFallbackMode) {
      alert(t.main.fallbackDeleteError);
      return;
    }
    if(!currentFileObj || !confirm(t.main.confirmDeleteFile)) return;
    try {
      if(currentFileObj.folderHandle) await currentFileObj.folderHandle.removeEntry(currentFileObj.filename);
      else await dirHandle.removeEntry(currentFileObj.filename);
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
      setCurrentFileObj({...currentFileObj, filename: newName, handle: nf});
      await loadFiles(dirHandle);
    } catch(e:any) { alert(e.message); }
  };

  const renameFolder = async (oldName: string, folderHandle: any, explicitNewName?: string) => {
    const newName = explicitNewName !== undefined 
      ? explicitNewName 
      : prompt(`${t.main.renameFolderPrompt} ${oldName}\n\n${t.main.renamePrompt}`, oldName);
    if (!newName || newName.trim() === '' || newName.trim() === oldName) return;
    const trimmed = newName.trim();
    try {
      const newFolderHandle = await dirHandle.getDirectoryHandle(trimmed, { create: true });
      for await (const item of folderHandle.values()) {
        if (item.kind === 'file') {
          const file = await item.getFile(); const text = await file.text();
          const newFileHandle = await newFolderHandle.getFileHandle(item.name, { create: true });
          const writable = await newFileHandle.createWritable(); await writable.write(text); await writable.close();
        }
      }
      await dirHandle.removeEntry(oldName, { recursive: true });
      
      if (currentFileObj && currentFileObj.category === oldName) {
        const newHandle = await newFolderHandle.getFileHandle(currentFileObj.filename, { create: false }).catch(() => null);
        if (newHandle) {
          setCurrentFileObj({ ...currentFileObj, category: trimmed, folderHandle: newFolderHandle, handle: newHandle });
        }
      }
      closeMovePanels();
      await loadFiles(dirHandle);
    } catch(e:any){ alert(e.message); }
  };

  const deleteFolder = async (name: string, folderHandle: any) => {
    if (isFallbackMode) {
      alert(t.main.fallbackDeleteError);
      return;
    }
    let count = 0;
    for await (const item of folderHandle.values()) { if (item.kind === 'file') count++; }
    const msg = count > 0 ? `「${name}」\n⚠️ ${count} ${t.main.confirmDeleteFolder}` : `「${name}」\n${t.main.confirmDeleteFolder}`;
    if (!confirm(msg)) return;
    try {
      await dirHandle.removeEntry(name, { recursive: true });
      if (currentFileObj && currentFileObj.category === name) setCurrentFileObj(null);
      closeMovePanels();
      await loadFiles(dirHandle);
    } catch(e:any){ alert(e.message); }
  };

  const createNewFolder = async (parentFolderHandle?: any, parentPath?: string | null, explicitFolderName?: string): Promise<boolean> => {
    if (isFallbackMode) return false;
    const targetParent = parentFolderHandle || dirHandle;
    let folderName = explicitFolderName;
    if (!folderName) {
      const promptMsg = parentPath 
        ? `【${parentPath}】${lang === 'en' ? ' - Subfolder name:' : ' の中に作成する新しいフォルダー名:'}`
        : (t.main.newFolderPrompt || "新しいフォルダー名:");
      folderName = prompt(promptMsg) || undefined;
    }
    if (!folderName || !folderName.trim()) return false;
    try {
      await getDirectoryHandleByPath(targetParent, folderName.trim(), true);
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
      viewMode, setViewMode, explorerCategory, setExplorerCategory, openExplorer,
      canGoBack, canGoForward, goBack, goForward, goBackExplorer, goForwardExplorer,
      openFolder, reopenFolder, refreshFolder, setSearchQuery, clearSearch, removeSearchQuery,
      selectFile, toggleEdit, saveFile, toggleSelectMode, toggleFileSelection, selectAllFiles, deselectAllFiles, clearFileSelection, toggleHighlight,
      toggleSettings, setCategoryOpen, expandAllGroups, collapseAllGroups,
      openMovePanel, closeMovePanels, execBulkMove, moveToNewFolder, bulkDeleteFiles, deleteCurrentFile,
      renameCurrentFile, renameFolder, deleteFolder, createNewFolder, createNewFile, importExistingFiles, lang, setLang, t, speakerModeEnabled, setSpeakerMode,
      ttsSettings, updateTtsSettings, voices, writingMode, setWritingMode,
      paperMode, paperColor, setPaperColor, setPaperMode, togglePaperMode, loadPaperForTheme, fileMarks, setFileMark, setBulkFileMarks, hasPrevFile, hasNextFile, goToPrevFile, goToNextFile,
      isResuming, pendingResumeHandle, resumeSavedFolder
    }}>
      {children}
    </AppContext.Provider>
  );
};
