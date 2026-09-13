// smsParser.js - Natural Language Bank SMS Parser for PennyWise

const MERCHANT_CATEGORY_MAP = {
  swiggy: "Food",
  zomato: "Food",
  starbucks: "Food",
  mcdonalds: "Food",
  kfc: "Food",
  dominos: "Food",
  blinkit: "Groceries",
  zepto: "Groceries",
  instamart: "Groceries",
  bigbasket: "Groceries",
  uber: "Transport",
  ola: "Transport",
  rapido: "Transport",
  metro: "Transport",
  fuel: "Transport",
  petrol: "Transport",
  netflix: "Entertainment",
  spotify: "Entertainment",
  hotstar: "Entertainment",
  prime: "Entertainment",
  bookmyshow: "Entertainment",
  pvr: "Entertainment",
  amazon: "Shopping",
  flipkart: "Shopping",
  myntra: "Shopping",
  zara: "Shopping",
  "h&m": "Shopping",
  nykaa: "Shopping",
  cult: "Health",
  pharmacy: "Health",
  apollo: "Health",
  bescom: "Utilities",
  electricity: "Utilities",
  wifi: "Utilities",
  airtel: "Utilities",
  jio: "Utilities"
};

function parseBankSMS(smsText) {
  if (!smsText || typeof smsText !== "string") {
    throw new Error("Invalid SMS text provided");
  }

  const cleanText = smsText.trim();

  // 1. Extract Amount
  let amount = 0;
  // Match amounts after currency symbols: Rs., Rs, INR, ₹
  const pattern1 = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
  const pattern2 = /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)/i;
  
  const m1 = cleanText.match(pattern1);
  const m2 = cleanText.match(pattern2);
  
  if (m1) {
    amount = parseFloat(m1[1].replace(/,/g, ''));
  } else if (m2) {
    amount = parseFloat(m2[1].replace(/,/g, ''));
  } else {
    // Fallback: look for standard standalone numbers
    const fallbackMatch = cleanText.match(/\b(\d{2,6}(?:\.\d{1,2})?)\b/);
    if (fallbackMatch) {
      amount = parseFloat(fallbackMatch[1]);
    }
  }

  // 2. Extract Merchant
  // Patterns like: "at SWIGGY", "on ZARA", "to Starbucks", "for Uber", "spent on Blinkit"
  let merchant = "Direct Merchant";
  const merchantMatch = cleanText.match(/(?:at|on|to|for|spent at|spent on)\s+([A-Za-z0-9&'.\-_]+(?:\s+[A-Za-z0-9&'.\-_]+)?)/i);
  
  if (merchantMatch) {
    const candidate = merchantMatch[1].trim();
    // Exclude noise words
    const noiseWords = ['card', 'a/c', 'account', 'upi', 'pos', 'vpa', 'atm', 'the', 'your', 'bank'];
    if (!noiseWords.includes(candidate.toLowerCase())) {
      merchant = candidate;
    }
  }

  // Check known brands in text if merchant is vague
  for (const brand of Object.keys(MERCHANT_CATEGORY_MAP)) {
    const regex = new RegExp(`\\b${brand}\\b`, 'i');
    if (regex.test(cleanText)) {
      merchant = brand.charAt(0).toUpperCase() + brand.slice(1);
      break;
    }
  }

  // 3. Determine Category
  let category = "General";
  const lowerMerchant = merchant.toLowerCase();
  for (const [brand, cat] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    if (lowerMerchant.includes(brand) || cleanText.toLowerCase().includes(brand)) {
      category = cat;
      break;
    }
  }

  // Fallback category keywords in SMS
  if (category === "General") {
    const lowerText = cleanText.toLowerCase();
    if (/food|lunch|dinner|breakfast|snack|cafe|restaurant|burger|pizza/i.test(lowerText)) category = "Food";
    else if (/cab|ride|trip|taxi|travel|flight|train/i.test(lowerText)) category = "Transport";
    else if (/movie|cinema|game|subscription|music/i.test(lowerText)) category = "Entertainment";
    else if (/clothes|shoes|dress|sale|mall|store/i.test(lowerText)) category = "Shopping";
    else if (/groceries|supermarket|mart|vegetables/i.test(lowerText)) category = "Groceries";
    else if (/doctor|medicine|gym|hospital|clinic/i.test(lowerText)) category = "Health";
    else if (/bill|recharge|power|water|gas|wifi/i.test(lowerText)) category = "Utilities";
  }

  return {
    merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1),
    amount: amount > 0 ? amount : 500,
    category,
    rawSMS: cleanText
  };
}

module.exports = {
  parseBankSMS,
  MERCHANT_CATEGORY_MAP
};
