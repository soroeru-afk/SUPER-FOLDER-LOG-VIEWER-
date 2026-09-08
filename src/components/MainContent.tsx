import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { EditIcon, SaveIcon, MoveIcon, FolderIcon, SpeakerIcon, ReadIcon, DeleteIcon } from './Icons';
import { ChevronsLeft, ChevronLeft, ChevronsRight, ChevronRight } from 'lucide-react';
import { extractFirstSentence, highlightText, highlightTextSafe, linkifyUrls, escHtml } from '../utils';
import { applySettingsToDOM } from '../settingsSync';
import { MarkdownView } from './MarkdownView';
import { FolderExplorer } from './FolderExplorer';

export const MainContent = () => {
  const {
    dirHandle, allFiles, searchQueries,
    currentFileObj, currentContent, isEditing, toggleEdit, saveFile,
    openMovePanel, deleteCurrentFile, renameCurrentFile,
    movePanelState, closeMovePanels, physicalFolders, execBulkMove, moveToNewFolder,
    renameFolder, deleteFolder, selectedFiles, selectedFileMap,
    lang, t, speakerModeEnabled, ttsSettings, voices, writingMode, setWritingMode,
    paperMode, paperColor, setPaperColor, setPaperMode, togglePaperMode, fileMarks, setFileMark, hasPrevFile, hasNextFile, goToPrevFile, goToNextFile,
    isResuming, pendingResumeHandle, resumeSavedFolder, loading,
    viewMode, openExplorer
  } = useAppContext();

  const [markPaletteOpen, setMarkPaletteOpen] = useState(false);
  const markPaletteRef = useRef<HTMLDivElement>(null);

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameInputVal, setRenameInputVal] = useState('');
  const [folderRenameTarget, setFolderRenameTarget] = useState<{ name: string; handle: any } | null>(null);
  const [folderRenameInputVal, setFolderRenameInputVal] = useState('');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (markPaletteRef.current && !markPaletteRef.current.contains(e.target as Node)) {
        setMarkPaletteOpen(false);
      }
    };
    if (markPaletteOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [markPaletteOpen]);

  const [currentLH, setCurrentLH] = useState(() => localStorage.getItem('lv_lineHeight') || '1.8');
  const [currentFS, setCurrentFS] = useState(() => localStorage.getItem('lv_fontSize') || '15');

  useEffect(() => {
    const handleSettingsChanged = () => {
      setCurrentLH(localStorage.getItem('lv_lineHeight') || '1.8');
      setCurrentFS(localStorage.getItem('lv_fontSize') || '15');
    };
    window.addEventListener('settingsChanged', handleSettingsChanged);
    return () => window.removeEventListener('settingsChanged', handleSettingsChanged);
  }, []);

  const stepLineHeight = (delta: number) => {
    const current = parseFloat(currentLH) || 1.8;
    let nextVal = +(current + delta * 0.1).toFixed(1);
    nextVal = Math.min(3.0, Math.max(1.1, nextVal));
    const strVal = nextVal.toFixed(1);
    localStorage.setItem('lv_lineHeight', strVal);
    setCurrentLH(strVal);
    applySettingsToDOM();
    window.dispatchEvent(new Event('settingsChanged'));
  };

  const stepFontSize = (delta: number) => {
    const current = parseInt(currentFS, 10) || 15;
    const nextVal = Math.min(32, Math.max(11, current + delta));
    const strVal = String(nextVal);
    localStorage.setItem('lv_fontSize', strVal);
    setCurrentFS(strVal);
    applySettingsToDOM();
    window.dispatchEvent(new Event('settingsChanged'));
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const startScrolling = (direction: 'left' | 'right') => {
    if (scrollAnimationFrameRef.current) return;
    const speed = direction === 'left' ? -7 : 7;
    const step = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft += speed;
        scrollAnimationFrameRef.current = requestAnimationFrame(step);
      }
    };
    scrollAnimationFrameRef.current = requestAnimationFrame(step);
  };

  const stopScrolling = () => {
    if (scrollAnimationFrameRef.current) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }
  };

  const scrollToStart = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // 一遍にパッとジャンプ（アニメーションなし）
    el.scrollTo({ left: 0, behavior: 'auto' });
    setTimeout(() => {
      if (el.scrollLeft < 0) {
        el.scrollTo({ left: 0, behavior: 'auto' });
      }
    }, 20);
  };

  const scrollToEnd = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // 一遍にパッとジャンプ（アニメーションなし）
    el.scrollTo({ left: -el.scrollWidth, behavior: 'auto' });
    setTimeout(() => {
      if (el.scrollLeft === 0 && el.scrollWidth > el.clientWidth) {
        el.scrollTo({ left: -(el.scrollWidth - el.clientWidth), behavior: 'auto' });
      }
    }, 20);
  };

  const stepScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // 1クリックで進みすぎないよう、ちょっとだけ（約55px・2〜3行分）進む
    const delta = direction === 'left' ? -55 : 55;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const handleArrowMouseDown = (direction: 'left' | 'right') => {
    stepScroll(direction);
    longPressTimerRef.current = window.setTimeout(() => {
      startScrolling(direction);
    }, 220);
  };

  const handleArrowMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    stopScrolling();
  };

  const renderVerticalNavArrows = () => (
    <>
      <div className="vertical-scroll-nav-group left-group">
        <button
          className="scroll-arrow-btn"
          onClick={scrollToEnd}
          title={lang === 'en' ? 'Jump to end (last page)' : '一番後ろ（末尾）へジャンプ'}
          aria-label="Jump to end"
        >
          <ChevronsLeft size={18} strokeWidth={2.4} />
        </button>
        <button
          className="scroll-arrow-btn"
          onMouseDown={() => handleArrowMouseDown('left')}
          onMouseUp={handleArrowMouseUp}
          onMouseLeave={handleArrowMouseUp}
          onTouchStart={() => handleArrowMouseDown('left')}
          onTouchEnd={handleArrowMouseUp}
          title={lang === 'en' ? 'Scroll left' : '左へスクロール'}
          aria-label="Scroll left"
        >
          <ChevronLeft size={18} strokeWidth={2.4} />
        </button>
      </div>

      <div className="vertical-scroll-nav-group right-group">
        <button
          className="scroll-arrow-btn"
          onClick={scrollToStart}
          title={lang === 'en' ? 'Jump to beginning (first page)' : '一番前（先頭）へジャンプ'}
          aria-label="Jump to start"
        >
          <ChevronsRight size={18} strokeWidth={2.4} />
        </button>
        <button
          className="scroll-arrow-btn"
          onMouseDown={() => handleArrowMouseDown('right')}
          onMouseUp={handleArrowMouseUp}
          onMouseLeave={handleArrowMouseUp}
          onTouchStart={() => handleArrowMouseDown('right')}
          onTouchEnd={handleArrowMouseUp}
          title={lang === 'en' ? 'Scroll right' : '右へスクロール'}
          aria-label="Scroll right"
        >
          <ChevronRight size={18} strokeWidth={2.4} />
        </button>
      </div>
    </>
  );

  useEffect(() => {
    return () => {
      if (scrollAnimationFrameRef.current) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
      }
    };
  }, []);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (writingMode === 'vertical' && !isEditing) return;
    const shouldShow = e.currentTarget.scrollTop > 150;
    if (shouldShow !== showScrollTop) {
      setShowScrollTop(shouldShow);
    }
  };
  const scrollToTop = () => {
    const contentAreaEl = document.getElementById('content-area');
    if (contentAreaEl) {
      contentAreaEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [editValue, setEditValue] = useState("");
  useEffect(() => {
    setEditValue(currentContent);
  }, [currentContent, isEditing]);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  useEffect(() => {
    const handleInterval = setInterval(() => {
      setIsPlayingAudio(window.speechSynthesis.speaking || window.speechSynthesis.pending);
    }, 200);
    return () => clearInterval(handleInterval);
  }, []);

  // ファイル切替や編集モード切り替え時に音声を自動停止
  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsPlayingAudio(false);
  }, [currentFileObj, isEditing]);

  useEffect(() => {
    applySettingsToDOM();

    const contentAreaEl = document.getElementById('content-area');
    if (contentAreaEl) {
      contentAreaEl.scrollTop = 0;
      contentAreaEl.scrollLeft = 0;
    }
  }, [writingMode, currentFileObj, isEditing, speakerModeEnabled]);

  const stopAudio = () => {
    window.speechSynthesis.cancel();
    setIsPlayingAudio(false);
  };

  const playFromIndex = (texts: string[], startIndex: number) => {
    window.speechSynthesis.cancel();
    const validTexts: string[] = [];
    for (let i = startIndex; i < texts.length; i++) {
      if (texts[i].trim()) {
        validTexts.push(texts[i]);
      }
    }
    if (validTexts.length === 0) {
      setIsPlayingAudio(false);
      return;
    }

    validTexts.forEach((text, idx) => {
      const u = new SpeechSynthesisUtterance(text);
      const v = voices.find(v => v.voiceURI === ttsSettings.voiceURI);
      if (v) u.voice = v;
      u.rate = ttsSettings.rate;
      u.volume = ttsSettings.volume;
      u.pitch = ttsSettings.pitch;
      if (idx === validTexts.length - 1) {
        u.onend = () => setIsPlayingAudio(false);
        u.onerror = () => setIsPlayingAudio(false);
      }
      window.speechSynthesis.speak(u);
    });
    setIsPlayingAudio(true);
  };

  const handleLinePlayOrStop = (texts: string[], startIndex: number) => {
    const isSpeaking = window.speechSynthesis.speaking || window.speechSynthesis.pending || isPlayingAudio;
    if (isSpeaking) {
      stopAudio();
      return;
    }
    playFromIndex(texts, startIndex);
  };

  const renderContent = () => {
    if (!currentFileObj) return null;
    
    if (isEditing) {
      return (
        <textarea 
          id="edit-area" 
          style={{display: 'block'}}
          value={editValue} 
          onChange={e => setEditValue(e.target.value)}
        />
      );
    }

    const msgs: {speaker: string, text: string}[] = [];
    currentContent.split('\n').forEach(line => {
      const t = line.trim();
      if (/^(コピー|Copy|copied|コピーしました|👍|👎|Like|Dislike|再生成|Regenerate|編集|Edit|削除|Delete|Share|シェア|Report|報告|Follow up|フォローアップ)$/i.test(t)) return;
      const m = line.match(/^([^:：]{1,10})[:：]\s*(.*)$/);
      if (m) msgs.push({ speaker: m[1].trim(), text: m[2].trim() });
      else if (t) {
        if (msgs.length) msgs[msgs.length-1].text += '\n'+t;
        else msgs.push({ speaker: '—', text: t });
      }
    });

    if (speakerModeEnabled && msgs.length > 0 && msgs.some(m => m.speaker !== '—')) {
      const allLines = msgs.flatMap(m => m.text.split('\n'));
      let globalLineIndex = 0;

      if (writingMode === 'vertical') {
        return (
          <div className="vertical-scroll-wrapper">
            {renderVerticalNavArrows()}
            <div 
              className="vertical-scroll-content" 
              ref={scrollContainerRef}
              onWheel={e => {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                  e.currentTarget.scrollLeft -= e.deltaY;
                }
              }}
            >
              <div 
                id="messages" 
                className="vertical-messages" 
                onDoubleClick={!isEditing ? toggleEdit : undefined}
                onClick={() => {
                  if (window.getSelection()?.toString().length) return;
                  if (window.speechSynthesis.speaking || window.speechSynthesis.pending || isPlayingAudio) {
                    stopAudio();
                  }
                }}
              >
                {msgs.map((m, i) => {
                  const startLine = globalLineIndex;
                  globalLineIndex += m.text.split('\n').length;
                  return (
                    <div className="vertical-msg-block" key={i}>
                      {m.speaker !== '—' && (
                        <div className="vertical-msg-speaker">
                          <SpeakerIcon /> {escHtml(m.speaker)}
                        </div>
                      )}
                      <div className="vertical-msg-body">
                        <MarkdownView
                          content={m.text}
                          searchQueries={searchQueries}
                          writingMode="vertical"
                          isPlayingAudio={isPlayingAudio}
                          onPlayFromLine={offset => {
                            handleLinePlayOrStop(allLines, startLine + offset);
                          }}
                          onDoubleClickToEdit={toggleEdit}
                          lang={lang}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div 
          id="messages" 
          style={{display: 'flex'}} 
          onDoubleClick={!isEditing ? toggleEdit : undefined}
          onClick={() => {
            if (window.getSelection()?.toString().length) return;
            if (window.speechSynthesis.speaking || window.speechSynthesis.pending || isPlayingAudio) {
              stopAudio();
            }
          }}
        >
          {msgs.map((m, i) => {
            const startLine = globalLineIndex;
            globalLineIndex += m.text.split('\n').length;
            return (
              <div className="msg-block" key={i}>
                {m.speaker !== '—' && (
                  <div className="msg-speaker">
                    <SpeakerIcon /> {escHtml(m.speaker)}
                  </div>
                )}
                <div className="msg-body">
                  <MarkdownView
                    content={m.text}
                    searchQueries={searchQueries}
                    writingMode="horizontal"
                    isPlayingAudio={isPlayingAudio}
                    onPlayFromLine={offset => {
                      handleLinePlayOrStop(allLines, startLine + offset);
                    }}
                    onDoubleClickToEdit={toggleEdit}
                    lang={lang}
                  />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    const lines = currentContent ? currentContent.split('\n') : [];
    if (writingMode === 'vertical') {
      return (
        <div className="vertical-card-fixed">
          <div className="vertical-scroll-wrapper">
            {renderVerticalNavArrows()}
            <div 
              className="vertical-scroll-content" 
              ref={scrollContainerRef} 
              onWheel={e => {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                  e.currentTarget.scrollLeft -= e.deltaY;
                }
              }}
            >
              <div 
                className="vertical-writing-text-inner"
                onDoubleClick={!isEditing ? toggleEdit : undefined}
                onClick={() => {
                  if (window.getSelection()?.toString().length) return;
                  if (window.speechSynthesis.speaking || window.speechSynthesis.pending || isPlayingAudio) {
                    stopAudio();
                  }
                }}
              >
                <MarkdownView
                  content={currentContent}
                  searchQueries={searchQueries}
                  writingMode="vertical"
                  isPlayingAudio={isPlayingAudio}
                  onPlayFromLine={i => {
                    handleLinePlayOrStop(lines, i);
                  }}
                  onDoubleClickToEdit={toggleEdit}
                  lang={lang}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        id="plain-text" 
        style={{display: 'block'}}
        onDoubleClick={!isEditing ? toggleEdit : undefined}
        onClick={() => {
          if (window.getSelection()?.toString().length) return;
          if (window.speechSynthesis.speaking || window.speechSynthesis.pending || isPlayingAudio) {
            stopAudio();
          }
        }}
      >
        <MarkdownView
          content={currentContent}
          searchQueries={searchQueries}
          writingMode="horizontal"
          isPlayingAudio={isPlayingAudio}
          onPlayFromLine={i => {
            handleLinePlayOrStop(lines, i);
          }}
          onDoubleClickToEdit={toggleEdit}
          lang={lang}
        />
      </div>
    );
  };

  const getHeadingHTML = () => {
    if (!currentFileObj) return '';
    const firstSentence = extractFirstSentence(currentContent);
    const displayTitle = (firstSentence && firstSentence.length > 2) ? firstSentence : currentFileObj.title;
    return highlightText(displayTitle, searchQueries);
  };

  const [newFolderName, setNewFolderName] = useState('');

  const isInitialLoading = (isResuming || loading) && allFiles.length === 0;

  return (
    <div id="main" className={writingMode === 'vertical' && !isEditing ? "vertical-mode-active" : ""} onClick={closeMovePanels}>
      
      {((!dirHandle && allFiles.length === 0) || isInitialLoading) && (
        <div id="welcome">
          <div id="welcome-big">ARCHIVE</div>
          {isResuming || loading ? (
            <div className="resume-loading-status">
              <span className="dice-spinner-mini">🎲</span>
              <span className="resume-loading-text">フォルダーを読み込み中です...</span>
            </div>
          ) : pendingResumeHandle ? (
            <div className="resume-prompt-box">
              <p>{t.main.resumeFolderDesc}</p>
              <button 
                className="tool-btn primary" 
                onClick={resumeSavedFolder} 
                style={{ marginTop: '16px', padding: '10px 24px', fontSize: '13px', display: 'inline-flex' }}
              >
                📁 {pendingResumeHandle.name} {t.app.reopenFolder}
              </button>
            </div>
          ) : (
            <p>{t.main.selectFolderDesc}</p>
          )}
        </div>
      )}

      {!isInitialLoading && (dirHandle || allFiles.length > 0) && viewMode === 'explorer' && (
        <FolderExplorer />
      )}

      {!isInitialLoading && (dirHandle || allFiles.length > 0) && viewMode === 'reader' && !currentFileObj && (
        <div id="welcome">
          <div id="welcome-big">ARCHIVE</div>
          <p style={{ marginBottom: '16px', opacity: 0.75 }}>
            {lang === 'en' ? 'Select a log file from the sidebar, or switch to Folder Explorer.' : 'サイドバーからログファイルを選択するか、展開モードを開いてください。'}
          </p>
          <button 
            className="tool-btn primary" 
            onClick={() => openExplorer(null)}
            style={{ padding: '8px 20px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            📁 {lang === 'en' ? 'Open Folder Explorer' : '展開モード（エクスプローラー）を開く'}
          </button>
        </div>
      )}

      {(dirHandle || allFiles.length > 0) && viewMode === 'reader' && currentFileObj && (
        <>
          <div id="content-area" onScroll={handleContentScroll}>
            <div id="bg-date">{currentFileObj.date ? currentFileObj.date.slice(5).replace('-','.') : ''}</div>
          <div id="content-inner">
            {/* パンくずリスト */}
            <div className="content-breadcrumb">
              <button className="content-breadcrumb-crumb" onClick={() => openExplorer(null)}>
                📁 [ ALL DATA ]
              </button>
              {currentFileObj.category && currentFileObj.category.split('/').map((part, idx, arr) => {
                const catPath = arr.slice(0, idx + 1).join('/');
                return (
                  <React.Fragment key={catPath}>
                    <span className="content-breadcrumb-sep">›</span>
                    <button className="content-breadcrumb-crumb" onClick={() => openExplorer(catPath)}>
                      {part}
                    </button>
                  </React.Fragment>
                );
              })}
              <span className="content-breadcrumb-sep">›</span>
              <span className="content-breadcrumb-current">{currentFileObj.filename}</span>
            </div>

            <div id="file-meta">{currentFileObj.filename}</div>
            <div id="file-heading" dangerouslySetInnerHTML={{__html: getHeadingHTML()}} />

            <div id="toolbar">
              <div className="toolbar-row">
                <button 
                  className="tool-btn" 
                  onClick={() => openExplorer(currentFileObj.category || null)}
                  title={lang === 'en' ? 'Open folder cards' : 'フォルダーカード一覧を開く'}
                >
                  <FolderIcon /> {lang === 'en' ? 'Explorer' : '一覧'}
                </button>
                <button className="tool-btn primary" onClick={isEditing ? () => saveFile(editValue) : toggleEdit}>
                  {isEditing ? <><SaveIcon /> {t.main.save}</> : <><EditIcon /> {t.main.edit}</>}
                </button>
                {isEditing && (
                  <button className="tool-btn" onClick={toggleEdit}>
                    <ReadIcon /> {t.main.read}
                  </button>
                )}
                {!isEditing && (
                  <>
                    <div className="toolbar-stepper" title={lang === 'en' ? 'Font size' : '文字サイズ'}>
                      <button
                        className="stepper-btn"
                        onClick={() => stepFontSize(-1)}
                        title={lang === 'en' ? 'Decrease font size (-1px)' : '文字を小さく (-1px)'}
                      >
                        -
                      </button>
                      <span className="stepper-value">{currentFS}</span>
                      <button
                        className="stepper-btn"
                        onClick={() => stepFontSize(1)}
                        title={lang === 'en' ? 'Increase font size (+1px)' : '文字を大きく (+1px)'}
                      >
                        +
                      </button>
                    </div>
                    <div className="toolbar-stepper" title={lang === 'en' ? 'Line height' : '行間'}>
                      <span className="stepper-label">LH:</span>
                      <button
                        className="stepper-btn"
                        onClick={() => stepLineHeight(-1)}
                        title={lang === 'en' ? 'Decrease line height (-0.1)' : '行間を狭く (-0.1)'}
                      >
                        -
                      </button>
                      <span className="stepper-value">{parseFloat(currentLH).toFixed(1)}</span>
                      <button
                        className="stepper-btn"
                        onClick={() => stepLineHeight(1)}
                        title={lang === 'en' ? 'Increase line height (+0.1)' : '行間を広く (+0.1)'}
                      >
                        +
                      </button>
                    </div>

                    <div className="layout-toggle-group" style={{ display: 'inline-flex', gap: '3px' }}>
                      <button
                        className={`tool-btn ${writingMode === 'horizontal' ? 'primary' : ''}`}
                        onClick={() => setWritingMode('horizontal')}
                      >
                        HORIZ
                      </button>
                      <button
                        className={`tool-btn ${writingMode === 'vertical' ? 'primary' : ''}`}
                        onClick={() => setWritingMode('vertical')}
                      >
                        VERT
                      </button>
                    </div>
                    <div 
                      className="paper-mode-control" 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        background: 'var(--btn-bg)', 
                        border: '1px solid var(--btn-border)', 
                        borderRadius: '0px', 
                        overflow: 'hidden',
                        height: '26px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <button
                        className={`tool-btn ${paperMode ? 'paper-btn-on' : ''}`}
                        onClick={togglePaperMode}
                        title={
                          paperMode 
                            ? (lang === 'en' ? 'Paper Mode: ON (Click to turn OFF)' : 'ペーパーモード: ON（クリックで通常テーマ表示に戻す）') 
                            : (lang === 'en' ? 'Paper Mode: OFF (Click to turn ON)' : 'ペーパーモード: OFF（クリックでONにする）')
                        }
                        style={{
                          height: '100%',
                          borderRadius: 0,
                          border: 'none',
                          borderRight: '1px solid var(--btn-border)',
                          padding: '0 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: paperMode ? '#4B5563' : 'transparent',
                          color: paperMode ? '#FFFFFF' : 'var(--btn-text)',
                          transition: 'all 0.15s',
                          cursor: 'pointer'
                        }}
                      >
                        {paperMode ? 'PAPER ON' : 'PAPER OFF'}
                      </button>
                      <button
                        className={`tool-btn ${paperColor === 'beige' && paperMode ? 'paper-sub-active' : ''}`}
                        onClick={() => {
                          setPaperColor('beige');
                          if (!paperMode) setPaperMode(true);
                        }}
                        title={lang === 'en' ? 'Warm Beige Paper' : 'ベージュペーパー（淡いクラフト紙調）'}
                        style={{
                          height: '100%',
                          borderRadius: 0,
                          border: 'none',
                          borderRight: '1px solid var(--btn-border)',
                          padding: '0 7px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: (paperColor === 'beige' && paperMode) ? '#64748B' : 'transparent',
                          color: (paperColor === 'beige' && paperMode) ? '#FFFFFF' : 'var(--btn-text)',
                          opacity: paperMode ? 1 : 0.42,
                          transition: 'all 0.15s',
                          cursor: 'pointer'
                        }}
                      >
                        BEIGE
                      </button>
                      <button
                        className={`tool-btn ${paperColor === 'white' && paperMode ? 'paper-sub-active' : ''}`}
                        onClick={() => {
                          setPaperColor('white');
                          if (!paperMode) setPaperMode(true);
                        }}
                        title={lang === 'en' ? 'Clean White Paper (Neutral table)' : 'ホワイトペーパー（白地＆テーブル明瞭調）'}
                        style={{
                          height: '100%',
                          borderRadius: 0,
                          border: 'none',
                          padding: '0 7px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: (paperColor === 'white' && paperMode) ? '#64748B' : 'transparent',
                          color: (paperColor === 'white' && paperMode) ? '#FFFFFF' : 'var(--btn-text)',
                          opacity: paperMode ? 1 : 0.42,
                          transition: 'all 0.15s',
                          cursor: 'pointer'
                        }}
                      >
                        WHITE
                      </button>
                    </div>
                    <button
                      className={`tool-btn ${!hasPrevFile ? 'disabled-nav' : ''}`}
                      onClick={goToPrevFile}
                      disabled={!hasPrevFile}
                      title="前の記事 (PREV)"
                    >
                      PREV
                    </button>
                    <button
                      className={`tool-btn ${!hasNextFile ? 'disabled-nav' : ''}`}
                      onClick={goToNextFile}
                      disabled={!hasNextFile}
                      title="次の記事 (NEXT)"
                    >
                      NEXT
                    </button>

                    <div className="mark-dropdown-container" ref={markPaletteRef} style={{position: 'relative', display: 'inline-flex'}}>
                      <button
                        id="mark-btn"
                        className={`tool-btn ${currentFileObj && fileMarks[currentFileObj.filename] ? 'has-mark' : ''}`}
                        onClick={() => setMarkPaletteOpen(prev => !prev)}
                        title="マークを付ける / 変更"
                      >
                        {currentFileObj && fileMarks[currentFileObj.filename] ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <span style={
                              fileMarks[currentFileObj.filename] === '★' 
                                ? { color: '#F59E0B' } 
                                : fileMarks[currentFileObj.filename] === '✓' 
                                  ? { color: '#10B981', fontWeight: 900 } 
                                  : undefined
                            }>
                              {fileMarks[currentFileObj.filename]}
                            </span>
                            <span>マーク</span>
                          </span>
                        ) : (
                          '☆ マーク'
                        )}
                      </button>
                      {markPaletteOpen && currentFileObj && (
                        <div className="mark-palette-popup">
                          <div className="mark-palette-items">
                            {[
                              { mark: '★', label: '星（★）', style: { color: '#F59E0B' } },
                              { mark: '✓', label: 'チェック（✓）', style: { color: '#10B981', fontWeight: 900 } },
                              { mark: '💡', label: '電球（💡）' },
                              { mark: '📌', label: 'ピン（📌）' },
                              { mark: '⚠️', label: '注意（⚠️）' },
                            ].map(item => {
                              const isMarkActive = fileMarks[currentFileObj.filename] === item.mark;
                              return (
                                <button
                                  key={item.mark}
                                  className={`mark-palette-btn ${isMarkActive ? 'active' : ''}`}
                                  onClick={() => {
                                    setFileMark(currentFileObj.filename, isMarkActive ? '' : item.mark);
                                    setMarkPaletteOpen(false);
                                  }}
                                  title={item.label}
                                  style={item.style}
                                >
                                  {item.mark}
                                </button>
                              );
                            })}
                            <div className="mark-palette-divider" />
                            <button
                              className="mark-palette-clear-btn"
                              onClick={() => {
                                setFileMark(currentFileObj.filename, '');
                                setMarkPaletteOpen(false);
                              }}
                              title="マークを解除"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <button id="move-btn" style={{display:'inline-flex'}} onClick={e => openMovePanel(e, 'single')}>
                      <MoveIcon /> {t.main.moveTo}
                    </button>
                    <button id="folder-edit-btn" style={{display:'inline-flex'}} onClick={e => openMovePanel(e, 'folder')}>
                      <FolderIcon /> {t.main.folderEdit}
                    </button>

                    <button 
                      id="rename-file-btn" 
                      style={{display:'inline-flex'}} 
                      onClick={() => {
                        if (!currentFileObj) return;
                        setRenameInputVal(currentFileObj.filename);
                        setIsRenameModalOpen(true);
                      }}
                    >
                      <EditIcon /> {t.main.rename}
                    </button>

                    <button id="delete-file-btn" style={{display:'inline-flex'}} onClick={deleteCurrentFile}>
                      <DeleteIcon /> {t.main.delete}
                    </button>

                    {(currentFileObj.category || dirHandle) && (
                      <div id="location-badge" style={{display: 'inline-flex'}}>
                        <FolderIcon /> {currentFileObj.category || dirHandle?.name}
                        {!currentFileObj.category && <span style={{opacity:0.5,fontWeight:'normal',fontSize:'9px'}}> {t.main.rootPath}</span>}
                      </div>
                    )}

                    <button 
                      id="play-audio-btn" 
                      className={isPlayingAudio ? 'playing' : ''}
                      style={{display:'inline-flex'}} 
                      onClick={() => {
                        const isSpeaking = window.speechSynthesis.speaking || window.speechSynthesis.pending || isPlayingAudio;
                        if (isSpeaking) {
                          stopAudio();
                        } else {
                          const lines = currentContent ? currentContent.split('\n') : [];
                          playFromIndex(lines, 0);
                        }
                      }}
                      title={isPlayingAudio ? '読み上げ停止' : '音声読み上げ再生'}
                    >
                      {isPlayingAudio ? (lang === 'en' ? '■ STOP' : '■ 停止') : (lang === 'en' ? '▶ VOICE' : '▶ 音声再生')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {writingMode === 'vertical' && !isEditing ? (
              <div className="vertical-content-wrapper-flex">
                {renderContent()}
              </div>
            ) : (
              renderContent()
            )}

          </div>
        </div>
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            style={{
              position: 'absolute',
              bottom: '24px',
              right: '24px',
              zIndex: 100,
              width: '44px',
              height: '44px',
              borderRadius: '0px',
              background: 'var(--btn-bg)',
              color: 'var(--btn-text)',
              border: '1px solid var(--btn-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              opacity: 0.9,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.9'}
            title={lang === 'en' ? 'Scroll to top' : '一番上へ'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </button>
        )}
        </>
      )}

      {/* Panels rendering conditionally based on movePanelState */}
      {movePanelState && movePanelState.isOpen && (
        <div 
          className="open-panel"
          style={{
            position: 'fixed', zIndex: 200, 
            background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', 
            borderRadius: '0px', padding: 0, boxShadow: '0 12px 48px rgba(0,0,0,0.55)', 
            width: movePanelState.type === 'bulk' && (!movePanelState.triggerRect || movePanelState.triggerRect.left < 280) ? 'calc(var(--sb-width) - 20px)' : '360px',
            maxWidth: 'calc(100vw - 32px)',
            boxSizing: 'border-box',
            overflow: 'hidden',
            top: movePanelState.triggerRect && (movePanelState.type !== 'bulk' || movePanelState.triggerRect.left >= 280)
              ? Math.max(10, Math.min(movePanelState.triggerRect.bottom + 6, window.innerHeight - 360)) + 'px'
              : (movePanelState.type === 'bulk' ? 'auto' : Math.max(10, Math.min((movePanelState.triggerRect?.bottom || 0) + 5, window.innerHeight - 340)) + 'px'),
            bottom: movePanelState.type === 'bulk' && (!movePanelState.triggerRect || movePanelState.triggerRect.left < 280) ? '70px' : 'auto',
            left: movePanelState.triggerRect && (movePanelState.type !== 'bulk' || movePanelState.triggerRect.left >= 280)
              ? Math.max(16, Math.min(movePanelState.triggerRect.left, window.innerWidth - 376)) + 'px'
              : '10px'
          }}
          onClick={e => e.stopPropagation()}
        >
          {movePanelState.type === 'single' || movePanelState.type === 'bulk' ? (
            <>
              <div className="move-panel-title">{t.main.moveBulkAction}</div>
              <div style={{ maxHeight: '40vh', overflowY: 'auto' }} className="move-panel-scroll">
                <button className="move-folder-btn" style={{color: 'var(--panel-text)', fontSize: '13px', opacity: 1}} onClick={async (e) => { e.stopPropagation(); const isBulk = movePanelState.type === 'bulk'; await execBulkMove(isBulk ? Array.from(selectedFileMap.values()) : [currentFileObj!], null, null); closeMovePanels(); }}>
                  <FolderIcon /> {t.main.moveToRoot}
                </button>
                {physicalFolders.map(cat => {
                  const parts = cat.name.split('/');
                  const depth = parts.length - 1;
                  const shortName = parts[parts.length - 1];
                  const parentPath = depth > 0 ? parts.slice(0, -1).join(' / ') : null;

                  return (
                    <button 
                      key={cat.name} 
                      className={`move-folder-btn ${depth > 0 ? 'is-subfolder' : ''}`}
                      style={{ paddingLeft: `${depth * 14 + 12}px` }}
                      onClick={async (e) => { 
                        e.stopPropagation(); 
                        const isBulk = movePanelState.type === 'bulk'; 
                        await execBulkMove(isBulk ? Array.from(selectedFileMap.values()) : [currentFileObj!], cat.handle, cat.name); 
                        closeMovePanels(); 
                      }}
                      title={`移動先: ${cat.name}`}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        {depth > 0 && <span style={{ opacity: 0.45, fontSize: '11px', fontFamily: 'monospace' }}>└</span>}
                        <FolderIcon /> 
                        <span style={{ fontWeight: depth > 0 ? 500 : 700 }}>{shortName}</span>
                        {parentPath && (
                          <span style={{ fontSize: '10px', opacity: 0.5, marginLeft: '4px' }}>
                            ({parentPath})
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
                {physicalFolders.length === 0 && <div style={{padding:'12px',opacity:0.5,fontSize:'12px'}}>{t.main.noDestFolder}</div>}
              </div>
              <div className="move-panel-new">
                <input 
                  type="text" 
                  placeholder={t.main.newFolderName} 
                  value={newFolderName} 
                  onChange={e => setNewFolderName(e.target.value)} 
                  onKeyDown={async e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      const targetFolder = newFolderName.trim();
                      if (!targetFolder) return;
                      const isBulk = movePanelState.type === 'bulk';
                      await moveToNewFolder(targetFolder, isBulk); 
                      setNewFolderName(''); 
                      closeMovePanels(); 
                    }
                  }}
                />
                <button onClick={async e => { 
                  e.stopPropagation();
                  const targetFolder = newFolderName.trim();
                  if (!targetFolder) return;
                  const isBulk = movePanelState.type === 'bulk';
                  await moveToNewFolder(targetFolder, isBulk); 
                  setNewFolderName(''); 
                  closeMovePanels(); 
                }}>{t.main.createAndMove}</button>
              </div>
              <button className="move-panel-close" onClick={closeMovePanels}>{t.main.cancel}</button>
            </>
          ) : (
            <>
              <div className="move-panel-title">{t.main.folderEditTitle}</div>
              <div style={{ maxHeight: '40vh', overflowY: 'auto' }} className="move-panel-scroll">
                {physicalFolders.length === 0 ? (
                  <div className="folder-edit-empty">{t.main.noFolders}</div>
                ) : (
                  physicalFolders.map(cat => {
                    const parts = cat.name.split('/');
                    const depth = parts.length - 1;
                    const shortName = parts[parts.length - 1];
                    const parentPath = depth > 0 ? parts.slice(0, -1).join(' / ') : null;

                    return (
                      <div className="folder-edit-row" key={cat.name} style={{ paddingLeft: `${depth * 14 + 10}px` }}>
                        <div className="folder-edit-name" title={cat.name}>
                          {depth > 0 && <span style={{ opacity: 0.45, fontSize: '11px', fontFamily: 'monospace', marginRight: '4px' }}>└</span>}
                          <FolderIcon /> 
                          <span style={{ fontWeight: depth > 0 ? 500 : 700 }}>{shortName}</span>
                          {parentPath && <span style={{ fontSize: '10px', opacity: 0.5, marginLeft: '4px' }}>({parentPath})</span>}
                        </div>
                        <div className="folder-edit-actions">
                        <button 
                          className="folder-edit-action" 
                          title={t.main.rename} 
                          onClick={() => {
                            setFolderRenameTarget({ name: cat.name, handle: cat.handle });
                            setFolderRenameInputVal(cat.name);
                          }}
                        >
                          ✏️
                        </button>
                        <button 
                          className="folder-edit-action" 
                          title={t.main.delete} 
                          style={{color: 'rgba(255,100,100,0.85)'}} 
                          onClick={() => deleteFolder(cat.name, cat.handle)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              </div>
              <button className="move-panel-close" onClick={closeMovePanels}>{t.main.close}</button>
            </>
          )}
        </div>
      )}

      {/* ファイル名前変更モーダル */}
      {isRenameModalOpen && currentFileObj && (
        <div className="modal-backdrop" onClick={() => setIsRenameModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <EditIcon />
              <span>{t.main.rename}</span>
            </div>
            <div className="modal-body">
              <label className="modal-label">{t.main.renamePrompt}</label>
              <input
                type="text"
                className="modal-input"
                value={renameInputVal}
                onChange={e => setRenameInputVal(e.target.value)}
                autoFocus
                onKeyDown={async e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = renameInputVal.trim();
                    if (trimmed && trimmed !== currentFileObj.filename) {
                      await renameCurrentFile(trimmed);
                    }
                    setIsRenameModalOpen(false);
                  } else if (e.key === 'Escape') {
                    setIsRenameModalOpen(false);
                  }
                }}
              />
              <div className="modal-hint">
                {currentFileObj.filename}
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={() => setIsRenameModalOpen(false)}>
                {t.main.cancel}
              </button>
              <button
                className="modal-btn-primary"
                disabled={!renameInputVal.trim() || renameInputVal.trim() === currentFileObj.filename}
                onClick={async () => {
                  const trimmed = renameInputVal.trim();
                  if (trimmed && trimmed !== currentFileObj.filename) {
                    await renameCurrentFile(trimmed);
                  }
                  setIsRenameModalOpen(false);
                }}
              >
                {t.main.save || '変更'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フォルダー名前変更モーダル */}
      {folderRenameTarget && (
        <div className="modal-backdrop" onClick={() => setFolderRenameTarget(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <FolderIcon />
              <span>{t.main.rename}</span>
            </div>
            <div className="modal-body">
              <label className="modal-label">{t.main.renameFolderPrompt} {folderRenameTarget.name}</label>
              <input
                type="text"
                className="modal-input"
                value={folderRenameInputVal}
                onChange={e => setFolderRenameInputVal(e.target.value)}
                autoFocus
                onKeyDown={async e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = folderRenameInputVal.trim();
                    if (trimmed && trimmed !== folderRenameTarget.name) {
                      await renameFolder(folderRenameTarget.name, folderRenameTarget.handle, trimmed);
                    }
                    setFolderRenameTarget(null);
                  } else if (e.key === 'Escape') {
                    setFolderRenameTarget(null);
                  }
                }}
              />
            </div>
            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={() => setFolderRenameTarget(null)}>
                {t.main.cancel}
              </button>
              <button
                className="modal-btn-primary"
                disabled={!folderRenameInputVal.trim() || folderRenameInputVal.trim() === folderRenameTarget.name}
                onClick={async () => {
                  const trimmed = folderRenameInputVal.trim();
                  if (trimmed && trimmed !== folderRenameTarget.name) {
                    await renameFolder(folderRenameTarget.name, folderRenameTarget.handle, trimmed);
                  }
                  setFolderRenameTarget(null);
                }}
              >
                {t.main.save || '変更'}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentFileObj && (
        <div id="footer" style={{display: 'flex'}}>
          <span id="footer-left">{dirHandle ? dirHandle.name + ' / ' + allFiles.length + ' files' : ''}</span>
          <span id="footer-right">{(currentFileObj.date||'') + (currentFileObj.time?' '+currentFileObj.time:'')}</span>
        </div>
      )}

    </div>
  );
};
