import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { FileObj } from '../types';
import { FolderIcon, MoveIcon, DeleteIcon } from './Icons';

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
    openMovePanel
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
    if (targetParentPath && physicalFolders.has(targetParentPath)) {
      targetHandle = physicalFolders.get(targetParentPath);
    }
    
    const success = await createNewFolder(targetHandle, targetParentPath, trimmed);
    if (success) {
      setIsNewFolderModalOpen(false);
      setNewFolderName('');
    }
  };

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
              title="ルートディレクトリ"
            >
              📁 [ ALL DATA ]
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
                  📥 {lang === 'en' ? 'Add Text File' : 'テキストファイル追加'}
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
              {subCategories.map(cat => (
                <div 
                  key={cat.name}
                  className="folder-card"
                  onClick={() => openExplorer(cat.name)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') openExplorer(cat.name); }}
                >
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
                    <span className="folder-card-open-arrow">
                      {lang === 'en' ? 'Open ➔' : '開く ➔'}
                    </span>
                  </div>
                </div>
              ))}
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
                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{isExplorerSelectMode ? '✓' : '☑'}</span>
                  <span>{isExplorerSelectMode ? (lang === 'en' ? 'Done' : '完了') : (lang === 'en' ? 'Select' : '選択')}</span>
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
                  <option value="">🏠 {lang === 'en' ? 'Root Folder (Top level)' : 'ルートフォルダー (最上位)'}</option>
                  {allCategories.map(cat => (
                    <option key={cat.name} value={cat.name}>
                      📁 {cat.name} ({cat.totalCount} {lang === 'en' ? 'files' : '件'})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '10.5px', opacity: 0.65, marginTop: '4px' }}>
                  {lang === 'en' 
                    ? `Will be created inside: ${targetParentPath ? `[${targetParentPath}]` : 'Root'}`
                    : `作成場所: ${targetParentPath ? `「${targetParentPath}」の中` : '最上位（ルート）'}`}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '6px', opacity: 0.85, textTransform: 'uppercase' }}>
                  {lang === 'en' ? 'New Folder Name:' : '新しいフォルダー名:'}
                </label>
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
    </div>
  );
};
