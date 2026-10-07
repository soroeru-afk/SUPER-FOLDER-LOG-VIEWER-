import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { SearchIcon, FolderIcon, FoldersStackIcon, RefreshIcon, HighlightIcon, SettingsIcon, ExternalLinkIcon, SolidSeriesIcon, SideChangeIcon, ImageIcon } from './Icons';
import { FileObj } from '../types';
import { highlightText, escHtml, isImageFilename } from '../utils';
import { ImageThumbnail } from './ImageThumbnail';

export const Sidebar = () => {
  const {
    dirHandle, allFiles, allCategories, physicalFolders, searchQueries,
    setSearchQuery, clearSearch, removeSearchQuery, openFolder, reopenFolder, refreshFolder,
    loading, refreshing, isSelectMode, toggleSelectMode, isHighlightOff, toggleHighlight,
    expandAllGroups, collapseAllGroups, toggleSettings, settingsOpen,
    selectedFiles, currentFileObj, selectFile, toggleFileSelection, selectFileRange,
    categoryOpenState, setCategoryOpen,
    movePanelState, closeMovePanels, openMovePanel, bulkDeleteFiles, execBulkMove,
    fileShortcuts,
    createNewFolder, createNewFile, openNewFileDialog, openNewFolderDialog,
    lang, setLang, t,
    sortMode, sortDirection, setSortMode, setSortDirection,
    customFolderOrders,
    fileMarks, setBulkFileMarks, isResuming, pendingResumeHandle, resumeSavedFolder,
    openExplorer, explorerCategory, viewMode, setViewMode,
    canGoBack, canGoForward, goBack, goForward,
    sidebarPosition, toggleSidebarPosition,
    isBackgroundLoading, backgroundProgress,
    showThumbnails, showImageFiles, toggleShowImageFiles
  } = useAppContext();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [bulkMarkOpen, setBulkMarkOpen] = useState(false);
  const bulkMarkRef = useRef<HTMLDivElement>(null);

  const visibleSidebarFiles = React.useMemo(() => {
    let list = allFiles;
    if (!showImageFiles) {
      list = list.filter(f => !isImageFilename(f.filename));
    }
    if (searchQueries.length === 0) return list;
    return list.filter(f => {
      const q = searchQueries;
      const fn = f.filename.toLowerCase();
      const tit = f.title ? f.title.toLowerCase() : '';
      const ct = f.content ? f.content.toLowerCase() : '';
      return q.every(query => {
        const lq = query.toLowerCase();
        return fn.includes(lq) || tit.includes(lq) || ct.includes(lq);
      });
    });
  }, [allFiles, searchQueries, showImageFiles]);

  const isAnyGroupOpen = () => {
    const keys = Object.keys(categoryOpenState);
    if (keys.length > 0) {
      return keys.some(k => categoryOpenState[k] === true);
    }
    return (allCategories.length > 0 || allFiles.length > 0);
  };

  const handleToggleAllGroups = () => {
    if (isAnyGroupOpen()) {
      collapseAllGroups();
    } else {
      expandAllGroups();
    }
  };

  const renderMarkBadge = (mark: string) => {
    if (!mark) return null;
    let markClass = 'file-mark-badge';
    let markStyle: React.CSSProperties = {};
    if (mark === '★') {
      markClass += ' mark-star';
      markStyle = { color: '#F59E0B' };
    } else if (mark === '✓') {
      markClass += ' mark-check';
      markStyle = { color: '#10B981', fontWeight: 900 };
    }
    return (
      <span className={markClass} style={markStyle} title={`マーク: ${mark}`}>
        {mark}
      </span>
    );
  };

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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect='move'; };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!window.__draggedFiles) return;
    execBulkMove(window.__draggedFiles, null, null);
  };

  const renderBreadcrumbs = () => {
    if (searchQueries.length === 0) return null;
    let currentQueryStr = '';
    return (
      <div className="search-breadcrumbs">
        <div className="breadcrumb-item" style={{cursor:'default',opacity:0.6}}>📁 {t.sidebar.allFiles}</div>
        {searchQueries.map((q, i) => {
          currentQueryStr += (currentQueryStr ? ' ' : '') + q;
          return (
            <React.Fragment key={i}>
              <div className="breadcrumb-separator">{'>'}</div>
              <div className="breadcrumb-item">
                🏷️ {q} 
                <span className="breadcrumb-remove" title="このキーワードを削除" onClick={(e) => {
                  e.stopPropagation();
                  removeSearchQuery(q);
                  if (searchInputRef.current) searchInputRef.current.value = searchQueries.filter(sq => sq !== q).join(' ');
                }}>×</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderFileBtn = (f: FileObj) => {
    const isSelected = selectedFiles.has((f.category||'')+'::'+f.filename);
    const isActive = currentFileObj && currentFileObj.filename === f.filename && currentFileObj.category === f.category;
    
    const isImg = isImageFilename(f.filename);
    let titleHtml = escHtml(f.title);
    let previewHtml = '';

    if (searchQueries.length > 0) {
      titleHtml = highlightText(f.title, searchQueries);
      const q0 = searchQueries[0];
      const idx = f.content.toLowerCase().indexOf(q0);
      if (idx !== -1) {
        const start = Math.max(0, idx - 20); const end = Math.min(f.content.length, idx + q0.length + 60);
        let snippet = f.content.substring(start, end).replace(/\n/g, ' ');
        if(start > 0) snippet = '...' + snippet; if(end < f.content.length) snippet += '...';
        previewHtml = `<div class="file-preview">${highlightText(snippet, searchQueries)}</div>`;
      }
    }

    return (
      <button 
        key={(f.category||'')+'::'+f.filename}
        className={`file-item ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
        onClick={(e) => {
          if (isSelectMode) {
            if (e.shiftKey) {
              selectFileRange(f, visibleSidebarFiles);
            } else {
              toggleFileSelection(f);
            }
          } else {
            if (e.shiftKey) {
              toggleSelectMode();
              selectFileRange(f, visibleSidebarFiles, true);
            } else {
              selectFile(f);
            }
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (isSelectMode) {
            toggleFileSelection(f);
          } else {
            selectFile(f);
            openMovePanel(e, 'single'); // actually triggers the move panel for single item in app layout context
          }
        }}
        draggable
        onDragStart={(e) => {
          let dragFiles = [f];
          if (isSelectMode && isSelected) dragFiles = allFiles.filter(af => selectedFiles.has((af.category||'')+'::'+af.filename));
          window.__draggedFiles = dragFiles;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', dragFiles.length + ' files');
        }}
        onDragEnd={() => { window.__draggedFiles = null; }}
      >
        {isSelectMode && (
          <div 
            className={`file-checkbox ${isSelected ? 'checked' : ''}`}
            role="checkbox"
            aria-checked={isSelected}
            onClick={(e) => {
              e.stopPropagation();
              if (e.shiftKey) {
                selectFileRange(f, visibleSidebarFiles);
              } else {
                toggleFileSelection(f);
              }
            }}
          >
            {isSelected && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="file-check-svg">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        )}
        {f.date && <div className="file-date">{f.dateSource==='os'?<span style={{opacity:0.5,fontSize:'9px'}}>📅 </span>:null}{f.date.replace(/-/g,'.')} {f.time}</div>}
        <div className="file-title">
          {f.isShortcut && (
            <span 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                marginRight: '4px',
                fontSize: '9.5px',
                fontWeight: 700,
                color: 'var(--sb-accent, #3b82f6)',
                background: 'rgba(59, 130, 246, 0.12)',
                padding: '0 3px',
                borderRadius: '0px'
              }}
              title={`🔗 ショートカット (原本: ${f.originalCategory || 'ALL DATA (ルート)'})`}
            >
              🔗
            </span>
          )}
          {!f.isShortcut && (() => {
            const origKey = (f.category || '') + '::' + f.filename;
            const dests = fileShortcuts[origKey] || [];
            if (dests.length === 0) return null;
            return (
              <span 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  marginRight: '4px',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#059669',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid #10b981',
                  padding: '0 4px',
                  borderRadius: '0px'
                }}
                title={`👑 原本ファイル (ショートカット配信先 ${dests.length}件):\n${dests.map(d => '・' + (d || 'ALL DATA (ルート)')).join('\n')}`}
              >
                👑原本 📤{dests.length}
              </span>
            );
          })()}
          {fileMarks[f.filename] && renderMarkBadge(fileMarks[f.filename])}
          {isImg && (
            <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginRight: '6px' }}>
              <ImageThumbnail file={f} size={18} fit="cover" />
            </span>
          )}
          {isImg && (
            <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginRight: '4px' }} title={lang === 'en' ? 'Image File' : '画像ファイル'}>
              <ImageIcon size={13} />
            </span>
          )}
          <span dangerouslySetInnerHTML={{__html: titleHtml}} />
        </div>
        {previewHtml && <div dangerouslySetInnerHTML={{__html: previewHtml}} />}
        <div className="file-fname" dangerouslySetInnerHTML={{__html: highlightText(f.filename, searchQueries)}} />
      </button>
    );
  };

  const renderCategoryGroup = (label: string, icon: React.ReactNode, files: FileObj[], groupKey: string, badge: string | null, isDefaultOpen: boolean, depth: number = 0, childrenGroups?: React.ReactNode, totalCount?: number) => {
    let isOpen = categoryOpenState[groupKey] ?? isDefaultOpen;
    if (searchQueries.length > 0) isOpen = true;

    const isCategory = groupKey.startsWith('cat:');
    let targetCatName: string | null = null;
    let targetHandle: any = null;
    if (isCategory) {
      targetCatName = groupKey.slice(4);
      const cat = physicalFolders.find(c => c.name === targetCatName);
      if (cat) targetHandle = cat.handle;
    }

    return (
      <div className="category-group" data-group-key={groupKey} key={groupKey}>
        <button 
          className={`category-header ${isOpen ? 'open' : ''}`}
          style={{ paddingLeft: `${10 + depth * 14}px` }}
          onClick={() => {
            setCategoryOpen(groupKey, !isOpen);
            if (isCategory) {
              const targetCatName = groupKey.slice(4);
              openExplorer(targetCatName);
            }
          }}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect='move'; e.currentTarget.classList.add('drag-over'); }}
          onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
          onDrop={async e => {
            e.preventDefault(); e.currentTarget.classList.remove('drag-over');
            if (!window.__draggedFiles) return;
            if (groupKey.startsWith('month:') || groupKey.startsWith('date:')) return; 
            let targetCatName: string|null = null, dropHandle: any = null;
            if (groupKey.startsWith('cat:')) {
              targetCatName = groupKey.slice(4);
              const cat = physicalFolders.find(c=>c.name===targetCatName);
              if(cat) dropHandle=cat.handle;
            }
            await execBulkMove(window.__draggedFiles, dropHandle, targetCatName);
          }}
        >
          {icon && <span className="category-icon" style={{ opacity: depth > 0 ? 0.7 : 1 }}>{icon}</span>}
          <span className="category-name">{label}</span>
          {badge && <span className="today-badge">{badge}</span>}
          {targetHandle && isAddMode && (
            <span 
              className="new-file-btn"
              title={t.main.newFilePrompt}
              onClick={(e) => { e.stopPropagation(); openNewFileDialog(targetCatName); }}
              style={{
                marginLeft: 'auto', background: 'var(--sb-accent)', color: '#fff',
                width: '18px', height: '18px', borderRadius: '0px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                marginRight: '6px'
              }}
            >＋</span>
          )}
          <span className="category-count" style={{ marginLeft: targetHandle ? '0' : 'auto' }}>{totalCount !== undefined ? totalCount : files.length}</span>
          <span className="category-arrow">▶</span>
        </button>
        <div className={`category-files ${isOpen ? 'open' : ''}`}>
          {childrenGroups}
          {files.map(f => renderFileBtn(f))}
        </div>
      </div>
    );
  };

  const renderList = () => {
    const today = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;
    let filtered = allFiles;
    if (!showImageFiles) {
      filtered = filtered.filter(f => !isImageFilename(f.filename));
    }
    if (searchQueries.length > 0) {
      filtered = filtered.filter(f => {
        const target = (f.title + ' ' + f.filename + ' ' + (f.category||'') + ' ' + (f.date||'') + ' ' + f.content).toLowerCase();
        return searchQueries.every(q => target.includes(q.toLowerCase()));
      });
    }

    const rootFiles = filtered.filter(f => !f.category);
    if (allCategories.length === 0 && rootFiles.length === 0) {
      return <div id="empty-msg">{t.sidebar.noFilesFound}</div>;
    }

    type CategoryNode = { name: string; files: FileObj[]; children: CategoryNode[]; totalCount: number; };
    const nodeMap = new Map<string, CategoryNode>();
    const treeTop: CategoryNode[] = [];
    
    allCategories.forEach(cat => {
      const catFiles = showImageFiles ? cat.files : cat.files.filter(f => !isImageFilename(f.filename));
      nodeMap.set(cat.name, { name: cat.name, files: catFiles, children: [], totalCount: catFiles.length });
    });
    
    allCategories.forEach(cat => {
      const node = nodeMap.get(cat.name)!;
      const parts = cat.name.split('/');
      if (parts.length > 1) {
        parts.pop();
        const parentName = parts.join('/');
        const parent = nodeMap.get(parentName);
        if (parent) {
          parent.children.push(node);
        } else {
          treeTop.push(node);
        }
      } else {
        treeTop.push(node);
      }
    });

    const computeTotalCount = (node: CategoryNode): number => {
      let count = node.files.length;
      for (const child of node.children) {
        count += computeTotalCount(child);
      }
      node.totalCount = count;
      return count;
    };
    treeTop.forEach(node => computeTotalCount(node));

    // フォルダ並び順のソート連動対応 (日付順・名前順)
    // 対象限定制御: 親フォルダが過去ログアーカイブ/AIエージェント関連、またはYYYY-MM等の年月名を持つフォルダ群に限定
    const isYearMonthName = (name: string) => /^\d{4}[-_./]\d{2}$/.test(name.trim());
    const isArchiveOrAiFolder = (name: string) => /過去ログ|アーカイブ|archive|agent|エージェント|ai/i.test(name);

    const sortCategoryNodes = (nodes: CategoryNode[], parentName: string = '') => {
      if (sortMode === 'custom') {
        const orderList = customFolderOrders[parentName || '__root__'] || [];
        if (orderList.length > 0) {
          nodes.sort((a, b) => {
            const idxA = orderList.indexOf(a.name);
            const idxB = orderList.indexOf(b.name);
            const posA = idxA >= 0 ? idxA : 999999;
            const posB = idxB >= 0 ? idxB : 999999;
            if (posA !== posB) return posA - posB;
            return a.name.localeCompare(b.name, 'ja');
          });
        }
      } else {
        const isTarget = isArchiveOrAiFolder(parentName) || nodes.some(n => {
          const short = n.name.split('/').pop() || n.name;
          return isYearMonthName(short);
        });

        if (isTarget) {
          nodes.sort((a, b) => {
            const shortA = a.name.split('/').pop() || a.name;
            const shortB = b.name.split('/').pop() || b.name;
            const isDateA = isYearMonthName(shortA);
            const isDateB = isYearMonthName(shortB);

            if (sortMode === 'date') {
              // 日付順: 降順(desc)なら最新月が上 (例: 2026-08 -> 2026-07 -> 2026-06)
              if (isDateA && isDateB) {
                return sortDirection === 'desc'
                  ? shortB.localeCompare(shortA, undefined, { numeric: true })
                  : shortA.localeCompare(shortB, undefined, { numeric: true });
              }
              if (isDateA && !isDateB) return sortDirection === 'desc' ? -1 : 1;
              if (!isDateA && isDateB) return sortDirection === 'desc' ? 1 : -1;

              return sortDirection === 'desc'
                ? shortB.localeCompare(shortA, 'ja', { numeric: true })
                : shortA.localeCompare(shortB, 'ja', { numeric: true });
            } else {
              // 名前順: 昇順(asc)なら a->b、降順(desc)なら b->a
              return sortDirection === 'asc'
                ? shortA.localeCompare(shortB, 'ja', { numeric: true })
                : shortB.localeCompare(shortA, 'ja', { numeric: true });
            }
          });
        }
      }

      // 再帰的に子階層も処理
      nodes.forEach(n => {
        if (n.children && n.children.length > 0) {
          sortCategoryNodes(n.children, n.name);
        }
      });
    };

    sortCategoryNodes(treeTop);

    const buildCategoryTree = (node: CategoryNode, depth: number): React.ReactNode => {
      const shortName = node.name.split('/').pop() || node.name;
      const childNodes = node.children.map(child => buildCategoryTree(child, depth + 1));
      return renderCategoryGroup(shortName, depth === 0 ? <FolderIcon /> : null, node.files, 'cat:'+node.name, null, false, depth, childNodes, node.totalCount);
    };

    const elements: React.ReactNode[] = [];

    // 最上部（ルート）の ALL DATA ホームボタン
    const isRootExplorerActive = viewMode === 'explorer' && !explorerCategory;
    elements.push(
      <div className="category-group" data-group-key="root:all_data" key="root:all_data" style={{ marginBottom: '4px' }}>
        <button
          className={`category-header root-all-data-header ${isRootExplorerActive ? 'open' : ''}`}
          style={{
            paddingLeft: '10px',
            background: isRootExplorerActive ? 'var(--sb-item-active, rgba(255,255,255,0.12))' : 'transparent',
            color: isRootExplorerActive ? 'var(--sb-accent)' : 'var(--sb-text)',
            borderLeft: isRootExplorerActive ? '3px solid var(--sb-accent)' : '3px solid transparent',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '7px'
          }}
          onClick={() => {
            openExplorer(null);
          }}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect='move'; e.currentTarget.classList.add('drag-over'); }}
          onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
          onDrop={async e => {
            e.preventDefault(); e.currentTarget.classList.remove('drag-over');
            if (!window.__draggedFiles) return;
            await execBulkMove(window.__draggedFiles, dirHandle, null);
          }}
          title={lang === 'en' ? 'Open Root Directory / All Data (Home)' : '最上位階層（ホーム / ALL DATA）を開く'}
        >
          <span className="category-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <FoldersStackIcon size={15} />
          </span>
          <span className="category-name" style={{ fontWeight: 700, letterSpacing: '0.4px' }}>
            ALL DATA
          </span>
          <span className="category-count" style={{ marginLeft: 'auto' }}>
            {visibleSidebarFiles.length}
          </span>
        </button>
      </div>
    );

    if (allCategories.length > 0) {
      elements.push(<div key="root-sep" style={{ height: '1px', background: 'var(--sb-border, rgba(255,255,255,0.06))', margin: '4px 8px 6px' }} />);
    }

    treeTop.forEach(node => {
      elements.push(buildCategoryTree(node, 0));
    });

    if (rootFiles.length > 0) {
      if (allCategories.length > 0) elements.push(<div key="sep" style={{height:'1px',background:'rgba(255,255,255,0.05)',margin:'6px 10px'}} />);
      
      const byMonth: Record<string, Record<string, FileObj[]>> = {};
      rootFiles.forEach(f => {
        const dKey = f.date || '__nodate__'; const mKey = dKey==='__nodate__' ? dKey : dKey.slice(0,7);
        if(!byMonth[mKey]) byMonth[mKey] = {}; if(!byMonth[mKey][dKey]) byMonth[mKey][dKey] = []; byMonth[mKey][dKey].push(f);
      });
      if (byMonth['__nodate__']) byMonth['__nodate__']['__nodate__'].forEach(f => elements.push(renderFileBtn(f)));
      
      Object.keys(byMonth).filter(k=>k!=='__nodate__').sort((a,b) => {
        if (sortMode === 'date') {
          return sortDirection === 'desc' ? b.localeCompare(a) : a.localeCompare(b);
        } else {
          return sortDirection === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
        }
      }).forEach(mKey => {
        const isThisMonth = mKey === today.slice(0,7); const [my,mm] = mKey.split('-');
        let mOpen = categoryOpenState['month:'+mKey] ?? isThisMonth;
        if(searchQueries.length>0) mOpen=true;

        elements.push(
          <div className="category-group" data-group-key={'month:'+mKey} key={'month:'+mKey}>
            <button className={`category-header ${mOpen?'open':''}`} onClick={() => setCategoryOpen('month:'+mKey, !mOpen)}>
              <span className="category-icon">{isThisMonth?'🗓':'📅'}</span>
              <span className="category-name">{isThisMonth?`${parseInt(mm)}${t.sidebar.thisMonth}`:`${my}.${mm}`}</span>
              {isThisMonth && <span className="today-badge">THIS MONTH</span>}
              <span className="category-count">{Object.values(byMonth[mKey]).flat().length}</span>
              <span className="category-arrow">▶</span>
            </button>
            <div className={`category-files ${mOpen?'open':''}`}>
              {Object.keys(byMonth[mKey]).sort((a,b) => {
                if (sortMode === 'date') {
                  return sortDirection === 'desc' ? b.localeCompare(a) : a.localeCompare(b);
                } else {
                  return sortDirection === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
                }
              }).map(dKey => {
                const isToday = dKey === today; const [,,dd] = dKey.split('-');
                return renderCategoryGroup(isToday?`${t.sidebar.today}(${parseInt(mm)}/${parseInt(dd)})`:`${parseInt(mm)}/${parseInt(dd)}`, '', byMonth[mKey][dKey], 'date:'+dKey, isToday?'TODAY':null, isToday);
              })}
            </div>
          </div>
        );
      });
    }

    return elements;
  };

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  })();

  return (
    <div id="sidebar" onClick={() => { if (settingsOpen) toggleSettings(); closeMovePanels(); }}>
      <div id="app-brand" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '10px', paddingBottom: '16px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', width: '100%'}}>
          <SolidSeriesIcon size={32} />
          <div id="app-name" style={{flex: 1}}>SUPER FOLDER<br/><span>LOG VIEWER</span></div>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center'}}>
          <div id="app-version">React Edition v3.1.2</div>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            <button 
              id="side-change-btn"
              className="side-change-btn"
              onClick={(e) => { e.stopPropagation(); toggleSidebarPosition(); }}
              title={lang === 'en' ? (sidebarPosition === 'left' ? 'Switch sidebar to right side' : 'Switch sidebar to left side') : (sidebarPosition === 'left' ? 'サイドバーを右側に移動' : 'サイドバーを左側に移動')}
              aria-label="Toggle Sidebar Position"
            >
              <SideChangeIcon size={13} />
            </button>

            <div 
              className="lang-toggle-container"
              onClick={(e) => { e.stopPropagation(); setLang(lang === 'ja' ? 'en' : 'ja'); }} 
              title={lang === 'ja' ? 'Switch to English' : '日本語に切り替え'}
            >
              <div className={`lang-toggle-btn ${lang === 'en' ? 'active' : 'inactive'}`}>EN</div>
              <div className={`lang-toggle-btn ${lang === 'ja' ? 'active' : 'inactive'}`}>JP</div>
            </div>

            {isInIframe && (
              <button 
                id="external-link-btn"
                className="side-change-btn"
                title={t.app.fallbackReopen}
                onClick={(e) => { e.stopPropagation(); window.open(window.location.href, '_blank'); }}
                aria-label="Open in new window"
              >
                <ExternalLinkIcon size={11} />
              </button>
            )}
          </div>
        </div>
      </div>
      <div id="sidebar-header" onDragOver={handleDragOver} onDragLeave={(e) => {}} onDrop={handleDrop}>
        <div className="sidebar-label">Log Archive</div>

        <button id="open-btn" onClick={openFolder} disabled={isResuming || loading}>
          {isResuming || loading ? (
            <>
              <span className="dice-spinner-mini">🎲</span>
              <span id="open-btn-label">{t.main.loadingFolder}</span>
            </>
          ) : (
            <>
              <FolderIcon />
              <span id="open-btn-label">{dirHandle ? dirHandle.name : t.app.openFolder}</span>
            </>
          )}
        </button>

        <div id="folder-name">{dirHandle?.name}</div>

        {!dirHandle && (
          <button 
            id="reopen-btn" 
            onClick={pendingResumeHandle ? resumeSavedFolder : reopenFolder}
            className={pendingResumeHandle ? "pending-resume-pulse" : ""}
          >
            <FolderIcon />
            <span id="reopen-btn-label">
              {pendingResumeHandle ? `${pendingResumeHandle.name} ${t.app.reopenFolder}` : t.app.reopenFolder}
            </span>
          </button>
        )}

        <div className="search-wrap" id="search-wrap" style={{display: dirHandle ? 'block' : 'none'}}>
          <SearchIcon className="search-icon" />
          <input 
            id="search-box" type="text" placeholder={t.sidebar.searchHint} 
            ref={searchInputRef}
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
          {searchQueries.length > 0 && <button id="search-clear-btn" onClick={() => { clearSearch(); if(searchInputRef.current) searchInputRef.current.value = ''; }} title="クリア">✕</button>}
        </div>

        {renderBreadcrumbs()}
      </div>

      <div id="file-list-header" style={{display: dirHandle ? 'flex' : 'none', flexDirection: 'column', gap: '8px', padding: '8px 12px'}}>
        {/* 上段: ファイル件数 と 閲覧状態の戻る・進む（Back / Next） */}
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px'}}>
          <span id="file-count" style={{textTransform:'uppercase', fontSize: '11px', fontWeight: 'bold', opacity: 0.85, letterSpacing: '0.5px'}}>
            {visibleSidebarFiles.length} FILES
          </span>
          <div style={{display: 'inline-flex', borderRadius: '0px', overflow: 'hidden', border: '1px solid var(--sb-border)', background: 'var(--sb-item-hover)'}}>
            <button 
              className="nav-history-btn"
              disabled={!canGoBack}
              onClick={goBack}
              title={lang === 'en' ? 'Back (previous state) [Alt+←]' : '戻る（直前の状態へ） [Alt+←]'}
              style={{
                background: 'transparent',
                color: canGoBack ? 'var(--sb-text)' : 'var(--sb-muted)',
                opacity: canGoBack ? 1 : 0.4,
                border: 'none',
                borderRight: '1px solid var(--sb-border)',
                padding: '4px 9px',
                fontSize: '11px',
                cursor: canGoBack ? 'pointer' : 'not-allowed',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s'
              }}
            >
              ◀ {lang === 'en' ? 'Back' : '戻る'}
            </button>
            <button 
              className="nav-history-btn"
              disabled={!canGoForward}
              onClick={goForward}
              title={lang === 'en' ? 'Next (forward state) [Alt+→]' : '進む（次の状態へ） [Alt+→]'}
              style={{
                background: 'transparent',
                color: canGoForward ? 'var(--sb-text)' : 'var(--sb-muted)',
                opacity: canGoForward ? 1 : 0.4,
                border: 'none',
                padding: '4px 9px',
                fontSize: '11px',
                cursor: canGoForward ? 'pointer' : 'not-allowed',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s'
              }}
            >
              {lang === 'en' ? 'Next' : '進む'} ▶
            </button>
          </div>
        </div>

        {/* 下段: ソート切り替え と ツールアクションボタン群 */}
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '6px', flexWrap: 'wrap'}}>
          <div style={{display:'flex', gap:'4px', alignItems:'center'}}>
            <button 
              className={`sort-btn ${sortMode === 'date' ? 'active' : ''}`}
              style={{
                background: sortMode === 'date' ? 'var(--sb-item-active)' : 'transparent', 
                border: '1px solid var(--sb-border)', 
                color: sortMode === 'date' ? 'var(--sb-accent)' : 'var(--sb-text)', 
                padding: '3px 7px', fontSize: '10px', borderRadius: '0px', cursor: 'pointer',
                fontWeight: sortMode === 'date' ? 'bold' : '600',
                display: 'flex', alignItems: 'center', gap: '2px'
              }}
              onClick={() => {
                if (sortMode === 'date') setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
                else { setSortMode('date'); setSortDirection('desc'); }
              }}
            >
              {t.sidebar.sortDate} {sortMode === 'date' ? (sortDirection === 'desc' ? '▼' : '▲') : ''}
            </button>
            <button 
              className={`sort-btn ${sortMode === 'name' ? 'active' : ''}`}
              style={{
                background: sortMode === 'name' ? 'var(--sb-item-active)' : 'transparent', 
                border: '1px solid var(--sb-border)', 
                color: sortMode === 'name' ? 'var(--sb-accent)' : 'var(--sb-text)', 
                padding: '3px 7px', fontSize: '10px', borderRadius: '0px', cursor: 'pointer',
                fontWeight: sortMode === 'name' ? 'bold' : '600',
                display: 'flex', alignItems: 'center', gap: '2px'
              }}
              onClick={() => {
                if (sortMode === 'name') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                else { setSortMode('name'); setSortDirection('asc'); }
              }}
            >
              {t.sidebar.sortName} {sortMode === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
            </button>
            <button 
              className={`sort-btn ${sortMode === 'custom' ? 'active' : ''}`}
              style={{
                background: sortMode === 'custom' ? 'var(--sb-item-active)' : 'transparent', 
                border: '1px solid var(--sb-border)', 
                color: sortMode === 'custom' ? 'var(--sb-accent)' : 'var(--sb-text)', 
                padding: '3px 7px', fontSize: '10px', borderRadius: '0px', cursor: 'pointer',
                fontWeight: sortMode === 'custom' ? 'bold' : '600',
                display: 'flex', alignItems: 'center', gap: '2px'
              }}
              onClick={() => {
                setSortMode('custom');
              }}
              title={lang === 'en' ? 'Custom manual order' : 'カスタム順'}
            >
              <span>↕</span>
              <span>{t.sidebar.sortCustom || 'カスタム'}</span>
            </button>
          </div>

          <div style={{display:'flex', gap:'4px', alignItems:'center'}}>
            <button 
              onClick={() => setIsAddMode(!isAddMode)}
              className={isAddMode ? 'active' : ''}
              style={{
                background: isAddMode ? 'var(--sb-item-active)' : 'transparent',
                border: '1px solid var(--sb-border)', 
                color: 'var(--sb-text)', opacity: 1, fontSize: '10px', fontWeight: 'bold', 
                letterSpacing: '1px', padding: '3px 6px', borderRadius: '0px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap'
              }}
              title={lang === 'en' ? 'Toggle Add Mode (Create File / Folder)' : '新規作成モード切替（ファイル・フォルダー作成）'}
            >
              ＋ <FolderIcon />
            </button>
            <button id="select-mode-btn" className={isSelectMode ? 'active' : ''} onClick={toggleSelectMode} title={t.sidebar.selectMode}>{isSelectMode ? (lang === 'en' ? 'Done' : '終了') : t.sidebar.selectMode}</button>
            <button 
              id="highlight-toggle-btn" 
              className={isHighlightOff ? 'off' : ''} 
              onClick={toggleHighlight} 
              title={lang === 'en' ? 'Toggle Keyword Highlight (ON/OFF)' : '本文ハイライト表示切替（ON/OFF）'}
            >
              <HighlightIcon /> HL
            </button>
            <button 
              onClick={handleToggleAllGroups} 
              title={isAnyGroupOpen() ? (lang === 'en' ? 'Collapse all folders' : '全て折りたたむ') : (lang === 'en' ? 'Expand all folders' : '全て展開')} 
              className="header-icon-btn"
              style={{
                fontSize: '13px',
                fontWeight: 'bold',
                minWidth: '22px',
                height: '22px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--sb-border)',
                borderRadius: '0px',
                color: 'var(--sb-text)',
                opacity: 0.85
              }}
            >
              {isAnyGroupOpen() ? '－' : '＋'}
            </button>
            <button id="refresh-btn" onClick={refreshFolder} title={lang === 'en' ? 'Refresh' : '更新'}>
              <RefreshIcon className={refreshing ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {isSelectMode && (
        <div id="bulk-bar" className="visible">
          <div id="bulk-bar-inner">
            <span id="bulk-count">{lang === 'en' ? `${selectedFiles.size}${t.sidebar.selectedCount}` : `${selectedFiles.size}${t.sidebar.selectedCount}`}</span>
            
            <button 
              id="bulk-cancel-btn"
              onClick={toggleSelectMode}
              title={lang === 'en' ? 'Cancel selection and exit' : '選択を解除して終了'}
            >
              {lang === 'en' ? 'Cancel' : 'キャンセル'}
            </button>

            <div className="bulk-mark-dropdown-container" ref={bulkMarkRef}>
              <button 
                id="bulk-mark-btn"
                onClick={() => setBulkMarkOpen(!bulkMarkOpen)}
                title={lang === 'en' ? 'Set mark for selected files' : '選択した項目にマークを付ける'}
              >
                <span style={{ color: '#F59E0B' }}>★</span>
                <span>{lang === 'en' ? 'Mark' : 'マーク'}</span>
                <span style={{ fontSize: '9px', opacity: 0.8 }}>▼</span>
              </button>

              {bulkMarkOpen && (
                <div className="bulk-mark-palette-popup">
                  <div className="bulk-mark-palette-title">
                    {lang === 'en' ? 'Mark selected' : 'マークを選択'}
                  </div>
                  <div className="bulk-mark-palette-items">
                    {[
                      { mark: '★', label: lang === 'en' ? 'Star (★)' : '星（★）', style: { color: '#F59E0B' } },
                      { mark: '✓', label: lang === 'en' ? 'Check (✓)' : 'チェック（✓）', style: { color: '#10B981', fontWeight: 'bold' } },
                      { mark: '💡', label: lang === 'en' ? 'Idea (💡)' : '電球（💡）' },
                      { mark: '📌', label: lang === 'en' ? 'Pin (📌)' : 'ピン（📌）' },
                      { mark: '⚠️', label: lang === 'en' ? 'Warn (⚠️)' : '注意（⚠️）' },
                    ].map(item => (
                      <button
                        key={item.mark}
                        className="bulk-mark-item-btn"
                        onClick={() => {
                          const fileNames = Array.from(selectedFiles).map((k: unknown) => {
                            const str = String(k);
                            const parts = str.split('::');
                            return parts.length > 1 ? parts[1] : str;
                          });
                          setBulkFileMarks(fileNames, item.mark);
                          setBulkMarkOpen(false);
                        }}
                      >
                        <span className="mark-symbol" style={item.style}>{item.mark}</span>
                        <span className="mark-label">{item.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="bulk-mark-palette-divider" />
                  <button
                    className="bulk-mark-clear-btn"
                    onClick={() => {
                      const fileNames = Array.from(selectedFiles).map((k: unknown) => {
                        const str = String(k);
                        const parts = str.split('::');
                        return parts.length > 1 ? parts[1] : str;
                      });
                      setBulkFileMarks(fileNames, '');
                      setBulkMarkOpen(false);
                    }}
                  >
                    ✕ {lang === 'en' ? 'Remove Marks' : 'マークを解除'}
                  </button>
                </div>
              )}
            </div>

            <button id="bulk-delete-btn" onClick={bulkDeleteFiles}>{t.sidebar.bulkDelete}</button>
            <button id="bulk-move-btn" onClick={e => openMovePanel(e, 'bulk')}>{t.sidebar.bulkMove}</button>
          </div>
        </div>
      )}

      {dirHandle && isAddMode && (
        <div style={{ margin: '0 10px 10px', display: 'flex', flexDirection: 'row', gap: '6px' }}>
          <button 
            onClick={() => openNewFileDialog(explorerCategory || currentFileObj?.category || null)}
            style={{
              flex: 1,
              padding: '7px 4px', 
              background: 'var(--sb-item-hover)', 
              border: '1px dashed var(--sb-accent)', 
              borderRadius: '0px', 
              color: 'var(--sb-accent)', 
              fontSize: '11px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '4px',
              whiteSpace: 'nowrap',
              minWidth: 0
            }}
            title={lang === 'en' ? 'Create New File' : '新規ファイル作成'}
          >
            📄＋ {lang === 'en' ? 'New File' : '新規ファイル'}
          </button>
          <button 
            onClick={() => openNewFolderDialog(null)}
            style={{
              flex: 1,
              padding: '7px 4px', 
              background: 'var(--sb-item-hover)', 
              border: '1px dashed var(--sb-border)', 
              borderRadius: '0px', 
              color: 'var(--sb-text)', 
              opacity: 0.9, 
              fontSize: '11px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '4px',
              whiteSpace: 'nowrap',
              minWidth: 0
            }}
            title={lang === 'en' ? 'Create New Folder' : '新規フォルダー作成'}
          >
            📁＋ {lang === 'en' ? 'New Folder' : '新規フォルダー'}
          </button>
        </div>
      )}

      <div id="file-list">
        {!dirHandle && <div id="empty-msg" style={{whiteSpace:'pre-wrap'}}>{t.sidebar.selectFolderToView}</div>}
        {dirHandle && renderList()}
      </div>

      <div id="sidebar-footer">
        <button id="settings-btn" onClick={(e) => { e.stopPropagation(); toggleSettings(); }}>
          <SettingsIcon />
          <span>{t.app.settings}</span>
        </button>

        {/* 画像ファイル表示 / 非表示トグル（固定幅・文字ズレ防止・落ち着いた統一カラー） */}
        <button
          type="button"
          className="sidebar-image-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            toggleShowImageFiles();
          }}
          title={
            showImageFiles 
              ? (lang === 'en' ? 'Image Files: ON (Showing image files. Click to hide)' : '画像ファイル表示: ON（画像ファイルを表示中。クリックで非表示）')
              : (lang === 'en' ? 'Image Files: OFF (Hiding image files for speed. Click to show)' : '画像ファイル表示: OFF（通常モード：画像ファイルを非表示。クリックで表示）')
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            height: '32px',
            width: '92px',
            minWidth: '92px',
            maxWidth: '92px',
            padding: '0 8px',
            boxSizing: 'border-box',
            background: 'none',
            color: 'var(--sb-muted)',
            border: '1px solid var(--sb-border)',
            borderRadius: '0px',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            letterSpacing: '0.2px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            userSelect: 'none',
            transition: 'all 0.15s'
          }}
        >
          <ImageIcon size={13} style={{ color: 'currentColor', flexShrink: 0 }} />
          <span style={{ flexShrink: 0 }}>{lang === 'en' ? 'Img' : '画像'}</span>
          <span 
            style={{ 
              display: 'inline-block', 
              width: '24px', 
              textAlign: 'center', 
              fontWeight: 800,
              letterSpacing: '0.5px',
              flexShrink: 0
            }}
          >
            {showImageFiles ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
    </div>
  );
};
