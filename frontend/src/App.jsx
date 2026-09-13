import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MetricsCards from './components/MetricsCards';
import AnalyticsCharts from './components/AnalyticsCharts';
import TransactionFeed from './components/TransactionFeed';
import SmartInsightsPanel from './components/SmartInsightsPanel';
import SmsSimulatorModal from './components/SmsSimulatorModal';
import AddTransactionModal from './components/AddTransactionModal';
import { api } from './api/client';
import { Sparkles, RefreshCw, Smartphone } from 'lucide-react';

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [insights, setInsights] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isResetting, setIsResetting] = useState(false);

  // Modals
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch full snapshot from backend API
  const fetchData = useCallback(async () => {
    try {
      const [txRes, anRes, inRes, syncRes] = await Promise.all([
        api.getTransactions('All'),
        api.getAnalytics(),
        api.getInsights().catch(() => ({ success: false, insights: [] })),
        api.getSyncStatus().catch(() => ({ success: false, syncStatus: null }))
      ]);

      if (txRes.success) {
        setTransactions(txRes.transactions || []);
      }
      if (anRes.success) {
        setAnalytics(anRes.analytics || {});
      }
      if (inRes.success && inRes.insights && inRes.insights.length > 0) {
        setInsights(inRes.insights);
      } else if (anRes.analytics?.insights) {
        setInsights(anRes.analytics.insights);
      }
      if (syncRes.success && syncRes.syncStatus) {
        setSyncStatus(syncRes.syncStatus);
      }

      setIsConnected(true);
    } catch (err) {
      console.error("Fetch data error:", err);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 1. Initial Load & Periodic Sync Heartbeat
  useEffect(() => {
    fetchData();

    const interval = setInterval(async () => {
      try {
        const res = await api.getSyncStatus();
        if (res.success && res.syncStatus) {
          setSyncStatus(res.syncStatus);
        }
      } catch {}
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // 2. REALTIME SERVER-SENT EVENTS (SSE) STREAM
  // Listens for real-time transactions pushed from Android or cloud backend
  useEffect(() => {
    const unsubscribe = api.subscribeToRealtimeEvents(
      (eventPayload) => {
        const { event, data } = eventPayload;

        if (event === 'transaction:sync') {
          // Android just synced a new SMS transaction!
          console.log("📲 Realtime event: Android SMS transaction synced!", data);
          if (data.analytics) {
            setAnalytics(data.analytics);
            if (data.analytics.insights) setInsights(data.analytics.insights);
          }
          if (data.syncStatus) setSyncStatus(data.syncStatus);
          
          // Refresh transaction feed smoothly
          api.getTransactions('All').then(res => {
            if (res.success) setTransactions(res.transactions);
          });
          setIsConnected(true);
        } 
        else if (event === 'transaction:new') {
          if (data.analytics) {
            setAnalytics(data.analytics);
            if (data.analytics.insights) setInsights(data.analytics.insights);
          }
          if (data.transaction) {
            setTransactions(prev => [data.transaction, ...prev.filter(t => t.id !== data.transaction.id)]);
          }
        }
        else if (event === 'transaction:deleted') {
          if (data.analytics) setAnalytics(data.analytics);
          if (data.transactionId) {
            setTransactions(prev => prev.filter(t => t.id !== data.transactionId));
          }
        }
        else if (event === 'database:reset') {
          fetchData();
        }
      },
      (err) => {
        console.warn("Realtime stream disconnected, reconnecting...", err);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchData]);

  // Handle SMS Simulation (POST /api/simulate-sms)
  const handleSimulateSMS = async (smsText) => {
    const res = await api.simulateSMS(smsText);
    await fetchData();
    return res;
  };

  // Handle Manual Add (POST /api/transactions)
  const handleAddTransaction = async (formData) => {
    const res = await api.createTransaction(formData);
    await fetchData();
    return res;
  };

  // Handle Delete (DELETE /api/transactions/:id)
  const handleDeleteTransaction = async (id) => {
    try {
      await api.deleteTransaction(id);
      await fetchData();
    } catch (err) {
      alert("Failed to delete transaction: " + err.message);
    }
  };

  // Handle Reset (POST /api/reset)
  const handleResetDemo = async () => {
    if (!window.confirm("Reset all transactions to default mock hackathon state?")) return;
    try {
      setIsResetting(true);
      await api.resetDemo();
      await fetchData();
    } catch (err) {
      alert("Failed to reset: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Ambient background lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[20%] right-[-5%] w-[450px] h-[450px] bg-purple-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[140px]" />
      </div>

      {/* Header with Live Sync Pulse */}
      <Header
        isConnected={isConnected}
        syncStatus={syncStatus}
        onOpenSmsModal={() => setIsSmsModalOpen(true)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Banner Announcement for Hackathon Demo */}
        <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-slate-900/80 to-emerald-900/40 border border-purple-500/20 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Android Cloud Sync & Realtime Stream Active</h4>
              <p className="text-xs text-slate-300">
                Transactions detected by your Android phone automatically stream here in real-time. Use <span className="font-semibold text-purple-300">"Simulate Bank SMS"</span> to demo SMS detection!
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSmsModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all whitespace-nowrap"
          >
            Launch Simulator →
          </button>
        </div>

        {/* Loading / Error States */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-sm font-medium">Connecting to PennyWise Cloud Engine...</p>
          </div>
        ) : (
          <>
            {/* 1. Metrics Overview Cards */}
            <MetricsCards analytics={analytics} />

            {/* 2. Smart AI Roast & Intelligence Panel */}
            <SmartInsightsPanel insights={insights.length > 0 ? insights : analytics?.insights} />

            {/* 3. Visual Charts (Donut & Spend Velocity) */}
            <AnalyticsCharts analytics={analytics} />

            {/* 4. Live Streaming Transaction Feed */}
            <TransactionFeed
              transactions={transactions}
              onDeleteTransaction={handleDeleteTransaction}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0B0F19]/90 py-6 text-center text-xs text-slate-500">
        <p>Built with ❤️ for Hackathon • PennyWise Real-Time Financial Intelligence Platform</p>
      </footer>

      {/* Modals */}
      <SmsSimulatorModal
        isOpen={isSmsModalOpen}
        onClose={() => setIsSmsModalOpen(false)}
        onSimulateSMS={handleSimulateSMS}
      />

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTransaction={handleAddTransaction}
      />

    </div>
  );
}
