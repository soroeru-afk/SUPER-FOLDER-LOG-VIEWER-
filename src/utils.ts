const IDB_NAME = 'LogViewerDB';
const IDB_STORE = 'handles';
const IDB_KEY = 'lastFolder';
const IDB_STORE_FALLBACK = 'fallback_files';
const IDB_STORE_FILE_CACHE = 'file_cache';
const IDB_KEY_METADATA = 'metadata_cache';

export async function openIDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 3);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
      if (!db.objectStoreNames.contains(IDB_STORE_FALLBACK)) {
        db.createObjectStore(IDB_STORE_FALLBACK);
      }
      if (!db.objectStoreNames.contains(IDB_STORE_FILE_CACHE)) {
        db.createObjectStore(IDB_STORE_FILE_CACHE);
      }
    };
    req.onsuccess = (e: any) => res(e.target.result);
    req.onerror = (e: any) => rej(e.target.error);
  });
}

export interface CachedFileMeta {
  filename: string;
  category: string | null;
  date: string;
  time: string;
  title: string;
  dateSource: string;
  snippet?: string;
}

export interface FileMetadataCache {
  rootName: string;
  pFolders: { name: string }[];
  files: CachedFileMeta[];
  savedAt: number;
  shortcuts?: Record<string, string[]>;
}

export async function saveFileMetaCache(cache: FileMetadataCache) {
  try {
    const db = await openIDB();
    // キャッシュサイズ肥大化防止: 各ファイルのスニペットは最大120文字、ファイル数は最大3000件に制限
    const sanitizedFiles: CachedFileMeta[] = cache.files.slice(0, 3000).map(f => ({
      filename: f.filename,
      category: f.category,
      date: f.date,
      time: f.time,
      title: f.title,
      dateSource: f.dateSource,
      snippet: f.snippet ? f.snippet.slice(0, 120) : ''
    }));
    const sanitizedCache: FileMetadataCache = {
      rootName: cache.rootName || '',
      pFolders: cache.pFolders || [],
      files: sanitizedFiles,
      savedAt: Date.now(),
      shortcuts: cache.shortcuts || {}
    };
    db.transaction(IDB_STORE_FILE_CACHE, 'readwrite').objectStore(IDB_STORE_FILE_CACHE).put(sanitizedCache, IDB_KEY_METADATA);
  } catch(e) {
    console.warn('Failed to save file metadata cache:', e);
  }
}

export async function loadFileMetaCache(): Promise<FileMetadataCache | null> {
  try {
    const db = await openIDB();
    return new Promise(res => {
      const tx = db.transaction(IDB_STORE_FILE_CACHE, 'readonly');
      const req = tx.objectStore(IDB_STORE_FILE_CACHE).get(IDB_KEY_METADATA);
      req.onsuccess = (e: any) => res(e.target.result || null);
      req.onerror = () => res(null);
    });
  } catch(e) {
    return null;
  }
}

export async function saveFallbackData(data: any) {
  try {
    const db = await openIDB();
    db.transaction(IDB_STORE_FALLBACK, 'readwrite').objectStore(IDB_STORE_FALLBACK).put(data, 'fallback_data');
  } catch(e){}
}

export async function loadFallbackData(): Promise<any | null> {
  try {
    const db = await openIDB();
    return new Promise(res => {
      const req = db.transaction(IDB_STORE_FALLBACK, 'readonly').objectStore(IDB_STORE_FALLBACK).get('fallback_data');
      req.onsuccess = (e: any) => res(e.target.result || null);
      req.onerror = () => res(null);
    });
  } catch(e) {
    return null;
  }
}

export async function saveFolderHandle(handle: FileSystemDirectoryHandle) {
  try {
    const db = await openIDB();
    db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(handle, IDB_KEY);
  } catch(e){}
}

export async function loadFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB();
    return new Promise(res => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = (e: any) => res(e.target.result || null);
      req.onerror = () => res(null);
    });
  } catch(e) {
    return null;
  }
}

