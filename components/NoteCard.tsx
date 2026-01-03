import React, { useState, useRef } from 'react';
import { Note, COLOR_PALETTE, NoteColor } from '../types';

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onEdit: (note: Note) => void;
  showToast: (msg: string) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onDelete, onColorChange, onEdit, showToast }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Timers and state for gestures
  const timerOptions = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{x: number, y: number} | null>(null);
  const isPressed = useRef(false);
  const longPressTriggered = useRef(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(note.content).then(() => {
      setIsCopied(true);
      showToast("Content copied to clipboard!");
      
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const startPress = (clientX: number, clientY: number) => {
    isPressed.current = true;
    startPos.current = { x: clientX, y: clientY };
    longPressTriggered.current = false;

    // 500ms Timer for Options Menu
    timerOptions.current = setTimeout(() => {
      if (isPressed.current) {
        longPressTriggered.current = true;
        setShowOptions(true);
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        // We do NOT clear isPressed here, we wait for end event
      }
    }, 500);
  };

  const cancelPress = () => {
    if (timerOptions.current) clearTimeout(timerOptions.current);
    isPressed.current = false;
    startPos.current = null;
  };

  const endPress = () => {
    if (timerOptions.current) clearTimeout(timerOptions.current);
    
    // Only copy if it wasn't a long press and we are actually pressing
    if (isPressed.current && !longPressTriggered.current) {
        handleCopy();
    }
    
    isPressed.current = false;
    startPos.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startPress(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startPos.current) return;
    const moveX = Math.abs(e.touches[0].clientX - startPos.current.x);
    const moveY = Math.abs(e.touches[0].clientY - startPos.current.y);
    
    // Cancel if scrolled/moved significantly
    if (moveX > 10 || moveY > 10) {
      cancelPress();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startPress(e.clientX, e.clientY);
  };

  return (
    <>
      <div 
        className={`group relative flex flex-col h-[200px] rounded-xl border border-gray-200 dark:border-gray-700 p-3 transition-all duration-300 hover:shadow-md ${note.color} ${isCopied ? 'ring-2 ring-blue-500 transform scale-[1.02]' : ''} noselect cursor-pointer overflow-hidden`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={endPress}
        onMouseDown={handleMouseDown}
        onMouseUp={endPress}
        onMouseLeave={cancelPress}
      >
        {note.title && (
          <>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 break-words mb-1 font-['BioRhyme'] leading-tight flex-shrink-0">{note.title}</h3>
            <div className="w-full h-px bg-gray-300 dark:bg-gray-600 mb-1 flex-shrink-0"></div>
          </>
        )}
        
        <p className="text-slate-500 dark:text-slate-400 whitespace-pre-wrap break-words text-xs leading-relaxed font-['Archivo Narrow'] flex-grow overflow-y-auto pointer-events-none">{note.content}</p>
      </div>

      {/* Options Popup Modal */}
      {showOptions && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { e.stopPropagation(); setShowOptions(false); }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl transform scale-100 animate-scale-in"
          >
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white font-['Roboto_Flex']">Note Options</h3>
            
            <div className="mb-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide font-bold">Color</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => onColorChange(note.id, c)}
                    className={`w-8 h-8 rounded-full border border-gray-300 shadow-sm ${c === NoteColor.DEFAULT ? 'bg-white' : c.split(' ')[0]} ${note.color === c ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' : ''}`}
                    aria-label="Select color"
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { setShowOptions(false); onEdit(note); }}
                className="w-full py-3 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                <span>Edit Note</span>
              </button>

              <button 
                onClick={() => { onDelete(note.id); setShowOptions(false); }}
                className="w-full py-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                <span>Delete Note</span>
              </button>
              
              <button 
                onClick={() => setShowOptions(false)}
                className="w-full py-3 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NoteCard;
