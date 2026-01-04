import { supabase } from './supabaseClient';
import { indexedDBService } from './indexedDBService';
import { Note } from '../types';

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return url && key && !url.includes('placeholder') && !key.includes('placeholder');
};

// Check if online
const isOnline = () => navigator.onLine;

// Sync notes from IndexedDB to Supabase
const syncToSupabase = async () => {
  if (!isSupabaseConfigured() || !isOnline()) return;

  try {
    const queue = await indexedDBService.getSyncQueue();
    for (const op of queue) {
      switch (op.operation) {
        case 'create':
          await supabase.from('notes').insert([{
            id: op.data.id,
            title: op.data.title,
            content: op.data.content,
            color: op.data.color,
            created_at: new Date(op.data.createdAt).toISOString(),
          }]);
          break;
        case 'update':
          await supabase.from('notes').update({
            title: op.data.title,
            content: op.data.content,
            color: op.data.color,
            updated_at: new Date().toISOString(),
          }).eq('id', op.data.id);
          break;
        case 'delete':
          await supabase.from('notes').delete().eq('id', op.data);
          break;
      }
    }
    await indexedDBService.clearSyncQueue();
  } catch (error) {
    console.error('Sync to Supabase failed:', error);
  }
};

// Sync notes from Supabase to IndexedDB
const syncFromSupabase = async () => {
  if (!isSupabaseConfigured() || !isOnline()) return;

  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const supabaseNotes = (data || []).map((note: any) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      color: note.color,
      createdAt: new Date(note.created_at).getTime(),
    }));

    // Clear IndexedDB and save Supabase notes
    const localNotes = await indexedDBService.getAllNotes();
    for (const note of localNotes) {
      await indexedDBService.deleteNote(note.id);
    }
    for (const note of supabaseNotes) {
      await indexedDBService.saveNote(note);
    }
  } catch (error) {
    console.error('Sync from Supabase failed:', error);
  }
};

export const notesService = {
  // Fetch all notes for the current user
  async getAllNotes(): Promise<Note[]> {
    // Always load from IndexedDB first
    let notes = await indexedDBService.getAllNotes();

    // If online and configured, sync from Supabase
    if (isSupabaseConfigured() && isOnline()) {
      await syncFromSupabase();
      notes = await indexedDBService.getAllNotes();
    }

    return notes;
  },

  // Create a new note
  async createNote(note: Omit<Note, 'id' | 'createdAt'>): Promise<Note | null> {
    const newNote: Note = {
      ...note,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
    };

    // Save to IndexedDB immediately
    await indexedDBService.saveNote(newNote);

    // If online and configured, try to sync to Supabase
    if (isSupabaseConfigured() && isOnline()) {
      try {
        await supabase.from('notes').insert([{
          id: newNote.id,
          title: newNote.title,
          content: newNote.content,
          color: newNote.color,
          created_at: new Date(newNote.createdAt).toISOString(),
        }]);
      } catch (error) {
        console.error('Error syncing create to Supabase, queuing:', error);
        await indexedDBService.addToSyncQueue({
          operation: 'create',
          data: newNote,
          timestamp: Date.now(),
        });
      }
    } else if (isSupabaseConfigured()) {
      // Offline, queue for later
      await indexedDBService.addToSyncQueue({
        operation: 'create',
        data: newNote,
        timestamp: Date.now(),
      });
    }

    return newNote;
  },

  // Update an existing note
  async updateNote(id: string, note: Omit<Note, 'id' | 'createdAt'>): Promise<Note | null> {
    const updatedNote: Note = {
      id,
      ...note,
      createdAt: Date.now(), // Update timestamp
    };

    // Save to IndexedDB immediately
    await indexedDBService.saveNote(updatedNote);

    // If online and configured, try to sync to Supabase
    if (isSupabaseConfigured() && isOnline()) {
      try {
        await supabase.from('notes').update({
          title: note.title,
          content: note.content,
          color: note.color,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
      } catch (error) {
        console.error('Error syncing update to Supabase, queuing:', error);
        await indexedDBService.addToSyncQueue({
          operation: 'update',
          data: updatedNote,
          timestamp: Date.now(),
        });
      }
    } else if (isSupabaseConfigured()) {
      // Offline, queue for later
      await indexedDBService.addToSyncQueue({
        operation: 'update',
        data: updatedNote,
        timestamp: Date.now(),
      });
    }

    return updatedNote;
  },

  // Delete a note
  async deleteNote(id: string): Promise<boolean> {
    // Delete from IndexedDB immediately
    await indexedDBService.deleteNote(id);

    // If online and configured, try to sync to Supabase
    if (isSupabaseConfigured() && isOnline()) {
      try {
        await supabase.from('notes').delete().eq('id', id);
      } catch (error) {
        console.error('Error syncing delete to Supabase, queuing:', error);
        await indexedDBService.addToSyncQueue({
          operation: 'delete',
          data: id,
          timestamp: Date.now(),
        });
      }
    } else if (isSupabaseConfigured()) {
      // Offline, queue for later
      await indexedDBService.addToSyncQueue({
        operation: 'delete',
        data: id,
        timestamp: Date.now(),
      });
    }

    return true;
  },

  // Update note color
  async updateNoteColor(id: string, color: string): Promise<boolean> {
    const notes = await indexedDBService.getAllNotes();
    const existingNote = notes.find(n => n.id === id);
    if (!existingNote) return false;

    const updatedNote: Note = {
      ...existingNote,
      color,
      createdAt: Date.now(), // Update timestamp
    };

    // Save to IndexedDB immediately
    await indexedDBService.saveNote(updatedNote);

    // If online and configured, try to sync to Supabase
    if (isSupabaseConfigured() && isOnline()) {
      try {
        await supabase.from('notes').update({
          color,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
      } catch (error) {
        console.error('Error syncing color update to Supabase, queuing:', error);
        await indexedDBService.addToSyncQueue({
          operation: 'update',
          data: updatedNote,
          timestamp: Date.now(),
        });
      }
    } else if (isSupabaseConfigured()) {
      // Offline, queue for later
      await indexedDBService.addToSyncQueue({
        operation: 'update',
        data: updatedNote,
        timestamp: Date.now(),
      });
    }

    return true;
  },

  // Sync pending operations
  async syncPendingOperations(): Promise<void> {
    if (!isSupabaseConfigured() || !isOnline()) return;
    await syncToSupabase();
  },

  // Subscribe to real-time changes
  subscribeToNotes(callback: (notes: Note[]) => void) {
    // Only subscribe to Supabase real-time if configured
    if (!isSupabaseConfigured()) {
      // Return a no-op unsubscribe function
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

