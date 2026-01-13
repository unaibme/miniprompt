import { Note } from '../types';

interface SyncOperation {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

class LocalStorageService {
  private readonly notesKey = 'keep-clone-notes';
  private readonly syncQueueKey = 'keep-clone-sync-queue';

  getAllNotes(): Note[] {
    console.log('Getting all notes from localStorage');
    try {
      const data = localStorage.getItem(this.notesKey);
      const notes = data ? JSON.parse(data) : [];
      console.log('Retrieved', notes.length, 'notes');
      return notes.sort((a: Note, b: Note) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Failed to get notes from localStorage:', error);
      return [];
    }
  }

  saveNote(note: Note): void {
    console.log('Saving note to localStorage:', note.id);
    try {
      const notes = this.getAllNotes();
      const existingIndex = notes.findIndex(n => n.id === note.id);
      if (existingIndex >= 0) {
        notes[existingIndex] = note;
      } else {
        notes.push(note);
      }
      localStorage.setItem(this.notesKey, JSON.stringify(notes));
      console.log('Note saved successfully');
    } catch (error) {
      console.error('Failed to save note to localStorage:', error);
    }
  }

  deleteNote(id: string): void {
    try {
      const notes = this.getAllNotes().filter(n => n.id !== id);
      localStorage.setItem(this.notesKey, JSON.stringify(notes));
    } catch (error) {
      console.error('Failed to delete note from localStorage:', error);
    }
  }

  addToSyncQueue(operation: SyncOperation): void {
    try {
      const queue = this.getSyncQueue();
      operation.id = Date.now(); // Simple ID
      queue.push(operation);
      localStorage.setItem(this.syncQueueKey, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }

  getSyncQueue(): SyncOperation[] {
    try {
      const data = localStorage.getItem(this.syncQueueKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  clearSyncQueue(): void {
    try {
      localStorage.removeItem(this.syncQueueKey);
    } catch (error) {
      console.error('Failed to clear sync queue:', error);
    }
  }
}

export const indexedDBService = new LocalStorageService();