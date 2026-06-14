import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { EditIcon, SaveIcon, MoveIcon, FolderIcon, SpeakerIcon, ReadIcon, DeleteIcon } from './Icons';
import { extractFirstSentence, highlightText, highlightTextSafe, linkifyUrls, escHtml, decorateMarkers } from '../utils';
import { applySettingsToDOM } from '../settingsSync';

export const MainContent = () => {
  const {
    dirHandle, savedFolderName, allFiles, filteredFiles, searchQueries,
    currentFileObj, currentContent, isEditing, toggleEdit, saveFile, selectFile,
    openMovePanel, deleteCurrentFile, renameCurrentFile, toggleFileMarker,
    movePanelState, closeMovePanels, physicalFolders, execBulkMove, moveToNewFolder,
    renameFolder, deleteFolder, selectedFiles, selectedFileMap,
    lang, t, speakerModeEnabled, ttsSettings, voices, writingMode, setWritingMode,
    reopenFolder
  } = useAppContext();

  const isSystemFile = (filename: string) => {
    const ln = filename.toLowerCase();
    // マーク付きのファイル名も考慮する
    const MARKERS = ["★", "☆", "✔", "💡", "📌", "⚠️"];
    let baseName = ln;
    for (const m of MARKERS) {
      if (baseName.startsWith(m.toLowerCase())) {
        baseName = baseName.slice(m.length).trim();
        break;
      }
    }
    // 日付プレフィックスを取り除く
    const prefixMatch = baseName.match(/^(\d{8}_\d{4}_)/);
    if (prefixMatch) {
      baseName = baseName.slice(prefixMatch[1].length);
    }

    return baseName === 'agents.md' || baseName.startsWith('00_【進行】_') || baseName.startsWith('00-');
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollAnimationFrameRef = useRef<number | null>(null);

  const startScrolling = (direction: 'left' | 'right') => {
    if (scrollAnimationFrameRef.current) return;
    const speed = direction === 'left' ? -10 : 10;
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

  useEffect(() => {
    return () => {
      if (scrollAnimationFrameRef.current) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleWheelEvent = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft -= e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheelEvent);
    };
  });

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

  const [isPaperMode, setIsPaperMode] = useState(false);

  useEffect(() => {
    if (isPaperMode) {
      document.body.classList.add('paper-mode-active');
    } else {
      document.body.classList.remove('paper-mode-active');
    }
    return () => {
      document.body.classList.remove('paper-mode-active');
    };
  }, [isPaperMode]);

  const currentIndex = currentFileObj && filteredFiles ? filteredFiles.findIndex(f => f.filename === currentFileObj.filename && f.category === currentFileObj.category) : -1;
  const hasPrev = currentIndex !== -1 && currentIndex < filteredFiles.length - 1; // older file exists (past)
  const hasNext = currentIndex > 0; // newer file exists (future)

  const handlePrev = () => {
    if (hasPrev) selectFile(filteredFiles[currentIndex + 1]); // older file (past)
  };
  const handleNext = () => {
    if (hasNext) selectFile(filteredFiles[currentIndex - 1]); // newer file (future)
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;
      if (e.target instanceof HTMLElement) {
        const tagName = e.target.tagName.toLowerCase();
        if (tagName !== "textarea" && tagName !== "input") {
          if (e.key === "k" && hasNext) {
            e.preventDefault();
            handleNext();
          }
          if (e.key === "j" && hasPrev) {
            e.preventDefault();
            handlePrev();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, hasPrev, hasNext, currentIndex, filteredFiles]);

  useEffect(() => {
    applySettingsToDOM();

    if (writingMode === 'vertical' && !isEditing) {
      const contentAreaEl = document.getElementById('content-area');
      if (contentAreaEl) {
        contentAreaEl.scrollTop = 0;
        contentAreaEl.scrollLeft = 0;
      }
    }
  }, [writingMode, currentFileObj, isEditing, speakerModeEnabled]);


  const playFromIndex = (texts: string[], startIndex: number) => {
    window.speechSynthesis.cancel();
    for (let i = startIndex; i < texts.length; i++) {
      if (!texts[i].trim()) continue;
      const u = new SpeechSynthesisUtterance(texts[i]);
      const v = voices.find(v => v.voiceURI === ttsSettings.voiceURI);
      if (v) u.voice = v;
      u.rate = ttsSettings.rate;
      u.volume = ttsSettings.volume;
      u.pitch = ttsSettings.pitch;
      window.speechSynthesis.speak(u);
    }
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
            <button 
              className="scroll-arrow-btn left-arrow" 
              onMouseDown={() => startScrolling('left')}
              onMouseUp={stopScrolling}
              onMouseLeave={stopScrolling}
              onTouchStart={() => startScrolling('left')}
              onTouchEnd={stopScrolling}
              title="左へスクロール"
            >
              &lt;
            </button>
            <div className="vertical-scroll-content" ref={scrollContainerRef}>
              <div id="messages" className="vertical-messages">
                {msgs.map((m, i) => (
                  <div className="vertical-msg-block" key={i}>
                    {m.speaker !== '—' && (
                      <div className="vertical-msg-speaker">
                        <SpeakerIcon /> {escHtml(m.speaker)}
                      </div>
                    )}
                    <div className="vertical-msg-body">
                      {m.text.split('\n').map((l, j) => {
                        const currentIndex = globalLineIndex++;
                        return l ? (
                          <p 
                            key={j} 
                            onClick={() => {
                              if (isPlayingAudio) {
                                window.speechSynthesis.cancel();
                                setIsPlayingAudio(false);
                              } else {
                                playFromIndex(allLines, currentIndex);
                                setIsPlayingAudio(true);
                              }
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--sb-item-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            style={{ cursor: 'pointer', transition: 'background 0.2s', borderRadius: '4px', margin: '-4px 0', padding: '4px 0' }}
                            dangerouslySetInnerHTML={{__html: highlightTextSafe(linkifyUrls(l), searchQueries)}}
                            title={lang === 'en' ? 'Click to read from here' : 'クリックしてここから読み上げ'}
                          />
                        ) : <p key={j} style={{width: '12px'}} />;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button 
              className="scroll-arrow-btn right-arrow" 
              onMouseDown={() => startScrolling('right')}
              onMouseUp={stopScrolling}
              onMouseLeave={stopScrolling}
              onTouchStart={() => startScrolling('right')}
              onTouchEnd={stopScrolling}
              title="右へスクロール"
            >
              &gt;
            </button>
          </div>
        );
      }

      return (
        <div id="messages" style={{display: 'flex'}}>
          {msgs.map((m, i) => (
            <div className="msg-block" key={i}>
              {m.speaker !== '—' && (
                <div className="msg-speaker">
                  <SpeakerIcon /> {escHtml(m.speaker)}
                </div>
              )}
              <div className="msg-body">
                {m.text.split('\n').map((l, j) => {
                  const currentIndex = globalLineIndex++;
                  return l ? (
                    <p 
                      key={j} 
                      onClick={() => {
                        if (isPlayingAudio) {
                          window.speechSynthesis.cancel();
                          setIsPlayingAudio(false);
                        } else {
                          playFromIndex(allLines, currentIndex);
                          setIsPlayingAudio(true);
                        }
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--sb-item-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      style={{ cursor: 'pointer', transition: 'background 0.2s', borderRadius: '4px', margin: '0 -4px', padding: '0 4px' }}
                      dangerouslySetInnerHTML={{__html: highlightTextSafe(linkifyUrls(l), searchQueries)}}
                      title={lang === 'en' ? 'Click to read from here' : 'クリックしてここから読み上げ'}
                    />
                  ) : <p key={j} style={{height: '8px'}} />;
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    const lines = currentContent ? currentContent.split('\n') : [];
    if (writingMode === 'vertical') {
      return (
        <div className="vertical-card-fixed">
          <div className="vertical-scroll-wrapper">
            <button 
              className="scroll-arrow-btn left-arrow" 
              onMouseDown={() => startScrolling('left')}
              onMouseUp={stopScrolling}
              onMouseLeave={stopScrolling}
              onTouchStart={() => startScrolling('left')}
              onTouchEnd={stopScrolling}
              title="左へスクロール"
            >
              &lt;
            </button>
            <div className="vertical-scroll-content" ref={scrollContainerRef} style={{ padding: '0 2px' }}>
              <div className="vertical-writing-text-inner">
                {lines.length > 0 ? lines.map((l, i) => {
                  return l ? (
                    <span 
                      key={i} 
                      onClick={() => {
                        if (isPlayingAudio) {
                          window.speechSynthesis.cancel();
                          setIsPlayingAudio(false);
                        } else {
                          playFromIndex(lines, i);
                          setIsPlayingAudio(true);
                        }
                      }}
                      style={{ cursor: 'pointer', transition: 'background 0.2s', borderRadius: '4px', margin: '-4px 0', padding: '4px 0' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--sb-item-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      title={lang === 'en' ? 'Click to read' : 'クリックして読み上げ'}
                      dangerouslySetInnerHTML={{__html: highlightTextSafe(linkifyUrls(l), searchQueries)}} 
                    />
                  ) : <div key={i} style={{width: '1.8em', display: 'block'}}></div>;
                }) : (lang === 'en' ? '(No Content)' : '（内容なし）')}
              </div>
            </div>
            <button 
              className="scroll-arrow-btn right-arrow" 
              onMouseDown={() => startScrolling('right')}
              onMouseUp={stopScrolling}
              onMouseLeave={stopScrolling}
              onTouchStart={() => startScrolling('right')}
              onTouchEnd={stopScrolling}
              title="右へスクロール"
            >
              &gt;
            </button>
          </div>
        </div>
      );
    }

    return (
      <div id="plain-text" style={{display: 'block'}}>
        {lines.length > 0 ? lines.map((l, i) => {
          return l ? (
            <span 
              key={i} 
              onClick={() => {
                if (isPlayingAudio) {
                  window.speechSynthesis.cancel();
                  setIsPlayingAudio(false);
                } else {
                  playFromIndex(lines, i);
                  setIsPlayingAudio(true);
                }
              }}
              style={{ cursor: 'pointer', display: 'block', transition: 'background 0.2s', borderRadius: '4px', margin: '0 -4px', padding: '0 4px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--sb-item-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title={lang === 'en' ? 'Click to read' : 'クリックして読み上げ'}
              dangerouslySetInnerHTML={{__html: highlightTextSafe(linkifyUrls(l), searchQueries)}} 
            />
          ) : <div key={i} style={{height: '1.8em'}}></div>;
        }) : (lang === 'en' ? '(No Content)' : '（内容なし）')}
      </div>
    );
  };

  const getHeadingHTML = () => {
    if (!currentFileObj) return '';
    const firstSentence = extractFirstSentence(currentContent);
    const displayTitle = (firstSentence && firstSentence.length > 2) ? firstSentence : currentFileObj.title;
    return decorateMarkers(highlightText(displayTitle, searchQueries));
  };

  const [newFolderName, setNewFolderName] = useState('');

  return (
    <div id="main" className={writingMode === 'vertical' && !isEditing ? "vertical-mode-active" : ""} onClick={closeMovePanels}>
      
      {!currentFileObj && (
        <div id="welcome">
          {(!dirHandle && savedFolderName) ? (
            <>
              <div id="welcome-big" style={{ fontSize: '28px', color: 'var(--sb-accent)' }}>📂 {lang === 'en' ? 'Previous Folder Detected' : '前回のフォルダが記憶されています'}</div>
              <p style={{ margin: '12px 0 24px 0', opacity: 0.8 }}>
                {lang === 'en' 
                  ? `To view and edit logs in "${savedFolderName}", please reconnect to grant folder access.`
                  : `前回のフォルダ「${savedFolderName}」のログを表示・編集するには、再接続してアクセス権を許可してください。`}
              </p>
              <button 
                onClick={reopenFolder}
                style={{
                  background: 'var(--sb-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 28px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  margin: '20px auto',
                  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <FolderIcon />
                <span>{lang === 'en' ? `Reconnect to "${savedFolderName}"` : `「${savedFolderName}」に再接続する`}</span>
              </button>
            </>
          ) : (
            <>
              <div id="welcome-big">{t.main.selectFolderArchive}</div>
              <p>{t.main.selectFolderDesc}</p>
            </>
          )}
        </div>
      )}

      {currentFileObj && (
        <div id="content-area" key={writingMode}>
          <div id="bg-date">{currentFileObj.date ? currentFileObj.date.slice(5).replace('-','.') : ''}</div>
          <div id="content-inner">
            <div id="file-meta">{currentFileObj.filename}</div>
            <div id="file-heading" dangerouslySetInnerHTML={{__html: getHeadingHTML()}} />

            <div id="toolbar">
              <button className="tool-btn primary" onClick={isEditing ? () => saveFile(editValue) : toggleEdit}>
                {isEditing ? <><SaveIcon /> {t.main.save}</> : <><EditIcon /> {t.main.edit}</>}
              </button>
              {isEditing && (
                <button className="tool-btn" onClick={toggleEdit}>
                  <ReadIcon /> {t.main.read}
                </button>
              )}
              {!isEditing && (
                <div className="layout-toggle-group">
                  <button
                    className={`layout-toggle-btn ${writingMode === 'horizontal' ? 'active' : ''}`}
                    onClick={() => setWritingMode('horizontal')}
                  >
                    HORIZ
                  </button>
                  <button
                    className={`layout-toggle-btn ${writingMode === 'vertical' ? 'active' : ''}`}
                    onClick={() => setWritingMode('vertical')}
                  >
                    VERT
                  </button>
                </div>
              )}
              {!isEditing && (
                <>
                  <button
                    className="tool-btn"
                    onClick={() => setIsPaperMode(!isPaperMode)}
                    title="ペーパーモード"
                    style={{
                      background: isPaperMode ? '#e6dac8' : 'var(--btn-bg)',
                      color: isPaperMode ? '#1a1a1a' : 'var(--btn-text)',
                      borderColor: isPaperMode ? '#bcaaa4' : 'var(--btn-border)',
                    }}
                  >
                    PAPER / {isPaperMode ? "ON" : "OFF"}
                  </button>
                  <button
                    className="tool-btn"
                    onClick={handlePrev}
                    disabled={!hasPrev}
                    title="古いファイルへ（過去） (j)"
                  >
                    PREV
                  </button>
                  <button
                    className="tool-btn"
                    onClick={handleNext}
                    disabled={!hasNext}
                    title="新しいファイルへ（未来） (k)"
                  >
                    NEXT
                  </button>
                </>
              )}
              <button id="move-btn" style={{display:'flex'}} onClick={e => openMovePanel(e, 'single')}>
                <MoveIcon /> {t.main.moveTo}
              </button>
              <button id="folder-edit-btn" style={{display:'flex'}} onClick={e => openMovePanel(e, 'folder')}>
                <FolderIcon /> {t.main.folderEdit}
              </button>
              {/* マーカークイック追加ボタン */}
              {currentFileObj && !isSystemFile(currentFileObj.filename) && (
                <div className="file-markers-quick-bar" style={{ display: 'flex', gap: '4px', alignItems: 'center', background: 'rgba(15,23,42,0.4)', padding: '2px 6px', borderRadius: '10px', border: '1px solid var(--btn-border)' }}>
                  {["★", "☆", "✔", "💡", "📌", "⚠️"].map(marker => {
                    let hasMarker = false;
                    const filename = currentFileObj.filename;
                    let baseName = filename;
                    const prefixMatch = filename.match(/^(\d{8}_\d{4}_)/);
                    if (prefixMatch) {
                      baseName = filename.slice(prefixMatch[1].length);
                    }
                    hasMarker = baseName.startsWith(marker);

                    let activeBg = 'rgba(251, 191, 36, 0.25)'; // 黄色
                    let activeBorder = 'rgba(251, 191, 36, 0.5)';
                    if (marker === '✔') {
                      activeBg = 'rgba(16, 185, 129, 0.25)'; // 緑
                      activeBorder = 'rgba(16, 185, 129, 0.5)';
                    } else if (marker === '⚠️') {
                      activeBg = 'rgba(239, 68, 68, 0.25)'; // 赤
                      activeBorder = 'rgba(239, 68, 68, 0.5)';
                    }

                    return (
                      <button
                        key={marker}
                        className={`marker-quick-btn ${hasMarker ? 'active' : ''}`}
                        style={{
                          background: hasMarker ? activeBg : 'transparent',
                          border: hasMarker ? `1px solid ${activeBorder}` : '1px solid transparent',
                          cursor: 'pointer',
                          padding: '3px 7px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text)'
                        }}
                        onClick={() => toggleFileMarker(marker)}
                        title={`${marker} ${lang === 'en' ? 'Toggle Marker' : 'マークをトグル'}`}
                        onMouseEnter={e => {
                          if (!hasMarker) e.currentTarget.style.background = 'var(--btn-hover)';
                        }}
                        onMouseLeave={e => {
                          if (!hasMarker) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {marker}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentFileObj && !isSystemFile(currentFileObj.filename) && (
                <button id="rename-file-btn" style={{display:'flex'}} onClick={() => renameCurrentFile()}>
                  <EditIcon /> {t.main.rename}
                </button>
              )}
              <button id="play-audio-btn" style={{display:'flex', minWidth: '94px', justifyContent: 'center'}} onClick={() => {
                if (isPlayingAudio) {
                  window.speechSynthesis.cancel();
                  setIsPlayingAudio(false);
                } else {
                  const lines = currentContent ? currentContent.split('\n') : [];
                  playFromIndex(lines, 0);
                  setIsPlayingAudio(true);
                }
              }}>
                {isPlayingAudio ? (lang === 'en' ? '■ Stop\u00A0\u00A0' : '■ 停止') : `▶ ${t.settings.audioOpen}`}
              </button>
              <button id="delete-file-btn" style={{display:'flex'}} onClick={deleteCurrentFile}>
                <DeleteIcon /> {t.main.delete}
              </button>
              
              {(currentFileObj.category || dirHandle) && (
                 <div id="location-badge" style={{display: 'flex'}}>
                   <FolderIcon /> {currentFileObj.category || dirHandle?.name}
                   {!currentFileObj.category && <span style={{opacity:0.5,fontWeight:'normal',fontSize:'10px'}}> {t.main.rootPath}</span>}
                 </div>
              )}
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
      )}

      {/* Panels rendering conditionally based on movePanelState */}
      {movePanelState && movePanelState.isOpen && (
        <div 
          className="open-panel"
          style={{
            position: 'fixed', zIndex: 200, 
            background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', 
            borderRadius: '14px', padding: 0, boxShadow: '0 12px 48px rgba(0,0,0,0.55)', minWidth: '260px', overflow: 'hidden',
            top: movePanelState.type === 'bulk' ? 'auto' : Math.max(10, Math.min(movePanelState.triggerRect.bottom + 5, window.innerHeight - 320)) + 'px',
            bottom: movePanelState.type === 'bulk' ? '70px' : 'auto',
            left: movePanelState.type === 'bulk' ? Math.max(10, Math.min(movePanelState.triggerRect.left, window.innerWidth - 280)) + 'px' : Math.max(10, Math.min(movePanelState.triggerRect.right + 10, window.innerWidth - 280)) + 'px'
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
                {physicalFolders.map(cat => (
                  <button key={cat.name} className="move-folder-btn" onClick={async (e) => { e.stopPropagation(); const isBulk = movePanelState.type === 'bulk'; await execBulkMove(isBulk ? Array.from(selectedFileMap.values()) : [currentFileObj!], cat.handle, cat.name); closeMovePanels(); }}>
                    <FolderIcon /> {cat.name}
                  </button>
                ))}
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
                  physicalFolders.map(cat => (
                    <div className="folder-edit-row" key={cat.name}>
                      <div className="folder-edit-name"><FolderIcon /> {cat.name}</div>
                      <button className="folder-edit-action" title={t.main.rename} onClick={() => renameFolder(cat.name, cat.handle)}>✏️</button>
                      <button className="folder-edit-action" title={t.main.delete} style={{color: 'rgba(255,100,100,0.7)'}} onClick={() => deleteFolder(cat.name, cat.handle)}>🗑️</button>
                    </div>
                  ))
                )}
              </div>
              <button className="move-panel-close" onClick={closeMovePanels}>{t.main.close}</button>
            </>
          )}
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
