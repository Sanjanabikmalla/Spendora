// insightEngine.js - Deterministic Financial Insights & Health Score Engine for PennyWise

const ROAST_TEMPLATES = {
  Food: [
    (amt, merchant) => `Ordered from ${merchant}? Your kitchen misses you, but your stomach clearly voted against cooking.`,
    (amt, merchant) => `₹${amt} on ${merchant}... Hope that meal came with emotional fulfillment and extra napkins.`,
    (amt, merchant) => `Gordon Ramsay is crying right now. You just paid ₹${amt} for food that took 10 mins to eat.`,
    (amt, merchant) => `Cooking at home saves 70%... but who cares when ${merchant} has discounts, right?`,
  ],
  Shopping: [
    (amt, merchant) => `₹${amt} at ${merchant}. Was this retail therapy or an actual necessity? Be honest.`,
    (amt, merchant) => `Another parcel coming from ${merchant}! Your delivery guy knows you better than your family.`,
    (amt, merchant) => `Buying happiness at ₹${amt} a swipe at ${merchant}. Hope it fits!`,
    (amt, merchant) => `Impulse purchase detected! That ₹${amt} could've bought fractional Bitcoin.`,
  ],
  Entertainment: [
    (amt, merchant) => `₹${amt} for ${merchant}. You are officially subsidizing the streaming industry.`,
    (amt, merchant) => `Are you actually watching ${merchant} or just letting it play while scrolling your phone?`,
    (amt, merchant) => `Entertainment score up, savings score down. Balance in the universe restored.`,
  ],
  Transport: [
    (amt, merchant) => `₹${amt} on ${merchant}. Walking is free and burns calories, but AC cabs are hard to resist.`,
    (amt, merchant) => `Surge pricing got you on ${merchant}, didn't it? Premium comfort for premium rupees.`,
  ],
  Bills: [
    (amt, merchant) => `₹${amt} for ${merchant}. Adulting is hard, but at least the utilities stay active.`,
    (amt, merchant) => `Responsible citizen alert! Paid ₹${amt} to ${merchant} on time.`,
  ],
  Healthcare: [
    (amt, merchant) => `₹${amt} on health & wellness. Your future self thanks you for this investment.`,
  ],
  Groceries: [
    (amt, merchant) => `₹${amt} on groceries at ${merchant}. Please actually eat the veggies before they turn into science experiments.`,
  ],
  General: [
    (amt, merchant) => `₹${amt} debited at ${merchant}. Your bank account felt that one!`,
    (amt, merchant) => `A solid ₹${amt} spent at ${merchant}. PennyWise is keeping score!`,
  ]
};

/**
 * Generate a witty contextual note for a single transaction
 */
function generateNote(transaction, allTransactions = []) {
  const { merchant = "Merchant", amount = 0, category = "General", note } = transaction;
  if (note && note.trim().length > 0) {
    return note.trim();
  }

  const catKey = ROAST_TEMPLATES[category] ? category : 'General';
  const templates = ROAST_TEMPLATES[catKey];
  const idx = Math.abs(Math.floor(Number(amount) * 7)) % templates.length;
  return templates[idx](amount, merchant);
}

/**
 * Deterministic Financial Health Score Calculation (0 - 100)
 * Evaluates:
 * 1. Discretionary spending vs Essentials ratio
 * 2. Category concentration (> 40% in single non-essential category)
 * 3. Food delivery dependency
 * 4. High average ticket sizes
 */
