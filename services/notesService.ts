import { supabase } from './supabaseClient';
import { indexedDBService } from './indexedDBService';
import { Note } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
  if (!isSupabaseConfigured() || !isOnline()) {
    console.log('Sync to Supabase skipped: configured?', isSupabaseConfigured(), 'online?', isOnline());
    return;
  }

  try {
    const queue = await indexedDBService.getSyncQueue();
    console.log('Syncing queue:', queue.length, 'operations');
    for (const op of queue) {
      switch (op.operation) {
        case 'create':
          console.log('Creating note in Supabase:', op.data.id);
          await supabase.from('notes').insert([{
            id: op.data.id,
            title: op.data.title,
            content: op.data.content,
            color: op.data.color,
            created_at: new Date(op.data.createdAt).toISOString(),
          }]);
          break;
        case 'update':
          console.log('Updating note in Supabase:', op.data.id);
          await supabase.from('notes').update({
            title: op.data.title,
            content: op.data.content,
            color: op.data.color,
            updated_at: new Date(op.data.updatedAt).toISOString(),
          }).eq('id', op.data.id);
          break;
        case 'delete':
          console.log('Deleting note in Supabase:', op.data);
          await supabase.from('notes').delete().eq('id', op.data);
          break;
      }
    }
    await indexedDBService.clearSyncQueue();
    console.log('Sync to Supabase completed');
  } catch (error) {
    console.error('Sync to Supabase failed:', error);
  }
};

// Sync notes from Supabase to IndexedDB
const syncFromSupabase = async () => {
  if (!isSupabaseConfigured() || !isOnline()) {
    console.log('Sync from Supabase skipped: configured?', isSupabaseConfigured(), 'online?', isOnline());
    return;
  }

  try {
    console.log('Fetching notes from Supabase');
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
      updatedAt: new Date(note.updated_at).getTime(),
    }));

    console.log('Fetched', supabaseNotes.length, 'notes from Supabase');

    // Merge Supabase notes with local notes
    const localNotes = await indexedDBService.getAllNotes();
    console.log('Local notes:', localNotes.length);
    const localMap = new Map(localNotes.map(n => [n.id, n]));

    for (const note of supabaseNotes) {
      const local = localMap.get(note.id);
      if (!local || note.updatedAt > local.updatedAt) {
        console.log('Saving/Updating note:', note.id);
        await indexedDBService.saveNote(note);
      }
    }
    console.log('Sync from Supabase completed');
  } catch (error) {
    console.error('Sync from Supabase failed:', error);
  }
};

export const notesService = {
  // Fetch all notes for the current user
  async getAllNotes(): Promise<Note[]> {
    // Always load from IndexedDB first
    let notes = await indexedDBService.getAllNotes();

    // If online and configured, sync pending operations first, then sync from Supabase
    if (isSupabaseConfigured() && isOnline()) {
      await syncToSupabase();
      await syncFromSupabase();
      notes = await indexedDBService.getAllNotes();
    }

    return notes;
  },

  // Create a new note
  async createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note | null> {
    const newNote: Note = {
      ...note,
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save to IndexedDB immediately
    await indexedDBService.saveNote(newNote);

    // If online and configured, try to sync to Supabase
    if (isSupabaseConfigured() && isOnline()) {
      try {
        console.log('Inserting note to Supabase:', newNote.id);
        await supabase.from('notes').insert([{
          id: newNote.id,
          title: newNote.title,
          content: newNote.content,
          color: newNote.color,
          created_at: new Date(newNote.createdAt).toISOString(),
        }]);
        console.log('Inserted successfully');
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
      console.log('Offline, queuing create for later');
      await indexedDBService.addToSyncQueue({
        operation: 'create',
        data: newNote,
        timestamp: Date.now(),
      });
    }

    return newNote;
  },

  // Update an existing note
  async updateNote(id: string, note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note | null> {
    const existingNotes = await indexedDBService.getAllNotes();
    const existingNote = existingNotes.find(n => n.id === id);
    if (!existingNote) return null;

    const updatedNote: Note = {
      id,
      ...note,
      createdAt: existingNote.createdAt,
      updatedAt: Date.now(),
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
      updatedAt: Date.now(),
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

