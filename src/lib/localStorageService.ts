'use client';

import { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, Firestore } from 'firebase/firestore';

// Local storage keys
const STORAGE_PREFIX = 'tbc_';
const SYNC_QUEUE_KEY = `${STORAGE_PREFIX}sync_queue`;
const LAST_SYNC_KEY = `${STORAGE_PREFIX}last_sync`;

interface SyncOperation {
  id: string;
  type: 'set' | 'update' | 'delete';
  collection: string;
  docId?: string;
  data?: any;
  timestamp: number;
  retries: number;
}

export class LocalStorageService {
  private firestore: Firestore;
  private syncQueue: SyncOperation[] = [];
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(firestore: Firestore) {
    this.firestore = firestore;
    this.loadSyncQueue();
    this.startSyncProcess();
  }

  // Get item from localStorage
  getItem<T>(key: string): T | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  // Set item in localStorage
  setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }

  // Remove item from localStorage
  removeItem(key: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  // Clear all items with prefix
  clearAll(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  // Load sync queue from localStorage
  private loadSyncQueue(): void {
    if (typeof window === 'undefined') {
      this.syncQueue = [];
      return;
    }
    
    try {
      const queue = localStorage.getItem(SYNC_QUEUE_KEY);
      this.syncQueue = queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.syncQueue = [];
    }
  }

  // Save sync queue to localStorage
  private saveSyncQueue(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  // Add operation to sync queue
  private queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'>): void {
    const syncOp: SyncOperation = {
      ...operation,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      retries: 0,
    };
    this.syncQueue.push(syncOp);
    this.saveSyncQueue();
  }

  // Start background sync process
  private startSyncProcess(): void {
    // Sync every 30 seconds
    this.syncInterval = setInterval(() => {
      this.syncWithFirebase();
    }, 30000);

    // Also sync immediately on network reconnect
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncWithFirebase();
      });
    }
  }

  // Stop sync process
  stopSyncProcess(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Sync with Firebase
  private async syncWithFirebase(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;

    try {
      // Process operations in order
      for (let i = this.syncQueue.length - 1; i >= 0; i--) {
        const operation = this.syncQueue[i];
        
        try {
          await this.processOperation(operation);
          
          // Remove successfully processed operation
          this.syncQueue.splice(i, 1);
          this.saveSyncQueue();
        } catch (error) {
          console.error('Error processing sync operation:', error);
          
          // Increment retry count
          operation.retries++;
          
          // Remove if too many retries
          if (operation.retries >= 3) {
            this.syncQueue.splice(i, 1);
            this.saveSyncQueue();
          }
        }
      }

      // Update last sync timestamp
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Process individual sync operation
  private async processOperation(operation: SyncOperation): Promise<void> {
    const { type, collection, docId, data } = operation;

    switch (type) {
      case 'set':
        if (docId) {
          await setDoc(doc(this.firestore, collection, docId), data);
        }
        break;
      case 'update':
        if (docId) {
          await updateDoc(doc(this.firestore, collection, docId), data);
        }
        break;
      case 'delete':
        if (docId) {
          await deleteDoc(doc(this.firestore, collection, docId));
        }
        break;
    }
  }

  // Set document (local + queue sync)
  async setDocument(collection: string, docId: string, data: any): Promise<void> {
    // Update local storage
    this.setItem(`${collection}/${docId}`, data);
    
    // Queue sync operation
    this.queueOperation({
      type: 'set',
      collection,
      docId,
      data,
    });
  }

  // Update document (local + queue sync)
  async updateDocument(collection: string, docId: string, data: any): Promise<void> {
    // Update local storage
    const existing = this.getItem(`${collection}/${docId}`);
    const updated = existing ? { ...existing, ...data } : data;
    this.setItem(`${collection}/${docId}`, updated);
    
    // Queue sync operation
    this.queueOperation({
      type: 'update',
      collection,
      docId,
      data,
    });
  }

  // Delete document (local + queue sync)
  async deleteDocument(collection: string, docId: string): Promise<void> {
    // Remove from local storage
    this.removeItem(`${collection}/${docId}`);
    
    // Queue sync operation
    this.queueOperation({
      type: 'delete',
      collection,
      docId,
    });
  }

  // Get document (local first, then Firebase)
  async getDocument<T>(collectionPath: string, docId: string): Promise<T | null> {
    // Try local storage first
    const local = this.getItem<T>(`${collectionPath}/${docId}`);
    if (local) {
      return local;
    }

    // Fallback to Firebase
    try {
      const docRef = doc(this.firestore, collectionPath, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = { ...docSnap.data(), id: docSnap.id } as T;
        this.setItem(`${collectionPath}/${docId}`, data);
        return data;
      }
    } catch (error) {
      console.error('Error fetching document from Firebase:', error);
    }

    return null;
  }

  // Get collection (local first, then Firebase)
  async getCollection<T>(collectionPath: string): Promise<T[]> {
    // Try local storage first
    const local = this.getItem<T[]>(collectionPath);
    if (local) {
      return local;
    }

    // Fallback to Firebase
    try {
      const collectionRef = collection(this.firestore, collectionPath);
      const querySnapshot = await getDocs(collectionRef);
      
      const data = querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as T));
      this.setItem(collectionPath, data);
      return data;
    } catch (error) {
      console.error('Error fetching collection from Firebase:', error);
      return [];
    }
  }

  // Subscribe to document changes (updates local storage)
  subscribeToDocument<T>(collectionPath: string, docId: string, callback: (data: T | null) => void): () => void {
    const docRef = doc(this.firestore, collectionPath, docId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { ...docSnap.data(), id: docSnap.id } as T;
        this.setItem(`${collectionPath}/${docId}`, data);
        callback(data);
      } else {
        this.removeItem(`${collectionPath}/${docId}`);
        callback(null);
      }
    }, (error) => {
      console.error('Error in document subscription:', error);
    });

    return unsubscribe;
  }

  // Subscribe to collection changes (updates local storage)
  subscribeToCollection<T>(collectionPath: string, callback: (data: T[]) => void): () => void {
    const collectionRef = collection(this.firestore, collectionPath);
    
    const unsubscribe = onSnapshot(collectionRef, (querySnapshot: any) => {
      const data = querySnapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as T));
      this.setItem(collectionPath, data);
      callback(data);
    }, (error: any) => {
      console.error('Error in collection subscription:', error);
    });

    return unsubscribe;
  }

  // Force immediate sync
  async forceSync(): Promise<void> {
    await this.syncWithFirebase();
  }

  // Get sync status
  getSyncStatus(): { isSyncing: boolean; queueLength: number; lastSync: number | null } {
    if (typeof window === 'undefined') {
      return {
        isSyncing: this.isSyncing,
        queueLength: this.syncQueue.length,
        lastSync: null,
      };
    }
    
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    return {
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
      lastSync: lastSync ? parseInt(lastSync) : null,
    };
  }
}

// Singleton instance
let localStorageServiceInstance: LocalStorageService | null = null;

export function getLocalStorageService(firestore: Firestore): LocalStorageService {
  if (!localStorageServiceInstance) {
    localStorageServiceInstance = new LocalStorageService(firestore);
  }
  return localStorageServiceInstance;
}
