import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { EditIcon, SaveIcon, MoveIcon, FolderIcon, SpeakerIcon, ReadIcon, DeleteIcon, ArrowUpIcon } from './Icons';
import { extractFirstSentence, highlightText, highlightTextSafe, linkifyUrls, escHtml, decorateMarkers, getVirtualFolder } from '../utils';
import { applySettingsToDOM } from '../settingsSync';

export const MainContent = () => {
  const {
    dirHandle, savedFolderName, allFiles, filteredFiles, searchQueries,
    currentFileObj, currentContent, isEditing, toggleEdit, saveFile, selectFile,
    openMovePanel, deleteCurrentFile, renameCurrentFile, toggleFileMarker,
    movePanelState, closeMovePanels, physicalFolders, execBulkMove, moveToNewFolder,
    renameFolder, deleteFolder, selectedFiles, selectedFileMap,
    lang, t, speakerModeEnabled, ttsSettings, voices, writingMode, setWritingMode,
    reopenFolder, loading
  } = useAppContext();

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;

    const handleScroll = () => {
      if (contentArea.scrollTop > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    contentArea.addEventListener('scroll', handleScroll);
    return () => contentArea.removeEventListener('scroll', handleScroll);
  }, [currentFileObj, isEditing]);

  const scrollToTop = () => {
    const contentArea = document.getElementById('content-area');
    if (contentArea) {
      contentArea.scrollTo({ top: 0, behavior: 'instant' });
    }
  };


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

  const [showToolbarMarkPanel, setShowToolbarMarkPanel] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowToolbarMarkPanel(false);
      }
    };
    if (showToolbarMarkPanel) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showToolbarMarkPanel]);

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
                              if (window.getSelection()?.toString().trim()) return;
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
                        if (window.getSelection()?.toString().trim()) return;
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
                        if (window.getSelection()?.toString().trim()) return;
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
                if (window.getSelection()?.toString().trim()) return;
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
          {loading ? (
            <>
              <div id="welcome-big">{t.main.selectFolderArchive}</div>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span className="spin" style={{ display: 'inline-block' }}>🔄</span>
                <span>{lang === 'en' ? 'LOADING FOLDER...' : 'フォルダーを読み込み中です...'}</span>
              </p>
            </>
          ) : (!dirHandle && savedFolderName) ? (
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
              {currentFileObj && !isSystemFile(currentFileObj.filename) && (() => {
                let activeMarker = "☆";
                let hasAnyMarker = false;
                const MARKERS = ["★", "✔", "💡", "📌", "⚠️"];
                const OLD_MARKERS = ["●", "■", "▲", "▼", "◆", "★", "☆", "✓"];
                const filename = currentFileObj.filename;
                let baseName = filename;
                const prefixMatch = filename.match(/^(\d{8}_\d{4}_(?:-\s*)?)/);
                if (prefixMatch) {
                  baseName = filename.slice(prefixMatch[1].length);
                }

                // 拡張子とベース名を分離してカッコ判定を行う
                let dotIdx = baseName.lastIndexOf('.');
                let nameWithoutExt = dotIdx !== -1 ? baseName.slice(0, dotIdx) : baseName;
                let bracketInnerName = nameWithoutExt;
                if ((nameWithoutExt.startsWith("「") && nameWithoutExt.endsWith("」")) || (nameWithoutExt.startsWith("『") && nameWithoutExt.endsWith("』"))) {
                  bracketInnerName = nameWithoutExt.slice(1, -1);
                }

                // 新マークの検出
                for (const m of MARKERS) {
                  if (bracketInnerName.startsWith(m)) {
                    activeMarker = m;
                    hasAnyMarker = true;
                    break;
                  }
                }

                // 旧マークの検出
                if (!hasAnyMarker) {
                  for (const m of OLD_MARKERS) {
                    if (bracketInnerName.startsWith(m)) {
                      hasAnyMarker = true; // システム上で「マークあり」として認識させ、解除(❌)や別マークへの置き換えを可能にする
                      break;
                    }
                  }
                }

                // 手動マーク制限: 先頭(日付直後またはカッコ内先頭)にマークがないが、タイトル内にマークがある場合は編集不可（非表示）とする
                if (!hasAnyMarker) {
                  const hasEmbeddedMarker = [...MARKERS, ...OLD_MARKERS].some(m => bracketInnerName.includes(m));
                  if (hasEmbeddedMarker) {
                    return null;
                  }
                }

                return (
                  <div 
                    ref={dropdownRef}
                    className="file-markers-dropdown-wrap" 
                    style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                  >
                    <button
                      id="toolbar-mark-trigger"
                      style={(() => {
                        const isStarType = activeMarker === '★' || activeMarker === '☆';
                        let btnBg = 'var(--btn-bg)';
                        let btnColor = 'var(--btn-text)';
                        let btnBorder = '1px solid var(--btn-border)';
                        
                        if (hasAnyMarker) {
                          if (activeMarker === '✔') {
                            btnBg = 'rgba(16, 185, 129, 0.12)';
                            btnColor = '#10b981';
                            btnBorder = '1px solid rgba(16, 185, 129, 0.4)';
                          } else if (activeMarker === '⚠️') {
                            btnBg = 'rgba(239, 68, 68, 0.12)';
                            btnColor = '#ef4444';
                            btnBorder = '1px solid rgba(239, 68, 68, 0.4)';
                          } else if (activeMarker === '★') {
                            // 通常の星（★）が選択されている時のみ、黄色の背景・枠線・文字を適用
                            btnBg = 'rgba(251, 191, 36, 0.12)';
                            btnColor = '#fbbf24';
                            btnBorder = '1px solid rgba(251, 191, 36, 0.4)';
                          } else {
                            btnBg = 'rgba(255, 255, 255, 0.08)';
                            btnColor = 'var(--text)';
                            btnBorder = '1px solid var(--btn-border)';
                          }
                        } else if (activeMarker === '☆') {
                          // デフォルトの☆の時は黄色を入れず、他の通常ボタンと同じ白抜きスタイルにする
                          btnBg = 'var(--btn-bg)';
                          btnColor = 'var(--btn-text)';
                          btnBorder = '1px solid var(--btn-border)';
                        }

                        return {
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 18px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          letterSpacing: '1.5px',
                          cursor: 'pointer',
                          border: btnBorder,
                          background: btnBg,
                          color: btnColor,
                          fontFamily: 'var(--font-body)',
                          transition: 'all 0.12s'
                        };
                      })()}
                      onClick={() => setShowToolbarMarkPanel(!showToolbarMarkPanel)}
                      title={lang === 'en' ? 'Toggle Marker' : 'マークを切り替え'}
                    >
                      <span style={{ 
                        fontSize: '13px', 
                        color: (activeMarker === '★' || activeMarker === '☆') ? '#fbbf24' : 'inherit'
                      }}>{activeMarker}</span>
                      {lang === 'en' ? 'MARK' : 'マーク'}
                    </button>
                    
                    {showToolbarMarkPanel && (
                      <div 
                        className="toolbar-mark-panel" 
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          right: 0,
                          background: 'var(--panel-bg)',
                          border: '1px solid var(--btn-border)',
                          borderRadius: '8px',
                          padding: '4px 6px',
                          display: 'flex',
                          gap: '4px',
                          zIndex: 100,
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                          alignItems: 'center'
                        }}
                      >
                        {["★", "✔", "💡", "📌", "⚠️", "❌"].map(marker => {
                          const isCurrent = marker === '❌' ? !hasAnyMarker : (activeMarker === marker);
                          let activeBg = 'rgba(251, 191, 36, 0.2)';
                          let activeBorder = 'rgba(251, 191, 36, 0.4)';
                          if (marker === '✔') {
                            activeBg = 'rgba(16, 185, 129, 0.2)';
                            activeBorder = 'rgba(16, 185, 129, 0.4)';
                          } else if (marker === '⚠️') {
                            activeBg = 'rgba(239, 68, 68, 0.2)';
                            activeBorder = 'rgba(239, 68, 68, 0.4)';
                          } else if (marker === '❌') {
                            activeBg = 'rgba(239, 68, 68, 0.15)';
                            activeBorder = 'rgba(239, 68, 68, 0.3)';
                          }

                          return (
                            <React.Fragment key={marker}>
                              {marker === '❌' && (
                                <div style={{ 
                                  width: '1px', 
                                  height: '16px', 
                                  background: 'var(--btn-border)', 
                                  margin: '0 4px',
                                  alignSelf: 'center'
                                }} />
                              )}
                              <button
                                style={{
                                  background: isCurrent ? activeBg : 'transparent',
                                  border: isCurrent ? `1px solid ${activeBorder}` : '1px solid transparent',
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  color: marker === '★' ? '#fbbf24' : 'var(--text)',
                                  transition: 'background 0.1s'
                                }}
                                onClick={() => {
                                  toggleFileMarker(marker);
                                  setShowToolbarMarkPanel(false);
                                }}
                                title={marker === '❌' ? (lang === 'en' ? 'Remove Marker' : 'マークを解除') : `${marker}`}
                                onMouseEnter={e => {
                                  if (!isCurrent) e.currentTarget.style.background = 'var(--btn-hover)';
                                }}
                                onMouseLeave={e => {
                                  if (!isCurrent) e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                {marker}
                              </button>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

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
                   <FolderIcon /> {(() => {
                     const cat = currentFileObj.category || dirHandle?.name || "";
                     if (cat.toUpperCase().includes("00_AIエージェント専用")) {
                       const vFolder = getVirtualFolder(currentFileObj.filename, currentFileObj.date);
                       const cleanVFolder = vFolder.replace(/^00_/, "");
                       return `${cat} / ${cleanVFolder}`;
                     }
                     return cat;
                   })()}
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

      {showScrollTop && writingMode !== 'vertical' && !isEditing && (
        <button 
          id="scroll-to-top-btn"
          onClick={scrollToTop}
          title={lang === 'en' ? 'Back to top' : '一番上に戻る'}
          style={{
            position: 'fixed',
            bottom: '60px',
            right: '40px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: '#ffffff',
            color: '#1a1a1a',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 150,
            transition: 'all 0.2s ease-in-out',
            outline: 'none'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.08)';
          }}
        >
          <ArrowUpIcon />
        </button>
      )}

    </div>
  );
};

