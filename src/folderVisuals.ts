// ============================================================================
// フォルダー別スマートビジュアル＆カバー生成ユーティリティ
// ============================================================================

export type FolderCoverStyle = 'illustration' | 'photo' | 'pattern';
export type FolderCoverLayout = 'banner' | 'card-bg';
export type FolderCoverPosition = 'top' | 'center' | 'bottom' | string | number;

/**
 * 位置指定（'top' | 'center' | 'bottom' またはパーセント文字列/数値）を 0〜100 の数値に変換
 */
export function parsePositionPercent(pos?: FolderCoverPosition): number {
  if (pos === undefined || pos === null) return 50;
  if (pos === 'top') return 0;
  if (pos === 'center') return 50;
  if (pos === 'bottom') return 100;
  if (typeof pos === 'number') {
    return Math.max(0, Math.min(100, Math.round(pos)));
  }
  const parsed = parseFloat(String(pos).replace('%', ''));
  return isNaN(parsed) ? 50 : Math.max(0, Math.min(100, Math.round(parsed)));
}

export interface FolderVisualSettings {
  enabled: boolean;
  style: FolderCoverStyle;
  layout: FolderCoverLayout;
  opacity: number; // 0.1 ~ 1.0
  brightness?: number; // 0.7 ~ 1.4
  defaultPosition?: FolderCoverPosition; // 全体のデフォルト位置
  customCovers: Record<string, string>; // folderPath or name -> custom URL or Data URI
  variations?: Record<string, number>;  // folderPath or name -> variation index
  customPositions?: Record<string, FolderCoverPosition>; // folderPath or name -> 'top' | 'center' | 'bottom' or percentage string/number
}

export const DEFAULT_FOLDER_VISUAL_SETTINGS: FolderVisualSettings = {
  enabled: false,
  style: 'illustration',
  layout: 'banner',
  opacity: 1.0,
  brightness: 1.05,
  defaultPosition: 'center',
  customCovers: {},
  variations: {},
  customPositions: {}
};

export function loadFolderVisualSettings(): FolderVisualSettings {
  try {
    const raw = localStorage.getItem('lv_folder_visual_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_FOLDER_VISUAL_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load folder visual settings', e);
  }
  return DEFAULT_FOLDER_VISUAL_SETTINGS;
}

