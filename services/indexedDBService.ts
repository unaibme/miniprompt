import { Note } from '../types';

interface SyncOperation {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'keep-clone-db';
  private readonly version = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync-queue')) {
          db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) throw new Error('IndexedDB not initialized');
    return this.db;
  }

  async getAllNotes(): Promise<Note[]> {
    await this.init();
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['notes'], 'readonly');
      const store = transaction.objectStore('notes');
      const request = store.getAll();

      request.onsuccess = () => {
        const notes = request.result.sort((a: Note, b: Note) => b.createdAt - a.createdAt);
        resolve(notes);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveNote(note: Note): Promise<void> {
    await this.init();
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['notes'], 'readwrite');
      const store = transaction.objectStore('notes');
      const request = store.put(note);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteNote(id: string): Promise<void> {
    await this.init();
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['notes'], 'readwrite');
      const store = transaction.objectStore('notes');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addToSyncQueue(operation: SyncOperation): Promise<void> {
    await this.init();
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync-queue'], 'readwrite');
      const store = transaction.objectStore('sync-queue');
      const request = store.add(operation);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncOperation[]> {
    await this.init();
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync-queue'], 'readonly');
      const store = transaction.objectStore('sync-queue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncQueue(): Promise<void> {
    await this.init();
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync-queue'], 'readwrite');
      const store = transaction.objectStore('sync-queue');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const indexedDBService = new IndexedDBService();