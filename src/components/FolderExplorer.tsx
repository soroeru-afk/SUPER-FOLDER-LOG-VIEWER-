import React, { useMemo, useState } from 'react';
import { useAppContext } from '../AppContext';
import { FileObj } from '../types';
import { FolderIcon } from './Icons';

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
    t,
    lang,
    createNewFile,
    physicalFolders,
    currentFileObj,
    loading,
    isResuming
  } = useAppContext();

  const [filterText, setFilterText] = useState('');
  const [layoutMode, setLayoutMode] = useState<'card' | 'list'>(() => {
    return (localStorage.getItem('sf_explorer_layout') as 'card' | 'list') || 'card';
  });

  const handleSetLayoutMode = (mode: 'card' | 'list') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('sf_explorer_layout', mode);
    } catch {
      // ignore
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
            {currentFolderHandle && (
              <button 
                className="explorer-btn primary" 
                onClick={() => createNewFile(currentFolderHandle)}
                title={t.main.newFilePrompt}
              >
                ＋ {t.main.newFile || '新規ファイル'}
              </button>
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

            {/* 表示形式（カード / リスト）切り替え */}
            <div className="explorer-layout-group" role="group" aria-label="Layout view">
              <button 
                className={`explorer-layout-btn ${layoutMode === 'card' ? 'active' : ''}`}
                onClick={() => handleSetLayoutMode('card')}
                title={lang === 'en' ? 'Card Grid View (4 columns)' : 'カード型表示（グリッド）'}
              >
                <span style={{ fontSize: '12px' }}>⊞</span> {lang === 'en' ? 'CARD' : 'カード'}
              </button>
              <button 
                className={`explorer-layout-btn ${layoutMode === 'list' ? 'active' : ''}`}
                onClick={() => handleSetLayoutMode('list')}
                title={lang === 'en' ? 'Horizontal List View' : 'リスト型表示（横長1行）'}
              >
                <span style={{ fontSize: '12px' }}>☰</span> {lang === 'en' ? 'LIST' : 'リスト'}
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
        <section className="explorer-section">
          <div className="explorer-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="section-icon">📄</span>
              <span>LOGS / ARTICLES ({filesInCurrentFolder.length})</span>
            </div>
            <div className="explorer-view-pill">
              <span className="explorer-view-indicator">
                {layoutMode === 'card' ? (lang === 'en' ? '⊞ Grid Mode' : '⊞ カード型') : (lang === 'en' ? '☰ List Mode' : '☰ リスト型')}
              </span>
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

                return (
                  <div 
                    key={f.filename}
                    className="article-card"
                    onClick={() => selectFile(f)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') selectFile(f); }}
                  >
                    {/* カードヘッダー: ファイル名 & 日付 & マーク */}
                    <div className="article-card-header">
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
            <div className="explorer-files-list">
              {filesInCurrentFolder.map(f => {
                const mark = fileMarks[f.filename];
                const digest = getDigestSnippet(f.content, 90);
                const charCount = f.content ? f.content.length : 0;

                return (
                  <div 
                    key={f.filename}
                    className="article-list-row"
                    onClick={() => selectFile(f)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') selectFile(f); }}
                  >
                    <div className="article-list-left">
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
    </div>
  );
};
