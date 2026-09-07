import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { SearchIcon, FolderIcon, RefreshIcon, HighlightIcon, SettingsIcon, ExternalLinkIcon } from './Icons';
import { FileObj } from '../types';
import { highlightText, escHtml } from '../utils';

export const Sidebar = () => {
  const {
    dirHandle, allFiles, allCategories, physicalFolders, searchQueries,
    setSearchQuery, clearSearch, removeSearchQuery, openFolder, reopenFolder, refreshFolder,
    loading, refreshing, isSelectMode, toggleSelectMode, isHighlightOff, toggleHighlight,
    expandAllGroups, collapseAllGroups, toggleSettings, settingsOpen,
    selectedFiles, currentFileObj, selectFile, toggleFileSelection,
    categoryOpenState, setCategoryOpen,
    movePanelState, closeMovePanels, openMovePanel, bulkDeleteFiles, execBulkMove,
    createNewFolder, createNewFile,
    lang, setLang, t,
    sortMode, sortDirection, setSortMode, setSortDirection,
    fileMarks, isResuming, pendingResumeHandle, resumeSavedFolder
  } = useAppContext();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isAddMode, setIsAddMode] = useState(false);

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
          if (isSelectMode) toggleFileSelection(f);
          else selectFile(f);
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
          <div className="file-checkbox">
            {isSelected && <svg viewBox="-2 -2 28 28" fill="none" stroke="white" strokeWidth="3" style={{width:'100%', height:'100%'}}><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
        )}
        {f.date && <div className="file-date">{f.dateSource==='os'?<span style={{opacity:0.5,fontSize:'9px'}}>📅 </span>:null}{f.date.replace(/-/g,'.')} {f.time}</div>}
        <div className="file-title">
          {fileMarks[f.filename] && (
            <span className="file-mark-badge" title="マーク">{fileMarks[f.filename]}</span>
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
    let targetHandle: any = null;
    if (isCategory) {
      const targetCatName = groupKey.slice(4);
      const cat = physicalFolders.find(c => c.name === targetCatName);
      if (cat) targetHandle = cat.handle;
    }

    return (
      <div className="category-group" data-group-key={groupKey} key={groupKey}>
        <button 
          className={`category-header ${isOpen ? 'open' : ''}`}
          style={{ paddingLeft: `${10 + depth * 14}px` }}
          onClick={() => setCategoryOpen(groupKey, !isOpen)}
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
              onClick={(e) => { e.stopPropagation(); createNewFile(targetHandle); }}
              style={{
                marginLeft: 'auto', background: 'var(--sb-accent)', color: '#fff',
                width: '18px', height: '18px', borderRadius: '4px', display: 'flex',
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
    if (searchQueries.length > 0) {
      filtered = allFiles.filter(f => {
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
      nodeMap.set(cat.name, { name: cat.name, files: cat.files, children: [], totalCount: cat.files.length });
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

    const buildCategoryTree = (node: CategoryNode, depth: number): React.ReactNode => {
      const shortName = node.name.split('/').pop() || node.name;
      const childNodes = node.children.map(child => buildCategoryTree(child, depth + 1));
      return renderCategoryGroup(shortName, depth === 0 ? <FolderIcon /> : null, node.files, 'cat:'+node.name, null, false, depth, childNodes, node.totalCount);
    };

    const elements: React.ReactNode[] = [];
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
      
      Object.keys(byMonth).filter(k=>k!=='__nodate__').sort((a,b)=>b.localeCompare(a)).forEach(mKey => {
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
              {Object.keys(byMonth[mKey]).sort((a,b)=>b.localeCompare(a)).map(dKey => {
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
      <div id="app-brand" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '8px', paddingBottom: '16px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end'}}>
          <div id="app-name">SUPER FOLDER<br/><span>LOG VIEWER</span></div>
          {isInIframe && (
            <button 
              title={t.app.fallbackReopen}
              onClick={(e) => { e.stopPropagation(); window.open(window.location.href, '_blank'); }}
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid var(--sb-border)', color: 'var(--sb-accent)', borderRadius: '6px', padding: '5px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 'bold' }}
            >
              <ExternalLinkIcon />
              {t.app.fallbackReopen}
            </button>
          )}
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center'}}>
          <div id="app-version">React Edition v3.1.2</div>
          <div onClick={(e) => { e.stopPropagation(); setLang(lang === 'ja' ? 'en' : 'ja'); }} style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer', fontSize: '9px', fontWeight: 'bold' }}>
            <div style={{ padding: '2px 5px', background: lang === 'en' ? '#94A3B8' : 'transparent', color: lang === 'en' ? '#0F172A' : '#94A3B8' }}>EN</div>
            <div style={{ padding: '2px 5px', background: lang === 'ja' ? '#94A3B8' : 'transparent', color: lang === 'ja' ? '#0F172A' : '#94A3B8' }}>JP</div>
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

      <div id="file-list-header" style={{display: dirHandle ? 'flex' : 'none'}}>
        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
          <span id="file-count" style={{textTransform:'uppercase'}}>{allFiles.length} files</span>
          <div style={{display:'flex', gap:'4px'}}>
            <button 
              className={`sort-btn ${sortMode === 'date' ? 'active' : ''}`}
              style={{
                background: sortMode === 'date' ? 'rgba(255,255,255,0.1)' : 'transparent', 
                border: '1px solid var(--panel-item-border)', 
                color: sortMode === 'date' ? 'var(--sb-accent)' : 'var(--sb-text-sec)', 
                padding: '2px 6px', fontSize: '10px', borderRadius: '4px', cursor: 'pointer',
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
                background: sortMode === 'name' ? 'rgba(255,255,255,0.1)' : 'transparent', 
                border: '1px solid var(--panel-item-border)', 
                color: sortMode === 'name' ? 'var(--sb-accent)' : 'var(--sb-text-sec)', 
                padding: '2px 6px', fontSize: '10px', borderRadius: '4px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '2px'
              }}
              onClick={() => {
                if (sortMode === 'name') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                else { setSortMode('name'); setSortDirection('asc'); }
              }}
            >
              {t.sidebar.sortName} {sortMode === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
            </button>
          </div>
        </div>
        <div style={{display:'flex', gap:'4px', alignItems:'center'}}>
          <button 
            onClick={() => setIsAddMode(!isAddMode)}
            className={isAddMode ? 'active' : ''}
            style={{
              background: isAddMode ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: '1px solid var(--sb-border)', 
              color: 'var(--sb-text)', opacity: isAddMode ? 1 : 0.75, fontSize: '10px', fontWeight: 'bold', 
              letterSpacing: '1px', padding: '3px 8px', borderRadius: '7px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
            }}
            title={t.main.newFolderPrompt}
          >
            ＋ <FolderIcon />
          </button>
          <button id="select-mode-btn" className={isSelectMode ? 'active' : ''} onClick={toggleSelectMode} title={t.sidebar.selectMode}>{isSelectMode ? 'Done' : t.sidebar.selectMode}</button>
          <button id="highlight-toggle-btn" className={isHighlightOff ? 'off' : ''} onClick={toggleHighlight} title={t.app.highlight}>
            <HighlightIcon /> HL
          </button>
          <button onClick={expandAllGroups} title="全て展開" className="header-icon-btn">＋</button>
          <button onClick={collapseAllGroups} title="全て折りたたむ" className="header-icon-btn">－</button>
          <button id="refresh-btn" onClick={refreshFolder} title="更新">
            <RefreshIcon className={refreshing ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {isSelectMode && (
        <div id="bulk-bar" className="visible">
          <div id="bulk-bar-inner">
            <span id="bulk-count">{lang === 'en' ? `${selectedFiles.size}${t.sidebar.selectedCount}` : `${selectedFiles.size}${t.sidebar.selectedCount}`}</span>
            <button id="bulk-cancel-btn" onClick={toggleSelectMode}>{t.sidebar.cancelSelect}</button>
            <button id="bulk-delete-btn" onClick={bulkDeleteFiles}>{t.sidebar.bulkDelete}</button>
            <button id="bulk-move-btn" onClick={e => openMovePanel(e, 'bulk')}>{t.sidebar.bulkMove}</button>
          </div>
        </div>
      )}

      {dirHandle && isAddMode && (
        <button 
          onClick={createNewFolder}
          style={{
            margin: '0 10px 10px', padding: '10px', background: 'rgba(59,130,246,0.1)', 
            border: '1px dashed rgba(59,130,246,0.4)', borderRadius: '8px', 
            color: '#60A5FA', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px'
          }}>
          {t.main.newRootFolder || "+ 一番上（ルート）に新規フォルダー作成"}
        </button>
      )}

      <div id="file-list">
        {!dirHandle && <div id="empty-msg" style={{whiteSpace:'pre-wrap'}}>{t.sidebar.selectFolderToView}</div>}
        {dirHandle && renderList()}
      </div>

      <div id="sidebar-footer">
        <button id="settings-btn" onClick={(e) => { e.stopPropagation(); toggleSettings(); }}>
          <SettingsIcon />
          {t.app.settings}
        </button>
      </div>
    </div>
  );
};
