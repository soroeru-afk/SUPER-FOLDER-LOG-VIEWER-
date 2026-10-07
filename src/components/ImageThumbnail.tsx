import React, { useState, useEffect } from 'react';
import { FileObj } from '../types';
import { ImageIcon } from './Icons';

// メモリキャッシュ: 同一ファイルのBlob URLを保持して再読み込みやレスポンス低下を防止
const imageBlobUrlCache = new Map<string, string>();
const pendingBlobPromises = new Map<string, Promise<string | null>>();

export const getCachedImageUrl = async (file: FileObj): Promise<string | null> => {
  if (file.imageUrl) return file.imageUrl;
  const key = `${file.category || ''}::${file.filename}`;
  if (imageBlobUrlCache.has(key)) {
    return imageBlobUrlCache.get(key) || null;
  }
  if (pendingBlobPromises.has(key)) {
    return pendingBlobPromises.get(key)!;
  }
  let handle = file.handle;
  if (!handle && file.folderHandle) {
    try {
      handle = await file.folderHandle.getFileHandle(file.filename);
      file.handle = handle;
    } catch (e) {}
  }
  if (!handle) return null;

  const promise = handle.getFile().then((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    imageBlobUrlCache.set(key, url);
    pendingBlobPromises.delete(key);
    return url;
  }).catch((err) => {
    console.warn('Image thumbnail load error:', file.filename, err);
    pendingBlobPromises.delete(key);
    return null;
  });

  pendingBlobPromises.set(key, promise);
  return promise;
};

interface ImageThumbnailProps {
  file: FileObj;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  fit?: 'cover' | 'contain';
  alt?: string;
}

export const ImageThumbnail: React.FC<ImageThumbnailProps> = ({
  file,
  size,
  width,
  height,
  className = '',
  style = {},
  fit = 'cover',
  alt = ''
}) => {
  const cacheKey = `${file.category || ''}::${file.filename}`;
  const cached = file.imageUrl || imageBlobUrlCache.get(cacheKey) || '';

  const [src, setSrc] = useState<string>(cached);
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(!cached && Boolean(file.handle || file.folderHandle || file.imageUrl));

  useEffect(() => {
    let active = true;

    if (file.imageUrl) {
      setSrc(file.imageUrl);
      setLoading(false);
      setError(false);
      return;
    }

    if (imageBlobUrlCache.has(cacheKey)) {
      setSrc(imageBlobUrlCache.get(cacheKey)!);
      setLoading(false);
      setError(false);
      return;
    }

    if (file.handle) {
      setLoading(true);
      getCachedImageUrl(file).then((url) => {
        if (!active) return;
        if (url) {
          setSrc(url);
          setError(false);
        } else {
          setError(true);
        }
        setLoading(false);
      }).catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });
    } else {
      setError(true);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [file.filename, file.category, file.handle, file.imageUrl, cacheKey]);

  const w = width ?? size ?? '100%';
  const h = height ?? size ?? '100%';

  if (error || (!loading && !src)) {
    return (
      <div 
        className={`img-thumb-fallback ${className}`}
        style={{
          width: w,
          height: h,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.06)',
          border: '1px solid var(--panel-border, rgba(120,120,120,0.2))',
          borderRadius: '0px',
          userSelect: 'none',
          color: 'var(--main-text, inherit)',
          opacity: 0.6,
          ...style
        }}
      >
        <ImageIcon size={typeof size === 'number' ? Math.max(12, size * 0.5) : 18} />
      </div>
    );
  }

  return (
    <div 
      className={`img-thumb-container ${className}`}
      style={{
        width: w,
        height: h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        background: 'rgba(0,0,0,0.04)',
        border: '1px solid var(--panel-border, rgba(120,120,120,0.2))',
        borderRadius: '0px',
        // 微細な透過チェッカーボード
        backgroundImage: `
          linear-gradient(45deg, rgba(120, 120, 120, 0.08) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(120, 120, 120, 0.08) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, rgba(120, 120, 120, 0.08) 75%),
          linear-gradient(-45deg, transparent 75%, rgba(120, 120, 120, 0.08) 75%)
        `,
        backgroundSize: '10px 10px',
        backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
        ...style
      }}
    >
      {loading ? (
        <span style={{ fontSize: '11px', opacity: 0.5 }}>⏳</span>
      ) : (
        <img 
          src={src} 
          alt={alt || file.filename}
          loading="lazy"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: fit,
            display: 'block'
          }}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
};
