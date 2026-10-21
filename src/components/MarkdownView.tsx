import React from 'react';
import { MarkdownBlock, parseMarkdown, formatInlineMarkdown } from '../markdownParser';

interface MarkdownViewProps {
  content: string;
  searchQueries: string[];
  writingMode: 'horizontal' | 'vertical';
  isPlayingAudio: boolean;
  onPlayFromLine?: (lineIndex: number) => void;
  onDoubleClickToEdit?: () => void;
  lang: 'en' | 'ja';
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  searchQueries,
  writingMode,
  isPlayingAudio,
  onPlayFromLine,
  onDoubleClickToEdit,
  lang
}) => {
  const blocks = React.useMemo(() => parseMarkdown(content), [content]);
  const isVertical = writingMode === 'vertical';
  const tooltipText = isPlayingAudio 
    ? (lang === 'en' ? 'Click to stop reading' : 'クリックして停止') 
    : (lang === 'en' ? 'Click to read' : 'クリックして読み上げ');

  // 全行の配列（読み上げインデックス用）
  const allLines = React.useMemo(() => (content ? content.split('\n') : []), [content]);

  let currentLineIndex = 0;

  return (
    <div
      className={`markdown-container ${isVertical ? 'vertical-mode' : 'horizontal-mode'}`}
      onDoubleClick={e => {
        // ボタンやリンクのダブルクリック以外で編集モードへ
        const target = e.target as HTMLElement;
        if (target.tagName.toLowerCase() !== 'a' && target.tagName.toLowerCase() !== 'button') {
          onDoubleClickToEdit?.();
        }
      }}
      title={lang === 'en' ? 'Double-click to edit' : 'ダブルクリックで編集モードに切り替え'}
    >
      {blocks.map((block, blockIndex) => {
        if (block.type === 'table') {
          const tableStartLine = currentLineIndex;
          currentLineIndex += block.rawLines.length;

          return (
            <div
              key={blockIndex}
              className={`table-responsive-wrapper ${isVertical ? 'vertical-table-wrapper' : ''}`}
            >
              <table
                className={`markdown-table ${isVertical ? 'vertical-table' : ''}`}
                style={{
                  borderCollapse: 'collapse',
                  border: '1.5px solid var(--card-border)',
                  background: 'var(--card-bg)',
                  fontSize: 'calc(var(--text-font-size, 15px) * 0.88)',
                  lineHeight: 'var(--text-line-height, 1.8)',
                  margin: isVertical ? '8px 18px' : 'calc(var(--msg-gap, 16px) * 1.1) 0',
                  color: 'var(--main-text)',
                  width: isVertical ? 'auto' : '100%',
                  minWidth: isVertical ? 'auto' : '300px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  borderRadius: '0px'
                }}
              >
                <thead>
                  <tr className="markdown-table-header-tr">
                    {block.headers.map((header, hIdx) => {
                      const align = block.alignments[hIdx] || 'left';
                      return (
                        <th
                          key={hIdx}
                          style={{
                            border: '1px solid var(--card-border)',
                            padding: isVertical ? '12px 16px' : '10px 16px',
                            textAlign: isVertical ? 'inherit' : align,
                            fontWeight: 700,
                            letterSpacing: 'var(--text-letter-spacing, 0px)',
                            whiteSpace: 'nowrap'
                          }}
                          dangerouslySetInnerHTML={{
                            __html: formatInlineMarkdown(header, searchQueries)
                          }}
                        />
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx % 2 === 1 ? 'markdown-table-row-alt' : 'markdown-table-row'}
                    >
                      {row.map((cell, cIdx) => {
                        const align = block.alignments[cIdx] || 'left';
                        return (
                          <td
                            key={cIdx}
                            style={{
                              border: '1px solid var(--card-border)',
                              padding: isVertical ? '11px 16px' : '9px 16px',
                              textAlign: isVertical ? 'inherit' : align,
                              letterSpacing: 'var(--text-letter-spacing, 0px)'
                            }}
                            dangerouslySetInnerHTML={{
                              __html: formatInlineMarkdown(cell, searchQueries)
                            }}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'heading') {
          const lineIdx = currentLineIndex++;
          const tag = `h${Math.min(block.level, 6)}`;
          // 見出しテキスト先頭に万が一残っている # 記号を徹底削除（"1. # " や "2. ## " にも完全対応）
          const cleanHeadingText = block.text
            .replace(/^(\d+[.・)][\s　]*)?(#{1,6})[\s　]*/, '$1')
            .replace(/^(#{1,6})[\s　]*/, '')
            .trim();

          const headingStyles: React.CSSProperties = {
            fontWeight: block.level === 1 ? 800 : block.level === 2 ? 700 : 600,
            lineHeight: 1.35,
            color: 'var(--heading-color, var(--main-text))',
            cursor: 'pointer',
            margin: isVertical
              ? (block.level === 1 ? '0 18px 0 12px' : block.level === 2 ? '0 14px 0 10px' : '0 10px 0 6px')
              : (block.level === 1 ? '20px 0 10px 0' : block.level === 2 ? '16px 0 8px 0' : '12px 0 6px 0'),
            padding: isVertical
              ? '0 4px'
              : (block.level === 1 ? '0 0 4px 0' : block.level === 2 ? '2px 0 2px 10px' : '2px 0'),
            borderBottom: !isVertical && block.level === 1 ? '2px solid var(--sb-accent, #3b82f6)' : 'none',
            borderLeft: !isVertical && block.level === 2 ? '3px solid var(--sb-accent, #3b82f6)' : 'none',
            borderRight: isVertical && block.level <= 2 ? '2px solid var(--sb-accent, #3b82f6)' : 'none',
            fontSize: isVertical
              ? (block.level === 1
                  ? 'calc(var(--text-font-size, 15px) * 1.30)'
                  : block.level === 2
                  ? 'calc(var(--text-font-size, 15px) * 1.18)'
                  : block.level === 3
                  ? 'calc(var(--text-font-size, 15px) * 1.08)'
                  : 'calc(var(--text-font-size, 15px) * 1.02)')
              : (block.level === 1
                  ? 'calc(var(--text-font-size, 15px) * 1.35)'
                  : block.level === 2
                  ? 'calc(var(--text-font-size, 15px) * 1.22)'
                  : block.level === 3
                  ? 'calc(var(--text-font-size, 15px) * 1.12)'
                  : 'calc(var(--text-font-size, 15px) * 1.05)'),
            letterSpacing: 'var(--text-letter-spacing, 0px)',
            fontFamily: 'var(--font-body)'
          };

          return React.createElement(tag, {
            key: blockIndex,
            className: `markdown-heading h${block.level}`,
            style: headingStyles,
            onClick: (e: React.MouseEvent) => {
              if (window.getSelection()?.toString().length) return;
              e.stopPropagation();
              onPlayFromLine?.(lineIdx);
            },
            title: tooltipText,
            dangerouslySetInnerHTML: {
              __html: formatInlineMarkdown(cleanHeadingText, searchQueries)
            }
          });
        }

        if (block.type === 'list') {
          const listStart = currentLineIndex;
          currentLineIndex += block.items.length;

          const ListTag = block.ordered ? 'ol' : 'ul';
          const listProps: React.OlHTMLAttributes<HTMLOListElement> & React.HTMLAttributes<HTMLUListElement> = {
            className: `markdown-list ${block.ordered ? 'ordered' : 'unordered'} ${
              isVertical ? 'vertical-list' : 'horizontal-list'
            }`,
            style: {
              margin: isVertical ? '0 10px' : '12px 0',
              padding: 0,
              paddingLeft: 0,
              paddingTop: 0,
              listStyle: 'none',
              listStyleType: 'none',
              lineHeight: 'var(--text-line-height, 1.8)',
              fontSize: 'var(--text-font-size, 15px)',
              fontFamily: 'var(--font-body)'
            }
          };

          if (block.ordered && block.start !== undefined) {
            listProps.start = block.start;
          }

          return (
            <ListTag
              key={blockIndex}
              {...listProps}
            >
              {block.items.map((item, idx) => {
                const itemLine = listStart + idx;
                const level = item.level || 0;

                // 1. リスト先頭の既存箇条書き記号を除去
                // ※「**太字**」のアスタリスクを誤って削らないよう、空白付きの箇条書き記号または中黒・数字リストのみを除去
                let cleanItemText = item.text
                  .replace(/^[・\u30FB•]\s*/, '')
                  .replace(/^\d+[.・)]\s*/, '')
                  .replace(/^[-+*]\s+/, '')
                  .trim();

                // 1.5 見出しやコロン前ラベル末尾の単独飾り「*」があればクリーンアップ（"定義*：" -> "定義："、"科学的探索*" -> "科学的探索"）
                // ※「**太字**」のペアは壊さずに保持する
                if (!cleanItemText.startsWith('**') || !cleanItemText.includes('**', 2)) {
                  cleanItemText = cleanItemText
                    .replace(/(\S)\*+([：:])/g, '$1$2')
                    .replace(/(\S)\*+$/g, '$1');
                }

                // 2. マーカーをテキスト先頭にインライン配置
                // これにより、縦書きでテキストが1段下がった際にも丸（・）が確実にテキストと一緒に下がり追従する
                let textToRender = cleanItemText;
                if (!block.ordered) {
                  // 無順序リスト：中黒「・」を先頭に付与
                  textToRender = `・${cleanItemText}`;
                } else {
                  // 順序付きリスト：番号を先頭に付与
                  const num = item.number !== undefined ? item.number : (idx + (block.start ?? 1));
                  textToRender = `${num}. ${cleanItemText}`;
                }

                // 階層レベル（level 0: 親大項目, level 1: 子項目（1段下げ）, level 2: 孫項目）に応じたインデントオフセット
                const itemStyles: React.CSSProperties = {
                  listStyle: 'none',
                  listStyleType: 'none',
                  marginBottom: isVertical ? '0' : (level === 0 ? '6px' : '4px'),
                  marginLeft: isVertical ? '0' : (level === 0 ? '0' : `${level * 22}px`),
                  paddingTop: isVertical ? (level === 0 ? '4px' : `${level * 28}px`) : '2px',
                  paddingLeft: isVertical ? '0' : '2px',
                  cursor: 'pointer',
                  borderRadius: '0px',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 400, // 重要：li全体を太字にしない！見出しやコロン前ラベル（「定義：」等）のみformatInlineMarkdownで太字化
                  fontSize: 'var(--text-font-size, 15px)'
                };

                return (
                  <li
                    key={idx}
                    value={item.number}
                    className={`markdown-list-item level-${level}`}
                    style={itemStyles}
                    onClick={(e) => {
                      if (window.getSelection()?.toString().length) return;
                      e.stopPropagation();
                      onPlayFromLine?.(itemLine);
                    }}
                    title={tooltipText}
                    dangerouslySetInnerHTML={{
                      __html: formatInlineMarkdown(textToRender, searchQueries)
                    }}
                  />
                );
              })}
            </ListTag>
          );
        }

        if (block.type === 'hr') {
          currentLineIndex++;
          return (
            <hr
              key={blockIndex}
              className="markdown-hr"
              style={{
                border: 'none',
                borderTop: isVertical ? 'none' : '1px solid var(--card-border)',
                borderRight: isVertical ? '1px solid var(--card-border)' : 'none',
                margin: isVertical ? '0 20px' : '20px 0',
                height: isVertical ? '100%' : '1px',
                opacity: 0.8
              }}
            />
          );
        }

        if (block.type === 'quote') {
          const lineIdx = currentLineIndex++;
          const cleanQuoteText = block.text.replace(/^>[\s　]?/, '').trim();
          return (
            <blockquote
              key={blockIndex}
              className="markdown-quote"
              style={{
                margin: isVertical ? '0 18px' : 'calc(var(--msg-gap, 16px) * 0.85) 0',
                padding: isVertical ? '10px 14px 10px 6px' : '8px 18px',
                borderLeft: isVertical ? 'none' : '4px solid var(--sb-accent, #3b82f6)',
                borderTop: isVertical ? '4px solid var(--sb-accent, #3b82f6)' : 'none',
                background: 'var(--quote-bg, var(--sb-item-hover))',
                borderRadius: '0px',
                color: 'var(--main-text)',
                opacity: 0.95,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)'
              }}
              onClick={(e) => {
                if (window.getSelection()?.toString().length) return;
                e.stopPropagation();
                onPlayFromLine?.(lineIdx);
              }}
              title={tooltipText}
              dangerouslySetInnerHTML={{
                __html: formatInlineMarkdown(cleanQuoteText, searchQueries)
              }}
            />
          );
        }

        // paragraph
        const line = block.lines[0];
        const lineIdx = currentLineIndex++;

        if (!line) {
          return (
            <div
              key={blockIndex}
              className="markdown-empty-line"
              style={{
                height: isVertical ? 'auto' : 'calc(var(--msg-gap, 16px) * 0.9)',
                width: isVertical ? 'calc(var(--msg-gap, 16px) * 0.9)' : 'auto',
                minHeight: isVertical ? 'auto' : '8px',
                minWidth: isVertical ? '8px' : 'auto',
                display: 'block'
              }}
            />
          );
        }

        // 段落行で万が一残っている先頭の見出し記号 (#) や箇条書き記号 (-, *, +) を二重保護トリム（中黒・は保持）
        let cleanParagraphLine = line
          .replace(/^(#{1,6})[\s　]*/, '')
          .replace(/^([\-+])[\s　]*/, '')
          .replace(/(\S)\*+([：:])/g, '$1$2')
          .replace(/^([・*-]\s*[^：:\n<*]{1,20})\*+\s*$/g, '$1');

        return (
          <span
            key={blockIndex}
            className="markdown-line"
            onClick={(e) => {
              if (window.getSelection()?.toString().length) return;
              e.stopPropagation();
              onPlayFromLine?.(lineIdx);
            }}
            style={{
              cursor: 'pointer',
              display: isVertical ? 'inline-block' : 'block',
              transition: 'background 0.2s',
              borderRadius: '0px',
              margin: isVertical ? '0 0' : '0 -4px',
              padding: isVertical ? '2px 0' : '0 4px',
              lineHeight: 'var(--text-line-height, 1.8)',
              fontSize: 'var(--text-font-size, 15px)',
              fontFamily: 'var(--font-body)'
            }}
            title={tooltipText}
            dangerouslySetInnerHTML={{
              __html: formatInlineMarkdown(cleanParagraphLine, searchQueries)
            }}
          />
        );
      })}
    </div>
  );
};