export function saveFolderVisualSettings(settings: FolderVisualSettings) {
  try {
    localStorage.setItem('lv_folder_visual_settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('folderVisualSettingsChanged'));
  } catch (e) {
    console.error('Failed to save folder visual settings', e);
  }
}

/**
 * ローカル画像ファイルを読み込み、最適化してData URI (base64) に変換
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('Failed to read file'));
        return;
      }
      
      // SVGや小型画像（300KB以下）は変換劣化を避けるためそのまま使用
      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg') || file.size < 300 * 1024) {
        resolve(src);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const MAX_W = 1200;
          const MAX_H = 700;
          let w = img.width;
          let h = img.height;
          if (w > MAX_W || h > MAX_H) {
            const ratio = Math.min(MAX_W / w, MAX_H / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const format = (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) ? 'image/png' : 'image/jpeg';
            resolve(canvas.toDataURL(format, 0.88));
          } else {
            resolve(src);
          }
        } catch {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// テーマカテゴリーのキーワード定義
export interface CategoryTheme {
  id: string;
  keywords: string[];
  title: string;
  badge: string;
  gradient: [string, string];
  illustrationSvgs: string[];
  photoUrls: string[];
}

const CATEGORY_THEMES: CategoryTheme[] = [
  {
    id: 'ai',
    keywords: ['ai', 'エージェント', 'gpt', 'claude', 'gemini', 'テクノロジー', 'tech', 'bot', '機械学習', 'llm', 'deep', 'ロボット', '人工知能'],
    title: 'AI & Technology',
    badge: '⚡ AI / TECH',
    gradient: ['#0f172a', '#1e3a8a'],
    photoUrls: [
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'
    ],
    illustrationSvgs: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_ai1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e1b4b"/>
            <stop offset="50%" stop-color="#312e81"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_ai1)"/>
        <circle cx="270" cy="60" r="45" fill="#38bdf8" opacity="0.15"/>
        <circle cx="50" cy="30" r="30" fill="#818cf8" opacity="0.12"/>
        <g stroke="#38bdf8" stroke-width="1.5" opacity="0.75" fill="none">
          <path d="M 40,80 L 100,40 L 170,75 L 240,35 L 290,65"/>
          <path d="M 80,100 L 140,90 L 200,45 L 260,85"/>
          <path d="M 100,40 L 140,90"/>
          <path d="M 170,75 L 200,45"/>
          <path d="M 240,35 L 260,85"/>
        </g>
        <circle cx="40" cy="80" r="4" fill="#38bdf8"/>
        <circle cx="100" cy="40" r="5" fill="#818cf8"/>
        <circle cx="170" cy="75" r="5" fill="#38bdf8"/>
        <circle cx="200" cy="45" r="4" fill="#a855f7"/>
        <circle cx="240" cy="35" r="6" fill="#38bdf8"/>
        <circle cx="260" cy="85" r="4" fill="#818cf8"/>
        <circle cx="290" cy="65" r="5" fill="#38bdf8"/>
        <g transform="translate(145, 25)" opacity="0.9">
          <rect x="0" y="0" width="30" height="30" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
          <path d="M 7,15 L 23,15 M 15,7 L 15,23" stroke="#818cf8" stroke-width="2" stroke-linecap="round"/>
          <circle cx="15" cy="15" r="3" fill="#38bdf8"/>
        </g>
      </svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_ai2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#090d16"/>
            <stop offset="50%" stop-color="#1e1b4b"/>
            <stop offset="100%" stop-color="#6366f1"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_ai2)"/>
        <g transform="translate(60, 20)" stroke="#67e8f9" stroke-width="2" fill="none">
          <polygon points="100,10 140,30 140,70 100,90 60,70 60,30"/>
          <line x1="100" y1="10" x2="100" y2="50"/>
          <line x1="60" y1="70" x2="100" y2="50"/>
          <line x1="140" y1="70" x2="100" y2="50"/>
          <circle cx="100" cy="50" r="8" fill="#818cf8"/>
        </g>
        <g fill="#38bdf8" opacity="0.6">
          <circle cx="260" cy="35" r="3"/><circle cx="280" cy="55" r="4"/><circle cx="250" cy="75" r="3"/>
          <circle cx="45" cy="45" r="4"/><circle cx="35" cy="75" r="3"/>
        </g>
      </svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_ai3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#030712"/>
            <stop offset="50%" stop-color="#111827"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_ai3)"/>
        <g stroke="#38bdf8" stroke-width="1.5" fill="none" opacity="0.85">
          <circle cx="160" cy="60" r="40" stroke-dasharray="4 4"/>
          <circle cx="160" cy="60" r="25"/>
          <circle cx="160" cy="60" r="10" fill="#38bdf8"/>
          <line x1="80" y1="60" x2="120" y2="60"/>
          <line x1="200" y1="60" x2="240" y2="60"/>
        </g>
      </svg>`
    ]
  },
  {
    id: 'music',
    keywords: ['音楽', 'エンタメ', 'music', 'audio', 'sound', 'バンド', 'ボカロ', 'ライブ', 'ソング', '歌', 'cd', 'アルバム', '演劇', '声優'],
    title: 'Music & Entertainment',
    badge: '🎵 MUSIC',
    gradient: ['#18181b', '#701a75'],
    photoUrls: [
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80'
    ],
    illustrationSvgs: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_mu1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#3b0764"/>
            <stop offset="50%" stop-color="#701a75"/>
            <stop offset="100%" stop-color="#db2777"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_mu1)"/>
        <circle cx="250" cy="60" r="50" fill="#09090b" stroke="#f472b6" stroke-width="1.5" opacity="0.8"/>
        <circle cx="250" cy="60" r="35" fill="none" stroke="#a21caf" stroke-width="1" opacity="0.6"/>
        <circle cx="250" cy="60" r="20" fill="none" stroke="#f472b6" stroke-width="1" opacity="0.6"/>
        <circle cx="250" cy="60" r="10" fill="#db2777"/>
        <g fill="#f472b6" opacity="0.85">
          <rect x="30" y="70" width="6" height="30" rx="3"/>
          <rect x="42" y="45" width="6" height="55" rx="3"/>
          <rect x="54" y="25" width="6" height="75" rx="3"/>
          <rect x="66" y="50" width="6" height="50" rx="3"/>
          <rect x="78" y="35" width="6" height="65" rx="3"/>
          <rect x="90" y="60" width="6" height="40" rx="3"/>
          <rect x="102" y="40" width="6" height="60" rx="3"/>
          <rect x="114" y="20" width="6" height="80" rx="3"/>
          <rect x="126" y="55" width="6" height="45" rx="3"/>
          <rect x="138" y="75" width="6" height="25" rx="3"/>
        </g>
        <path d="M 175,45 Q 185,25 200,30 L 200,60 M 175,45 L 175,70" stroke="#fbcfe8" stroke-width="2.5" fill="none"/>
        <circle cx="170" cy="72" r="6" fill="#fbcfe8"/>
        <circle cx="195" cy="62" r="6" fill="#fbcfe8"/>
      </svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_mu2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#18181b"/>
            <stop offset="50%" stop-color="#4c1d95"/>
            <stop offset="100%" stop-color="#c026d3"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_mu2)"/>
        <g transform="translate(100, 20)" stroke="#f472b6" stroke-width="3" fill="none">
          <path d="M 20,60 C 20,25 90,25 90,60"/>
          <rect x="10" y="55" width="20" height="30" rx="6" fill="#ec4899"/>
          <rect x="80" y="55" width="20" height="30" rx="6" fill="#ec4899"/>
        </g>
        <circle cx="50" cy="40" r="15" fill="#a855f7" opacity="0.3"/>
        <circle cx="260" cy="70" r="25" fill="#f43f5e" opacity="0.25"/>
      </svg>`
    ]
  },
  {
    id: 'game',
    keywords: ['ゲーム', 'game', 'rpg', 'steam', 'switch', 'ps5', '攻略', 'プレイ', '任天堂', 'ポケモン', 'ソシャゲ', 'ゲーミング'],
    title: 'Gaming & Interactive',
    badge: '🎮 GAMING',
    gradient: ['#052e16', '#14532d'],
    photoUrls: [
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1612287233215-68a8677c772b?w=600&auto=format&fit=crop&q=80'
    ],
    illustrationSvgs: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_gm1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#022c22"/>
            <stop offset="50%" stop-color="#065f46"/>
            <stop offset="100%" stop-color="#10b981"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_gm1)"/>
        <g fill="#34d399" opacity="0.25">
          <rect x="240" y="20" width="12" height="12"/>
          <rect x="256" y="20" width="12" height="12"/>
          <rect x="256" y="36" width="12" height="12"/>
          <rect x="272" y="36" width="12" height="12"/>
          <rect x="288" y="20" width="12" height="12"/>
        </g>
        <g transform="translate(60, 28)">
          <path d="M 25,10 C 15,10 5,20 5,45 C 5,60 15,68 30,68 C 45,68 55,55 70,55 C 85,55 95,68 110,68 C 125,68 135,60 135,45 C 135,20 125,10 115,10 Z" fill="#047857" stroke="#6ee7b7" stroke-width="2.5"/>
          <rect x="26" y="27" width="10" height="26" fill="#a7f3d0" rx="2"/>
          <rect x="18" y="35" width="26" height="10" fill="#a7f3d0" rx="2"/>
          <circle cx="108" cy="32" r="4" fill="#fbbf24"/>
          <circle cx="118" cy="42" r="4" fill="#f87171"/>
          <circle cx="98" cy="42" r="4" fill="#60a5fa"/>
          <circle cx="108" cy="52" r="4" fill="#34d399"/>
        </g>
      </svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_gm2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="50%" stop-color="#064e3b"/>
            <stop offset="100%" stop-color="#059669"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_gm2)"/>
        <g stroke="#34d399" stroke-width="2" fill="none">
          <polygon points="160,20 220,60 160,100 100,60"/>
          <polygon points="160,35 200,60 160,85 120,60" fill="#10b981" opacity="0.4"/>
        </g>
      </svg>`
    ]
  },
  {
    id: 'movie',
    keywords: ['映画', '特撮', 'movie', 'film', 'cinema', 'アニメ', 'hero', 'ライダー', 'ウルトラ', '戦隊', 'ドラマ', '劇場版', '怪獣', 'godzilla'],
    title: 'Cinema & Tokusatsu',
    badge: '🎬 CINEMA / HERO',
    gradient: ['#450a0a', '#991b1b'],
    photoUrls: [
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&auto=format&fit=crop&q=80'
    ],
    illustrationSvgs: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_mv1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#450a0a"/>
            <stop offset="50%" stop-color="#7f1d1d"/>
            <stop offset="100%" stop-color="#ea580c"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_mv1)"/>
        <polygon points="50,0 120,120 280,120 150,0" fill="#fef08a" opacity="0.12"/>
        <g transform="translate(40, 25)">
          <rect x="0" y="0" width="90" height="68" rx="4" fill="#1c1917" stroke="#fca5a5" stroke-width="2"/>
          <rect x="0" y="0" width="90" height="20" fill="#292524"/>
          <polygon points="10,0 22,0 12,20 0,20" fill="#ffffff"/>
          <polygon points="34,0 46,0 36,20 24,20" fill="#ffffff"/>
          <polygon points="58,0 70,0 60,20 48,20" fill="#ffffff"/>
          <polygon points="82,0 90,0 84,20 72,20" fill="#ffffff"/>
          <polygon points="45,35 48,44 57,44 50,50 53,59 45,53 37,59 40,50 33,44 42,44" fill="#f59e0b"/>
        </g>
        <g transform="translate(200, 30)">
          <polygon points="50,10 75,55 25,55" fill="none" stroke="#fef08a" stroke-width="2.5" opacity="0.8"/>
          <circle cx="50" cy="40" r="10" fill="#ef4444"/>
        </g>
      </svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_mv2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#18181b"/>
            <stop offset="50%" stop-color="#991b1b"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_mv2)"/>
        <g transform="translate(80, 20)" fill="none" stroke="#fef08a" stroke-width="2">
          <circle cx="80" cy="40" r="30"/>
          <circle cx="80" cy="40" r="10" fill="#ef4444"/>
          <path d="M 30,70 L 130,70"/>
        </g>
      </svg>`
    ]
  },
  {
    id: 'design',
    keywords: ['デザイン', 'クリエイティブ', 'design', 'creative', 'ui', 'ux', 'イラスト', 'アート', 'art', 'グラフィック', 'ロゴ', 'フォント', '配色'],
    title: 'Design & Creative',
    badge: '🎨 DESIGN / ART',
    gradient: ['#4c1d95', '#c026d3'],
    photoUrls: [
      'https://images.unsplash.com/photo-1558655146-d09347e92766?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80'
    ],
    illustrationSvgs: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_ds1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#311042"/>
            <stop offset="50%" stop-color="#581c87"/>
            <stop offset="100%" stop-color="#ec4899"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_ds1)"/>
        <circle cx="70" cy="60" r="42" fill="none" stroke="#f472b6" stroke-width="2" stroke-dasharray="6,4" opacity="0.6"/>
        <circle cx="55" cy="45" r="12" fill="#38bdf8"/>
        <circle cx="85" cy="45" r="12" fill="#f43f5e"/>
        <circle cx="55" cy="75" r="12" fill="#fbbf24"/>
        <circle cx="85" cy="75" r="12" fill="#4ade80"/>
        <path d="M 150,90 C 180,20 220,110 270,35" stroke="#fdf4ff" stroke-width="3" fill="none"/>
        <circle cx="180" cy="48" r="4" fill="#a855f7" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="240" cy="72" r="4" fill="#a855f7" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="270" cy="35" r="6" fill="#ec4899" stroke="#ffffff" stroke-width="2"/>
      </svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_ds2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="50%" stop-color="#3b0764"/>
            <stop offset="100%" stop-color="#06b6d4"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_ds2)"/>
        <g stroke="#38bdf8" stroke-width="2" fill="none">
          <rect x="50" y="30" width="50" height="50" rx="4"/>
          <circle cx="160" cy="55" r="25"/>
          <polygon points="250,30 280,80 220,80"/>
        </g>
      </svg>`
    ]
  },
  {
    id: 'dev',
    keywords: ['開発', 'ツール', 'アプリ', 'dev', 'code', 'プログラミング', '企画', 'script', 'python', 'react', 'ts', 'js', 'エンジニア', 'システム'],
    title: 'Tools & Engineering',
    badge: '💻 DEV / TOOLS',
    gradient: ['#0f172a', '#334155'],
    photoUrls: [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80'
    ],
    illustrationSvgs: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_dv1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#090d16"/>
            <stop offset="50%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_dv1)"/>
        <g transform="translate(40, 20)">
          <rect x="0" y="0" width="150" height="80" rx="6" fill="#020617" stroke="#38bdf8" stroke-width="1.5"/>
          <rect x="0" y="0" width="150" height="18" fill="#1e293b"/>
          <circle cx="10" cy="9" r="3" fill="#ef4444"/>
          <circle cx="18" cy="9" r="3" fill="#f59e0b"/>
          <circle cx="26" cy="9" r="3" fill="#10b981"/>
          <text x="12" y="38" font-family="monospace" font-size="12" fill="#38bdf8" font-weight="bold">&gt; npm run dev</text>
          <text x="12" y="56" font-family="monospace" font-size="11" fill="#4ade80">✓ Ready on :3000</text>
        </g>
        <g transform="translate(225, 25)" stroke="#38bdf8" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M 20,15 L 5,35 L 20,55"/>
          <path d="M 45,15 L 60,35 L 45,55"/>
          <line x1="38" y1="12" x2="27" y2="58" stroke="#f59e0b" stroke-width="2.5"/>
        </g>
      </svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_dv2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#052e16"/>
            <stop offset="50%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#3b82f6"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_dv2)"/>
        <g transform="translate(60, 25)" fill="none" stroke="#38bdf8" stroke-width="2">
          <path d="M 30,10 L 10,35 L 30,60"/>
          <path d="M 80,10 L 100,35 L 80,60"/>
          <line x1="65" y1="10" x2="45" y2="60" stroke="#f59e0b"/>
        </g>
      </svg>`
    ]
  },
  {
    id: 'life',
    keywords: ['生活', 'ライフ', '住宅', '車', '住まい', 'life', 'home', 'car', 'インテリア', '料理', 'レシピ', '家電', '環境', '健康', '散歩'],
    title: 'Life & Environment',
    badge: '🏡 LIFE / HOME',
    gradient: ['#14532d', '#15803d'],
    photoUrls: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600&auto=format&fit=crop&q=80'
    ],
    illustrationSvgs: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_lf1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#14532d"/>
            <stop offset="50%" stop-color="#15803d"/>
            <stop offset="100%" stop-color="#84cc16"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_lf1)"/>
        <circle cx="260" cy="40" r="24" fill="#fef08a" opacity="0.3"/>
        <g transform="translate(45, 25)">
          <polygon points="40,5 5,35 75,35" fill="#fde047" stroke="#ffffff" stroke-width="2"/>
          <rect x="15" y="35" width="50" height="35" fill="#ffffff" rx="2"/>
          <rect x="32" y="45" width="16" height="25" fill="#854d0e"/>
          <rect x="20" y="42" width="10" height="10" fill="#38bdf8"/>
          <circle cx="95" cy="40" r="18" fill="#4ade80"/>
          <rect x="92" y="55" width="6" height="15" fill="#713f12"/>
        </g>
        <g transform="translate(160, 45)">
          <path d="M 10,25 Q 25,25 35,15 Q 45,5 70,5 Q 90,5 105,18 L 120,22 C 125,22 130,28 130,35 L 5,35 C 5,28 8,25 10,25 Z" fill="#bbf7d0" opacity="0.9"/>
          <circle cx="30" cy="38" r="8" fill="#1e293b"/>
          <circle cx="105" cy="38" r="8" fill="#1e293b"/>
        </g>
      </svg>`
    ]
  },
  {
    id: 'nostalgia',
    keywords: ['懐かしい', '思い出', 'レトロ', '昭和', 'nostalgia', 'retro', 'memory', '歴史', '昔', '記念', 'ノスタルジック', '少年時代'],
    title: 'Nostalgia & Memories',
    badge: '📻 NOSTALGIA',
    gradient: ['#78350f', '#b45309'],
    photoUrls: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?w=600&auto=format&fit=crop&q=80'
    ],
    illustrationSvgs: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_ns1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#451a03"/>
            <stop offset="50%" stop-color="#78350f"/>
            <stop offset="100%" stop-color="#d97706"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_ns1)"/>
        <circle cx="160" cy="110" r="60" fill="#fde68a" opacity="0.4"/>
        <g transform="translate(40, 25)">
          <rect x="0" y="0" width="100" height="64" rx="6" fill="#292524" stroke="#fde68a" stroke-width="2"/>
          <rect x="15" y="15" width="70" height="34" rx="4" fill="#44403c"/>
          <circle cx="35" cy="32" r="10" fill="#292524" stroke="#fde68a" stroke-width="1.5"/>
          <circle cx="65" cy="32" r="10" fill="#292524" stroke="#fde68a" stroke-width="1.5"/>
          <rect x="42" y="27" width="16" height="10" fill="#78716c"/>
        </g>
        <g stroke="#fed7aa" stroke-width="2" fill="none" opacity="0.8">
          <path d="M 210,50 Q 230,30 250,50 Q 270,70 290,50"/>
          <path d="M 210,65 Q 230,45 250,65 Q 270,85 290,65"/>
        </g>
      </svg>`
    ]
  },
  {
    id: 'finance',
    keywords: ['投資', '株式', '経済', 'finance', 'stock', 'money', '暗号資産', '仮想通貨', '相場', '配当', '積立', '金利', 'ドル', '円', 'トレード'],
    title: 'Finance & Markets',
    badge: '📈 FINANCE',
    gradient: ['#042f2e', '#0f766e'],
    photoUrls: [
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=600&auto=format&fit=crop&q=80'
    ],
    illustrationSvgs: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_fn1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#042f2e"/>
            <stop offset="50%" stop-color="#115e59"/>
            <stop offset="100%" stop-color="#14b8a6"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_fn1)"/>
        <g stroke="#2dd4bf" stroke-width="1.5">
          <line x1="45" y1="35" x2="45" y2="85"/>
          <rect x="38" y="45" width="14" height="25" fill="#0d9488"/>
          <line x1="85" y1="25" x2="85" y2="75"/>
          <rect x="78" y="32" width="14" height="30" fill="#2dd4bf"/>
          <line x1="125" y1="40" x2="125" y2="90"/>
          <rect x="118" y="50" width="14" height="28" fill="#0d9488"/>
        </g>
        <path d="M 30,85 L 75,65 L 120,72 L 170,45 L 220,50 L 285,18" fill="none" stroke="#5eead4" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="285" cy="18" r="6" fill="#facc15" stroke="#ffffff" stroke-width="2"/>
        <g transform="translate(230, 60)" fill="#facc15" stroke="#ca8a04" stroke-width="1.5">
          <ellipse cx="20" cy="30" rx="18" ry="6"/>
          <ellipse cx="20" cy="22" rx="18" ry="6"/>
          <ellipse cx="20" cy="14" rx="18" ry="6"/>
          <ellipse cx="20" cy="6" rx="18" ry="6"/>
        </g>
      </svg>`
    ]
  },
  {
    id: 'fortune',
    keywords: ['開運', '宝くじ', 'ギャンブル', '占い', 'fortune', 'lucky', '金運', '神社', 'パワースポット', '当選', '吉日', 'スピリチュアル'],
    title: 'Fortune & Luck',
    badge: '🍀 FORTUNE',
    gradient: ['#713f12', '#ca8a04'],
    photoUrls: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80'
    ],
    illustrationSvgs: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_ft1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#422006"/>
            <stop offset="50%" stop-color="#854d0e"/>
            <stop offset="100%" stop-color="#eab308"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_ft1)"/>
        <g fill="#fef08a" opacity="0.8">
          <polygon points="60,20 63,28 71,31 63,34 60,42 57,34 49,31 57,28"/>
          <polygon points="180,15 182,21 188,23 182,25 180,31 178,25 172,23 178,21"/>
          <polygon points="260,35 262,41 268,43 262,45 260,51 258,45 252,43 258,41"/>
        </g>
        <g transform="translate(100, 25)" fill="#4ade80" stroke="#15803d" stroke-width="1.5">
          <circle cx="20" cy="20" r="14"/>
          <circle cx="44" cy="20" r="14"/>
          <circle cx="20" cy="44" r="14"/>
          <circle cx="44" cy="44" r="14"/>
          <path d="M 32,36 Q 30,65 20,70" stroke="#15803d" stroke-width="3" fill="none"/>
        </g>
        <g transform="translate(200, 48)">
          <polygon points="15,20 45,20 55,40 5,40" fill="#fde047" stroke="#ca8a04" stroke-width="2"/>
          <ellipse cx="30" cy="20" rx="15" ry="5" fill="#facc15"/>
        </g>
      </svg>`
    ]
  },
  {
    id: 'self',
    keywords: ['自己分析', '自分史', '誕生日', '牡牛座', '星座', 'ホロスコープ', '日記', 'メンタル', '振り返り', '内省', 'マインド', '哲学', '性格'],
    title: 'Self Analysis & Identity',
    badge: '🌌 IDENTITY',
    gradient: ['#1e1b4b', '#4338ca'],
    photoUrls: [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&auto=format&fit=crop&q=80'
    ],
    illustrationSvgs: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_sf1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="50%" stop-color="#312e81"/>
            <stop offset="100%" stop-color="#6366f1"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_sf1)"/>
        <g stroke="#a5b4fc" stroke-width="1.5" opacity="0.8" fill="none">
          <path d="M 40,70 L 90,40 L 140,55 L 180,25 L 220,60 L 270,30 L 290,75"/>
          <path d="M 90,40 L 110,85 L 140,55"/>
          <path d="M 180,25 L 200,75 L 220,60"/>
        </g>
        <circle cx="40" cy="70" r="4" fill="#ffffff"/>
        <circle cx="90" cy="40" r="5" fill="#c7d2fe"/>
        <circle cx="110" cy="85" r="3" fill="#ffffff"/>
        <circle cx="140" cy="55" r="5" fill="#818cf8"/>
        <circle cx="180" cy="25" r="6" fill="#ffffff"/>
        <circle cx="200" cy="75" r="3" fill="#c7d2fe"/>
        <circle cx="220" cy="60" r="5" fill="#818cf8"/>
        <circle cx="270" cy="30" r="5" fill="#ffffff"/>
        <circle cx="290" cy="75" r="4" fill="#c7d2fe"/>
        <g transform="translate(145, 60)" stroke="#e0e7ff" stroke-width="2" fill="none">
          <circle cx="15" cy="25" r="10"/>
          <path d="M 5,15 Q 15,22 25,15"/>
        </g>
      </svg>`
    ]
  },
  {
    id: 'memo',
    keywords: ['日常', 'メモ', '備忘録', '緊急', 'todo', 'memo', 'note', 'タスク', '日課', '記録', '保存', '一覧', '連絡先'],
    title: 'Daily Notes & Quick Memo',
    badge: '📝 DAILY MEMO',
    gradient: ['#1e293b', '#475569'],
    photoUrls: [
      'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=600&auto=format&fit=crop&q=80'
    ],
    illustrationSvgs: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_mm1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#18181b"/>
            <stop offset="50%" stop-color="#3f3f46"/>
            <stop offset="100%" stop-color="#71717a"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_mm1)"/>
        <g transform="translate(45, 20)">
          <rect x="0" y="0" width="110" height="80" rx="4" fill="#f4f4f5" stroke="#e4e4e7" stroke-width="2"/>
          <line x1="25" y1="20" x2="95" y2="20" stroke="#a1a1aa" stroke-width="2"/>
          <line x1="25" y1="36" x2="95" y2="36" stroke="#a1a1aa" stroke-width="2"/>
          <line x1="25" y1="52" x2="95" y2="52" stroke="#a1a1aa" stroke-width="2"/>
          <line x1="25" y1="68" x2="70" y2="68" stroke="#a1a1aa" stroke-width="2"/>
          <circle cx="12" cy="20" r="4" fill="#22c55e"/>
          <circle cx="12" cy="36" r="4" fill="#22c55e"/>
          <circle cx="12" cy="52" r="4" fill="#3b82f6"/>
          <circle cx="12" cy="68" r="4" fill="#e4e4e7"/>
        </g>
        <g transform="translate(195, 30) rotate(35)">
          <rect x="0" y="0" width="12" height="60" rx="2" fill="#f59e0b"/>
          <polygon points="0,60 12,60 6,75" fill="#fde68a"/>
          <polygon points="4,70 8,70 6,75" fill="#18181b"/>
        </g>
      </svg>`
    ]
  },
  {
    id: 'future',
    keywords: ['将来', '今後', '未来', '目標', '暮らし', 'future', 'vision', 'goal', '夢', '計画', 'プラン', '方針'],
    title: 'Future & Vision',
    badge: '🚀 FUTURE VISION',
    gradient: ['#1e1b4b', '#0284c7'],
    photoUrls: [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80'
    ],
    illustrationSvgs: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
        <defs>
          <linearGradient id="g_ftr1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0c0a09"/>
            <stop offset="50%" stop-color="#1e1b4b"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="url(#g_ftr1)"/>
        <circle cx="160" cy="85" r="40" fill="#38bdf8" opacity="0.35"/>
        <polygon points="40,120 110,60 180,120" fill="#1e293b"/>
        <polygon points="130,120 210,40 290,120" fill="#0f172a"/>
        <polygon points="190,58 210,40 230,58" fill="#f0f9ff"/>
        <g transform="translate(230, 20)">
          <line x1="10" y1="40" x2="40" y2="10" stroke="#f0f9ff" stroke-width="3"/>
          <line x1="35" y1="5" x2="45" y2="15" stroke="#38bdf8" stroke-width="2.5"/>
          <polygon points="45,5 48,11 54,14 48,17 45,23 42,17 36,14 42,11" fill="#facc15"/>
        </g>
      </svg>`
    ]
  }
];

// デフォルトのフォルダー用ビジュアル
const DEFAULT_CATEGORY_THEME: CategoryTheme = {
  id: 'general',
  keywords: [],
  title: 'Folder Directory',
  badge: '📁 DIRECTORY',
  gradient: ['#1e293b', '#334155'],
  photoUrls: [
    'https://images.unsplash.com/photo-1507842229451-7f01be7f70d2?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80'
  ],
  illustrationSvgs: [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
      <defs>
        <linearGradient id="g_gen1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="50%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#64748b"/>
        </linearGradient>
      </defs>
      <rect width="320" height="120" fill="url(#g_gen1)"/>
      <g transform="translate(110, 25)" fill="#e2e8f0" opacity="0.85">
        <path d="M 10,0 L 40,0 L 50,12 L 90,12 C 95,12 100,17 100,22 L 100,60 C 100,65 95,70 90,70 L 10,70 C 5,70 0,65 0,60 L 0,10 C 0,5 5,0 10,0 Z" fill="#475569" stroke="#94a3b8" stroke-width="2"/>
      </g>
    </svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="100%" height="100%">
      <defs>
        <linearGradient id="g_gen2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="50%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#3b82f6"/>
        </linearGradient>
      </defs>
      <rect width="320" height="120" fill="url(#g_gen2)"/>
      <g stroke="#60a5fa" stroke-width="2" fill="none" opacity="0.7">
        <circle cx="160" cy="60" r="35"/>
        <line x1="80" y1="60" x2="240" y2="60"/>
        <line x1="160" y1="20" x2="160" y2="100"/>
      </g>
    </svg>`
  ]
};

/**
 * フォルダー名から最適なテーマを自動判定して取得
 */
export function getCategoryTheme(folderName: string): CategoryTheme {
  if (!folderName) return DEFAULT_CATEGORY_THEME;
  // 00_, 01_, 02-, 1. などの数字・記号プレフィックスを取り除いたコア名もチェック
  const rawLower = folderName.toLowerCase().trim();
  const strippedLower = rawLower.replace(/^[\d_.\-\s]+/, '').trim();
  
  for (const theme of CATEGORY_THEMES) {
    if (theme.keywords.some(kw => {
      const k = kw.toLowerCase();
      return rawLower.includes(k) || (strippedLower && strippedLower.includes(k));
    })) {
      return theme;
    }
  }
  return DEFAULT_CATEGORY_THEME;
}

/**
 * フォルダーに対応するカバー画像URLまたはSVG Data URIを取得
 */
export function getFolderCoverData(
  folderName: string,
  folderPath: string,
  settings: FolderVisualSettings
): {
  backgroundUrl: string;
  fallbackSvgDataUri: string;
  badge: string;
  gradient: [string, string];
  isCustom: boolean;
  currentIndex: number;
  totalCandidates: number;
  position: FolderCoverPosition;
  positionPercent: number;
  backgroundPosition: string;
} {
  const theme = getCategoryTheme(folderName);
  const key = folderPath || folderName;
  const customUrl = settings.customCovers?.[folderPath] || settings.customCovers?.[folderName];
  const hasCustom = !!customUrl;

  // 画像位置の判定（個別設定 > 全体デフォルト > 'center'）
  const pos: FolderCoverPosition = settings.customPositions?.[folderPath] 
    ?? settings.customPositions?.[folderName] 
    ?? settings.defaultPosition 
    ?? 'center';

  const positionPercent = parsePositionPercent(pos);
  const backgroundPosition = `center ${positionPercent}%`;

  const presets = settings.style === 'photo'
    ? (theme.photoUrls && theme.photoUrls.length > 0 ? theme.photoUrls : DEFAULT_CATEGORY_THEME.photoUrls)
    : (theme.illustrationSvgs && theme.illustrationSvgs.length > 0 ? theme.illustrationSvgs : DEFAULT_CATEGORY_THEME.illustrationSvgs);
  
  const totalCandidates = hasCustom ? 1 + presets.length : presets.length;
  const rawIdx = settings.variations?.[key] ?? settings.variations?.[folderName] ?? 0;
  const currentIndex = ((rawIdx % totalCandidates) + totalCandidates) % totalCandidates;

  // テーマに対応するSVGイラストDataURI（常時フォールバックとして利用可能）
  const illustrations = theme.illustrationSvgs && theme.illustrationSvgs.length > 0 ? theme.illustrationSvgs : DEFAULT_CATEGORY_THEME.illustrationSvgs;
  const fallbackSvgClean = illustrations[0].trim();
  const defaultSvgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(fallbackSvgClean)}`;

  // 1. 独自画像が登録されており、かつ現在のインデックスが 0 の場合 -> 独自画像を表示
  if (hasCustom && currentIndex === 0) {
    return {
      backgroundUrl: customUrl,
      fallbackSvgDataUri: defaultSvgDataUri,
      badge: '✨ CUSTOM',
      gradient: theme.gradient || ['#0f172a', '#1e293b'],
      isCustom: true,
      currentIndex: 1,
      totalCandidates,
      position: pos,
      positionPercent,
      backgroundPosition
    };
  }

  // プリセット用インデックス (hasCustom の場合は 1〜N なので -1)
  const presetIdx = hasCustom ? currentIndex - 1 : currentIndex;
  const currentSvgClean = illustrations[presetIdx % illustrations.length].trim();
  const currentSvgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(currentSvgClean)}`;

  if (settings.style === 'photo') {
    const photoUrl = presets[presetIdx % presets.length];
    return {
      backgroundUrl: photoUrl,
      fallbackSvgDataUri: currentSvgDataUri,
      badge: theme.badge,
      gradient: theme.gradient,
      isCustom: false,
      currentIndex: currentIndex + 1,
      totalCandidates,
      position: pos,
      positionPercent,
      backgroundPosition
    };
  }

  // イラスト
  return {
    backgroundUrl: currentSvgDataUri,
    fallbackSvgDataUri: currentSvgDataUri,
    badge: theme.badge,
    gradient: theme.gradient,
    isCustom: false,
    currentIndex: currentIndex + 1,
    totalCandidates,
    position: pos,
    positionPercent,
    backgroundPosition
  };
}

