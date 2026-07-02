import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../AppContext';

export const RenameModal: React.FC = () => {
  const { renameDialogState, closeRenameDialog, execRename, t } = useAppContext();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renameDialogState?.isOpen) {
      setInputValue(renameDialogState.currentName);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Select text before extension
          const extIndex = renameDialogState.currentName.lastIndexOf('.');
          if (extIndex > 0) {
            inputRef.current.setSelectionRange(0, extIndex);
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [renameDialogState]);

  if (!renameDialogState?.isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    execRename(inputValue);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }} onClick={closeRenameDialog}>
      <div style={{
        backgroundColor: '#ffffff',
        color: '#000000',
        padding: '20px',
        borderRadius: '8px',
        width: '400px',
        maxWidth: '90%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        border: '1px solid #ccc'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>{t.main.renamePrompt || '名前を変更'}</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '20px',
              backgroundColor: '#f5f5f5',
              color: '#000000',
              border: '1px solid #ccc',
              borderRadius: '4px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={closeRenameDialog} style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1px solid #ccc',
              color: '#333',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              {t.main.cancel || 'Cancel'}
            </button>
            <button type="submit" style={{
              padding: '6px 12px',
              backgroundColor: 'var(--sb-accent)',
              border: 'none',
              color: '#fff',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              {t.main.ok || 'OK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
