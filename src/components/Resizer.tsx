import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../AppContext';

export const Resizer = () => {
  const { sidebarPosition } = useAppContext();
  const [isResizing, setIsResizing] = useState(false);
  const resizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      let newWidth = sidebarPosition === 'right' 
        ? window.innerWidth - e.clientX 
        : e.clientX;

      if (newWidth < 180) newWidth = 180;
      if (newWidth > 800) newWidth = 800;
      
      document.documentElement.style.setProperty('--sb-width', `${newWidth}px`);
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      
      let finalWidth = sidebarPosition === 'right' 
        ? window.innerWidth - e.clientX 
        : e.clientX;

      if (finalWidth < 180) finalWidth = 180;
      if (finalWidth > 800) finalWidth = 800;
      localStorage.setItem('lv_sbWidth', finalWidth.toString());
      window.dispatchEvent(new Event('settingsChanged'));
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarPosition]);

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
