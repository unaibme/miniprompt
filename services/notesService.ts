import { supabase } from './supabaseClient';
import { Note } from '../types';

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return url && key && !url.includes('placeholder') && !key.includes('placeholder');
};

// LocalStorage fallback functions
const localStorageService = {
  getAllNotes(): Note[] {
    try {
      const savedNotes = localStorage.getItem('keep-clone-notes');
      if (savedNotes) {
        return JSON.parse(savedNotes);
      }
    } catch (e) {
      console.error('Failed to parse notes from localStorage', e);
    }
    return [];
  },

  saveNote(note: Note): Note {
    const notes = this.getAllNotes();
    const updatedNotes = [note, ...notes];
    localStorage.setItem('keep-clone-notes', JSON.stringify(updatedNotes));
    return note;
  },

  updateNote(id: string, noteData: Omit<Note, 'id' | 'createdAt'>): Note | null {
    const notes = this.getAllNotes();
    const noteIndex = notes.findIndex(n => n.id === id);
    if (noteIndex === -1) return null;
    
    const updatedNote: Note = {
      ...notes[noteIndex],
      ...noteData,
    };
    notes[noteIndex] = updatedNote;
    localStorage.setItem('keep-clone-notes', JSON.stringify(notes));
    return updatedNote;
  },

  deleteNote(id: string): boolean {
    const notes = this.getAllNotes();
    const filtered = notes.filter(n => n.id !== id);
    localStorage.setItem('keep-clone-notes', JSON.stringify(filtered));
    return true;
  },
};

export const notesService = {
  // Fetch all notes for the current user
  async getAllNotes(): Promise<Note[]> {
    // Use localStorage fallback if Supabase is not configured
    if (!isSupabaseConfigured()) {
      return localStorageService.getAllNotes();
    }

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database format to app format
      return (data || []).map((note: any) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        color: note.color,
        createdAt: new Date(note.created_at).getTime(),
      }));
    } catch (error) {
      console.error('Error fetching notes from Supabase, falling back to localStorage:', error);
      return localStorageService.getAllNotes();
    }
  },

  // Create a new note
  async createNote(note: Omit<Note, 'id' | 'createdAt'>): Promise<Note | null> {
    // Use localStorage fallback if Supabase is not configured
    if (!isSupabaseConfigured()) {
      const newNote: Note = {
        ...note,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
      };
      return localStorageService.saveNote(newNote);
    }

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([
          {
            title: note.title,
            content: note.content,
            color: note.color,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        title: data.title,
        content: data.content,
        color: data.color,
        createdAt: new Date(data.created_at).getTime(),
      };
    } catch (error) {
      console.error('Error creating note in Supabase, falling back to localStorage:', error);
      // Fallback to localStorage
      const newNote: Note = {
        ...note,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
      };
      return localStorageService.saveNote(newNote);
    }
  },

  // Update an existing note
  async updateNote(id: string, note: Omit<Note, 'id' | 'createdAt'>): Promise<Note | null> {
    // Use localStorage fallback if Supabase is not configured
    if (!isSupabaseConfigured()) {
      return localStorageService.updateNote(id, note);
    }

    try {
      const { data, error } = await supabase
        .from('notes')
        .update({
          title: note.title,
          content: note.content,
          color: note.color,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        title: data.title,
        content: data.content,
        color: data.color,
        createdAt: new Date(data.created_at).getTime(),
      };
    } catch (error) {
      console.error('Error updating note in Supabase, falling back to localStorage:', error);
      return localStorageService.updateNote(id, note);
    }
  },

  // Delete a note
  async deleteNote(id: string): Promise<boolean> {
    // Use localStorage fallback if Supabase is not configured
    if (!isSupabaseConfigured()) {
      return localStorageService.deleteNote(id);
    }

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting note from Supabase, falling back to localStorage:', error);
      return localStorageService.deleteNote(id);
    }
  },

  // Update note color
  async updateNoteColor(id: string, color: string): Promise<boolean> {
    // Use localStorage fallback if Supabase is not configured
    if (!isSupabaseConfigured()) {
      const notes = localStorageService.getAllNotes();
      const existingNote = notes.find(n => n.id === id);
      if (!existingNote) return false;
      const result = localStorageService.updateNote(id, { 
        title: existingNote.title, 
        content: existingNote.content, 
        color 
      });
      return result !== null;
    }

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          color,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating note color in Supabase, falling back to localStorage:', error);
      const notes = localStorageService.getAllNotes();
      const existingNote = notes.find(n => n.id === id);
      if (!existingNote) return false;
      const result = localStorageService.updateNote(id, { 
        title: existingNote.title, 
        content: existingNote.content, 
        color 
      });
      return result !== null;
    }
  },

  // Subscribe to real-time changes
  subscribeToNotes(callback: (notes: Note[]) => void) {
    // Only subscribe to Supabase real-time if configured
    if (!isSupabaseConfigured()) {
      // Return a no-op unsubscribe function for localStorage mode
      return () => {};
    }

    try {
      const channel = supabase
        .channel('notes-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes',
          },
          async () => {
            // Refetch all notes when any change occurs
            const notes = await this.getAllNotes();
            callback(notes);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
      return () => {};
    }
  },
};

