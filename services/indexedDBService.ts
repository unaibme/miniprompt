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

  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
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
  }

  async getAllNotes(): Promise<Note[]> {
    console.log('Getting all notes from IndexedDB');
    try {
      const db = await this.initDB();
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
    console.log('Saving note to IndexedDB:', note.id);
    try {
      const db = await this.initDB();
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
    try {
      const db = await this.initDB();
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
    try {
      const db = await this.initDB();
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
    try {
      const db = await this.initDB();
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
    try {
      const db = await this.initDB();
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