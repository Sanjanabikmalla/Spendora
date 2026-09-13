import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  Utensils, 
  ShoppingBag, 
  Car, 
  Tv, 
  Sparkles, 
  Smartphone, 
  HeartPulse, 
  Zap, 
  Layers,
  Flame
} from 'lucide-react';

const CATEGORY_ICONS = {
  Food: Utensils,
  Shopping: ShoppingBag,
  Transport: Car,
  Entertainment: Tv,
  Groceries: ShoppingBag,
  Healthcare: HeartPulse,
  Health: HeartPulse,
  Bills: Zap,
  Utilities: Zap,
  General: Layers
};

const CATEGORIES = ['All', 'Food', 'Shopping', 'Transport', 'Groceries', 'Entertainment', 'Healthcare', 'Bills'];

export default function TransactionFeed({ 
  transactions = [], 
  onDeleteTransaction, 
  selectedCategory, 
  onSelectCategory 
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesCategory = selectedCategory === 'All' || (t.category && t.category.toLowerCase() === selectedCategory.toLowerCase());
    const matchesSearch = !searchQuery || 
      t.merchant.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.note && t.note.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 mb-8">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
            <span>Live Transaction Stream</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredTransactions.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400">Real-time parsed bank debits and smart annotations</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search merchant or roast..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          No transactions found matching your filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((t) => {
            const IconComponent = CATEGORY_ICONS[t.category] || CATEGORY_ICONS.General;
            return (
              <div
                key={t.id}
                className="group relative p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in"
              >
                {/* Left info */}
                <div className="flex items-start sm:items-center space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/50 text-slate-200 group-hover:text-emerald-400 transition-colors flex-shrink-0">
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm sm:text-base font-bold text-white tracking-tight">
                        {t.merchant}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-slate-800 text-slate-400 border border-slate-700/50">
                        {t.category}
                      </span>
                      {t.source === 'sms_sync' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center space-x-1">
                          <Smartphone className="w-2.5 h-2.5 mr-0.5" />
                          SMS Auto-Parsed
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-400">
                      {formatDate(t.date)}
                    </div>

                    {/* PennyWise Roast Note */}
                    {t.note && (
                      <div className="mt-1.5 flex items-start space-x-1.5 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg max-w-xl">
                        <Flame className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span className="italic leading-relaxed">{t.note}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right info & actions */}
                <div className="flex items-center justify-between sm:justify-end space-x-4 pl-12 sm:pl-0">
                  <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
                    -{formatCurrency(t.amount)}
                  </div>
                  
                  <button
                    onClick={() => onDeleteTransaction(t.id)}
                    className="opacity-60 group-hover:opacity-100 p-2 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 transition-all"
                    title="Delete transaction"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
