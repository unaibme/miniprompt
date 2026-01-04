import React, { useState, useEffect, Suspense } from 'react';
import { Note, NoteColor } from './types';
import { notesService } from './services/notesService';

const Header = React.lazy(() => import('./components/Header'));
const CreateNote = React.lazy(() => import('./components/CreateNote'));
const NoteCard = React.lazy(() => import('./components/NoteCard'));

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load notes on mount
  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true);
      try {
        const fetchedNotes = await notesService.getAllNotes();
        if (fetchedNotes.length === 0) {
          // Create default welcome note if no notes exist
          const welcomeNote = await notesService.createNote({
            title: 'Welcome to Keep Clone!',
            content: 'Tap to copy. Hold for 500ms for options.',
            color: NoteColor.DEFAULT,
          });
          if (welcomeNote) {
            setNotes([welcomeNote]);
          }
        } else {
          setNotes(fetchedNotes);
        }
      } catch (error) {
        console.error('Error loading notes:', error);
        showToast('Failed to load notes');
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();

    // Subscribe to real-time changes
    const unsubscribe = notesService.subscribeToNotes((updatedNotes) => {
      setNotes(updatedNotes);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync pending operations when coming online
  useEffect(() => {
    const handleOnline = async () => {
      try {
        await notesService.syncPendingOperations();
        // Reload notes after sync
        const updatedNotes = await notesService.getAllNotes();
        setNotes(updatedNotes);
        showToast('Synced with server');
      } catch (error) {
        console.error('Error syncing:', error);
      }
    };

    if (isOnline) {
      handleOnline();
    }
  }, [isOnline]);

  const handleSaveNote = async (noteData: Omit<Note, 'id' | 'createdAt'>) => {
    try {
      if (editingNote) {
        // Update existing note
        const updatedNote = await notesService.updateNote(editingNote.id, noteData);
        if (updatedNote) {
          setNotes(prevNotes => 
            prevNotes.map(n => n.id === editingNote.id ? updatedNote : n)
          );
          showToast("Note updated");
        } else {
          showToast("Failed to update note");
        }
      } else {
        // Create new note
        const newNote = await notesService.createNote(noteData);
        if (newNote) {
          setNotes([newNote, ...notes]);
          showToast("Note created");
        } else {
          showToast("Failed to create note");
        }
      }
      setEditingNote(null);
    } catch (error) {
      console.error('Error saving note:', error);
      showToast("Failed to save note");
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const success = await notesService.deleteNote(id);
      if (success) {
        setNotes(notes.filter((n) => n.id !== id));
        showToast("Note deleted");
      } else {
        showToast("Failed to delete note");
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      showToast("Failed to delete note");
    }
  };

  const changeColor = async (id: string, color: string) => {
    try {
      const success = await notesService.updateNoteColor(id, color);
      if (success) {
        setNotes(notes.map((n) => (n.id === id ? { ...n, color } : n)));
      } else {
        showToast("Failed to update color");
      }
    } catch (error) {
      console.error('Error updating color:', error);
      showToast("Failed to update color");
    }
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setIsCreateModalOpen(true);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Suspense fallback={<div className="text-center mt-32 text-gray-400">Loading...</div>}>
      <div className="min-h-screen pt-20 pb-24 bg-white dark:bg-slate-900 transition-colors duration-300">
        {!isOnline && (
          <div className="bg-yellow-500 text-white text-center py-2 text-sm">
            You are offline. Changes will sync when online.
          </div>
        )}
        <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        <CreateNote
          isOpen={isCreateModalOpen}
          onClose={() => { setIsCreateModalOpen(false); setEditingNote(null); }}
          onSave={handleSaveNote}
          initialNote={editingNote}
        />

        <main className="w-full px-2 sm:px-4 max-w-7xl mx-auto">
          {isLoading ? (
            <div className="text-center mt-32 text-gray-400">
              <div className="flex justify-center mb-4">
                <svg className="animate-spin h-12 w-12" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-xl">Loading notes...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 auto-rows-[200px]">
                {filteredNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onDelete={deleteNote}
                    onColorChange={changeColor}
                    onEdit={openEditModal}
                    showToast={showToast}
                  />
                ))}
              </div>

              {filteredNotes.length === 0 && (
                  <div className="text-center mt-32 text-gray-400">
                      <div className="flex justify-center mb-4">
                          <svg className="w-24 h-24 opacity-20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                      </div>
                      <p className="text-xl">No notes found</p>
                  </div>
              )}
            </>
          )}
        </main>

        {/* Floating Action Button (FAB) */}
        <button
          onClick={() => { setEditingNote(null); setIsCreateModalOpen(true); }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex items-center justify-center text-gray-800 dark:text-white hover:scale-105 active:scale-95 transition-all duration-200 z-40 border border-gray-100 dark:border-gray-700"
          aria-label="Create new note"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        </button>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-md shadow-lg z-[60] flex items-center animate-bounce-in">
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </Suspense>
  );
};

export default App;