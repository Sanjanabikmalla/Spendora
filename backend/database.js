// database.js - Persistent Multi-User Transaction Store with Idempotency for PennyWise
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'transactions_db.json');

// Ensure data directory exists
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
          deviceSync: {
            user_pennywise_01: {
              lastSyncedAt: new Date().toISOString(),
              device: "PennyWise Android Client",
              status: "CONNECTED"
            }
          }
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
  getUserTransactions(userId, filters = {}) {
    this.loadFromDisk(); // reload to get latest updates
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
  findByHash(userId, transactionHash) {
    if (!transactionHash) return null;
    this.loadFromDisk();
    return this.memoryStore.transactions.find(t => 
      t.user_id === userId && t.transaction_hash === transactionHash
    ) || null;
  }

  // Insert single transaction with idempotency check
  insertTransaction(userId, txnData) {
    this.loadFromDisk();

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
    const existing = this.findByHash(userId, effectiveHash);
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

    this.memoryStore.transactions.unshift(newTxn);
    this.saveToDisk();

    return {
      transaction: newTxn,
      isDuplicate: false,
      status: "SYNC_SUCCESS"
    };
  }

  // Delete transaction
  deleteTransaction(userId, id) {
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
  recordDeviceSync(userId, metadata = {}) {
    this.loadFromDisk();
    this.memoryStore.deviceSync[userId] = {
      lastSyncedAt: new Date().toISOString(),
      device: metadata.device || "PennyWise Android",
      appVersion: metadata.appVersion || "2.19.0",
      status: "CONNECTED"
    };
    this.saveToDisk();
  }

  // Get device sync status
  getDeviceSyncStatus(userId) {
    this.loadFromDisk();
    return this.memoryStore.deviceSync[userId] || {
      lastSyncedAt: null,
      device: null,
      status: "NEVER_SYNCED"
    };
  }

  // Reset to default seed
  resetUserData(userId) {
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
