import React from 'react';
import { 
  Sparkles, 
  PlusCircle, 
  MessageSquareCode, 
  RotateCcw, 
  Zap, 
  Smartphone 
} from 'lucide-react';

export default function Header({ 
  isConnected, 
  syncStatus,
  onOpenSmsModal, 
  onOpenAddModal, 
  onResetDemo, 
  isResetting 
}) {
  const getSyncLabel = () => {
    if (!isConnected) return "Connecting to Cloud...";
    if (syncStatus?.secondsAgo !== null && syncStatus?.secondsAgo !== undefined) {
      if (syncStatus.secondsAgo < 10) return "Connected to Device • Synced just now";
      if (syncStatus.secondsAgo < 60) return `Connected to Device • Synced ${syncStatus.secondsAgo}s ago`;
      const mins = Math.floor(syncStatus.secondsAgo / 60);
      return `Connected to Device • Synced ${mins}m ago`;
    }
    return "Connected to Device";
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-[#0B0F19]/85 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-[#0B0F19] rounded-[15px] flex items-center justify-center">
              <Zap className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Penny<span className="text-emerald-400">Wise</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.0 • Hackathon
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden md:block">
              Intelligent Financial Tracking & Cloud Sync
            </p>
          </div>
        </div>

        {/* Sync Status & Action Buttons */}
        <div className="flex items-center space-x-2.5 sm:space-x-4">
          {/* Live Device Sync Indicator */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300">
            <span className="relative flex h-2.5 w-2.5">
              {isConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              )}
            </span>
            <span className="truncate max-w-[240px]">{getSyncLabel()}</span>
          </div>

          {/* Reset Demo Button */}
          <button
            onClick={onResetDemo}
            disabled={isResetting}
            title="Reset to Initial Demo Data"
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          </button>

          {/* Simulate Bank SMS Button (Hackathon Highlight) */}
          <button
            onClick={onOpenSmsModal}
            className="flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <MessageSquareCode className="w-4 h-4" />
            <span className="hidden sm:inline">Simulate Bank SMS</span>
            <span className="sm:hidden">SMS Sim</span>
          </button>

          {/* Quick Manual Add Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>

      </div>
    </header>
  );
}
