// API Client for PennyWise Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeaders() {
  const token = localStorage.getItem('pennywise_token') || localStorage.getItem('supabase_token') || localStorage.getItem('sb-access-token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Check backend sync and health status
  async checkHealth() {
    const res = await fetch(`${API_BASE_URL}/health`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Backend health check failed');
    return res.json();
  },

  // Get Android device synchronization status (GET /api/sync/status)
  async getSyncStatus() {
    const res = await fetch(`${API_BASE_URL}/sync/status`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch sync status');
    return res.json();
  },

  // Subscribe to Realtime Server-Sent Events (GET /api/realtime)
  subscribeToRealtimeEvents(onEvent, onError) {
    try {
      const token = localStorage.getItem('pennywise_token') || localStorage.getItem('supabase_token') || localStorage.getItem('sb-access-token');
      const sseUrl = token 
        ? `${API_BASE_URL}/realtime?token=${encodeURIComponent(token)}` 
        : `${API_BASE_URL}/realtime`;

      const eventSource = new EventSource(sseUrl);

      eventSource.addEventListener('connected', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onEvent) onEvent({ event: 'connected', data });
        } catch {}
      });

      eventSource.addEventListener('transaction:sync', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onEvent) onEvent({ event: 'transaction:sync', data });
        } catch {}
      });

      eventSource.addEventListener('transaction:new', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onEvent) onEvent({ event: 'transaction:new', data });
        } catch {}
      });

      eventSource.addEventListener('transaction:deleted', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onEvent) onEvent({ event: 'transaction:deleted', data });
        } catch {}
      });

      eventSource.addEventListener('database:reset', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onEvent) onEvent({ event: 'database:reset', data });
        } catch {}
      });

      eventSource.onerror = (err) => {
        if (onError) onError(err);
      };

      return () => {
        eventSource.close();
      };
    } catch (err) {
      if (onError) onError(err);
      return () => {};
    }
  },

  // Fetch all transactions (GET /api/transactions)
  async getTransactions(category = 'All', limit = null) {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (limit) params.append('limit', limit);
    
    const url = `${API_BASE_URL}/transactions${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch transactions');
    const data = await res.json();
    return {
      success: data.success,
      transactions: data.transactions || data.data || []
    };
  },

  // Add a transaction (POST /api/transactions)
  async createTransaction({ merchant, amount, category, note, date, timestamp, transactionType, source }) {
    const res = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        merchant, 
        amount: Number(amount), 
        category, 
        note, 
        date, 
        timestamp,
        transactionType: transactionType || 'debit',
        source: source || 'WEB'
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create transaction');
    }
    return res.json();
  },

  // Simulate bank SMS received (POST /api/simulate-sms)
  async simulateSMS(smsText) {
    const res = await fetch(`${API_BASE_URL}/simulate-sms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sms: smsText })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to simulate SMS');
    }
    return res.json();
  },

  // Fetch complete analytics overview (GET /api/analytics)
  async getAnalytics() {
    const res = await fetch(`${API_BASE_URL}/analytics`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    const data = await res.json();
    return {
      success: data.success,
      analytics: data.analytics || data.data || {}
    };
  },

  // Fetch smart insights directly (GET /api/insights)
  async getInsights() {
    const res = await fetch(`${API_BASE_URL}/insights`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch insights');
    const data = await res.json();
    return {
      success: data.success,
      insights: data.insights || []
    };
  },

  // Delete transaction (DELETE /api/transactions/:id)
  async deleteTransaction(id) {
    const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete transaction');
    return res.json();
  },

  // Reset database to initial state (POST /api/reset)
  async resetDemo() {
    const res = await fetch(`${API_BASE_URL}/reset`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to reset demo data');
    return res.json();
  }
};

