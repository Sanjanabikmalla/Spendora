// database.js - Multi-User Transaction Store with Supabase Postgres & Idempotency for PennyWise
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { supabase } = require('./auth');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'transactions_db.json');

// Ensure data directory exists for offline/local fallback
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class Database {
  constructor() {
    this.memoryStore = {
      transactions: [],
      deviceSync: {}
    };
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.memoryStore = {
          transactions: parsed.transactions || [],
          deviceSync: parsed.deviceSync || {}
        };
      } else {
        this.memoryStore = {
          transactions: [],
          deviceSync: {}
        };
        this.saveToDisk();
      }
    } catch (err) {
      console.error("Error reading database file, using fallback in-memory store:", err);
      this.memoryStore = {
        transactions: [],
        deviceSync: {}
      };
    }
  }

  saveToDisk() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.memoryStore, null, 2), 'utf8');
    } catch (err) {
      console.error("Error saving database to disk:", err);
    }
  }

  // Get user transactions sorted newest first
  async getUserTransactions(userId, filters = {}) {
    if (supabase) {
      try {
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false });

        if (filters.category && filters.category !== 'All') {
          query = query.ilike('category', filters.category);
        }

        if (filters.limit) {
          const limit = parseInt(filters.limit, 10);
          if (!isNaN(limit) && limit > 0) {
            query = query.limit(limit);
          }
        }

        const { data, error } = await query;
        if (!error && data) {
          return data.map(t => ({
            ...t,
            amount: Number(t.amount || 0)
          }));
        }
        console.warn("Supabase query error, falling back to local store:", error?.message);
      } catch (err) {
        console.warn("Supabase connection error, falling back to local store:", err.message);
      }
    }

    // Local JSON Fallback
    this.loadFromDisk();
    let list = this.memoryStore.transactions.filter(t => t.user_id === userId);

    if (filters.category && filters.category !== 'All') {
      list = list.filter(t => t.category && t.category.toLowerCase() === filters.category.toLowerCase());
    }

    list.sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at));

    if (filters.limit) {
      const limit = parseInt(filters.limit, 10);
      if (!isNaN(limit) && limit > 0) {
        list = list.slice(0, limit);
      }
    }

    return list;
  }

  // Find transaction by hash for idempotency
  async findByHash(userId, transactionHash) {
    if (!transactionHash) return null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('transaction_hash', transactionHash)
          .maybeSingle();

        if (!error && data) {
          return {
            ...data,
            amount: Number(data.amount || 0)
          };
        }
      } catch (err) {
        console.warn("Supabase findByHash error, falling back to local:", err.message);
      }
    }

    this.loadFromDisk();
    return this.memoryStore.transactions.find(t => 
      t.user_id === userId && t.transaction_hash === transactionHash
    ) || null;
  }

  // Insert single transaction with idempotency check
  async insertTransaction(userId, txnData) {
    const {
      merchant,
      amount,
      category = "General",
      currency = "INR",
      transaction_type = "debit",
      transactionType,
      date,
      timestamp,
      source = "BANK_SMS",
      note = "",
      transaction_hash,
      transactionHash,
      bank_name = "Bank",
      bankName,
      account_number,
      accountNumber
    } = txnData;

    const numAmount = Math.abs(parseFloat(amount) || 0);
    const effectiveType = (transaction_type || transactionType || 'debit').toLowerCase();
    const effectiveDate = date || new Date().toISOString().split('T')[0];
    const effectiveTimestamp = timestamp || new Date().toISOString();
    const effectiveBank = bank_name || bankName || "Bank";
    const effectiveAccount = account_number || accountNumber || null;

    // Generate deterministic hash if not supplied
    const effectiveHash = transaction_hash || transactionHash || 
      crypto.createHash('sha256')
        .update(`${userId}_${merchant}_${numAmount}_${effectiveDate}_${effectiveBank}_${effectiveAccount}`)
        .digest('hex');

    // IDEMPOTENCY CHECK
    const existing = await this.findByHash(userId, effectiveHash);
    if (existing) {
      return {
        transaction: existing,
        isDuplicate: true,
        status: "ALREADY_SYNCED"
      };
    }

    const newId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newTxn = {
      id: newId,
      user_id: userId,
      merchant: (merchant || "Unknown").trim(),
      amount: numAmount,
      currency,
      category: category.trim(),
      transaction_type: effectiveType,
      date: effectiveDate,
      timestamp: effectiveTimestamp,
      source: source || 'BANK_SMS',
      note: note ? note.trim() : "",
      transaction_hash: effectiveHash,
      bank_name: effectiveBank,
      account_number: effectiveAccount,
      sync_status: "SYNCED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert([newTxn])
          .select()
          .single();

        if (!error && data) {
          return {
            transaction: {
              ...data,
              amount: Number(data.amount || 0)
            },
            isDuplicate: false,
            status: "SYNC_SUCCESS"
          };
        }
        console.warn("Supabase insert error, saving to local fallback:", error?.message);
      } catch (err) {
        console.warn("Supabase insert exception, saving to local fallback:", err.message);
      }
    }

    // Local JSON Fallback
    this.loadFromDisk();
    this.memoryStore.transactions.unshift(newTxn);
    this.saveToDisk();

    return {
      transaction: newTxn,
      isDuplicate: false,
      status: "SYNC_SUCCESS"
    };
  }

  // Delete transaction
  async deleteTransaction(userId, id) {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('user_id', userId)
          .eq('id', id);

        if (!error) {
          return true;
        }
      } catch (err) {
        console.warn("Supabase delete error:", err.message);
      }
    }

    this.loadFromDisk();
    const initialLen = this.memoryStore.transactions.length;
    this.memoryStore.transactions = this.memoryStore.transactions.filter(
      t => !(t.user_id === userId && (t.id === id || String(t.id) === String(id)))
    );
    if (this.memoryStore.transactions.length !== initialLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  // Record device sync activity
  async recordDeviceSync(userId, metadata = {}) {
    const syncData = {
      user_id: userId,
      last_synced_at: new Date().toISOString(),
      device: metadata.device || "PennyWise Android",
      app_version: metadata.appVersion || "2.19.0",
      status: "CONNECTED",
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        await supabase
          .from('device_sync')
          .upsert([syncData], { onConflict: 'user_id' });
      } catch (err) {
        console.warn("Supabase recordDeviceSync error:", err.message);
      }
    }

    this.loadFromDisk();
    this.memoryStore.deviceSync[userId] = {
      lastSyncedAt: syncData.last_synced_at,
      device: syncData.device,
      appVersion: syncData.app_version,
      status: syncData.status
    };
    this.saveToDisk();
  }

  // Get device sync status
  async getDeviceSyncStatus(userId) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('device_sync')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          return {
            lastSyncedAt: data.last_synced_at,
            device: data.device,
            appVersion: data.app_version,
            status: data.status || "CONNECTED"
          };
        }
      } catch (err) {
        console.warn("Supabase getDeviceSyncStatus error:", err.message);
      }
    }

    this.loadFromDisk();
    return this.memoryStore.deviceSync[userId] || {
      lastSyncedAt: null,
      device: null,
      status: "NEVER_SYNCED"
    };
  }

  // Reset user data
  async resetUserData(userId) {
    if (supabase) {
      try {
        await supabase
          .from('transactions')
          .delete()
          .eq('user_id', userId);
      } catch (err) {
        console.warn("Supabase resetUserData error:", err.message);
      }
    }

    this.loadFromDisk();
    this.memoryStore.transactions = this.memoryStore.transactions.filter(t => t.user_id !== userId);
    this.recordDeviceSync(userId, { device: "PennyWise Android Demo" });
    this.saveToDisk();
    return [];
  }
}

const db = new Database();

module.exports = {
  db
};

