const IDB_NAME = 'LogViewerDB';
const IDB_STORE = 'handles';
const IDB_KEY = 'lastFolder';
const IDB_STORE_FALLBACK = 'fallback_files';

export async function openIDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 2);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
      if (!db.objectStoreNames.contains(IDB_STORE_FALLBACK)) {
        db.createObjectStore(IDB_STORE_FALLBACK);
      }
    };
    req.onsuccess = (e: any) => res(e.target.result);
    req.onerror = (e: any) => rej(e.target.error);
  });
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

export function getVirtualFolder(filename: string, date: string | null): string {
  let cleanName = filename;
  if (/^\d{8}_\d{4}_/.test(cleanName)) {
    cleanName = cleanName.slice(14);
  }
  
  const cleanNameLower = cleanName.toLowerCase();
  if (cleanNameLower === 'agents' || cleanNameLower === 'agents.md') {
    return '00_【進行】';
  }
  
  if (cleanName.startsWith('00_【進行】_') || cleanName.startsWith('00-') || cleanName.includes('_【進行】_')) {
    return '00_【進行】';
  }
  if (cleanName.startsWith('【定型】_')) {
    return '【定型】';
  }
  if (cleanName.startsWith('- ')) {
    const idx = cleanName.indexOf('_', 2);
    if (idx !== -1) {
      return cleanName.substring(0, idx);
    } else {
      return cleanName.substring(0, cleanName.lastIndexOf('.')) || cleanName;
    }
  }
  
  if (date) {
    const parts = date.split('-');
    const mm = parts[1];
    const dd = parts[2];
    if (mm && dd) {
      return `${parseInt(mm)}/${parseInt(dd)}`;
    }
  }
  return 'その他ログ';
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

const UI_NOISE_LINES = /^(コピー|Copy|copied|コピーしました|👍|👎|Like|Dislike|再生成|Regenerate|編集|Edit|削除|Delete|Share|シェア|Report|報告|Follow up|フォローアップ)$/i;
const HEADING_MIN_CHARS = 15;

export function extractFirstSentence(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  let firstRaw: string | null = null;
  for (const line of lines) {
    const withSpeaker = line.match(/^[^:：]{1,10}[:：]\s*(.+)$/);
    const raw = withSpeaker ? withSpeaker[1].trim() : line.trim();
    if (raw && !UI_NOISE_LINES.test(raw)) { firstRaw = raw; break; }
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
    const withSpeaker = line.match(/^[^:：]{1,10}[:：]\s*(.+)$/);
    const raw = withSpeaker ? withSpeaker[1].trim() : line.trim();
    if (!raw || raw === firstRaw) continue;
    combined = (combined + '　' + raw);
    if (combined.length >= HEADING_MIN_CHARS) break;
  }
  if (combined.length > 60) combined = combined.slice(0, 60) + '…';
  return combined;
}
