import { openDB, IDBPDatabase } from 'idb';
import { addNetworkListener, getNetworkStatus } from './capacitorHelpers';

// Define the record type for all stores
interface SyncRecord {
  id: string;
  data: any;
  updated_at: string;
  synced: boolean;
  pending_delete?: boolean;
}

interface SyncQueueItem {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  created_at: string;
  retries: number;
}

type StoreName = 'tasks' | 'systems' | 'habits' | 'transactions' | 'journal_entries' | 'savings_goals';

let db: IDBPDatabase | null = null;
let isOnline = true;
let syncInProgress = false;

// Initialize the database
export const initOfflineDB = async (): Promise<IDBPDatabase> => {
  if (db) return db;

  db = await openDB('lifeos-offline', 1, {
    upgrade(database) {
      // Tasks store
      if (!database.objectStoreNames.contains('tasks')) {
        const tasksStore = database.createObjectStore('tasks', { keyPath: 'id' });
        tasksStore.createIndex('by-synced', 'synced');
      }

      // Systems store
      if (!database.objectStoreNames.contains('systems')) {
        const systemsStore = database.createObjectStore('systems', { keyPath: 'id' });
        systemsStore.createIndex('by-synced', 'synced');
      }

      // Habits store
      if (!database.objectStoreNames.contains('habits')) {
        const habitsStore = database.createObjectStore('habits', { keyPath: 'id' });
        habitsStore.createIndex('by-synced', 'synced');
      }

      // Transactions store
      if (!database.objectStoreNames.contains('transactions')) {
        const transactionsStore = database.createObjectStore('transactions', { keyPath: 'id' });
        transactionsStore.createIndex('by-synced', 'synced');
      }

      // Journal entries store
      if (!database.objectStoreNames.contains('journal_entries')) {
        const journalStore = database.createObjectStore('journal_entries', { keyPath: 'id' });
        journalStore.createIndex('by-synced', 'synced');
      }

      // Savings goals store
      if (!database.objectStoreNames.contains('savings_goals')) {
        const savingsStore = database.createObjectStore('savings_goals', { keyPath: 'id' });
        savingsStore.createIndex('by-synced', 'synced');
      }

      // Sync queue store
      if (!database.objectStoreNames.contains('sync_queue')) {
        database.createObjectStore('sync_queue', { keyPath: 'id' });
      }
    }
  });

  // Initialize network status
  const status = await getNetworkStatus();
  isOnline = status.connected;

  // Listen for network changes
  addNetworkListener((connected) => {
    isOnline = connected;
    if (connected) {
      processSyncQueue();
    }
  });

  return db;
};

// Get database instance
const getDB = async (): Promise<IDBPDatabase> => {
  if (!db) {
    return initOfflineDB();
  }
  return db;
};

// Check if online
export const isNetworkOnline = () => isOnline;

// Save item to local store
export const saveToLocal = async <T extends { id: string }>(
  storeName: StoreName,
  item: T,
  synced = false
): Promise<void> => {
  const database = await getDB();
  const record: SyncRecord = {
    id: item.id,
    data: item,
    updated_at: new Date().toISOString(),
    synced
  };
  await database.put(storeName, record);
};

// Get item from local store
export const getFromLocal = async <T>(
  storeName: StoreName,
  id: string
): Promise<T | null> => {
  const database = await getDB();
  const record = await database.get(storeName, id) as SyncRecord | undefined;
  return record?.data || null;
};

// Get all items from local store
export const getAllFromLocal = async <T>(storeName: StoreName): Promise<T[]> => {
  const database = await getDB();
  const records = await database.getAll(storeName) as SyncRecord[];
  return records
    .filter(r => !r.pending_delete)
    .map(r => r.data);
};

// Mark item for deletion
export const markForDeletion = async (
  storeName: StoreName,
  id: string
): Promise<void> => {
  const database = await getDB();
  const record = await database.get(storeName, id) as SyncRecord | undefined;
  if (record) {
    record.pending_delete = true;
    record.synced = false;
    await database.put(storeName, record);
  }
};

// Delete item from local store
export const deleteFromLocal = async (
  storeName: StoreName,
  id: string
): Promise<void> => {
  const database = await getDB();
  await database.delete(storeName, id);
};

