import React, { useState, useEffect } from 'react';
import { Note, NoteColor, COLOR_PALETTE } from '../types';

interface CreateNoteProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Omit<Note, 'id' | 'createdAt'>) => void;
  initialNote?: Note | null;
}

const CreateNote: React.FC<CreateNoteProps> = ({ isOpen, onClose, onSave, initialNote }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<NoteColor>(NoteColor.DEFAULT);

  // Reset or Populate state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialNote) {
        setTitle(initialNote.title);
        setContent(initialNote.content);
        // Ensure color is one of the enum values or default
        setColor((initialNote.color as NoteColor) || NoteColor.DEFAULT);
      } else {
        setTitle('');
        setContent('');
        setColor(NoteColor.DEFAULT);
      }
    }
  }, [isOpen, initialNote]);

  const handleSaveAndClose = () => {
    if (title.trim() || content.trim()) {
      onSave({
        title,
        content,
        color,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity" onClick={handleSaveAndClose}>
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg shadow-2xl rounded-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col max-h-[90vh] ${color}`}
      >
        <div className="flex flex-col p-2 overflow-y-auto no-scrollbar">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full p-4 pb-2 text-base font-bold bg-transparent border-none outline-none placeholder-gray-500 text-gray-900 dark:text-white font-['BioRhyme']`}
            autoFocus={!initialNote}
          />
          <textarea
            placeholder="Note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`w-full p-4 pt-2 text-sm bg-transparent border-none outline-none resize-none placeholder-gray-500 text-gray-800 dark:text-gray-100 min-h-[150px] font-['Archivo Narrow']`}
          />
        </div>
        
        <div className="p-3 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-black/20 rounded-b-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border border-gray-300 shadow-sm ${c === NoteColor.DEFAULT ? 'bg-white' : c.split(' ')[0]} hover:scale-110 transition-transform ${color === c ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                  aria-label="Change color"
                />
              ))}
            </div>

            <div className="flex items-center space-x-2 ml-auto">
              <button
                onClick={handleSaveAndClose}
                className="px-5 py-2 text-sm font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateNote;