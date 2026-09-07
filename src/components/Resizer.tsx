import React, { useState, useEffect, useRef } from 'react';

export const Resizer = () => {
  const [isResizing, setIsResizing] = useState(false);
  const resizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      let newWidth = e.clientX;
      if (newWidth < 180) newWidth = 180;
      if (newWidth > 800) newWidth = 800; // Increased max width
      
      document.documentElement.style.setProperty('--sb-width', `${newWidth}px`);
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      
      let finalWidth = e.clientX;
      if (finalWidth < 180) finalWidth = 180;
      if (finalWidth > 800) finalWidth = 800;
      localStorage.setItem('lv_sbWidth', finalWidth.toString());
      window.dispatchEvent(new Event('settingsChanged'));
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; // Prevent text selection while resizing
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      ref={resizerRef}
      onMouseDown={() => setIsResizing(true)}
      style={{
        width: '6px',
        cursor: 'col-resize',
        background: 'transparent',
        position: 'relative',
        zIndex: 100,
        marginLeft: '-3px',
        marginRight: '-3px'
      }}
      className="resizer-handle"
    >
      {/* Optional: visual indicator on hover could be added via CSS */}
    </div>
  );
};