function calculateHealthScore(transactions = []) {
  if (!transactions || transactions.length === 0) {
    return {
      score: 100,
      label: "Disciplined Saver",
      status: "excellent",
      badgeColor: "emerald"
    };
  }

  const debits = transactions.filter(t => t.transactionType !== 'credit');
  const total = debits.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  if (total === 0) {
    return {
      score: 100,
      label: "Disciplined Saver",
      status: "excellent",
      badgeColor: "emerald"
    };
  }

  let score = 95;

  // 1. Category Breakdown
  const catTotals = {};
  debits.forEach(t => {
    const c = t.category || 'General';
    catTotals[c] = (catTotals[c] || 0) + Number(t.amount || 0);
  });

  const foodSpend = catTotals['Food'] || 0;
  const shoppingSpend = catTotals['Shopping'] || 0;

  // Deduction for category concentration (> 40% in Shopping or Food)
  if (shoppingSpend / total > 0.35) {
    score -= 12;
  }
  if (foodSpend / total > 0.30) {
    score -= 10;
  }

  // Deduction for high total spending
  if (total > 25000) score -= 12;
  else if (total > 15000) score -= 6;

  // Deduct if average transaction size is very large
  const avg = total / debits.length;
  if (avg > 2500) score -= 5;

  // Keep within bounds [35, 98]
  score = Math.max(35, Math.min(98, Math.round(score)));

  let label = "Disciplined Saver";
  let status = "excellent";
  let badgeColor = "emerald";

  if (score < 50) {
    label = "High Spending Risk";
    status = "danger";
    badgeColor = "rose";
  } else if (score < 65) {
    label = "Watch Your Spending";
    status = "warning";
    badgeColor = "amber";
  } else if (score < 80) {
    label = "Balanced";
    status = "warning";
    badgeColor = "amber";
  } else {
    label = "Disciplined Saver";
    status = "excellent";
    badgeColor = "emerald";
  }

  return { score, label, status, badgeColor };
}

/**
 * Deterministic Insights Generator from Dataset
 */
function generateDatasetInsights(transactions = []) {
  const debits = transactions.filter(t => t.transactionType !== 'credit');
  const total = debits.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const insights = [];

  if (debits.length === 0) {
    return [
      {
        type: "tip",
        title: "Fresh Start",
        message: "No expenses recorded yet. Your budget is completely clean!",
        priority: "low"
      }
    ];
  }

  // Category map
  const catTotals = {};
  const merchantCount = {};
  debits.forEach(t => {
    const c = t.category || 'General';
    catTotals[c] = (catTotals[c] || 0) + Number(t.amount || 0);

    const m = t.merchant || 'Unknown';
    merchantCount[m] = (merchantCount[m] || 0) + 1;
  });

  // Check Food order count
  const foodTxns = debits.filter(t => t.category === 'Food');
  if (foodTxns.length >= 3) {
    insights.push({
      type: "roast",
      title: "Food Delivery Addiction Alert",
      message: `You've logged ${foodTxns.length} food/delivery transactions. Your kitchen is starting to feel unemployed.`,
      priority: "high"
    });
  }

  // Check Category Dominance (> 35%)
  Object.entries(catTotals).forEach(([cat, amt]) => {
    const pct = Math.round((amt / total) * 100);
    if (pct >= 35 && (cat === 'Shopping' || cat === 'Entertainment')) {
      insights.push({
        type: "warning",
        title: `${cat} Surge Detected`,
        message: `${cat} accounts for ${pct}% of your expenses this month. Your cart seems to have a full-time career.`,
        priority: "high"
      });
    }
  });

  // Check Frequent Merchant (>= 2 transactions)
  Object.entries(merchantCount).forEach(([merchant, count]) => {
    if (count >= 2 && ['Swiggy', 'Zomato', 'Uber', 'Blinkit', 'Amazon'].includes(merchant)) {
      insights.push({
        type: "roast",
        title: `Frequent Swipes at ${merchant}`,
        message: `${merchant} has appeared ${count} times recently. At this point, it's practically a subscription.`,
        priority: "medium"
      });
    }
  });

  // Always include a strategic PennyWise tip
  insights.push({
    type: "tip",
    title: "PennyWise Golden Rule",
    message: "Automate 20% of your incoming income to a locked savings vault to cushion impulse cravings.",
    priority: "low"
  });

  return insights;
}

module.exports = {
  generateNote,
  calculateHealthScore,
  generateDatasetInsights
};
