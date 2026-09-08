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
                  margin: isVertical ? '8px 18px' : '18px 0',
                  color: 'var(--main-text)',
                  width: isVertical ? 'auto' : '100%',
                  minWidth: isVertical ? 'auto' : '300px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  borderRadius: '6px'
                }}
              >
                <thead>
                  <tr style={{ background: 'var(--sb-item-hover)' }}>
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
                      style={{
                        background: rIdx % 2 === 1 ? 'var(--sb-item-hover)' : 'transparent',
                        transition: 'background 0.15s'
                      }}
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
          const headingStyles: React.CSSProperties = {
            fontWeight: block.level <= 2 ? 800 : 700,
            lineHeight: 1.35,
            color: 'var(--heading-color)',
            cursor: 'pointer',
            margin: isVertical
              ? (block.level === 1 ? '0 24px 0 16px' : '0 18px 0 12px')
              : (block.level === 1 ? '24px 0 12px' : '18px 0 8px'),
            padding: isVertical ? '0 4px' : '4px 0',
            borderBottom: !isVertical && block.level <= 2 ? '1px solid var(--card-border)' : 'none',
            borderLeft: isVertical && block.level <= 2 ? '2px solid var(--card-border)' : 'none',
            fontSize:
              block.level === 1
                ? 'calc(var(--text-font-size, 15px) * 1.45)'
                : block.level === 2
                ? 'calc(var(--text-font-size, 15px) * 1.25)'
                : 'calc(var(--text-font-size, 15px) * 1.1)'
          };

          return React.createElement(tag, {
            key: blockIndex,
            className: "markdown-heading",
            style: headingStyles,
            onClick: (e: React.MouseEvent) => {
              if (window.getSelection()?.toString().length) return;
              e.stopPropagation();
              onPlayFromLine?.(lineIdx);
            },
            onMouseEnter: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.background = 'var(--sb-item-hover)'),
            onMouseLeave: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.background = 'transparent'),
            title: tooltipText,
            dangerouslySetInnerHTML: {
              __html: formatInlineMarkdown(block.text, searchQueries)
            }
          });
        }

        if (block.type === 'list') {
          const listStart = currentLineIndex;
          currentLineIndex += block.items.length;

          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag
              key={blockIndex}
              className={`markdown-list ${block.ordered ? 'ordered' : 'unordered'} ${
                isVertical ? 'vertical-list' : ''
              }`}
              style={{
                margin: isVertical ? '0 16px' : '10px 0',
                paddingLeft: isVertical ? '0' : '24px',
                paddingTop: isVertical ? '12px' : '0',
                listStyleType: block.ordered ? 'decimal' : 'disc',
                lineHeight: 'var(--text-line-height, 1.8)',
                fontSize: 'var(--text-font-size, 15px)'
              }}
            >
              {block.items.map((item, idx) => {
                const itemLine = listStart + idx;
                return (
                  <li
                    key={idx}
                    className="markdown-list-item"
                    style={{
                      marginBottom: isVertical ? '0' : '6px',
                      marginLeft: isVertical ? '6px' : '0',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      padding: '2px 4px'
                    }}
                    onClick={(e) => {
                      if (window.getSelection()?.toString().length) return;
                      e.stopPropagation();
                      onPlayFromLine?.(itemLine);
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--sb-item-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    title={tooltipText}
                    dangerouslySetInnerHTML={{
                      __html: formatInlineMarkdown(item.text, searchQueries)
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
          return (
            <blockquote
              key={blockIndex}
              className="markdown-quote"
              style={{
                margin: isVertical ? '0 16px' : '12px 0',
                padding: isVertical ? '8px 12px 8px 4px' : '6px 14px',
                borderLeft: isVertical ? 'none' : '3px solid var(--sb-accent)',
                borderTop: isVertical ? '3px solid var(--sb-accent)' : 'none',
                background: 'var(--sb-item-hover)',
                borderRadius: '4px',
                color: 'var(--main-text)',
                opacity: 0.9,
                cursor: 'pointer'
              }}
              onClick={(e) => {
                if (window.getSelection()?.toString().length) return;
                e.stopPropagation();
                onPlayFromLine?.(lineIdx);
              }}
              title={tooltipText}
              dangerouslySetInnerHTML={{
                __html: formatInlineMarkdown(block.text, searchQueries)
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
              style={{
                height: isVertical ? 'auto' : '1.4em',
                width: isVertical ? '1.4em' : 'auto',
                display: 'block'
              }}
            />
          );
        }

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
              borderRadius: '4px',
              margin: isVertical ? '0 0' : '0 -4px',
              padding: isVertical ? '2px 0' : '0 4px',
              lineHeight: 'var(--text-line-height, 1.8)',
              fontSize: 'var(--text-font-size, 15px)'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--sb-item-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title={tooltipText}
            dangerouslySetInnerHTML={{
              __html: formatInlineMarkdown(line, searchQueries)
            }}
          />
        );
      })}
    </div>
  );
};
