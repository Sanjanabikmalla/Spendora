import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  MessageSquareCode, 
  Zap, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

const SMS_PRESETS = [
  {
    label: "Swiggy Order",
    text: "Txn of INR 680.00 spent at SWIGGY on card ending 4912. Available bal: ₹14,200",
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300"
  },
  {
    label: "Uber Ride",
    text: "Alert: Rs. 380.00 debited from your HDFC Bank account for UBER TRIP via UPI.",
    color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-300"
  },
  {
    label: "Zara Shopping",
    text: "Spent INR 3,990.00 at ZARA STORE on your Credit Card XX9901 on 13-Sep.",
    color: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-300"
  },
  {
    label: "Blinkit Groceries",
    text: "Paid Rs 950 to Blinkit Quick Commerce via GPay UPI ref 4910283.",
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300"
  },
  {
    label: "Netflix Subscription",
    text: "Your account debited by Rs. 649.00 for Netflix Entertainment subscription auto-pay.",
    color: "from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-300"
  },
  {
    label: "Starbucks Coffee",
    text: "Sent Rs. 450 to Starbucks Coffee. Thanks for visiting!",
    color: "from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-300"
  }
];

export default function SmsSimulatorModal({ isOpen, onClose, onSimulateSMS }) {
  const [smsText, setSmsText] = useState(SMS_PRESETS[0].text);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!smsText.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await onSimulateSMS(smsText);
      setSuccessMsg(`Extracted ₹${res.parsed.amount} at ${res.parsed.merchant} (${res.parsed.category}) & logged instantly!`);
      
      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to simulate SMS');
      setIsSubmitting(false);
    }
  };

  const handleSelectPreset = (presetText) => {
    setSmsText(presetText);
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden">
        
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <MessageSquareCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Bank SMS Simulator</h3>
              <p className="text-xs text-slate-400">Test PennyWise NLP automatic extraction & real-time sync</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="my-4">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">
            Click a preset scenario:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SMS_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(p.text)}
                className={`text-left px-3 py-2 rounded-xl border text-xs font-medium bg-gradient-to-br transition-all hover:scale-[1.02] ${p.color}`}
              >
                ⚡ {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* SMS Text Area Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 block">
              SMS Message Payload
            </label>
            <textarea
              rows={3}
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              placeholder="e.g., Spent Rs 650 on Swiggy..."
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/40 transition-all resize-none"
              required
            />
          </div>

          {/* Feedback Messages */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${isSubmitting ? 'animate-pulse' : ''}`} />
              <span>{isSubmitting ? 'Processing NLP...' : 'Simulate & Auto-Sync'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