/**
 * フォルダーのカバー画像を次の候補に順送り（シャッフル）
 * ※ 独自画像が登録されている場合も消去せず、巡回リストの1つとして保持します
 */
export function shuffleFolderCover(
  folderPath: string,
  folderName: string,
  settings: FolderVisualSettings
): FolderVisualSettings {
  const key = folderPath || folderName;
  const theme = getCategoryTheme(folderName);
  const customUrl = settings.customCovers?.[folderPath] || settings.customCovers?.[folderName];
  const hasCustom = !!customUrl;

  const presets = settings.style === 'photo' 
    ? (theme.photoUrls && theme.photoUrls.length > 0 ? theme.photoUrls : DEFAULT_CATEGORY_THEME.photoUrls)
    : (theme.illustrationSvgs && theme.illustrationSvgs.length > 0 ? theme.illustrationSvgs : DEFAULT_CATEGORY_THEME.illustrationSvgs);

  const totalCandidates = hasCustom ? 1 + presets.length : presets.length;
  const currentIdx = settings.variations?.[key] ?? settings.variations?.[folderName] ?? 0;
  const nextIdx = (currentIdx + 1) % totalCandidates;

  const nextSettings: FolderVisualSettings = {
    ...settings,
    variations: {
      ...(settings.variations || {}),
      [key]: nextIdx,
      [folderName]: nextIdx
    }
  };

  saveFolderVisualSettings(nextSettings);
  return nextSettings;
}

