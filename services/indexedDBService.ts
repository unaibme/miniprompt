import { Note } from '../types';

interface SyncOperation {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'KeepCloneDB';
  private readonly notesStore = 'notes';
  private readonly syncQueueStore = 'syncQueue';
  private useLocalStorage = false;

  private async initDB(): Promise<IDBDatabase | null> {
    if (this.db) return this.db;
    if (this.useLocalStorage) return null;

    try {
      return await new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, 1);

        request.onerror = () => {
          console.warn('IndexedDB not available, falling back to localStorage');
          this.useLocalStorage = true;
          resolve(null);
        };
        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.notesStore)) {
            db.createObjectStore(this.notesStore, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(this.syncQueueStore)) {
            db.createObjectStore(this.syncQueueStore, { keyPath: 'id' });
          }
        };
      });
    } catch (error) {
      console.warn('IndexedDB error, falling back to localStorage:', error);
      this.useLocalStorage = true;
      return null;
    }
  }

  async getAllNotes(): Promise<Note[]> {
    if (this.useLocalStorage) {
      console.log('Getting all notes from localStorage (fallback)');
      try {
        const data = localStorage.getItem('keep-clone-notes');
        const notes = data ? JSON.parse(data) : [];
        console.log('Retrieved', notes.length, 'notes');
        return notes.sort((a: Note, b: Note) => b.createdAt - a.createdAt);
      } catch (error) {
        console.error('Failed to get notes from localStorage:', error);
        return [];
      }
    }

    console.log('Getting all notes from IndexedDB');
    try {
      const db = await this.initDB();
      if (!db) return this.getAllNotes(); // Fallback

      const transaction = db.transaction([this.notesStore], 'readonly');
      const store = transaction.objectStore(this.notesStore);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const notes = request.result || [];
          console.log('Retrieved', notes.length, 'notes');
          resolve(notes.sort((a: Note, b: Note) => b.createdAt - a.createdAt));
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get notes from IndexedDB:', error);
      return [];
    }
  }

  async saveNote(note: Note): Promise<void> {
    if (this.useLocalStorage) {
      console.log('Saving note to localStorage (fallback):', note.id);
      try {
        const notes = await this.getAllNotes();
        const existingIndex = notes.findIndex(n => n.id === note.id);
        if (existingIndex >= 0) {
          notes[existingIndex] = note;
        } else {
          notes.push(note);
        }
        localStorage.setItem('keep-clone-notes', JSON.stringify(notes));
        console.log('Note saved successfully');
        return;
      } catch (error) {
        console.error('Failed to save note to localStorage:', error);
      }
      return;
    }

    console.log('Saving note to IndexedDB:', note.id);
    try {
      const db = await this.initDB();
      if (!db) return this.saveNote(note); // Fallback

      const transaction = db.transaction([this.notesStore], 'readwrite');
      const store = transaction.objectStore(this.notesStore);
      const request = store.put(note);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('Note saved successfully');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to save note to IndexedDB:', error);
    }
  }

  async deleteNote(id: string): Promise<void> {
    if (this.useLocalStorage) {
      try {
        const notes = await this.getAllNotes();
        const filtered = notes.filter(n => n.id !== id);
        localStorage.setItem('keep-clone-notes', JSON.stringify(filtered));
        return;
      } catch (error) {
        console.error('Failed to delete note from localStorage:', error);
      }
      return;
    }

    try {
      const db = await this.initDB();
      if (!db) return this.deleteNote(id); // Fallback

      const transaction = db.transaction([this.notesStore], 'readwrite');
      const store = transaction.objectStore(this.notesStore);
      const request = store.delete(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to delete note from IndexedDB:', error);
    }
  }

  async addToSyncQueue(operation: SyncOperation): Promise<void> {
    if (this.useLocalStorage) {
      try {
        const queue = await this.getSyncQueue();
        operation.id = Date.now();
        queue.push(operation);
        localStorage.setItem('keep-clone-sync-queue', JSON.stringify(queue));
        return;
      } catch (error) {
        console.error('Failed to add to sync queue in localStorage:', error);
      }
      return;
    }

    try {
      const db = await this.initDB();
      if (!db) return this.addToSyncQueue(operation); // Fallback

      const transaction = db.transaction([this.syncQueueStore], 'readwrite');
      const store = transaction.objectStore(this.syncQueueStore);
      operation.id = Date.now();
      const request = store.put(operation);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }

  async getSyncQueue(): Promise<SyncOperation[]> {
    if (this.useLocalStorage) {
      try {
        const data = localStorage.getItem('keep-clone-sync-queue');
        return data ? JSON.parse(data) : [];
      } catch (error) {
        console.error('Failed to get sync queue from localStorage:', error);
        return [];
      }
    }

    try {
      const db = await this.initDB();
      if (!db) return this.getSyncQueue(); // Fallback

      const transaction = db.transaction([this.syncQueueStore], 'readonly');
      const store = transaction.objectStore(this.syncQueueStore);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  async clearSyncQueue(): Promise<void> {
    if (this.useLocalStorage) {
      try {
        localStorage.removeItem('keep-clone-sync-queue');
        return;
      } catch (error) {
        console.error('Failed to clear sync queue in localStorage:', error);
      }
      return;
    }

    try {
      const db = await this.initDB();
      if (!db) return this.clearSyncQueue(); // Fallback

      const transaction = db.transaction([this.syncQueueStore], 'readwrite');
      const store = transaction.objectStore(this.syncQueueStore);
      const request = store.clear();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to clear sync queue:', error);
    }
  }
}

export const indexedDBService = new IndexedDBService();