require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { db } = require('./database');
const { generateToken, authenticateToken, DEFAULT_USER_ID, DEFAULT_USER_EMAIL } = require('./auth');
const { realtimeHub } = require('./realtime');
const { generateNote, calculateHealthScore, generateDatasetInsights } = require('./insightEngine');
const { parseBankSMS } = require('./smsParser');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Helper to compute user analytics dynamically from persistent store
function computeUserAnalytics(userId) {
  const transactions = db.getUserTransactions(userId);
  const debits = transactions.filter(t => t.transaction_type !== 'credit');
  const totalSpent = debits.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const transactionCount = transactions.length;
  const debitCount = debits.length;
  const averageTransaction = debitCount > 0 ? Math.round(totalSpent / debitCount) : 0;

  // Category Breakdown
  const categoryMap = {};
  debits.forEach(t => {
    const cat = t.category || 'Others';
    categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount || 0);
  });

  const categoryBreakdownList = Object.entries(categoryMap).map(([category, amount]) => ({
    category,
    amount: Math.round(amount * 100) / 100,
    percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0
  })).sort((a, b) => b.amount - a.amount);

  const topCategory = categoryBreakdownList.length > 0 ? categoryBreakdownList[0].category : "None";

  // Daily Spending (Last 7 Days)
  const dailySpendingMap = {};
  const dailyTrendList = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

    const dayTotal = debits
      .filter(t => t.date && t.date.startsWith(dateKey))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    dailySpendingMap[dateKey] = Math.round(dayTotal);
    dailyTrendList.push({
      date: dateKey,
      day: dayName,
      amount: Math.round(dayTotal)
    });
  }

  // Merchant Frequency
  const merchantFrequency = {};
  debits.forEach(t => {
    const m = t.merchant || 'Unknown';
    merchantFrequency[m] = (merchantFrequency[m] || 0) + 1;
  });

  const health = calculateHealthScore(transactions);
  const insights = generateDatasetInsights(transactions);

  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    topCategory,
    averageTransaction,
    transactionCount,
    categoryBreakdown: categoryMap,
    categoryBreakdownList,
    dailySpending: dailySpendingMap,
    dailyTrend: dailyTrendList,
    merchantFrequency,
    healthScore: health.score,
    healthScoreDetails: health,
    insights
  };
}

// -------------------------------------------------------------
// 1. AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------

app.post('/api/auth/token', (req, res) => {
  const { userId = DEFAULT_USER_ID, email = DEFAULT_USER_EMAIL } = req.body;
  const token = generateToken(userId, email);
  res.json({
    success: true,
    token,
    user: { userId, email }
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// -------------------------------------------------------------
// 2. REALTIME SERVER-SENT EVENTS (SSE) ENDPOINT
// -------------------------------------------------------------

app.get('/api/realtime', (req, res) => {
  const token = req.query.token;
  let userId = DEFAULT_USER_ID;

  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pennywise_super_secret_jwt_key_hackathon_2026');
      userId = decoded.userId || DEFAULT_USER_ID;
    } catch {
      userId = DEFAULT_USER_ID;
    }
  }

  // Set SSE HTTP Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Register client with RealtimeHub
  realtimeHub.addClient(userId, res);

  // Keepalive ping every 15s
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
    }
  }, 15000);

  res.on('close', () => {
    clearInterval(pingInterval);
    realtimeHub.removeClient(userId, res);
  });
});

// -------------------------------------------------------------
// 3. DEVICE SYNC STATUS ENDPOINT
// -------------------------------------------------------------

app.get('/api/sync/status', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const syncInfo = db.getDeviceSyncStatus(userId);
  
  let secondsAgo = null;
  if (syncInfo.lastSyncedAt) {
    secondsAgo = Math.max(0, Math.floor((Date.now() - new Date(syncInfo.lastSyncedAt).getTime()) / 1000));
  }

  res.json({
    success: true,
    syncStatus: {
      ...syncInfo,
      connected: syncInfo.status === 'CONNECTED',
      secondsAgo
    }
  });
});

// -------------------------------------------------------------
// 4. ANDROID CLOUD SYNCHRONIZATION ENDPOINT
// -------------------------------------------------------------

