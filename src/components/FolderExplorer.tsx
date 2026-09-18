import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { FileObj } from '../types';
import { FolderIcon, FoldersStackIcon, MoveIcon, DeleteIcon, EditIcon, ImageIcon, SunOutlineIcon, ShuffleIcon, UploadIcon } from './Icons';
import { 
  loadFolderVisualSettings, 
  saveFolderVisualSettings, 
  getFolderCoverData, 
  FolderVisualSettings, 
  FolderCoverPosition,
  getCategoryTheme, 
  shuffleFolderCover, 
  setFolderCoverPosition,
  migrateFolderVisualSettings,
  readFileAsDataUrl 
} from '../folderVisuals';
import { ThemeQuickToggle } from './ThemeQuickToggle';

export const FolderExplorer: React.FC = () => {
  const {
    allFiles,
    allCategories,
    explorerCategory,
    openExplorer,
    selectFile,
    sortMode,
    sortDirection,
    setSortMode,
    setSortDirection,
    fileMarks,
    setBulkFileMarks,
    t,
    lang,
    createNewFile,
    createNewFolder,
    renameFolder,
    importExistingFiles,
    dirHandle,
    physicalFolders,
    currentFileObj,
    loading,
    isResuming,
    selectedFiles,
    selectedFileMap,
    toggleFileSelection,
    selectAllFiles,
    deselectAllFiles,
    clearFileSelection,
    bulkDeleteFiles,
    openMovePanel,
    mainBgWhite,
    toggleMainBgWhite
  } = useAppContext();

  const [isExplorerSelectMode, setIsExplorerSelectMode] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [layoutMode, setLayoutMode] = useState<'card' | 'list'>(() => {
    return (localStorage.getItem('sf_explorer_layout') as 'card' | 'list') || 'card';
  });
  const [listDensity, setListDensity] = useState<'compact' | 'standard' | 'spacious'>(() => {
    return (localStorage.getItem('sf_explorer_density') as 'compact' | 'standard' | 'spacious') || 'standard';
  });
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [targetParentPath, setTargetParentPath] = useState<string>('');

  // フォルダー名編集（リネーム）用ステート
  const [isRenameFolderModalOpen, setIsRenameFolderModalOpen] = useState(false);
  const [folderRenameTarget, setFolderRenameTarget] = useState<{ name: string; shortName: string; handle?: any } | null>(null);
  const [folderRenameInputVal, setFolderRenameInputVal] = useState('');

  const [visualSettings, setVisualSettings] = useState<FolderVisualSettings>(loadFolderVisualSettings);
  const [coverModalTarget, setCoverModalTarget] = useState<{ path: string; name: string } | null>(null);
  const [coverInputUrl, setCoverInputUrl] = useState('');
  const [isDraggingModalFile, setIsDraggingModalFile] = useState(false);
  const [draggingCardPath, setDraggingCardPath] = useState<string | null>(null);

  useEffect(() => {
    const handleVisualChanged = () => {
      setVisualSettings(loadFolderVisualSettings());
    };
    window.addEventListener('folderVisualSettingsChanged', handleVisualChanged);
    return () => window.removeEventListener('folderVisualSettingsChanged', handleVisualChanged);
  }, []);

  const [bulkMarkOpen, setBulkMarkOpen] = useState(false);
  const bulkMarkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bulkMarkRef.current && !bulkMarkRef.current.contains(e.target as Node)) {
        setBulkMarkOpen(false);
      }
    };
    if (bulkMarkOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [bulkMarkOpen]);

  const handleSetLayoutMode = (mode: 'card' | 'list') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('sf_explorer_layout', mode);
    } catch {
      // ignore
    }
  };

  const handleSetListDensity = (density: 'compact' | 'standard' | 'spacious') => {
    setListDensity(density);
    try {
      localStorage.setItem('sf_explorer_density', density);
    } catch {
      // ignore
    }
  };

  const handleOpenNewFolderModal = () => {
    setTargetParentPath(explorerCategory || '');
    setNewFolderName('');
    setIsNewFolderModalOpen(true);
  };

  const handleCreateFolderSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    
    // 選択された親パスに対応するハンドルを取得
    let targetHandle = dirHandle;
    if (targetParentPath) {
      const found = physicalFolders.find(p => p.name === targetParentPath);
      if (found && found.handle) {
        targetHandle = found.handle;
      }
    }
    
    const success = await createNewFolder(targetHandle, targetParentPath, trimmed);
    if (success) {
      setIsNewFolderModalOpen(false);
      setNewFolderName('');
    }
  };

  // フォルダー名変更モーダルを開く
  const handleOpenRenameFolderModal = (catName: string, catHandle?: any) => {
    const parts = catName.split('/');
    const shortName = parts[parts.length - 1];
    setFolderRenameTarget({ name: catName, shortName, handle: catHandle });
    setFolderRenameInputVal(shortName);
    setIsRenameFolderModalOpen(true);
  };

  // 既存フォルダーに素早く「00_」を付与 / 解除（トグル）
  const handleTogglePrefix00 = async (catName: string, catHandle?: any) => {
    const parts = catName.split('/');
    const shortName = parts[parts.length - 1];
    let newShortName = '';
    if (shortName.startsWith('00_')) {
      newShortName = shortName.slice(3);
    } else {
      newShortName = '00_' + shortName;
    }
    if (!newShortName.trim()) return;
    await renameFolder(catName, catHandle, newShortName.trim());
  };

  // フォルダー名変更を実行
  const handleRenameFolderSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!folderRenameTarget) return;
    const trimmed = folderRenameInputVal.trim();
    if (!trimmed || trimmed === folderRenameTarget.shortName) {
      setIsRenameFolderModalOpen(false);
      return;
    }
    const success = await renameFolder(folderRenameTarget.name, folderRenameTarget.handle, trimmed);
    if (success) {
      setIsRenameFolderModalOpen(false);
      setFolderRenameTarget(null);
      setFolderRenameInputVal('');
    }
  };

  // 全カテゴリー（フォルダー）配下のファイル総数を算出するマップ（自身および配下サブフォルダ含む）
  const categoryFileCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allCategories.forEach(cat => {
      const subPrefix = cat.name + '/';
      const total = allFiles.filter(f => f.category === cat.name || (f.category && f.category.startsWith(subPrefix))).length;
      counts.set(cat.name, total);
    });
    return counts;
  }, [allCategories, allFiles]);

  // 本文ダイジェスト（プレビュー）の生成用ヘルパー
  const getDigestSnippet = (content: string, maxLen = 130) => {
    if (!content) return '';
    const clean = content
      .replace(/<[^>]*>/g, '')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*|__/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[-*+]\s+/g, '')
      .replace(/\r?\n+/g, ' ')
      .trim();
    return clean.slice(0, maxLen) + (clean.length > maxLen ? '...' : '');
  };

  // 1. パンくずリストの階層分解
  const breadcrumbs = useMemo(() => {
    if (!explorerCategory) return [];
    return explorerCategory.split('/');
  }, [explorerCategory]);

  // 2. 現在のフォルダの直下にあるサブフォルダ（カテゴリー）を抽出
  const subCategories = useMemo(() => {
    const currentPrefix = explorerCategory ? explorerCategory + '/' : '';
    const currentDepth = explorerCategory ? explorerCategory.split('/').length : 0;

    // 現在のディレクトリ直下のサブフォルダを見つける
    const directSubs = allCategories.filter(cat => {
      if (explorerCategory) {
        return cat.name.startsWith(currentPrefix) && cat.name.split('/').length === currentDepth + 1;
      } else {
        return !cat.name.includes('/');
      }
    });

    // 各サブフォルダの配下にあるファイル総数、子フォルダー数を計算
    const subsWithCount = directSubs.map(sub => {
      const subPrefix = sub.name + '/';
      const allFilesInSub = allFiles.filter(f => f.category === sub.name || (f.category && f.category.startsWith(subPrefix)));
      const shortName = sub.name.split('/').pop() || sub.name;
      
      // 子フォルダー数
      const directChildFolders = allCategories.filter(c => 
        c.name.startsWith(subPrefix) && c.name.split('/').length === (sub.name.split('/').length + 1)
      );

      return {
        ...sub,
        shortName,
        totalCount: allFilesInSub.length,
        childFolderCount: directChildFolders.length
      };
    });

    // ソート処理
    const isYearMonth = (name: string) => /^\d{4}[-_./]\d{2}$/.test(name.trim());
    const isArchive = /過去ログ|アーカイブ|archive|agent|エージェント|ai/i.test(explorerCategory || '');

    // 1. トップページ（ALL DATA 直下）の場合:
    // サイドバーと同じ並び順（allCategoriesの登録順）を基準にし、00_AIエージェント専用が最上位に来るようにする
    if (!explorerCategory) {
      if (sortMode === 'name') {
        subsWithCount.sort((a, b) => {
          return sortDirection === 'asc'
            ? a.shortName.localeCompare(b.shortName, 'ja', { numeric: true })
            : b.shortName.localeCompare(a.shortName, 'ja', { numeric: true });
        });
      } else {
        // デフォルト（日付順モード時）: サイドバーのトップ階層と完全に同一の並び順（allCategoriesのインデックス順）
        const catOrderMap = new Map<string, number>();
        allCategories.forEach((c, idx) => catOrderMap.set(c.name, idx));
        subsWithCount.sort((a, b) => {
          const idxA = catOrderMap.get(a.name) ?? 0;
          const idxB = catOrderMap.get(b.name) ?? 0;
          return idxA - idxB;
        });
      }
      return subsWithCount;
    }

    // 2. サブフォルダー配下の場合（年月フォルダやアーカイブ等）
    subsWithCount.sort((a, b) => {
      const isDateA = isYearMonth(a.shortName);
      const isDateB = isYearMonth(b.shortName);

      if (sortMode === 'date') {
        if ((isArchive || isDateA || isDateB)) {
          if (isDateA && isDateB) {
            return sortDirection === 'desc'
              ? b.shortName.localeCompare(a.shortName, undefined, { numeric: true })
              : a.shortName.localeCompare(b.shortName, undefined, { numeric: true });
          }
          if (isDateA && !isDateB) return sortDirection === 'desc' ? -1 : 1;
          if (!isDateA && isDateB) return sortDirection === 'desc' ? 1 : -1;
        }
        return sortDirection === 'desc'
          ? b.shortName.localeCompare(a.shortName, 'ja', { numeric: true })
          : a.shortName.localeCompare(b.shortName, 'ja', { numeric: true });
      } else {
        return sortDirection === 'asc'
          ? a.shortName.localeCompare(b.shortName, 'ja', { numeric: true })
          : b.shortName.localeCompare(a.shortName, 'ja', { numeric: true });
      }
    });

    return subsWithCount;
  }, [allCategories, allFiles, explorerCategory, sortMode, sortDirection]);

  // 3. 現在のフォルダの直下にあるファイル群を抽出
  const filesInCurrentFolder = useMemo(() => {
    let files: FileObj[] = [];
    if (!explorerCategory) {
      files = allFiles.filter(f => !f.category);
    } else {
      files = allFiles.filter(f => f.category === explorerCategory);
    }

    // フィルタリング
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      files = files.filter(f => 
        (f.title || '').toLowerCase().includes(q) ||
        (f.filename || '').toLowerCase().includes(q) ||
        (f.content || '').toLowerCase().includes(q)
      );
    }

    // ソート処理
    return [...files].sort((a, b) => {
      if (sortMode === 'date') {
        const dA = a.date || '';
        const dB = b.date || '';
        if (dA !== dB) {
          return sortDirection === 'desc' ? dB.localeCompare(dA) : dA.localeCompare(dB);
        }
        return sortDirection === 'desc' ? b.filename.localeCompare(a.filename) : a.filename.localeCompare(b.filename);
      } else {
        return sortDirection === 'asc'
          ? (a.title || a.filename).localeCompare(b.title || b.filename, 'ja')
          : (b.title || b.filename).localeCompare(a.title || a.filename, 'ja');
      }
    });
  }, [allFiles, explorerCategory, filterText, sortMode, sortDirection]);

  // 現在フォルダー内のファイルの選択判定
  const selectedInCurrentFolder = useMemo(() => {
    return filesInCurrentFolder.filter(f => selectedFiles.has((f.category || '') + '::' + f.filename));
  }, [filesInCurrentFolder, selectedFiles]);

  const isAllFolderSelected = filesInCurrentFolder.length > 0 && selectedInCurrentFolder.length === filesInCurrentFolder.length;
  const isSomeFolderSelected = selectedInCurrentFolder.length > 0 && !isAllFolderSelected;
  const totalSelectedCount = selectedFiles.size;
  const isSelecting = isExplorerSelectMode || totalSelectedCount > 0;

  const handleToggleExplorerSelect = () => {
    if (isExplorerSelectMode) {
      setIsExplorerSelectMode(false);
      clearFileSelection();
    } else {
      setIsExplorerSelectMode(true);
    }
  };

  const handleToggleSelectAll = () => {
    if (isAllFolderSelected) {
      deselectAllFiles(filesInCurrentFolder);
    } else {
      setIsExplorerSelectMode(true);
      selectAllFiles(filesInCurrentFolder);
    }
  };

  const handleApplyBulkMark = (markSymbol: string | null) => {
    if (totalSelectedCount === 0) {
      alert(lang === 'en' ? 'Please select files using checkboxes first.' : 'マークを付けるファイルをチェックマークで選択してください。');
      return;
    }
    const names = (Array.from(selectedFileMap.values()) as FileObj[]).map(f => f.filename);
    setBulkFileMarks(names, markSymbol);
    setBulkMarkOpen(false);
  };

  const handleBulkDelete = () => {
    if (totalSelectedCount === 0) {
      alert(lang === 'en' ? 'Please select files using checkboxes first.' : '削除するファイルをチェックマークで選択してください。');
      return;
    }
    bulkDeleteFiles();
  };

  const handleOpenBulkMove = (e: React.MouseEvent) => {
    if (totalSelectedCount === 0) {
      alert(lang === 'en' ? 'Please select files using checkboxes first.' : '移動するファイルをチェックマークで選択してください。');
      return;
    }
    openMovePanel(e, 'bulk');
  };

  const MARK_OPTIONS: { mark: string | null; label: string; icon: string }[] = [
    { mark: '★', label: lang === 'en' ? 'Star' : '星マーク', icon: '★' },
    { mark: '✓', label: lang === 'en' ? 'Check' : 'チェック', icon: '✓' },
    { mark: '💡', label: lang === 'en' ? 'Idea' : 'アイデア', icon: '💡' },
    { mark: '📌', label: lang === 'en' ? 'Pin' : 'ピン留め', icon: '📌' },
    { mark: '⚠️', label: lang === 'en' ? 'Alert' : '注意', icon: '⚠️' },
    { mark: null, label: lang === 'en' ? 'Clear' : 'マーク解除', icon: '✕' },
  ];

  // 上の階層へ戻るパスを算出
  const handleGoUp = () => {
    if (!explorerCategory) return;
    const parts = explorerCategory.split('/');
    if (parts.length <= 1) {
      openExplorer(null);
    } else {
      parts.pop();
      openExplorer(parts.join('/'));
    }
  };

  const currentFolderHandle = useMemo(() => {
    if (!explorerCategory) return null;
    const cat = physicalFolders.find(c => c.name === explorerCategory);
    return cat ? cat.handle : null;
  }, [physicalFolders, explorerCategory]);

  return (
    <div id="explorer-view" className="explorer-container">
      {/* 01. 上部コントロール・パンくずナビゲーション */}
      <div className="explorer-header">
        <div className="explorer-breadcrumb-row">
          <div className="explorer-breadcrumbs">
            <button 
              className={`explorer-crumb ${!explorerCategory ? 'active' : ''}`}
              onClick={() => openExplorer(null)}
              title="ルートディレクトリ（ALL DATA）"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <FoldersStackIcon size={14} />
              <span>ALL DATA</span>
            </button>
            {breadcrumbs.map((crumb, idx) => {
              const fullPath = breadcrumbs.slice(0, idx + 1).join('/');
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={fullPath}>
                  <span className="explorer-crumb-sep">›</span>
                  <button 
                    className={`explorer-crumb ${isLast ? 'active' : ''}`}
                    onClick={() => openExplorer(fullPath)}
                    disabled={isLast}
                  >
                    {crumb}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="explorer-actions">
            {explorerCategory && (
              <button className="explorer-btn" onClick={handleGoUp} title="1つ上のフォルダーへ">
                ⬆ {lang === 'en' ? 'Up' : '上の階層'}
              </button>
            )}
            {/* 現在開いているフォルダーの名前変更ボタン */}
            {explorerCategory && (
              <>
                <button 
                  className="explorer-btn" 
                  onClick={() => {
                    const found = physicalFolders.find(p => p.name === explorerCategory);
                    handleTogglePrefix00(explorerCategory, found?.handle);
                  }} 
                  title={
                    explorerCategory.split('/').pop()?.startsWith('00_')
                      ? (lang === 'en' ? 'Remove "00_" prefix' : '先頭の「00_」を外す')
                      : (lang === 'en' ? 'Add "00_" prefix to folder name' : 'フォルダー名の先頭に「00_」を付与')
                  }
                  style={{ fontFamily: 'var(--font-mono, monospace)' }}
                >
                  {explorerCategory.split('/').pop()?.startsWith('00_') ? '↩ 00_解除' : '＋ 00_付与'}
                </button>
                <button 
                  className="explorer-btn" 
                  onClick={() => {
                    const found = physicalFolders.find(p => p.name === explorerCategory);
                    handleOpenRenameFolderModal(explorerCategory, found?.handle);
                  }} 
                  title={lang === 'en' ? 'Rename current folder' : '現在開いているフォルダー名を変更'}
                >
                  ✏️ {lang === 'en' ? 'Rename' : '名前変更'}
                </button>
              </>
            )}
            {/* 新規フォルダー作成ボタン（作成先フォルダー選択モーダルを開く） */}
            <button 
              className="explorer-btn" 
              onClick={handleOpenNewFolderModal}
              title={lang === 'en' ? 'Create new folder with location selection' : '作成先を選んで新規フォルダーを作成'}
            >
              📁＋ {lang === 'en' ? 'New Folder' : '新規フォルダー'}
            </button>
            {/* 既存テキストファイル取り込みボタン（主要操作） */}
            {(currentFolderHandle || dirHandle) && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <button 
                  className="explorer-btn primary" 
                  onClick={() => importExistingFiles(currentFolderHandle || dirHandle, explorerCategory)}
                  title={lang === 'en' ? 'Select and import existing text files (.txt, .md, .log, etc.)' : '既存のテキストファイル（.txt, .md, チャットログ等）を選んで追加'}
                >
                  📥 {lang === 'en' ? 'Add File' : 'ファイル追加'}
                </button>
                <button 
                  className="explorer-btn" 
                  onClick={() => createNewFile(currentFolderHandle || dirHandle)}
                  title={lang === 'en' ? 'Create a blank new file' : '空の新規ファイルを作成'}
                  style={{ padding: '5px 8px' }}
                >
                  ＋
                </button>
              </div>
            )}

            {/* テーマQuick切り替えボタン */}
            <ThemeQuickToggle />
          </div>
        </div>

        {/* 02. サブツールバー（検索・ソート切り替え・集計） */}
        <div className="explorer-toolbar">
          <div className="explorer-search-box">
            <span className="explorer-search-icon">🔍</span>
            <input 
              type="text" 
              placeholder={lang === 'en' ? 'Filter in this directory...' : 'このフォルダー内を検索...'}
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="explorer-search-input"
            />
            {filterText && (
              <button className="explorer-clear-btn" onClick={() => setFilterText('')}>✕</button>
            )}
          </div>

          <div className="explorer-meta-info">
            <span className="explorer-stat-badge">
              {lang === 'en' ? `SUB-DIRS: ${subCategories.length}` : `サブフォルダ: ${subCategories.length}`}
            </span>
            <span className="explorer-stat-badge">
              {lang === 'en' ? `FILES: ${filesInCurrentFolder.length}` : `ファイル: ${filesInCurrentFolder.length}`}
            </span>

            {/* ソート順切り替え */}
            <div className="explorer-sort-group">
              <button 
                className={`explorer-sort-btn ${sortMode === 'date' ? 'active' : ''}`}
                onClick={() => {
                  if (sortMode === 'date') setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
                  else { setSortMode('date'); setSortDirection('desc'); }
                }}
              >
                {t.sidebar.sortDate} {sortMode === 'date' ? (sortDirection === 'desc' ? '▼' : '▲') : ''}
              </button>
              <button 
                className={`explorer-sort-btn ${sortMode === 'name' ? 'active' : ''}`}
                onClick={() => {
                  if (sortMode === 'name') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                  else { setSortMode('name'); setSortDirection('asc'); }
                }}
              >
                {t.sidebar.sortName} {sortMode === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
              </button>
            </div>

            {/* メイン白背景切り替えボタン */}
            <button 
              className={`explorer-sort-btn ${mainBgWhite ? 'active' : ''}`}
              onClick={toggleMainBgWhite}
              title={
                mainBgWhite 
                  ? (lang === 'en' ? 'Main Background: White (Click for theme default)' : 'メイン画面背景: 白（クリックでテーマ標準色に戻す）') 
                  : (lang === 'en' ? 'Main Background: Theme Default (Click for white)' : 'メイン画面背景: テーマ標準（クリックで白背景にする）')
              }
              style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <SunOutlineIcon size={13} />
              <span>{mainBgWhite ? '白背景 ON' : '白背景'}</span>
            </button>

            {/* フォルダーカバー表示切り替えボタン */}
            <button 
              className={`explorer-sort-btn ${visualSettings.enabled ? 'active' : ''}`}
              onClick={() => {
                const next = { ...visualSettings, enabled: !visualSettings.enabled };
                setVisualSettings(next);
                saveFolderVisualSettings(next);
              }}
              title={
                visualSettings.enabled 
                  ? (lang === 'en' ? 'Folder Covers: Enabled (Click to hide)' : 'フォルダーカバー表示中（クリックで通常表示に戻す）') 
                  : (lang === 'en' ? 'Folder Covers: Disabled (Click to show)' : 'フォルダーカバー表示（クリックで図絵・画像カバーを表示）')
              }
              style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <ImageIcon size={13} />
              <span>{visualSettings.enabled ? 'カバー ON' : 'カバー'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="explorer-scroll-area">
        {/* 03. サブディレクトリ群のカード表示（存在する場合） */}
        {subCategories.length > 0 && (
          <section className="explorer-section">
            <div className="explorer-section-title">
              <span className="section-icon">📁</span>
              <span>SUB-DIRECTORIES ({subCategories.length})</span>
            </div>
            <div className="explorer-folders-grid">
              {subCategories.map(cat => {
                const isCoverOn = visualSettings.enabled;
                const isBanner = isCoverOn && visualSettings.layout === 'banner';
                const isCardBg = isCoverOn && visualSettings.layout === 'card-bg';
                const coverData = isCoverOn ? getFolderCoverData(cat.shortName, cat.name, visualSettings) : null;
                const isCardDragging = draggingCardPath === cat.name;

                return (
                  <div 
                    key={cat.name}
                    className={`folder-card ${isBanner ? 'with-cover-banner' : ''} ${isCardBg ? 'with-cover-bg' : ''}`}
                    onClick={() => openExplorer(cat.name)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') openExplorer(cat.name); }}
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes('Files')) {
                        e.preventDefault();
                        e.stopPropagation();
                        setDraggingCardPath(cat.name);
                      }
                    }}
                    onDragEnter={(e) => {
                      if (e.dataTransfer.types.includes('Files')) {
                        e.preventDefault();
                        e.stopPropagation();
                        setDraggingCardPath(cat.name);
                      }
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDraggingCardPath(null);
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDraggingCardPath(null);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        try {
                          const dataUri = await readFileAsDataUrl(file);
                          const nextCovers = { ...(visualSettings.customCovers || {}) };
                          nextCovers[cat.name] = dataUri;
                          nextCovers[cat.shortName] = dataUri;
                          const nextVariations = { ...(visualSettings.variations || {}) };
                          nextVariations[cat.name] = 0;
                          nextVariations[cat.shortName] = 0;
                          const nextSettings = { ...visualSettings, customCovers: nextCovers, variations: nextVariations };
                          setVisualSettings(nextSettings);
                          saveFolderVisualSettings(nextSettings);
                        } catch (err) {
                          console.error('Folder card drop failed:', err);
                        }
                      }
                    }}
                    style={isCardDragging ? { outline: '2.5px dashed var(--sb-accent, #3b82f6)', outlineOffset: '-2px', transform: 'scale(1.02)' } : undefined}
                  >
                    {/* カード全面背景レイヤー */}
                    {isCardBg && coverData && (
                      <div 
                        className="folder-card-full-bg-layer"
                        style={{
                          backgroundColor: coverData.gradient ? coverData.gradient[0] : '#0f172a',
                          backgroundImage: `url("${coverData.backgroundUrl}"), url("${coverData.fallbackSvgDataUri}")`,
                          backgroundPosition: coverData.backgroundPosition || 'center center',
                          opacity: (visualSettings.opacity ?? 1.0) * 0.28
                        }}
                      />
                    )}

                    {/* 上部ヘッダーバナー */}
                    {isBanner && coverData && (
                      <div className="folder-cover-banner">
                        <div 
                          className="folder-cover-bg-image"
                          style={{
                            backgroundColor: coverData.gradient ? coverData.gradient[0] : '#0f172a',
                            backgroundImage: `url("${coverData.backgroundUrl}"), url("${coverData.fallbackSvgDataUri}")`,
                            backgroundPosition: coverData.backgroundPosition || 'center center',
                            opacity: visualSettings.opacity ?? 1.0,
                            filter: `brightness(${visualSettings.brightness ?? 1.05}) contrast(1.02)`
                          }}
                        />
                        <div className="folder-cover-overlay" />
                        
                        <span className="folder-cover-badge">
                          {coverData.badge}
                        </span>

                        <div className="folder-cover-actions">
                          <button
                            type="button"
                            className="folder-cover-btn-icon"
                            title={lang === 'en' ? 'Next cover candidate in rotation (includes custom image)' : 'カバー画像を順送り（独自登録画像も候補に含まれます）'}
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = shuffleFolderCover(cat.name, cat.shortName, visualSettings);
                              setVisualSettings(next);
                            }}
                          >
                            <ShuffleIcon size={13} />
                          </button>
                          <button
                            type="button"
                            className="folder-cover-btn-icon"
                            title={lang === 'en' ? 'Select custom cover from folder / upload' : 'フォルダーから画像を選択・独自設定'}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCoverModalTarget({ path: cat.name, name: cat.shortName });
                              setCoverInputUrl(visualSettings.customCovers?.[cat.name] || visualSettings.customCovers?.[cat.shortName] || '');
                            }}
                          >
                            <UploadIcon size={13} />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={isBanner ? 'folder-card-body-wrap' : ''} style={isBanner ? { display: 'flex', flexDirection: 'column', flex: 1, gap: '8px', padding: '10px 14px 12px 14px' } : undefined}>
                      <div className="folder-card-top">
                        <div className="folder-card-icon-wrap">
                          <FolderIcon size={20} />
                        </div>
                        <div className="folder-card-name" title={cat.shortName}>
                          {cat.shortName}
                        </div>
                        <div className="folder-card-count" title={`${cat.totalCount} files`}>
                          {cat.totalCount}
                        </div>
                      </div>

                      <div className="folder-card-substats">
                        <span className="folder-card-subinfo">
                          {cat.childFolderCount > 0 
                            ? (lang === 'en' ? `📁 ${cat.childFolderCount} sub-folders` : `📁 ${cat.childFolderCount} サブフォルダ`) 
                            : (lang === 'en' ? '📁 Direct' : '📁 単一階層')}
                        </span>
                        <div className="folder-card-actions">
                          {isCardBg && (
                            <button
                              type="button"
                              className="folder-card-rename-btn"
                              title={lang === 'en' ? 'Customize cover' : 'カバー画像・図絵を設定'}
                              style={{ width: 'auto', padding: '0 5px', fontSize: '10px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCoverModalTarget({ path: cat.name, name: cat.shortName });
                                setCoverInputUrl(visualSettings.customCovers?.[cat.name] || visualSettings.customCovers?.[cat.shortName] || '');
                              }}
                            >
                              🖼️
                            </button>
                          )}
                          <button
                            type="button"
                            className="folder-card-prefix-btn"
                            title={
                              cat.shortName.startsWith('00_')
                                ? (lang === 'en' ? 'Remove "00_" prefix' : '「00_」を解除')
                                : (lang === 'en' ? 'Add "00_" prefix' : '「00_」を先頭に付与')
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePrefix00(cat.name, cat.handle);
                            }}
                          >
                            {cat.shortName.startsWith('00_') ? '00_✓' : '+00_'}
                          </button>
                          <button
                            type="button"
                            className="folder-card-rename-btn"
                            title={lang === 'en' ? 'Rename this folder' : 'フォルダー名を変更'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRenameFolderModal(cat.name, cat.handle);
                            }}
                          >
                            <EditIcon />
                          </button>
                          <span className="folder-card-open-arrow">
                            {lang === 'en' ? 'Open ➔' : '開く ➔'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 04. ログファイル・テキストのダイジェストカード/リスト一覧 */}
        <section className={`explorer-section ${isSelecting ? 'select-mode-active' : ''}`} style={{ position: 'relative', zIndex: 30 }}>
          <div className="explorer-section-title" style={{ position: 'relative', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            {/* 左側: 見出しタイトルと件数 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="section-icon">📄</span>
              <span>LOGS / ARTICLES ({filesInCurrentFolder.length})</span>
            </div>

            {/* 右側: ツールバー + 表示形式ピルを一番右寄りにまとめて配置 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
              {/* 一括操作バー（選択モード・全選択・マーク・削除・移動） */}
              <div className="explorer-bulk-toolbar">
                {/* 選択モード切り替えボタン */}
                <button
                  type="button"
                  className={`explorer-bulk-tool-btn select-mode ${isExplorerSelectMode ? 'active' : ''}`}
                  onClick={handleToggleExplorerSelect}
                  title={isExplorerSelectMode ? (lang === 'en' ? 'Exit selection mode' : '選択モードを終了') : (lang === 'en' ? 'Enter selection mode' : '選択モードを開始')}
                >
                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{isExplorerSelectMode ? '✕' : '☑'}</span>
                  <span>{isExplorerSelectMode ? (lang === 'en' ? 'Exit' : '終了') : (lang === 'en' ? 'Select' : '選択')}</span>
                </button>

                {/* 全選択 / 全解除 */}
                <button
                  type="button"
                  className={`explorer-bulk-tool-btn select-all ${isAllFolderSelected ? 'active' : ''}`}
                  onClick={handleToggleSelectAll}
                  disabled={filesInCurrentFolder.length === 0}
                  title={isAllFolderSelected ? (lang === 'en' ? 'Deselect all' : '全選択解除') : (lang === 'en' ? 'Select all' : 'すべて選択')}
                >
                  <div className={`explorer-mini-checkbox ${isAllFolderSelected ? 'checked' : (isSomeFolderSelected ? 'indeterminate' : '')}`}>
                    {isAllFolderSelected && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="mini-check-svg">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {isSomeFolderSelected && <div className="mini-indeterminate-bar" />}
                  </div>
                  <span>{isAllFolderSelected ? (lang === 'en' ? 'Deselect All' : '全解除') : (lang === 'en' ? 'Select All' : '全選択')}</span>
                </button>

                {/* 選択件数カウンター */}
                <span className={`explorer-bulk-count-badge ${totalSelectedCount > 0 ? 'highlight' : ''}`} title="選択中のファイル数">
                  {totalSelectedCount} {lang === 'en' ? 'selected' : '件選択中'}
                </span>

                {/* ☆ マーク ドロップダウン */}
                <div style={{ position: 'relative', zIndex: 100 }} ref={bulkMarkRef}>
                  <button
                    type="button"
                    className="explorer-bulk-tool-btn mark"
                    onClick={() => setBulkMarkOpen(!bulkMarkOpen)}
                    title={lang === 'en' ? 'Set mark for selected files' : '選択したファイルにマークをつける'}
                  >
                    <span>☆ {lang === 'en' ? 'Mark' : 'マーク'}</span>
                    <span style={{ fontSize: '9px', opacity: 0.8 }}>▼</span>
                  </button>

                  {bulkMarkOpen && (
                    <div className="explorer-bulk-mark-popup" onClick={e => e.stopPropagation()}>
                      <div className="explorer-mark-popup-header">
                        {lang === 'en' ? 'Mark selected files' : '選択したファイルにマーク'}
                      </div>
                      <div className="explorer-mark-popup-grid">
                        {MARK_OPTIONS.map(opt => (
                          <button
                            key={opt.label}
                            type="button"
                            className="explorer-mark-item-btn"
                            onClick={() => handleApplyBulkMark(opt.mark)}
                          >
                            <span className="mark-item-icon">{opt.icon}</span>
                            <span className="mark-item-label">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 移動先... ボタン */}
                <button
                  type="button"
                  className="explorer-bulk-tool-btn move"
                  onClick={handleOpenBulkMove}
                  title={lang === 'en' ? 'Move selected files' : '選択したファイルを別のフォルダーへ移動'}
                >
                  <MoveIcon />
                  <span>{t.main.moveTo || '移動先...'}</span>
                </button>

                {/* 削除ボタン */}
                <button
                  type="button"
                  className="explorer-bulk-tool-btn delete"
                  onClick={handleBulkDelete}
                  title={lang === 'en' ? 'Delete selected files' : '選択したファイルを削除'}
                >
                  <DeleteIcon />
                  <span>{t.main.delete || '削除'}</span>
                </button>
              </div>

              {/* リスト表示時の行間隔調整ピル (カード/リストボタンの左隣に配置) */}
              {layoutMode === 'list' && (
                <div className="explorer-layout-group" title={lang === 'en' ? 'List spacing density' : 'リストの行間隔（密度）'}>
                  <button
                    className={`explorer-layout-btn ${listDensity === 'compact' ? 'active' : ''}`}
                    onClick={() => handleSetListDensity('compact')}
                    title="狭 (8px)"
                    style={{ fontSize: '10px', padding: '0 7px' }}
                  >
                    狭
                  </button>
                  <button
                    className={`explorer-layout-btn ${listDensity === 'standard' ? 'active' : ''}`}
                    onClick={() => handleSetListDensity('standard')}
                    title="標準 (14px)"
                    style={{ fontSize: '10px', padding: '0 7px' }}
                  >
                    標準
                  </button>
                  <button
                    className={`explorer-layout-btn ${listDensity === 'spacious' ? 'active' : ''}`}
                    onClick={() => handleSetListDensity('spacious')}
                    title="広 (22px)"
                    style={{ fontSize: '10px', padding: '0 7px' }}
                  >
                    広
                  </button>
                </div>
              )}

              {/* カード型 / リスト型 切り替えピル (一番端っこに固定配置) */}
              <div className="explorer-layout-group">
                <button 
                  className={`explorer-layout-btn ${layoutMode === 'card' ? 'active' : ''}`}
                  onClick={() => handleSetLayoutMode('card')}
                  title={lang === 'en' ? 'Card / Grid view' : 'カード型グリッド表示'}
                >
                  <span>⊞</span> {lang === 'en' ? 'Card' : 'カード'}
                </button>
                <button 
                  className={`explorer-layout-btn ${layoutMode === 'list' ? 'active' : ''}`}
                  onClick={() => handleSetLayoutMode('list')}
                  title={lang === 'en' ? 'List / Slim view' : 'リスト型表示'}
                >
                  <span>☰</span> {lang === 'en' ? 'List' : 'リスト'}
                </button>
              </div>
            </div>
          </div>

          {filesInCurrentFolder.length === 0 ? (
            <div className="explorer-empty-box">
              {loading || isResuming ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px 0' }}>
                  <span className="dice-spinner-mini" style={{ fontSize: '24px' }}>🎲</span>
                  <span style={{ fontSize: '13px', opacity: 0.85 }}>
                    {lang === 'en' ? 'Loading folder logs...' : 'フォルダーを読み込み中です...'}
                  </span>
                </div>
              ) : (
                <p>{lang === 'en' ? 'No files in this directory' : 'このフォルダーにはファイルがありません'}</p>
              )}
            </div>
          ) : layoutMode === 'card' ? (
            <div className="explorer-files-grid">
              {filesInCurrentFolder.map(f => {
                const mark = fileMarks[f.filename];
                const digest = getDigestSnippet(f.content);
                const charCount = f.content ? f.content.length : 0;
                const fileKey = (f.category || '') + '::' + f.filename;
                const isSelected = selectedFiles.has(fileKey);

                return (
                  <div 
                    key={f.filename}
                    className={`article-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (isSelecting) {
                        toggleFileSelection(f);
                      } else {
                        selectFile(f);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { 
                      if (e.key === 'Enter') {
                        if (isSelecting) toggleFileSelection(f);
                        else selectFile(f);
                      }
                    }}
                  >
                    {/* カードヘッダー: チェックボックス & ファイル名 & 日付 & マーク */}
                    <div className="article-card-header">
                      {isSelecting && (
                        <div 
                          className={`article-card-checkbox ${isSelected ? 'checked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFileSelection(f);
                          }}
                          role="checkbox"
                          aria-checked={isSelected}
                          title={isSelected ? (lang === 'en' ? 'Deselect' : '選択解除') : (lang === 'en' ? 'Select' : '選択')}
                        >
                          {isSelected && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="article-check-svg">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      )}
                      <div className="article-card-filename" title={f.filename}>
                        {f.filename}
                      </div>
                      <div className="article-card-tags">
                        {mark && <span className="article-mark-badge">{mark}</span>}
                        {f.date && (
                          <span className="article-date-badge">
                            {f.date}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* カードタイトル */}
                    <div className="article-card-title">
                      {f.title || f.filename}
                    </div>

                    {/* ダイジェスト本文（先頭2〜3行プレビュー） */}
                    <div className="article-card-digest">
                      {digest || (lang === 'en' ? '(Empty file)' : '（本文なし）')}
                    </div>

                    {/* カードフッター */}
                    <div className="article-card-footer">
                      <span className="article-char-count">
                        {charCount.toLocaleString()} {lang === 'en' ? 'chars' : '文字'}
                      </span>
                      <span className="article-open-label">
                        {lang === 'en' ? 'Open ➔' : '開く ➔'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 横長リスト型（イメージビュアーのようなスリム＆高一覧性ビュー） */
            <div className={`explorer-files-list density-${listDensity}`}>
              {filesInCurrentFolder.map(f => {
                const mark = fileMarks[f.filename];
                const digest = getDigestSnippet(f.content, 90);
                const charCount = f.content ? f.content.length : 0;
                const fileKey = (f.category || '') + '::' + f.filename;
                const isSelected = selectedFiles.has(fileKey);

                return (
                  <div 
                    key={f.filename}
                    className={`article-list-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (isSelecting) {
                        toggleFileSelection(f);
                      } else {
                        selectFile(f);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { 
                      if (e.key === 'Enter') {
                        if (isSelecting) toggleFileSelection(f);
                        else selectFile(f);
                      }
                    }}
                  >
                    <div className="article-list-left">
                      {isSelecting && (
                        <div 
                          className={`article-list-checkbox ${isSelected ? 'checked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFileSelection(f);
                          }}
                          role="checkbox"
                          aria-checked={isSelected}
                          title={isSelected ? (lang === 'en' ? 'Deselect' : '選択解除') : (lang === 'en' ? 'Select' : '選択')}
                        >
                          {isSelected && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="article-check-svg">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      )}
                      <div className="article-list-icon-box">
                        <span className="article-list-doc-icon">📄</span>
                      </div>
                      <div className="article-list-content">
                        <div className="article-list-title-line">
                          {mark && <span className="article-mark-badge" style={{ marginRight: '6px' }}>{mark}</span>}
                          <span className="article-list-title" title={f.title || f.filename}>
                            {f.title || f.filename}
                          </span>
                        </div>
                        <div className="article-list-sub-line">
                          <span className="article-list-filename" title={f.filename}>
                            {f.filename}
                          </span>
                          {digest && (
                            <>
                              <span className="article-list-dot">•</span>
                              <span className="article-list-snippet">
                                {digest}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="article-list-right">
                      {f.date && (
                        <span className="article-list-date" title="日付">
                          {f.date}
                        </span>
                      )}
                      <span className="article-list-chars" title="文字数">
                        {charCount.toLocaleString()} {lang === 'en' ? 'chars' : '文字'}
                      </span>
                      <span className="article-list-open-arrow">➔</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 新規フォルダー作成モーダル（作成場所を選択可能） */}
      {isNewFolderModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setIsNewFolderModalOpen(false)}
        >
          <div 
            style={{
              background: 'var(--card-bg, #ffffff)',
              color: 'var(--main-text, #1e293b)',
              border: '1.5px solid var(--card-border, rgba(120, 120, 120, 0.4))',
              borderRadius: '0px',
              width: '90%',
              maxWidth: '440px',
              padding: '20px 24px',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.5)',
              boxSizing: 'border-box',
            }}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === 'Escape') setIsNewFolderModalOpen(false);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--card-border, rgba(120, 120, 120, 0.2))', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700 }}>
                <span>📁＋</span>
                <span>{lang === 'en' ? 'Create New Folder' : '新規フォルダー作成'}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsNewFolderModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: 'var(--main-text, inherit)',
                  opacity: 0.6,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFolderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '6px', opacity: 0.85, textTransform: 'uppercase' }}>
                  {lang === 'en' ? 'Destination Folder (Location):' : '作成先の場所（親フォルダー）:'}
                </label>
                <select
                  value={targetParentPath}
                  onChange={e => setTargetParentPath(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12px',
                    borderRadius: '0px',
                    border: '1px solid var(--card-border, rgba(120, 120, 120, 0.35))',
                    background: 'var(--card-bg, #ffffff)',
                    color: 'var(--main-text, #1e293b)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">🏠 {lang === 'en' ? 'Root Folder (Top level)' : 'ルートフォルダー (最上位)'} ({allFiles.length} {lang === 'en' ? 'files' : '件'})</option>
                  {allCategories.map(cat => {
                    const count = categoryFileCounts.get(cat.name) ?? 0;
                    return (
                      <option key={cat.name} value={cat.name}>
                        📁 {cat.name} ({count} {lang === 'en' ? 'files' : '件'})
                      </option>
                    );
                  })}
                </select>
                <div style={{ fontSize: '10.5px', opacity: 0.65, marginTop: '4px' }}>
                  {lang === 'en' 
                    ? `Will be created inside: ${targetParentPath ? `[${targetParentPath}]` : 'Root'}`
                    : `作成場所: ${targetParentPath ? `「${targetParentPath}」の中` : '最上位（ルート）'}`}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, opacity: 0.85, textTransform: 'uppercase' }}>
                    {lang === 'en' ? 'New Folder Name:' : '新しいフォルダー名:'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (newFolderName.startsWith('00_')) {
                        setNewFolderName(newFolderName.slice(3));
                      } else {
                        setNewFolderName('00_' + newFolderName);
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono, monospace)',
                      borderRadius: '0px',
                      border: newFolderName.startsWith('00_') ? '1px solid #3b82f6' : '1px solid var(--card-border, #CBD5E1)',
                      background: newFolderName.startsWith('00_') ? '#3b82f6' : 'var(--btn-bg, #F1F5F9)',
                      color: newFolderName.startsWith('00_') ? '#ffffff' : 'var(--main-text, #0F172A)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title={newFolderName.startsWith('00_') ? '先頭の「00_」を取り除く' : '先頭に「00_」をワンクリックで付与'}
                  >
                    {newFolderName.startsWith('00_') ? '✓ 先頭に 00_ 付き (解除)' : '＋「00_」を付ける'}
                  </button>
                </div>
                <input
                  type="text"
                  autoFocus
                  placeholder={lang === 'en' ? 'Enter folder name...' : '例: 進行用_2026, 会議録 など'}
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    borderRadius: '0px',
                    border: '1px solid var(--card-border, rgba(120, 120, 120, 0.35))',
                    background: 'var(--card-bg, #ffffff)',
                    color: 'var(--main-text, #1e293b)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '0px',
                    border: '1px solid var(--card-border, rgba(120, 120, 120, 0.3))',
                    background: 'transparent',
                    color: 'var(--main-text, inherit)',
                    cursor: 'pointer',
                  }}
                >
                  {lang === 'en' ? 'Cancel' : 'キャンセル'}
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  style={{
                    padding: '6px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '0px',
                    border: '1px solid var(--sb-accent, #3b82f6)',
                    background: 'var(--sb-accent, #3b82f6)',
                    color: '#ffffff',
                    cursor: newFolderName.trim() ? 'pointer' : 'not-allowed',
                    opacity: newFolderName.trim() ? 1 : 0.5,
                  }}
                >
                  📁 {lang === 'en' ? 'Create Folder' : '作成する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 06. フォルダー名編集モーダル */}
      {isRenameFolderModalOpen && folderRenameTarget && (
        <div 
          className="explorer-modal-overlay"
          onClick={() => setIsRenameFolderModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(2px)'
          }}
        >
          <div 
            className="explorer-modal-card"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'var(--card-bg, #ffffff)',
              border: '1.5px solid var(--card-border, rgba(120, 120, 120, 0.4))',
              borderRadius: '0px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              color: 'var(--main-text, #1e293b)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
                <span style={{ color: 'var(--sb-accent, #8FAFCF)' }}>✏️</span>
                <span>{lang === 'en' ? 'Rename Folder' : 'フォルダー名の変更'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsRenameFolderModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  opacity: 0.6,
                  fontSize: '16px',
                  padding: '4px 8px',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRenameFolderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '6px', opacity: 0.85, textTransform: 'uppercase' }}>
                  {lang === 'en' ? 'Target Folder:' : '変更対象のフォルダー:'}
                </label>
                <div style={{
                  padding: '8px 10px',
                  fontSize: '12px',
                  background: 'var(--card-bg, rgba(255, 255, 255, 0.05))',
                  border: '1px solid var(--card-border, rgba(120, 120, 120, 0.25))',
                  opacity: 0.85,
                  wordBreak: 'break-all'
                }}>
                  📁 {folderRenameTarget.name}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, opacity: 0.85, textTransform: 'uppercase' }}>
                    {lang === 'en' ? 'New Folder Name:' : '新しいフォルダー名:'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (folderRenameInputVal.startsWith('00_')) {
                        setFolderRenameInputVal(folderRenameInputVal.slice(3));
                      } else {
                        setFolderRenameInputVal('00_' + folderRenameInputVal);
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono, monospace)',
                      borderRadius: '0px',
                      border: folderRenameInputVal.startsWith('00_') ? '1px solid #3b82f6' : '1px solid var(--card-border, #CBD5E1)',
                      background: folderRenameInputVal.startsWith('00_') ? '#3b82f6' : 'var(--btn-bg, #F1F5F9)',
                      color: folderRenameInputVal.startsWith('00_') ? '#ffffff' : 'var(--main-text, #0F172A)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title={folderRenameInputVal.startsWith('00_') ? '先頭の「00_」を取り除く' : '先頭に「00_」をワンクリックで付与'}
                  >
                    {folderRenameInputVal.startsWith('00_') ? '✓ 先頭に 00_ 付き (解除)' : '＋「00_」を付ける'}
                  </button>
                </div>
                <input
                  type="text"
                  autoFocus
                  placeholder={lang === 'en' ? 'Enter new folder name...' : '新しいフォルダー名を入力...'}
                  value={folderRenameInputVal}
                  onChange={e => setFolderRenameInputVal(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    borderRadius: '0px',
                    border: '1px solid var(--card-border, rgba(120, 120, 120, 0.35))',
                    background: 'var(--card-bg, #ffffff)',
                    color: 'var(--main-text, #1e293b)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsRenameFolderModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '0px',
                    border: '1px solid var(--card-border, rgba(120, 120, 120, 0.3))',
                    background: 'transparent',
                    color: 'var(--main-text, inherit)',
                    cursor: 'pointer',
                  }}
                >
                  {lang === 'en' ? 'Cancel' : 'キャンセル'}
                </button>
                <button
                  type="submit"
                  disabled={!folderRenameInputVal.trim() || folderRenameInputVal.trim() === folderRenameTarget.shortName}
                  style={{
                    padding: '6px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '0px',
                    border: '1px solid var(--sb-accent, #3b82f6)',
                    background: 'var(--sb-accent, #3b82f6)',
                    color: '#ffffff',
                    cursor: (!folderRenameInputVal.trim() || folderRenameInputVal.trim() === folderRenameTarget.shortName) ? 'not-allowed' : 'pointer',
                    opacity: (!folderRenameInputVal.trim() || folderRenameInputVal.trim() === folderRenameTarget.shortName) ? 0.5 : 1,
                  }}
                >
                  ✏️ {lang === 'en' ? 'Save Changes' : '変更する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 07. フォルダーカバー画像・カスタム設定モーダル */}
      {coverModalTarget && (
        <div 
          className="folder-rename-modal-backdrop"
          onClick={() => setCoverModalTarget(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div 
            className="folder-rename-modal-card"
            onClick={e => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '440px',
              background: 'var(--card-bg, #ffffff)',
              border: '1.5px solid var(--sb-accent, #3b82f6)',
              borderRadius: '0px',
              padding: '20px 22px',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border, rgba(120,120,120,0.2))', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 800, color: 'var(--main-text, inherit)' }}>
                <span>🖼️</span>
                <span>{lang === 'en' ? 'Folder Cover Settings' : 'フォルダーカバー設定'}</span>
              </div>
              <button
                type="button"
                onClick={() => setCoverModalTarget(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '15px', color: 'var(--main-text, inherit)', cursor: 'pointer', opacity: 0.7 }}
              >
                ✕
              </button>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--main-text, inherit)', marginBottom: '4px' }}>
                {lang === 'en' ? 'Target Folder:' : '対象フォルダー:'}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--sb-accent, #3b82f6)' }}>
                📁 {coverModalTarget.name}
              </div>
            </div>

            {/* 現在のプレビュー */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.7, marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{lang === 'en' ? 'Cover Preview:' : '現在のカバー表示:'}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = shuffleFolderCover(coverModalTarget.path, coverModalTarget.name, visualSettings);
                    setVisualSettings(next);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'transparent',
                    border: '1px solid var(--card-border, rgba(120,120,120,0.3))',
                    color: 'var(--main-text, inherit)',
                    cursor: 'pointer'
                  }}
                  title={lang === 'en' ? 'Next cover in rotation (includes custom image)' : '別の候補に順送り（独自画像も候補に含まれます）'}
                >
                  <ShuffleIcon size={11} />
                  <span>{lang === 'en' ? 'Next in Rotation' : '候補を順送り'}</span>
                </button>
              </div>
              {(() => {
                const modalCoverData = getFolderCoverData(coverModalTarget.name, coverModalTarget.path, visualSettings);
                const hasStaged = !!coverInputUrl.trim();
                const currentBg = hasStaged ? coverInputUrl.trim() : modalCoverData.backgroundUrl;
                const fallbackBg = modalCoverData.fallbackSvgDataUri;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div 
                      style={{
                        width: '100%',
                        height: '84px',
                        borderRadius: '0px',
                        border: '1px solid var(--card-border, rgba(120, 120, 120, 0.3))',
                        backgroundColor: modalCoverData.gradient ? modalCoverData.gradient[0] : '#0f172a',
                        backgroundImage: currentBg !== fallbackBg ? `url("${currentBg}"), url("${fallbackBg}")` : `url("${currentBg}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: modalCoverData.backgroundPosition || 'center center',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        boxSizing: 'border-box',
                        filter: `brightness(${visualSettings.brightness ?? 1.05})`,
                        transition: 'background-position 0.2s ease'
                      }}
                    >
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.2) 100%)' }} />
                      <span style={{ position: 'relative', zIndex: 2, fontSize: '10px', fontWeight: 800, padding: '2px 8px', background: 'rgba(0,0,0,0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.5)', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                        {hasStaged ? '✨ 独自画像 (適用中)' : `${modalCoverData.badge} (${modalCoverData.currentIndex}/${modalCoverData.totalCandidates})`}
                      </span>
                      <span style={{ position: 'relative', zIndex: 2, fontSize: '10px', fontWeight: 700, padding: '2px 6px', background: 'rgba(0,0,0,0.7)', color: '#93c5fd', border: '1px solid rgba(147,197,253,0.4)' }}>
                        位置: {modalCoverData.position === 'top' ? '⬆ 上' : modalCoverData.position === 'bottom' ? '⬇ 下' : '⏺ 中央'}
                      </span>
                    </div>

                    {/* 画像の表示位置（上 / 中央 / 下 ＆ スライダー微調整） */}
                    <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.03))', border: '1px solid var(--card-border, rgba(120,120,120,0.25))', padding: '10px 12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.9, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>🖼️ {lang === 'en' ? 'Image Vertical Position (Crop Alignment):' : '画像の位置・微調整（トリミング位置）:'}</span>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sb-accent, #3b82f6)', background: 'rgba(59,130,246,0.1)', padding: '1px 6px', border: '1px solid rgba(59,130,246,0.3)' }}>
                          {modalCoverData.positionPercent}% {modalCoverData.positionPercent === 0 ? '(上端)' : modalCoverData.positionPercent === 50 ? '(中央)' : modalCoverData.positionPercent === 100 ? '(下端)' : ''}
                        </span>
                      </div>

                      {/* クイックプリセットボタン */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                        {[
                          { val: 0, label: lang === 'en' ? '⬆ Top (0%)' : '⬆ 上部 (0%)', desc: '上側を重視' },
                          { val: 50, label: lang === 'en' ? '⏺ Center (50%)' : '⏺ 中央 (50%)', desc: '真ん中' },
                          { val: 100, label: lang === 'en' ? '⬇ Bottom (100%)' : '⬇ 下部 (100%)', desc: '下側を重視' },
                        ].map(posOpt => {
                          const isSelected = modalCoverData.positionPercent === posOpt.val;
                          return (
                            <button
                              key={posOpt.val}
                              type="button"
                              onClick={() => {
                                const next = setFolderCoverPosition(coverModalTarget.path, coverModalTarget.name, posOpt.val, visualSettings);
                                setVisualSettings(next);
                              }}
                              title={posOpt.desc}
                              style={{
                                padding: '5px 6px',
                                fontSize: '11px',
                                fontWeight: isSelected ? 800 : 600,
                                border: isSelected ? '1.5px solid var(--sb-accent, #3b82f6)' : '1px solid var(--card-border, rgba(120, 120, 120, 0.3))',
                                background: isSelected ? 'var(--sb-accent, #3b82f6)' : 'transparent',
                                color: isSelected ? '#ffffff' : 'var(--main-text, inherit)',
                                cursor: 'pointer',
                                borderRadius: '0px',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              {posOpt.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* スライダーと ±5% 微調整ボタン */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const newPercent = Math.max(0, modalCoverData.positionPercent - 5);
                            const next = setFolderCoverPosition(coverModalTarget.path, coverModalTarget.name, newPercent, visualSettings);
                            setVisualSettings(next);
                          }}
                          style={{
                            padding: '3px 7px',
                            fontSize: '11px',
                            fontWeight: 700,
                            border: '1px solid var(--card-border, rgba(120,120,120,0.3))',
                            background: 'transparent',
                            color: 'var(--main-text, inherit)',
                            cursor: 'pointer',
                            borderRadius: '0px'
                          }}
                          title="上へ5%移動"
                        >
                          ▲ -5%
                        </button>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={modalCoverData.positionPercent}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            const next = setFolderCoverPosition(coverModalTarget.path, coverModalTarget.name, val, visualSettings);
                            setVisualSettings(next);
                          }}
                          style={{
                            flex: 1,
                            accentColor: 'var(--sb-accent, #3b82f6)',
                            cursor: 'pointer'
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const newPercent = Math.min(100, modalCoverData.positionPercent + 5);
                            const next = setFolderCoverPosition(coverModalTarget.path, coverModalTarget.name, newPercent, visualSettings);
                            setVisualSettings(next);
                          }}
                          style={{
                            padding: '3px 7px',
                            fontSize: '11px',
                            fontWeight: 700,
                            border: '1px solid var(--card-border, rgba(120,120,120,0.3))',
                            background: 'transparent',
                            color: 'var(--main-text, inherit)',
                            cursor: 'pointer',
                            borderRadius: '0px'
                          }}
                          title="下へ5%移動"
                        >
                          ▼ +5%
                        </button>
                      </div>
                      <div style={{ fontSize: '10px', opacity: 0.65, marginTop: '5px', textAlign: 'center' }}>
                        {lang === 'en' ? 'Drag slider to adjust crop focus for vertical/panoramic images' : '💡 縦長の画像でも、スライダーを動かして好きな位置にぴったり合わせられます'}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 01. フォルダー・ローカル画像ファイルから選択 */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.85, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <UploadIcon size={13} />
                <span>{lang === 'en' ? 'Select Image from Folder / PC:' : '自分の画像フォルダー・PCから選ぶ:'}</span>
              </div>
              <label 
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingModalFile(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingModalFile(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingModalFile(false);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingModalFile(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    try {
                      const dataUri = await readFileAsDataUrl(file);
                      setCoverInputUrl(dataUri);
                      const nextCovers = { ...(visualSettings.customCovers || {}) };
                      nextCovers[coverModalTarget.path] = dataUri;
                      nextCovers[coverModalTarget.name] = dataUri;
                      const nextVariations = { ...(visualSettings.variations || {}) };
                      nextVariations[coverModalTarget.path] = 0;
                      nextVariations[coverModalTarget.name] = 0;
                      const nextSettings = { ...visualSettings, customCovers: nextCovers, variations: nextVariations };
                      setVisualSettings(nextSettings);
                      saveFolderVisualSettings(nextSettings);
                    } catch (err) {
                      console.error('File drop failed:', err);
                    }
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '16px 10px',
                  border: isDraggingModalFile ? '2px dashed #2563eb' : '1.5px dashed var(--sb-accent, #3b82f6)',
                  background: isDraggingModalFile ? 'rgba(37, 99, 235, 0.15)' : 'rgba(59, 130, 246, 0.05)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                  transform: isDraggingModalFile ? 'scale(1.02)' : 'none'
                }}
              >
                <UploadIcon size={24} style={{ color: isDraggingModalFile ? '#2563eb' : 'var(--sb-accent, #3b82f6)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--main-text, inherit)' }}>
                  {isDraggingModalFile 
                    ? (lang === 'en' ? 'Drop image here now!' : 'ここに画像をドロップ！') 
                    : (lang === 'en' ? 'Click or drop your image here (JPEG / PNG / WEBP)' : 'クリックして画像ファイルを選択（またはドラッグ＆ドロップ）')}
                </span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>
                  JPG, PNG, WEBP, GIF, SVG に対応（ドロップで即座に保存・反映）
                </span>
                <input
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.svg"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const dataUri = await readFileAsDataUrl(file);
                        setCoverInputUrl(dataUri);
                        const nextCovers = { ...(visualSettings.customCovers || {}) };
                        nextCovers[coverModalTarget.path] = dataUri;
                        nextCovers[coverModalTarget.name] = dataUri;
                        const nextVariations = { ...(visualSettings.variations || {}) };
                        nextVariations[coverModalTarget.path] = 0;
                        nextVariations[coverModalTarget.name] = 0;
                        const nextSettings = { ...visualSettings, customCovers: nextCovers, variations: nextVariations };
                        setVisualSettings(nextSettings);
                        saveFolderVisualSettings(nextSettings);
                      } catch (err) {
                        console.error('File reading failed:', err);
                      }
                    }
                  }}
                />
              </label>
            </div>

            {/* 02. カスタム画像URL入力（任意） */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.8, marginBottom: '4px' }}>
                {lang === 'en' ? 'Or paste Image URL (optional):' : 'または画像URLを直接指定（任意）:'}
              </div>
              <input
                type="text"
                placeholder={lang === 'en' ? 'https://...' : 'https://...'}
                value={coverInputUrl.startsWith('data:') ? '(ローカル画像ファイル選択中)' : coverInputUrl}
                onChange={e => setCoverInputUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  fontSize: '12px',
                  borderRadius: '0px',
                  border: '1px solid var(--card-border, rgba(120, 120, 120, 0.35))',
                  background: 'var(--card-bg, #ffffff)',
                  color: 'var(--main-text, #1e293b)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* ボタンアクション群 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', gap: '8px' }}>
              {(() => {
                const hasCustomCover = !!(visualSettings.customCovers?.[coverModalTarget.path] || visualSettings.customCovers?.[coverModalTarget.name] || coverInputUrl.trim());
                return (
                  <button
                    type="button"
                    disabled={!hasCustomCover}
                    onClick={() => {
                      const nextCovers = { ...(visualSettings.customCovers || {}) };
                      delete nextCovers[coverModalTarget.path];
                      delete nextCovers[coverModalTarget.name];
                      const nextVariations = { ...(visualSettings.variations || {}) };
                      nextVariations[coverModalTarget.path] = 0;
                      nextVariations[coverModalTarget.name] = 0;
                      const nextSettings = { ...visualSettings, customCovers: nextCovers, variations: nextVariations };
                      setVisualSettings(nextSettings);
                      saveFolderVisualSettings(nextSettings);
                      setCoverInputUrl('');
                      // モーダルは閉じずに、解除されて自動テーマに戻った状態をプレビューで確認可能にします
                    }}
                    style={{
                      padding: '6px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '0px',
                      border: '1px solid var(--card-border, rgba(120, 120, 120, 0.3))',
                      background: hasCustomCover ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                      color: hasCustomCover ? 'var(--sb-danger, #ef4444)' : 'var(--main-text, inherit)',
                      cursor: hasCustomCover ? 'pointer' : 'default',
                      opacity: hasCustomCover ? 1 : 0.4
                    }}
                    title={hasCustomCover ? '独自画像を解除して自動テーマ（イラスト/写真）に戻します' : '独自画像は設定されていません'}
                  >
                    🔄 {lang === 'en' ? 'Reset to Auto Theme' : '独自画像を解除（自動テーマに戻す）'}
                  </button>
                );
              })()}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCoverModalTarget(null)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '0px',
                    border: '1px solid var(--card-border, rgba(120, 120, 120, 0.3))',
                    background: 'transparent',
                    color: 'var(--main-text, inherit)',
                    cursor: 'pointer',
                  }}
                >
                  {lang === 'en' ? 'Close' : '閉じる'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = coverInputUrl.trim();
                    const nextCovers = { ...(visualSettings.customCovers || {}) };
                    const nextVariations = { ...(visualSettings.variations || {}) };
                    if (trimmed && !trimmed.includes('(ローカル画像ファイル選択中)')) {
                      nextCovers[coverModalTarget.path] = trimmed;
                      nextCovers[coverModalTarget.name] = trimmed;
                      nextVariations[coverModalTarget.path] = 0;
                      nextVariations[coverModalTarget.name] = 0;
                    } else if (!trimmed && !visualSettings.customCovers?.[coverModalTarget.path]) {
                      delete nextCovers[coverModalTarget.path];
                      delete nextCovers[coverModalTarget.name];
                    }
                    const nextSettings = { ...visualSettings, customCovers: nextCovers, variations: nextVariations };
                    setVisualSettings(nextSettings);
                    saveFolderVisualSettings(nextSettings);
                    setCoverModalTarget(null);
                  }}
                  style={{
                    padding: '6px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '0px',
                    border: '1px solid var(--sb-accent, #3b82f6)',
                    background: 'var(--sb-accent, #3b82f6)',
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  ✓ {lang === 'en' ? 'Done' : '完了'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
