import React from 'react';
import { escHtml, highlightTextSafe, linkifyUrls } from './utils';

export interface TableBlock {
  type: 'table';
  headers: string[];
  alignments: ('left' | 'center' | 'right')[];
  rows: string[][];
  rawLines: string[];
}

export interface HeadingBlock {
  type: 'heading';
  level: number;
  text: string;
  rawLine: string;
}

export interface ListBlock {
  type: 'list';
  ordered: boolean;
  items: { text: string; rawLine: string }[];
}

export interface HrBlock {
  type: 'hr';
  rawLine: string;
}

export interface QuoteBlock {
  type: 'quote';
  text: string;
  rawLine: string;
}

export interface ParagraphBlock {
  type: 'paragraph';
  lines: string[];
}

export type MarkdownBlock = TableBlock | HeadingBlock | ListBlock | HrBlock | QuoteBlock | ParagraphBlock;

// インライン装飾（太字・イタリック・インラインコード・打ち消し・URL・検索ハイライト）
export function formatInlineMarkdown(text: string, searchQueries: string[] = []): string {
  // まず特殊文字をエスケープ
  let html = escHtml(text);

  // インラインコード `code`
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // 太字 **text** または __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // 斜体 *text* または _text_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // 打ち消し ~~text~~
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // URLのリンク化 (HTMLエスケープ済み前提)
  html = html.replace(
    /(https?:\/\/[^\s&"<>]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--sb-accent);text-decoration:underline;">$1</a>'
  );

  // 検索語ハイライト
  html = highlightTextSafe(html, searchQueries);

  return html;
}

// 行がテーブルのヘッダー/区切り行であるか判定
function isTableDelimiterRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  const parts = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim());
  if (parts.length === 0) return false;
  return parts.every(part => /^:?-{3,}:?$/.test(part));
}

function parseTableAlignments(delimiterLine: string): ('left' | 'center' | 'right')[] {
  const parts = delimiterLine.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim());
  return parts.map(part => {
    const startColon = part.startsWith(':');
    const endColon = part.endsWith(':');
    if (startColon && endColon) return 'center';
    if (endColon) return 'right';
    return 'left';
  });
}

function splitTableRow(rowLine: string): string[] {
  let s = rowLine.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(col => col.trim());
}

// Markdownテキストをブロックに分解
export function parseMarkdown(text: string): MarkdownBlock[] {
  if (!text) return [];
  const lines = text.split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. 空行
    if (!trimmed) {
      blocks.push({ type: 'paragraph', lines: [''] });
      i++;
      continue;
    }

    // 2. 水平線 (---, ***, ___)
    if (/^([-*_]){3,}\s*$/.test(trimmed)) {
      blocks.push({ type: 'hr', rawLine: line });
      i++;
      continue;
    }

    // 3. テーブル判定 (AI Search形式のMarkdownテーブル)
    // 2行目が区切り行（| --- | --- |）である場合
    if (trimmed.includes('|') && i + 1 < lines.length && isTableDelimiterRow(lines[i + 1])) {
      const headerLine = line;
      const delimiterLine = lines[i + 1];
      const headers = splitTableRow(headerLine);
      const alignments = parseTableAlignments(delimiterLine);
      const rows: string[][] = [];
      const rawLines: string[] = [headerLine, delimiterLine];

      i += 2;
      while (i < lines.length) {
        const nextLine = lines[i];
        const nextTrimmed = nextLine.trim();
        // 空行またはパイプを含まない行でテーブル終了
        if (!nextTrimmed || !nextTrimmed.includes('|')) {
          break;
        }
        rows.push(splitTableRow(nextLine));
        rawLines.push(nextLine);
        i++;
      }

      blocks.push({
        type: 'table',
        headers,
        alignments,
        rows,
        rawLines
      });
      continue;
    }

    // 4. 見出し (# H1, ## H2, ### H3...)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
        rawLine: line
      });
      i++;
      continue;
    }

    // 5. 引用 (> quote)
    if (line.startsWith('>')) {
      const quoteText = line.replace(/^>\s?/, '');
      blocks.push({
        type: 'quote',
        text: quoteText,
        rawLine: line
      });
      i++;
      continue;
    }

    // 6. 箇条書きリスト (Ordered or Unordered)
    const ulMatch = line.match(/^([*\-+]|\u2022)\s+(.+)$/);
    const olMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (ulMatch || olMatch) {
      const isOrdered = Boolean(olMatch);
      const items: { text: string; rawLine: string }[] = [];

      while (i < lines.length) {
        const currentLine = lines[i];
        const mUl = currentLine.match(/^([*\-+]|\u2022)\s+(.+)$/);
        const mOl = currentLine.match(/^(\d+)[.)]\s+(.+)$/);
        if (isOrdered && mOl) {
          items.push({ text: mOl[2], rawLine: currentLine });
          i++;
        } else if (!isOrdered && mUl) {
          items.push({ text: mUl[2], rawLine: currentLine });
          i++;
        } else {
          break;
        }
      }

      blocks.push({
        type: 'list',
        ordered: isOrdered,
        items
      });
      continue;
    }

    // 7. 通常の段落行
    blocks.push({
      type: 'paragraph',
      lines: [line]
    });
    i++;
  }

  return blocks;
}
