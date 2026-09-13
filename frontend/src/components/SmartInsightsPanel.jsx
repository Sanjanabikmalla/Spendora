import React from 'react';
import { 
  Flame, 
  Lightbulb, 
  AlertTriangle, 
  Sparkles, 
  TrendingDown, 
  CheckCircle,
  BrainCircuit
} from 'lucide-react';

const INSIGHT_ICONS = {
  roast: Flame,
  warning: AlertTriangle,
  tip: Lightbulb,
  achievement: CheckCircle
};

const INSIGHT_COLORS = {
  roast: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  warning: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
  tip: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
  achievement: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
};

const ICON_STYLES = {
  roast: 'text-amber-400 bg-amber-500/20',
  warning: 'text-rose-400 bg-rose-500/20',
  tip: 'text-blue-400 bg-blue-500/20',
  achievement: 'text-emerald-400 bg-emerald-500/20'
};

export default function SmartInsightsPanel({ insights = [] }) {
  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 mb-8 relative overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
              <span>PennyWise Smart Insights & Roasts</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                AI Engine
              </span>
            </h3>
            <p className="text-xs text-slate-400">Contextual financial intelligence & behavioral feedback</p>
          </div>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="py-6 text-center text-slate-500 text-xs">
          No critical insights at this moment. You are spending responsibly!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((item, index) => {
            const Icon = INSIGHT_ICONS[item.type] || Lightbulb;
            const containerStyle = INSIGHT_COLORS[item.type] || INSIGHT_COLORS.tip;
            const iconStyle = ICON_STYLES[item.type] || ICON_STYLES.tip;

            return (
              <div
                key={index}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.01] ${containerStyle}`}
              >
                <div>
                  <div className="flex items-center space-x-2.5 mb-2.5">
                    <div className={`p-1.5 rounded-lg ${iconStyle}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-200/90 font-medium">
                    {item.message}
                  </p>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="capitalize">Priority: {item.impact || 'Normal'}</span>
                  <span className="flex items-center text-emerald-400 font-semibold">
                    <Sparkles className="w-3 h-3 mr-1" />
                    PennyWise AI
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
