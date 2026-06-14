import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FileObj, PhysicalFolder, CategoryObj } from './types';
import { loadFolderHandle, saveFolderHandle, saveFallbackData, loadFallbackData, parseFilename, getVirtualFolder } from './utils';

export interface AppState {
  dirHandle: any | null;
  savedFolderName: string | null;
  isFallbackMode: boolean;
  allFiles: FileObj[];
  filteredFiles: FileObj[];
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
  renameCurrentFile: () => Promise<void>;
  toggleFileMarker: (marker: string) => Promise<void>;
  renameFolder: (oldName: string, folderHandle: any) => Promise<void>;
  deleteFolder: (name: string, folderHandle: any) => Promise<void>;
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
  const [savedFolderName, setSavedFolderName] = useState<string | null>(null);
  const [allFiles, setAllFiles] = useState<FileObj[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileObj[]>([]);
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
  const [writingMode, setWritingModeState] = useState<'horizontal' | 'vertical'>(
    () => (localStorage.getItem('lv_writingMode') as 'horizontal' | 'vertical') || 'horizontal'
  );

  const setWritingMode = (mode: 'horizontal' | 'vertical') => {
    setWritingModeState(mode);
    localStorage.setItem('lv_writingMode', mode);
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
        setVoices(v);
        if (!localStorage.getItem('lv_ttsVoiceURI')) {
          const defaultVoice = v.find(voice => voice.name.toLowerCase().includes('ichiro')) 
            || v.find(voice => voice.name.toLowerCase().includes('google 日本語'))
            || v.find(voice => voice.lang.startsWith('ja'));
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

  useEffect(() => {
    const init = async () => {
      if (!window.showDirectoryPicker) {
        const fallbackData = await loadFallbackData();
        if (fallbackData) {
          setDirHandle({ name: fallbackData.rootFolderName, isFallback: true });
          setIsFallbackMode(true);
          setAllFiles(fallbackData.fileObjs);
          setPhysicalFolders(fallbackData.pFolders);
          updateFilter(fallbackData.fileObjs, fallbackData.pFolders, searchQueries);

          const lastCat = localStorage.getItem('lv_lastFileCategory');
          const lastFile = localStorage.getItem('lv_lastFileName');
          if (lastFile) {
            const target = fallbackData.fileObjs.find((f: any) => (f.category || '') === (lastCat || '') && f.filename === lastFile);
            if (target) {
              setCurrentFileObj(target);
              setCurrentContent(target.content);
              setIsEditing(false);
            }
          }
        }
      } else {
        const handle = await loadFolderHandle();
        if (handle) {
          setSavedFolderName(handle.name);
          try {
            if (await (handle as any).verifyPermission({ mode: 'readwrite' }) === 'granted') {
              setDirHandle(handle);
              setLoading(true);
              await loadFiles(handle);
              setLoading(false);
            }
          } catch(e) { console.warn(e); }
        }
      }
    };
    init();
  }, []);

  const loadFiles = async (handle: any) => {
    const entries: {handle: any, category: string | null, folderHandle: any | null}[] = [];
    const pFolders: PhysicalFolder[] = [];
    
    async function collect(dirH: any, cat: string | null) {
      if (!dirH.values) return;
      for await (const item of dirH.values()) {
        if (item.kind === 'file' && (item.name.endsWith('.txt') || item.name.endsWith('.md'))) {
          entries.push({ handle: item, category: cat, folderHandle: cat ? dirH : null });
        } else if (item.kind === 'directory') {
          if (dirH.name === '00_AIエージェント専用' || dirH.name === 'AIエージェント専用' || cat === '00_AIエージェント専用' || cat === 'AIエージェント専用' || (cat && (cat.startsWith('00_AIエージェント専用/') || cat.startsWith('AIエージェント専用/')))) {
            continue;
          }
          const subCat = cat ? cat + '/' + item.name : item.name;
          pFolders.push({ name: subCat, handle: item });
          await collect(item, subCat);
        }
      }
    }
    await collect(handle, null);
    
    pFolders.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    
    const filesPromises = await Promise.all(entries.map(async entry => {
      try {
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
      } catch (e) {
        console.warn("Skipping file due to getFile error (likely renamed or deleted):", entry.handle.name, e);
        return null;
      }
    }));
    const files = filesPromises.filter((f): f is Exclude<typeof f, null> => f !== null);
    
    files.sort((a, b) => {
      const dtA = (a.date || '') + (a.time || '');
      const dtB = (b.date || '') + (b.time || '');
      return dtB.localeCompare(dtA);
    });

    setAllFiles(files);
    setPhysicalFolders(pFolders);
    updateFilter(files, pFolders, searchQueries);

    const lastCat = localStorage.getItem('lv_lastFileCategory');
    const lastFile = localStorage.getItem('lv_lastFileName');
    if (lastFile) {
      const target = files.find(f => (f.category || '') === (lastCat || '') && f.filename === lastFile);
      if (target) {
        setCurrentFileObj(target);
        setCurrentContent(target.content);
        setIsEditing(false);
      }
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
    setFilteredFiles(filtered);
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
               category = parts[1];
               pFoldersMap.set(category, { name: category, handle: null });
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
      setSavedFolderName(handle.name);
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
        setSavedFolderName(fallbackData.rootFolderName);
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
      setSavedFolderName(handle.name);
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

  const selectFile = (f: FileObj) => {
    setCurrentFileObj(f);
    setCurrentContent(f.content);
    setIsEditing(false);
    localStorage.setItem('lv_lastFileCategory', f.category || '');
    localStorage.setItem('lv_lastFileName', f.filename);
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
    allFiles.forEach(f => {
      const dKey = f.date || '__nodate__';
      if (dKey !== '__nodate__') {
        const mKey = dKey.slice(0, 7);
        const vFolder = getVirtualFolder(f.filename, f.date);
        if (f.category) {
          if (f.category === '00_AIエージェント専用' || f.category === 'AIエージェント専用') {
            newState[`vdir:cat:${f.category}:${vFolder}`] = true;
          } else {
            newState[`cat:${f.category}:month:${mKey}`] = true;
            newState[`vdir:cat:${f.category}:${mKey}:${vFolder}`] = true;
          }
        } else {
          if (dirHandle && (dirHandle.name === '00_AIエージェント専用' || dirHandle.name === 'AIエージェント専用')) {
            newState[`vdir:${vFolder}`] = true;
          } else {
            newState['month:' + mKey] = true;
            newState[`vdir:${mKey}:${vFolder}`] = true;
          }
        }
      }
    });
    setCategoryOpenState(newState);
  };
  
  const collapseAllGroups = () => {
    const newState: Record<string, boolean> = {};
    allCategories.forEach(cat => { newState['cat:' + cat.name] = false; });
    allFiles.forEach(f => {
      const dKey = f.date || '__nodate__';
      if (dKey !== '__nodate__') {
        const mKey = dKey.slice(0, 7);
        const vFolder = getVirtualFolder(f.filename, f.date);
        if (f.category) {
          if (f.category === '00_AIエージェント専用' || f.category === 'AIエージェント専用') {
            newState[`vdir:cat:${f.category}:${vFolder}`] = false;
          } else {
            newState[`cat:${f.category}:month:${mKey}`] = false;
            newState[`vdir:cat:${f.category}:${mKey}:${vFolder}`] = false;
          }
        } else {
          if (dirHandle && (dirHandle.name === '00_AIエージェント専用' || dirHandle.name === 'AIエージェント専用')) {
            newState[`vdir:${vFolder}`] = false;
          } else {
            newState['month:' + mKey] = false;
            newState[`vdir:${mKey}:${vFolder}`] = false;
          }
        }
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
  };

  const moveToNewFolder = async (folderName: string, isBulk: boolean) => {
    if (!folderName) return;
    try {
      const nh = await dirHandle.getDirectoryHandle(folderName, {create: true});
      const files = isBulk ? Array.from(selectedFileMap.values()) : (currentFileObj ? [currentFileObj] : []);
      await execBulkMove(files, nh, folderName);
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
    toggleSelectMode();
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

  const renameCurrentFile = async () => {
    if (isFallbackMode) {
      alert(t.main.fallbackRenameError);
      return;
    }
    if (!currentFileObj) return;

    const newName = prompt(t.main.renamePrompt, currentFileObj.filename);
    if (newName === null) return; // User pressed Cancel
    
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === currentFileObj.filename) return;

    let finalNewName = trimmedName;
    const match = currentFileObj.filename.match(/\.([^.]+)$/);
    const ext = match ? `.${match[1]}` : '.txt';
    if (!finalNewName.endsWith('.txt') && !finalNewName.endsWith('.md')) {
      finalNewName += ext;
    }

    if (finalNewName === currentFileObj.filename) return;

    try {
      const th = currentFileObj.folderHandle || dirHandle;
      if (currentFileObj.handle && typeof currentFileObj.handle.move === 'function') {
        await currentFileObj.handle.move(finalNewName);
        setCurrentFileObj({...currentFileObj, filename: finalNewName});
      } else {
        const nf = await th.getFileHandle(finalNewName, {create: true});
        const w = await nf.createWritable();
        await w.write(currentFileObj.content);
        await w.close();
        await th.removeEntry(currentFileObj.filename);
        setCurrentFileObj({...currentFileObj, filename: finalNewName, handle: nf});
      }
      await loadFiles(dirHandle);
    } catch(e:any) { alert(e.message); }
  };

  const toggleFileMarker = async (marker: string) => {
    if (isFallbackMode) {
      alert(t.main.fallbackRenameError);
      return;
    }
    if (!currentFileObj) return;

    const MARKERS = ["★", "☆", "✔", "💡", "📌", "⚠️"];
    const OLD_MARKERS = ["●", "■", "▲", "▼", "◆", "★", "☆", "✓"];
    const filename = currentFileObj.filename;
    
    let prefix = "";
    let baseName = filename;
    const prefixMatch = filename.match(/^(\d{8}_\d{4}_(?:-\s*)?)/);
    if (prefixMatch) {
      prefix = prefixMatch[1];
      baseName = filename.slice(prefix.length);
    }
    
    // 拡張子とベース名を分離してカッコ判定を行う
    let dotIdx = baseName.lastIndexOf('.');
    let nameWithoutExt = dotIdx !== -1 ? baseName.slice(0, dotIdx) : baseName;
    let ext = dotIdx !== -1 ? baseName.slice(dotIdx) : "";

    let hasBracket = false;
    let bracketOpen = "";
    let bracketClose = "";
    let innerName = nameWithoutExt;
    if ((nameWithoutExt.startsWith("「") && nameWithoutExt.endsWith("」")) || (nameWithoutExt.startsWith("『") && nameWithoutExt.endsWith("』"))) {
      hasBracket = true;
      bracketOpen = nameWithoutExt[0];
      bracketClose = nameWithoutExt[nameWithoutExt.length - 1];
      innerName = nameWithoutExt.slice(1, -1);
    }

    let hasExistingMarker = false;
    let existingMarker = "";
    let restOfName = innerName;
    
    const ALL_DETECT_MARKERS = [...MARKERS, ...OLD_MARKERS];
    for (const m of ALL_DETECT_MARKERS) {
      if (innerName.startsWith(m)) {
        hasExistingMarker = true;
        existingMarker = m;
        restOfName = innerName.slice(m.length).replace(/^\s+/, "");
        break;
      }
    }
    
    let newBaseName = "";
    if (marker === "❌" || marker === "") {
      // マークを剥がす
      newBaseName = restOfName;
    } else if (hasExistingMarker && existingMarker === marker) {
      // 同じマークの場合は剥がす
      newBaseName = restOfName;
    } else {
      // 別のマークを付与
      newBaseName = `${marker} ${restOfName}`;
    }

    // カッコを包み直す
    if (hasBracket) {
      newBaseName = `${bracketOpen}${newBaseName}${bracketClose}`;
    }
    // 拡張子を戻す
    newBaseName = newBaseName + ext;
    
    const finalNewName = prefix + newBaseName;
    if (finalNewName === filename) return;

    try {
      const th = currentFileObj.folderHandle || dirHandle;
      if (currentFileObj.handle && typeof currentFileObj.handle.move === 'function') {
        await currentFileObj.handle.move(finalNewName);
        setCurrentFileObj({ ...currentFileObj, filename: finalNewName });
      } else {
        const nf = await th.getFileHandle(finalNewName, {create: true});
        const w = await nf.createWritable();
        await w.write(currentFileObj.content);
        await w.close();
        await th.removeEntry(filename);
        setCurrentFileObj({ ...currentFileObj, filename: finalNewName, handle: nf });
      }
      await loadFiles(dirHandle);
    } catch(e:any) { 
      alert(e.message); 
    }
  };

  const renameFolder = async (oldName: string, folderHandle: any) => {
    const newName = prompt(`${t.main.renameFolderPrompt} ${oldName}\n\n${t.main.renamePrompt}`, oldName);
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
      for await (const item of folderHandle.values()) {
        if (item.kind === 'file') await folderHandle.removeEntry(item.name);
      }
      await dirHandle.removeEntry(oldName);
      
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
      for await (const item of folderHandle.values()) { if (item.kind === 'file') await folderHandle.removeEntry(item.name); }
      await dirHandle.removeEntry(name);
      if (currentFileObj && currentFileObj.category === name) setCurrentFileObj(null);
      closeMovePanels();
      await loadFiles(dirHandle);
    } catch(e:any){ alert(e.message); }
  };

  window.__draggedFiles = isSelectMode ? Array.from(selectedFileMap.values()) : (currentFileObj ? [currentFileObj] : null);

  return (
    <AppContext.Provider value={{
      dirHandle, savedFolderName, isFallbackMode, allFiles, filteredFiles, allCategories, physicalFolders, searchQueries,
      currentFileObj, currentContent, isEditing, selectedFiles, selectedFileMap, isSelectMode,
      settingsOpen, isHighlightOff, categoryOpenState, movePanelState, loading, refreshing,
      sortMode, sortDirection, setSortMode, setSortDirection,
      openFolder, reopenFolder, refreshFolder, setSearchQuery, clearSearch, removeSearchQuery,
      selectFile, toggleEdit, saveFile, toggleSelectMode, toggleFileSelection, toggleHighlight,
      toggleSettings, setCategoryOpen, expandAllGroups, collapseAllGroups,
      openMovePanel, closeMovePanels, execBulkMove, moveToNewFolder, bulkDeleteFiles, deleteCurrentFile,
      renameCurrentFile, toggleFileMarker, renameFolder, deleteFolder, lang, setLang, t, speakerModeEnabled, setSpeakerMode,
      ttsSettings, updateTtsSettings, voices, writingMode, setWritingMode
    }}>
      {children}
    </AppContext.Provider>
  );
};
