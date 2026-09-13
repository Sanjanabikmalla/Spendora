import React from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { PieChart as PieIcon, BarChart3 } from 'lucide-react';

const CATEGORY_COLORS = {
  Food: '#F59E0B',        // Amber
  Shopping: '#EC4899',    // Pink
  Transport: '#06B6D4',   // Cyan
  Entertainment: '#8B5CF6',// Purple
  Groceries: '#10B981',   // Emerald
  Bills: '#64748B',       // Slate
  Utilities: '#64748B',   // Slate
  Healthcare: '#3B82F6',  // Blue
  Health: '#3B82F6',      // Blue
  General: '#6B7280'      // Gray
};

export default function AnalyticsCharts({ analytics }) {
  const rawCat = analytics?.categoryBreakdownList || analytics?.categoryBreakdown;
  const rawDaily = analytics?.dailyTrend || analytics?.dailySpending;

  // Normalize categoryBreakdown to list
  let categoryBreakdown = [];
  if (Array.isArray(rawCat)) {
    categoryBreakdown = rawCat;
  } else if (rawCat && typeof rawCat === 'object') {
    const total = Object.values(rawCat).reduce((a, b) => a + Number(b || 0), 0);
    categoryBreakdown = Object.entries(rawCat).map(([category, amount]) => ({
      category,
      amount: Number(amount),
      percentage: total > 0 ? Math.round((Number(amount) / total) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);
  }

  // Normalize daily trend
  let dailyTrend = [];
  if (Array.isArray(rawDaily)) {
    dailyTrend = rawDaily;
  } else if (rawDaily && typeof rawDaily === 'object') {
    dailyTrend = Object.entries(rawDaily).map(([date, amount]) => {
      const d = new Date(date);
      const dayName = isNaN(d.getTime()) ? date : d.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        date,
        day: dayName,
        amount: Number(amount)
      };
    });
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-xl shadow-xl">
          <div className="text-xs font-semibold text-slate-300">{data.category}</div>
          <div className="text-sm font-bold text-emerald-400 font-mono">
            {formatCurrency(data.amount)} <span className="text-xs text-slate-400">({data.percentage}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-xl shadow-xl">
          <div className="text-xs text-slate-400">{payload[0].payload.date} ({label})</div>
          <div className="text-sm font-bold text-emerald-400 font-mono">
            {formatCurrency(payload[0].value)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      
      {/* 1. Category Spend Distribution Donut */}
      <div className="glass-card rounded-2xl p-6 relative flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-slate-800 text-emerald-400">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Expense Distribution</h3>
              <p className="text-xs text-slate-400">Category-wise spending allocation</p>
            </div>
          </div>
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-500">
            No transaction data available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Chart */}
            <div className="md:col-span-6 h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Pie
                    data={categoryBreakdown}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.General} 
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend List */}
            <div className="md:col-span-6 space-y-2 max-h-56 overflow-y-auto pr-2">
              {categoryBreakdown.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/50 border border-slate-800/60">
                  <div className="flex items-center space-x-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.General }}
                    />
                    <span className="font-medium text-slate-300 truncate max-w-[90px]">{cat.category}</span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="text-slate-100 font-semibold">{formatCurrency(cat.amount)}</span>
                    <span className="text-slate-500 text-[11px] w-8 text-right">{cat.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. 7-Day Spending Trend */}
      <div className="glass-card rounded-2xl p-6 relative flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-slate-800 text-purple-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">7-Day Spend Velocity</h3>
              <p className="text-xs text-slate-400">Daily outflow trends over the past week</p>
            </div>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis 
                dataKey="day" 
                stroke="#64748B" 
                fontSize={12} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#64748B" 
                fontSize={11} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar 
                dataKey="amount" 
                fill="#10B981" 
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