export function parseFilename(name: string) {
  const m = name.match(/^(\d{4})-?(\d{2})-?(\d{2})_(\d{2})-?(\d{2})\.?_(.+)\.[^.]+$/);
  if (m) {
    let title = m[6];
    title = title.replace(/^[「【]/, '').replace(/[」】]$/, '');
    return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}`, title: title };
  }
  let fallbackTitle = name.replace(/\.[^.]+$/, '');
  fallbackTitle = fallbackTitle.replace(/^[「【]/, '').replace(/[」】]$/, '');
  return { date: '', time: '', title: fallbackTitle };
}

export function escapeRegExp(string: string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
export function escHtml(s: string) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

export function highlightTextSafe(html: string, queries: string[]) {
  if (!queries || queries.length === 0) return html;
  const tags: string[] = [];
  let temp = html.replace(/(<[^>]+>)/g, m => { tags.push(m); return `__TAG_${tags.length - 1}__`; });
  queries.forEach(q => { temp = temp.replace(new RegExp(`(${escapeRegExp(q)})`, 'gi'), '<mark>$1</mark>'); });
  return temp.replace(/__TAG_(\d+)__/g, (m, p1) => tags[Number(p1)]);
}

export function highlightText(text: string, queries: string[]) {
  if (!queries || queries.length === 0) return escHtml(text);
  let html = escHtml(text);
  queries.forEach(q => { html = html.replace(new RegExp(`(${escapeRegExp(q)})`, 'gi'), '<mark>$1</mark>'); });
  return html;
}

export function linkifyUrls(s: string) {
  return escHtml(s).replace(/(https?:\/\/[^\s&"<>]+)/g, '<a href="$1" target="_blank" style="color:var(--sb-accent);text-decoration:underline;">$1</a>');
}

// チャットログ保存時に混入するUIノイズ（コピーボタン、トーストメッセージ等）の判定パターン
export const UI_NOISE_PATTERNS = [
  /^(クリップボードにコピーしました|クリップボードにコピーできませんでした|しばらくしてからもう一度お試しください|コピーしました|コピーできませんでした)+[。.]?$/i,
  /^(コピー|Copy|copied|コピーしました|👍|👎|Like|Dislike|再生成|Regenerate|編集|Edit|削除|Delete|Share|シェア|Report|報告|Follow up|フォローアップ)$/i,
];

// 行全体がUIノイズかどうかを判定
export function isNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // 1. 基本パターン
  for (const pat of UI_NOISE_PATTERNS) {
    if (pat.test(trimmed)) return true;
  }

  // 2. 結合されたノイズ文言（例:「クリップボードにコピーしましたクリップボードにコピーできませんでした。しばらくしてからもう一度お試しください。コピーしましたコピーできませんでした」）
  // 句読点やスペースを除去した上で、ノイズ語句のみで構成されているかを検証
  const stripped = trimmed.replace(/[ 　\n\r。、,.]/g, '');
  if (!stripped) return false;

  const noisePhrases = [
    'クリップボードにコピーしました',
    'クリップボードにコピーできませんでした',
    'しばらくしてからもう一度お試しください',
    'コピーしました',
    'コピーできませんでした',
    'コピー',
    '再生成',
    '編集',
    '削除',
    'シェア',
    '報告',
    'フォローアップ'
  ];

  let testStr = stripped;
  for (const phrase of noisePhrases) {
    while (testStr.includes(phrase)) {
      testStr = testStr.replace(phrase, '');
    }
  }

  // ノイズ語句を取り除いて空になれば、行全体がノイズ
  return testStr.length === 0;
}

// 文末や段落末尾に付着したノイズ（インライン・サフィックス）も含めて完全に除去
export function cleanChatNoise(text: string): string {
  if (!text) return '';

  // 1. 特定の複合ノイズ文字列（完全一致またはインライン）の除去
  let cleaned = text.replace(
    /(?:クリップボードにコピー(?:しました|できませんでした)[ 　\n]*)+(?:[。.]?[ 　\n]*しばらくしてからもう一度お試しください[。.]?)?(?:[ 　\n]*(?:コピーしました|コピーできませんでした))+/g,
    ''
  );

  // 2. 「しばらくしてからもう一度お試しください」の単独や残余
  cleaned = cleaned.replace(/しばらくしてからもう一度お試しください[。.]?/g, '');
  cleaned = cleaned.replace(/クリップボードにコピー(?:しました|できませんでした)[。.]?/g, '');
  cleaned = cleaned.replace(/コピー(?:しました|できませんでした)/g, '');

  // 3. 行単位でのフィルタリング
  const lines = cleaned.split('\n');
  const filteredLines: string[] = [];
  for (const line of lines) {
    if (!isNoiseLine(line)) {
      filteredLines.push(line);
    }
  }

  return filteredLines.join('\n');
}

// 音声読み上げ対象外のノイズか判定
export function isAudioNoise(text: string): boolean {
  if (!text || !text.trim()) return true;
  return isNoiseLine(text);
}

const HEADING_MIN_CHARS = 15;
const KNOWN_SPEAKERS = /^(User|Human|Assistant|AI|System|ユーザー|アシスタント|質問|回答|Bot|Me|You)[:：]\s*(.+)$/i;

export function extractFirstSentence(text: string) {
  if (!text) return null;
  const cleaned = cleanChatNoise(text);
  const lines = cleaned.split('\n');
  let firstRaw: string | null = null;
  for (const line of lines) {
    const knownSpeakerMatch = line.match(KNOWN_SPEAKERS);
    const raw = knownSpeakerMatch ? knownSpeakerMatch[2].trim() : line.trim();
    if (raw && !isNoiseLine(raw)) {
      firstRaw = raw
        .replace(/^(\d+[.・)][\s　]*)?(#{1,6})[\s　]*/, '$1')
        .replace(/^(#{1,6})[\s　]*/, '')
        .replace(/^([*\-+]|\u2022|\u2013|\u2014)[\s　]*/, '')
        .trim();
      break;
    }
  }
  if (!firstRaw) return null;

  const m = firstRaw.match(/^(.+?[。！？!?])/);
  const sentence = m ? m[1].trim() : (firstRaw.length > 60 ? firstRaw.slice(0, 60) + '…' : firstRaw);

  if (sentence.length >= HEADING_MIN_CHARS) return sentence;

  if (firstRaw.length >= HEADING_MIN_CHARS) {
    return firstRaw.length > 60 ? firstRaw.slice(0, 60) + '…' : firstRaw;
  }

  let combined = sentence;
  for (const line of lines) {
    const knownSpeakerMatch = line.match(KNOWN_SPEAKERS);
    const raw = knownSpeakerMatch ? knownSpeakerMatch[2].trim() : line.trim();
    if (!raw || raw === firstRaw) continue;
    combined = (combined + '　' + raw);
    if (combined.length >= HEADING_MIN_CHARS) break;
  }
  if (combined.length > 60) combined = combined.slice(0, 60) + '…';
  return combined;
}

export async function getDirectoryHandleByPath(rootDirHandle: any, pathStr: string, create = true) {
  if (!rootDirHandle || !pathStr) return rootDirHandle;
  const parts = pathStr.split('/').filter(p => p.trim().length > 0);
  let current = rootDirHandle;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create });
  }
  return current;
}

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif'];

export function isImageFilename(filename?: string | null): boolean {
  if (!filename) return false;
  const lower = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

export function isSupportedFilename(filename?: string | null): boolean {
  if (!filename) return false;
  const lower = filename.toLowerCase();
  return lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.log') || isImageFilename(filename);
}

export async function downloadFileBlob(fileOrBlob: Blob, filename: string) {
  const url = URL.createObjectURL(fileOrBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