app.post('/api/transactions/sync', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      transactions: batchTransactions, 
      deviceInfo,
      merchant, 
      amount, 
      category, 
      transaction_hash,
      date, 
      timestamp,
      source = "BANK_SMS",
      note,
      bank_name,
      account_number
    } = req.body;

    // Record device ping
    db.recordDeviceSync(userId, deviceInfo || { device: "PennyWise Android" });

    // Handle batch or single transaction sync
    const txnsToSync = Array.isArray(batchTransactions) ? batchTransactions : [{
      merchant,
      amount,
      category,
      transaction_hash,
      date,
      timestamp,
      source,
      note,
      bank_name,
      account_number
    }];

    const results = [];
    for (const txn of txnsToSync) {
      if (!txn.merchant || !txn.amount) continue;

      const smartNote = txn.note && txn.note.trim().length > 0 
        ? txn.note.trim() 
        : generateNote(txn, db.getUserTransactions(userId));

      const insertResult = db.insertTransaction(userId, {
        ...txn,
        note: smartNote,
        source: txn.source || 'BANK_SMS'
      });

      results.push(insertResult);
    }

    // Recalculate full user analytics & insights
    const updatedAnalytics = computeUserAnalytics(userId);
    const updatedSyncStatus = db.getDeviceSyncStatus(userId);

    // BROADCAST REALTIME EVENT TO ALL OPEN WEB DASHBOARDS
    realtimeHub.broadcast(userId, 'transaction:sync', {
      type: "ANDROID_SMS_SYNC",
      results,
      analytics: updatedAnalytics,
      syncStatus: updatedSyncStatus,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: `Synchronized ${results.length} transaction(s)`,
      results,
      analytics: updatedAnalytics
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 5. TRANSACTIONS CRUD ENDPOINTS
// -------------------------------------------------------------

app.get('/api/transactions', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const result = db.getUserTransactions(userId, req.query);

    res.json({
      success: true,
      count: result.length,
      transactions: result,
      data: result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/transactions', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { merchant, amount, category, date, timestamp, transactionType, source = "WEB", note, bankName } = req.body;

    if (!merchant || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: "Merchant and valid positive amount are required."
      });
    }

    const smartNote = note && note.trim().length > 0 
      ? note.trim() 
      : generateNote({ merchant, amount, category }, db.getUserTransactions(userId));

    const insertResult = db.insertTransaction(userId, {
      merchant,
      amount,
      category: category || "General",
      date,
      timestamp,
      transactionType: transactionType || 'debit',
      source: source || 'WEB',
      note: smartNote,
      bankName: bankName || 'Direct'
    });

    const updatedAnalytics = computeUserAnalytics(userId);

    // Broadcast Realtime Event
    realtimeHub.broadcast(userId, 'transaction:new', {
      transaction: insertResult.transaction,
      analytics: updatedAnalytics,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      transaction: insertResult.transaction,
      data: insertResult.transaction
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const deleted = db.deleteTransaction(userId, req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: "Transaction not found" });
    }

    const updatedAnalytics = computeUserAnalytics(userId);
    realtimeHub.broadcast(userId, 'transaction:deleted', {
      transactionId: req.params.id,
      analytics: updatedAnalytics
    });

    res.json({ success: true, message: "Transaction deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 6. ANALYTICS & INSIGHTS ENDPOINTS
// -------------------------------------------------------------

app.get('/api/analytics', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const analytics = computeUserAnalytics(userId);

    res.json({
      success: true,
      analytics,
      data: analytics
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/insights', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const userTransactions = db.getUserTransactions(userId);
    const insights = generateDatasetInsights(userTransactions);

    res.json({
      success: true,
      insights
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 7. SIMULATE SMS & RESET ENDPOINTS (HACKATHON DEMO)
// -------------------------------------------------------------

app.post('/api/simulate-sms', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { sms } = req.body;
    if (!sms || typeof sms !== 'string' || sms.trim().length === 0) {
      return res.status(400).json({ success: false, error: "Please provide a valid SMS text in { sms: '...' }" });
    }

    const parsed = parseBankSMS(sms);
    const smartNote = generateNote(parsed, db.getUserTransactions(userId));
    const nowIso = new Date().toISOString();

    const insertResult = db.insertTransaction(userId, {
      merchant: parsed.merchant,
      amount: parsed.amount,
      category: parsed.category,
      date: nowIso.split('T')[0],
      timestamp: nowIso,
      source: "DEMO_SIMULATOR",
      note: smartNote,
      bankName: "Simulated Bank"
    });

    const updatedAnalytics = computeUserAnalytics(userId);

    // Broadcast realtime event
    realtimeHub.broadcast(userId, 'transaction:new', {
      type: "SMS_SIMULATED",
      transaction: insertResult.transaction,
      analytics: updatedAnalytics,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: "SMS parsed and transaction logged in real-time!",
      parsed,
      transaction: insertResult.transaction,
      data: insertResult.transaction
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reset', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const resetList = db.resetUserData(userId);
    const updatedAnalytics = computeUserAnalytics(userId);

    realtimeHub.broadcast(userId, 'database:reset', {
      analytics: updatedAnalytics,
      transactions: resetList
    });

    res.json({
      success: true,
      message: "Database reset to initial demo state",
      count: resetList.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: "ok",
    app: "PennyWise API",
    syncStatus: "Connected to Device",
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 PennyWise Cloud & Sync Server running on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`⚡ Realtime SSE: http://localhost:${PORT}/api/realtime`);
  console.log(`📲 Android Sync: http://localhost:${PORT}/api/transactions/sync`);
  console.log(`=========================================`);
});
