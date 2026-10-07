import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileObj } from '../types';
import { downloadFileBlob, isImageFilename } from '../utils';

interface ImageViewerProps {
  file: FileObj;
  lang: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ file, lang }) => {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageSrc, setImageSrc] = useState<string>(file.imageUrl || '');
  const [isLoading, setIsLoading] = useState<boolean>(!file.imageUrl);
  const [loadError, setLoadError] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // ファイル変更時に画像ソースを解決し、表示をリセット
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setImgDimensions(null);
    setLoadError(false);

    let active = true;
    let objectUrlToRevoke: string | null = null;

    const resolveImage = async () => {
      if (file.imageUrl) {
        setImageSrc(file.imageUrl);
        setIsLoading(false);
        return;
      }

      if (file.handle) {
        setIsLoading(true);
        try {
          const fileBlob = await file.handle.getFile();
          if (!active) return;
          const url = URL.createObjectURL(fileBlob);
          objectUrlToRevoke = url;
          setImageSrc(url);
          setIsLoading(false);
        } catch (e) {
          console.error('Failed to load image from handle:', e);
          if (active) {
            setLoadError(true);
            setIsLoading(false);
          }
        }
      } else {
        setIsLoading(false);
        setLoadError(true);
      }
    };

    resolveImage();

    return () => {
      active = false;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [file.filename, file.category, file.handle, file.imageUrl]);

  // 画像読み込み完了時に自然サイズを取得し、画面に初期フィット
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setImgDimensions({ width: nw, height: nh });
    setIsLoading(false);

    // 初回フィット計算
    if (containerRef.current) {
      const cw = containerRef.current.clientWidth - 40;
      const ch = containerRef.current.clientHeight - 40;
      if (cw > 0 && ch > 0 && nw > 0 && nh > 0) {
        const scaleW = cw / nw;
        const scaleH = ch / nh;
        const fitScale = Math.min(1, scaleW, scaleH);
        setScale(Math.max(0.1, Number(fitScale.toFixed(2))));
      }
    }
  };

  // ズームイン
  const handleZoomIn = () => {
    setScale(prev => Math.min(10, Number((prev * 1.25).toFixed(2))));
  };

  // ズームアウト
  const handleZoomOut = () => {
    setScale(prev => Math.max(0.1, Number((prev / 1.25).toFixed(2))));
  };

  // 原寸大 (100%)
  const handleReset100 = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // 画面にフィット
  const handleFitToScreen = () => {
    if (!containerRef.current || !imgDimensions) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      return;
    }
    const cw = containerRef.current.clientWidth - 40;
    const ch = containerRef.current.clientHeight - 40;
    const nw = rotation % 180 === 0 ? imgDimensions.width : imgDimensions.height;
    const nh = rotation % 180 === 0 ? imgDimensions.height : imgDimensions.width;
    if (cw > 0 && ch > 0 && nw > 0 && nh > 0) {
      const scaleW = cw / nw;
      const scaleH = ch / nh;
      const fitScale = Math.min(scaleW, scaleH);
      setScale(Math.max(0.05, Number(fitScale.toFixed(2))));
      setPosition({ x: 0, y: 0 });
    }
  };

  // 90度回転
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // ダウンロード実行
  const handleDownload = async () => {
    try {
      if (file.handle) {
        const fileBlob = await file.handle.getFile();
        await downloadFileBlob(fileBlob, file.filename);
      } else if (imageSrc) {
        const resp = await fetch(imageSrc);
        const blob = await resp.blob();
        await downloadFileBlob(blob, file.filename);
      }
    } catch (e: any) {
      alert(lang === 'en' ? `Download failed: ${e.message}` : `ダウンロードに失敗しました: ${e.message}`);
    }
  };

  // マウスホイールによるズーム（ネイティブリスナーで非パッシブ登録し、PWAでの親画面スクロール連動を完全防止）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 1.15 : 0.85;
      setScale(prev => {
        const next = prev * delta;
        return Math.min(10, Math.max(0.05, Number(next.toFixed(2))));
      });
    };

    container.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onNativeWheel);
    };
  }, []);

  // マウスドラッグによる移動（パン）
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // 左クリックのみ
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ダブルクリックで Fit ⇔ 100%
  const handleDoubleClick = () => {
    if (Math.abs(scale - 1) < 0.05) {
      handleFitToScreen();
    } else {
      handleReset100();
    }
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        width: '100%', 
        height: '100%', 
        minHeight: '480px',
        background: 'var(--main-bg, #0B132B)',
        position: 'relative',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* 上部コントロールバー */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 14px',
          background: 'var(--panel-bg, rgba(20, 25, 38, 0.95))',
          borderBottom: '1px solid var(--panel-border, rgba(120, 120, 120, 0.25))',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}
      >
        {/* 左側: 解像度＆ファイル情報 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11.5px', color: 'var(--main-text, #ffffff)', fontWeight: 600 }}>
          <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            🖼️ {file.filename}
          </span>
          {imgDimensions && (
            <span style={{ fontFamily: 'monospace', opacity: 0.9, background: 'rgba(120,120,120,0.15)', padding: '2px 8px', border: '1px solid var(--panel-border)', borderRadius: '0px', color: 'var(--main-text, inherit)' }}>
              {imgDimensions.width} × {imgDimensions.height} px
            </span>
          )}
        </div>

        {/* 右側: 拡大縮小・回転・ダウンロード・リセットボタン群 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {/* ズームアウト */}
          <button
            type="button"
            className="tool-btn"
            onClick={handleZoomOut}
            title={lang === 'en' ? 'Zoom Out (or mouse wheel)' : '縮小 (またはマウスホイール)'}
            style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 700 }}
          >
            🔍－
          </button>

          {/* ズーム倍率（クリックで100%） */}
          <button
            type="button"
            className="tool-btn"
            onClick={handleReset100}
            title={lang === 'en' ? 'Click to reset to 100%' : 'クリックで等倍 (100%) にリセット'}
            style={{ 
              padding: '4px 8px', 
              fontSize: '11px', 
              fontFamily: 'monospace', 
              minWidth: '54px',
              textAlign: 'center',
              fontWeight: 700
            }}
          >
            {Math.round(scale * 100)}%
          </button>

          {/* ズームイン */}
          <button
            type="button"
            className="tool-btn"
            onClick={handleZoomIn}
            title={lang === 'en' ? 'Zoom In (or mouse wheel)' : '拡大 (またはマウスホイール)'}
            style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 700 }}
          >
            🔍＋
          </button>

          {/* 画面に合わせる */}
          <button
            type="button"
            className="tool-btn"
            onClick={handleFitToScreen}
            title={lang === 'en' ? 'Fit to window' : '画面サイズに合わせる (Fit)'}
            style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600 }}
          >
            ↔ {lang === 'en' ? 'Fit' : 'フィット'}
          </button>

          {/* 回転 */}
          <button
            type="button"
            className="tool-btn"
            onClick={handleRotate}
            title={lang === 'en' ? 'Rotate 90°' : '90度回転'}
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            🔄 {rotation !== 0 ? `${rotation}°` : (lang === 'en' ? 'Rotate' : '回転')}
          </button>

          {/* ダウンロード */}
          <button
            type="button"
            className="tool-btn primary"
            onClick={handleDownload}
            title={lang === 'en' ? 'Download this image' : 'この画像をダウンロード保存'}
            style={{ 
              padding: '4px 10px', 
              fontSize: '11px', 
              fontWeight: 700, 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px',
              background: 'var(--sb-accent, #3b82f6)',
              color: '#ffffff'
            }}
          >
            📥 {lang === 'en' ? 'Download' : 'ダウンロード'}
          </button>
        </div>
      </div>

      {/* メイン画像キャンバス表示エリア */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          minHeight: '440px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          overscrollBehavior: 'contain',
          touchAction: 'none',
          cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'default'),
          // 透過チェッカーボード背景（ダーク＆ライト対応）
          backgroundImage: `
            linear-gradient(45deg, rgba(120, 120, 120, 0.08) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(120, 120, 120, 0.08) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(120, 120, 120, 0.08) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(120, 120, 120, 0.08) 75%)
          `,
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px'
        }}
      >
        {isLoading && (
          <div style={{ color: 'var(--main-text, #ffffff)', opacity: 0.7, fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>⏳</span>
            <span>{lang === 'en' ? 'Loading image...' : '画像を読み込み中...'}</span>
          </div>
        )}

        {loadError && (
          <div style={{ color: '#ef4444', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <span style={{ fontSize: '28px' }}>⚠️</span>
            <span>{lang === 'en' ? 'Failed to display image file.' : '画像ファイルの表示に失敗しました。'}</span>
            <button 
              type="button"
              className="tool-btn" 
              onClick={handleDownload}
              style={{ marginTop: '8px' }}
            >
              📥 {lang === 'en' ? 'Try Downloading Direct File' : '直接ダウンロードを試す'}
            </button>
          </div>
        )}

        {!isLoading && !loadError && imageSrc && (
          <img
            ref={imgRef}
            src={imageSrc}
            alt={file.filename}
            onLoad={handleImageLoad}
            onError={() => {
              setLoadError(true);
              setIsLoading(false);
            }}
            draggable={false}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              maxWidth: 'none',
              maxHeight: 'none',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              pointerEvents: 'none', // ドラッグイベントをコンテナで処理
              imageRendering: scale > 2 ? 'pixelated' : 'auto'
            }}
          />
        )}

        {/* 画面下部の操作ヒント */}
        <div 
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '12px',
            background: 'rgba(0, 0, 0, 0.65)',
            color: '#cbd5e1',
            padding: '3px 8px',
            fontSize: '10px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            borderRadius: '0px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {lang === 'en' ? 'Wheel: Zoom | Drag: Pan | Double-Click: Fit' : 'ホイール: 拡大縮小 | ドラッグ: 移動 | Wクリック: フィット'}
        </div>
      </div>
    </div>
  );
};