/**
 * フォルダーのカバー画像表示位置（上 / 中央 / 下）を設定
 */
export function setFolderCoverPosition(
  folderPath: string,
  folderName: string,
  position: FolderCoverPosition,
  settings: FolderVisualSettings
): FolderVisualSettings {
  const key = folderPath || folderName;
  const nextPositions = { ...(settings.customPositions || {}) };
  nextPositions[key] = position;
  if (folderName) nextPositions[folderName] = position;
  if (folderPath) nextPositions[folderPath] = position;

  const nextSettings: FolderVisualSettings = {
    ...settings,
    customPositions: nextPositions
  };

  saveFolderVisualSettings(nextSettings);
  return nextSettings;
}

/**
 * フォルダーのリネーム時に、保存されているビジュアル設定（独自画像、候補インデックス、画像位置）を
 * 新しいフォルダー名・パスへと自動引き継ぎ・移行する
 */
export function migrateFolderVisualSettings(
  oldPath: string,
  newPath: string,
  existingSettings?: FolderVisualSettings
): FolderVisualSettings {
  const settings = existingSettings ? { ...existingSettings } : loadFolderVisualSettings();
  const oldShort = oldPath.split('/').pop() || oldPath;
  const newShort = newPath.split('/').pop() || newPath;

  const nextCovers = { ...(settings.customCovers || {}) };
  const nextVariations = { ...(settings.variations || {}) };
  const nextPositions = { ...(settings.customPositions || {}) };

  // 1. 直下フォルダーの引き継ぎ
  if (nextCovers[oldPath]) {
    nextCovers[newPath] = nextCovers[oldPath];
  }
  if (nextCovers[oldShort]) {
    nextCovers[newShort] = nextCovers[oldShort];
  }

  if (nextVariations[oldPath] !== undefined) {
    nextVariations[newPath] = nextVariations[oldPath];
  }
  if (nextVariations[oldShort] !== undefined) {
    nextVariations[newShort] = nextVariations[oldShort];
  }

  if (nextPositions[oldPath] !== undefined) {
    nextPositions[newPath] = nextPositions[oldPath];
  }
  if (nextPositions[oldShort] !== undefined) {
    nextPositions[newShort] = nextPositions[oldShort];
  }

  // 2. 配下のサブフォルダー群の引き継ぎ（例: oldPath/2026-03 -> newPath/2026-03）
  const oldPrefix = oldPath + '/';
  const newPrefix = newPath + '/';

  Object.keys(nextCovers).forEach(key => {
    if (key.startsWith(oldPrefix)) {
      const subKey = newPrefix + key.slice(oldPrefix.length);
      nextCovers[subKey] = nextCovers[key];
    }
  });

  Object.keys(nextVariations).forEach(key => {
    if (key.startsWith(oldPrefix)) {
      const subKey = newPrefix + key.slice(oldPrefix.length);
      nextVariations[subKey] = nextVariations[key];
    }
  });

  Object.keys(nextPositions).forEach(key => {
    if (key.startsWith(oldPrefix)) {
      const subKey = newPrefix + key.slice(oldPrefix.length);
      nextPositions[subKey] = nextPositions[key];
    }
  });

  const updatedSettings: FolderVisualSettings = {
    ...settings,
    customCovers: nextCovers,
    variations: nextVariations,
    customPositions: nextPositions
  };

  saveFolderVisualSettings(updatedSettings);
  return updatedSettings;
}
