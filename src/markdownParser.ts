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
  start?: number;
  items: { text: string; rawLine: string; number?: number; level?: number }[];
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
  // HTMLタグやコメント（<div...>, <a...>, <!--...-->等）が含まれる場合はエスケープせず生HTMLとしてプレビューレンダリングさせる
  const hasHtmlTags = /<[a-zA-Z!\/][^>]*>|<!--/i.test(text);

  let html = text;
  if (!hasHtmlTags) {
    // HTMLタグを含まない通常のMarkdownテキストのみ特殊文字をエスケープ
    html = escHtml(text);
  }

  // シャープマーク（#）の徹底除去（"1. # " や "## " などの残余）
  html = html.replace(/^(\d+[.・)][\s　]*)?(#{1,6})[\s　]*/, '$1');
  html = html.replace(/^(#{1,6})[\s　]*/, '');

  if (!hasHtmlTags) {
    // インラインコード `code`
    html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

    // 太字 **text** または __text__
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');

    // 打ち消し ~~text~~
    html = html.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

    // URLのリンク化 (HTMLエスケープ済み前提)
    html = html.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s&"<>)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>'
    );
    html = html.replace(
      /(https?:\/\/[^\s&"<>]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>'
    );

    // ソースノード・NODEタグの青色バッジ化（[ NODE: ... ] や [ 04SOURCENODES ] などの角括弧ノード）
    html = html.replace(
      /(\[\s*(?:NODE:|SOURCE|[A-Z0-9_-]*NODE)[^\]]*\])/gi,
      '<span class="md-node-tag">$1</span>'
    );

    // 冒頭キーフレーズ・コロン前ラベル自動太字化（斜体処理より前に実行し、見出し末尾の飾り「*」を除去して確実に太字化）
    // 1. コロン付きキーフレーズ (例: "・定義*：説明" -> "・<strong>定義：</strong> 説明", "- id: 識別子" -> "- <strong>id:</strong> 識別子")
    html = html.replace(/^([・*-]\s*|^\s*)([^：:\n<*]{1,25})\*?([：:])\s*/gm, '$1<strong>$2$3</strong> ');

    // 2. コロンなしの中黒・ハイフン見出しフレーズ (例: "・科学的探索*" や "・文化的表象*" -> "・<strong>科学的探索</strong>")
    html = html.replace(/^([・*-]\s*)([^：:\n<*]{1,20})\*?\s*$/gm, '$1<strong>$2</strong>');

    // 3. 角括弧セクション見出し (例: "[ 02_DATA_GRID ]", "[ 03STRATEGICOVERVIEW ]")
    html = html.replace(/^(\[\s*[A-Z0-9_ -]{2,30}\s*\])$/gm, '<strong>$1</strong>');

    // 斜体 *text* または _text_ (※改行をまたがず、前後に空白がないインライン単語のみ対象)
    html = html.replace(/(?<!\*)\*([^*\s\n](?:[^*\n]*[^*\s\n])?)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_([^_\s\n](?:[^_\n]*[^_\s\n])?)_(?!_)/g, '<em>$1</em>');
  }

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

    // 4. 見出し (# H1, ## H2, ### H3... "1. # " や "2. ## " などの番号付き見出し、インデントやスペース欠落にも完全対応)
    const headingMatch = trimmed.match(/^(\d+[.・)][\s　]*)?(#{1,6})[\s　]*(.+)$/);
    if (headingMatch) {
      const numPrefix = headingMatch[1] || '';
      const hashes = headingMatch[2];
      const headingBody = headingMatch[3];
      // テキスト先頭に残っている # 記号を完全に除去
      const cleanHeadingText = (numPrefix + headingBody)
        .replace(/^(\d+[.・)][\s　]*)?(#{1,6})[\s　]*/, '$1')
        .replace(/^(#{1,6})[\s　]*/, '')
        .trim();
      blocks.push({
        type: 'heading',
        level: hashes.length,
        text: cleanHeadingText,
        rawLine: line
      });
      i++;
      continue;
    }

    // 5. 引用 (> quote インデント対応)
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>[\s　]?/, '');
      blocks.push({
        type: 'quote',
        text: quoteText,
        rawLine: line
      });
      i++;
      continue;
    }

    // 6. 箇条書きリスト (インデント・階層付き - / * / + / • / ・ / 数字リストに対応)
    // ※「*」「-」「+」は直後に空白を必須とし、「**太字**」などのマークダウン構文を壊さないようにする
    const ulMatch = trimmed.match(/^([*\-+]|\u2022|\u2013|\u2014)[\s　]+(.+)$/) || trimmed.match(/^([•・\u30FB])[\s　]*(.+)$/);
    const olMatch = trimmed.match(/^(\d+)[.・)][\s　]*(.+)$/);
    if (ulMatch || olMatch) {
      const isOrdered = Boolean(olMatch);
      const startNumber = olMatch ? parseInt(olMatch[1], 10) : undefined;
      const items: { text: string; rawLine: string; number?: number; level?: number }[] = [];

      let currentHasParent = false;

      while (i < lines.length) {
        const currentLine = lines[i];
        const currentTrimmed = currentLine.trim();
        const mUl = currentTrimmed.match(/^([*\-+]|\u2022|\u2013|\u2014)[\s　]+(.+)$/) || currentTrimmed.match(/^([•・\u30FB])[\s　]*(.+)$/);
        const mOl = currentTrimmed.match(/^(\d+)[.・)][\s　]*(.+)$/);

        if ((isOrdered && mOl) || (!isOrdered && mUl)) {
          const match = isOrdered ? mOl : mUl;
          const rawItemText = match[2].trim();
          
          // インデント幅の判定（タブはスペース2文字換算）
          const indentStr = (currentLine.match(/^([ \t]*)/) || ['', ''])[1];
          const indentSpaces = indentStr.replace(/\t/g, '  ').length;
          const hasColon = /[：:]/.test(rawItemText);

          let level = 0;
          if (indentSpaces >= 2) {
            level = Math.min(2, Math.floor(indentSpaces / 2));
          } else if (hasColon && currentHasParent) {
            level = 1; // 親項目の下にある詳細説明項目は1段下げ（子項目）へ
          } else if (!hasColon) {
            currentHasParent = true;
            level = 0; // 大項目
          }

          items.push({ 
            text: rawItemText, 
            rawLine: currentLine,
            number: isOrdered ? parseInt(mOl[1], 10) : undefined,
            level
          });
          i++;
        } else {
          break;
        }
      }

      blocks.push({
        type: 'list',
        ordered: isOrdered,
        start: startNumber,
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