// Add to sync queue
export const addToSyncQueue = async (
  table: string,
  operation: 'insert' | 'update' | 'delete',
  data: any
): Promise<void> => {
  const database = await getDB();
  const id = `${table}-${data.id}-${Date.now()}`;
  const queueItem: SyncQueueItem = {
    id,
    table,
    operation,
    data,
    created_at: new Date().toISOString(),
    retries: 0
  };
  await database.put('sync_queue', queueItem);

  // Try to process immediately if online
  if (isOnline) {
    processSyncQueue();
  }
};

// Process sync queue
export const processSyncQueue = async (): Promise<void> => {
  if (syncInProgress || !isOnline) return;

  syncInProgress = true;
  const database = await getDB();

  try {
    const queue = await database.getAll('sync_queue') as SyncQueueItem[];
    
    for (const item of queue) {
      try {
        // Dynamic import to avoid circular dependency
        const { supabase } = await import('@/integrations/supabase/client');
        
        let result;
        const tableName = item.table as 'tasks' | 'systems' | 'habits' | 'transactions' | 'journal_entries' | 'savings_goals';
        
        if (item.operation === 'insert') {
          result = await supabase.from(tableName).insert(item.data);
        } else if (item.operation === 'update') {
          result = await supabase.from(tableName).update(item.data).eq('id', item.data.id);
        } else if (item.operation === 'delete') {
          result = await supabase.from(tableName).delete().eq('id', item.data.id);
        }

        if (result?.error) {
          throw result.error;
        }

        // Remove from queue on success
        const tx1 = database.transaction('sync_queue', 'readwrite');
        await tx1.store.delete(item.id);
        await tx1.done;

        // If delete operation, also remove from local store
        if (item.operation === 'delete') {
          await deleteFromLocal(item.table as StoreName, item.data.id);
        } else {
          // Mark as synced in local store
          const storeName = item.table as StoreName;
          const record = await database.get(storeName, item.data.id) as SyncRecord | undefined;
          if (record) {
            record.synced = true;
            await database.put(storeName, record);
          }
        }
      } catch (error) {
        console.error(`Sync error for ${item.table}:`, error);
        
        // Increment retry count
        item.retries += 1;
        
        // Remove from queue if too many retries
        if (item.retries >= 5) {
          console.error(`Max retries reached for ${item.id}, removing from queue`);
          await database.delete('sync_queue', item.id);
        } else {
          await database.put('sync_queue', item);
        }
      }
    }
  } finally {
    syncInProgress = false;
  }
};

// Sync from server (background refresh)
export const syncFromServer = async (
  storeName: StoreName,
  serverData: Array<{ id: string; updated_at?: string; [key: string]: any }>
): Promise<void> => {
  const database = await getDB();
  
  for (const serverItem of serverData) {
    const localRecord = await database.get(storeName, serverItem.id) as SyncRecord | undefined;
    
    if (!localRecord) {
      // New item from server
      const record: SyncRecord = {
        id: serverItem.id,
        data: serverItem,
        updated_at: serverItem.updated_at || new Date().toISOString(),
        synced: true
      };
      await database.put(storeName, record);
    } else if (!localRecord.synced) {
      // Local changes pending - compare timestamps
      const localTime = new Date(localRecord.updated_at).getTime();
      const serverTime = new Date(serverItem.updated_at || 0).getTime();
      
      if (serverTime > localTime) {
        // Server is newer, overwrite local
        const record: SyncRecord = {
          id: serverItem.id,
          data: serverItem,
          updated_at: serverItem.updated_at || new Date().toISOString(),
          synced: true
        };
        await database.put(storeName, record);
      }
      // If local is newer, keep local and it will sync on next queue process
    } else {
      // No local changes, update with server data
      const record: SyncRecord = {
        id: serverItem.id,
        data: serverItem,
        updated_at: serverItem.updated_at || new Date().toISOString(),
        synced: true
      };
      await database.put(storeName, record);
    }
  }
};

// Get pending sync count
export const getPendingSyncCount = async (): Promise<number> => {
  const database = await getDB();
  const queue = await database.getAll('sync_queue') as SyncQueueItem[];
  return queue.length;
};

// Clear all local data (for reset/logout)
export const clearAllLocalData = async (): Promise<void> => {
  const database = await getDB();
  const storeNames: StoreName[] = ['tasks', 'systems', 'habits', 'transactions', 'journal_entries', 'savings_goals'];
  
  for (const storeName of storeNames) {
    await database.clear(storeName);
  }
  await database.clear('sync_queue');
};
