import React from 'react';
import { 
  TrendingUp, 
  Wallet, 
  PieChart, 
  Activity, 
  AlertTriangle, 
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react';

export default function MetricsCards({ analytics }) {
  const {
    totalSpent = 0,
    transactionCount = 0,
    averageTransaction = 0,
    topCategory = "N/A",
  } = analytics || {};

  // Normalize health score (object or number)
  const rawHealth = analytics?.healthScoreDetails || analytics?.healthScore;
  let health = { score: 85, label: "Disciplined Saver", status: "excellent" };

  if (typeof rawHealth === 'number') {
    let label = "Disciplined Saver";
    let status = "excellent";
    if (rawHealth < 50) { label = "High Spending Risk"; status = "danger"; }
    else if (rawHealth < 65) { label = "Watch Your Spending"; status = "warning"; }
    else if (rawHealth < 80) { label = "Balanced"; status = "warning"; }
    health = { score: rawHealth, label, status };
  } else if (rawHealth && typeof rawHealth === 'object') {
    health = {
      score: rawHealth.score ?? 85,
      label: rawHealth.label || "Disciplined Saver",
      status: rawHealth.status || "excellent"
    };
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const getHealthBadgeStyle = (status) => {
    switch (status) {
      case 'danger':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'danger':
        return <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-400" />;
      case 'warning':
        return <Activity className="w-3.5 h-3.5 mr-1 text-amber-400" />;
      default:
        return <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
      
      {/* 1. Total Spent */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Spent</span>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
            {formatCurrency(totalSpent)}
          </div>
          <div className="flex items-center text-xs text-slate-400 space-x-1.5">
            <span className="text-emerald-400 flex items-center font-medium">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              Live Sync
            </span>
            <span>across {transactionCount} orders</span>
          </div>
        </div>
      </div>

      {/* 2. Top Category */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Top Category</span>
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <PieChart className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
            {topCategory}
          </div>
          <div className="text-xs text-slate-400">
            Primary budget consumer this month
          </div>
        </div>
      </div>

      {/* 3. Financial Health Score */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Health Score</span>
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
              {health.score}
            </span>
            <span className="text-xs font-medium text-slate-400">/ 100</span>
          </div>
          <div className="flex items-center">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getHealthBadgeStyle(health.status)}`}>
              {getHealthIcon(health.status)}
              <span>{health.label}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Average Ticket Size */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Transaction</span>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
            {formatCurrency(averageTransaction)}
          </div>
          <div className="text-xs text-slate-400">
            Calculated spend per swipe
          </div>
        </div>
      </div>

    </div>
  );
}
