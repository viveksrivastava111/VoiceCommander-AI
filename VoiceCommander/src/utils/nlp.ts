import { NLPResult, VoiceOrderItem } from '../types';

// Hindi, Hinglish and common speech-recognition variants mapped to catalogue-friendly words.
const dictionary: Record<string, string> = {
  doodh: 'milk', dudh: 'milk', dood: 'milk', milk: 'milk',
  tamatar: 'tomato', tomato: 'tomato', pyaz: 'onion', pyaaz: 'onion', pyaaj: 'onion',
  chawal: 'rice', chaawal: 'rice', anda: 'egg', ande: 'egg', egg: 'egg',
  pani: 'water', paani: 'water', kela: 'banana', kele: 'banana', banana: 'banana',
  seb: 'apple', seeb: 'apple', sebz: 'apple', apple: 'apple', aam: 'mango',
  palak: 'spinach', dahi: 'yogurt', curd: 'yogurt', makhan: 'butter', tel: 'oil', oil: 'oil',
  chai: 'tea', atta: 'flour', aata: 'flour', bread: 'bread', biscuit: 'biscuits', namkeen: 'chips',
  'दूध': 'milk', 'टमाटर': 'tomato', 'प्याज': 'onion', 'प्याज़': 'onion', 'चावल': 'rice',
  'अंडा': 'egg', 'अंडे': 'egg', 'पानी': 'water', 'केला': 'banana', 'केले': 'banana',
  'सेब': 'apple', 'आम': 'mango', 'पालक': 'spinach', 'दही': 'yogurt', 'मक्खन': 'butter',
  'तेल': 'oil', 'आटा': 'flour', 'ब्रेड': 'bread', 'बिस्किट': 'biscuits', 'नमकीन': 'chips',
  'और': 'and', 'कार्ट': 'cart', 'में': 'mein', 'मे': 'mein', 'मुझे': 'mujhe', 'चाहिए': 'chahiye',
  'डालो': 'add', 'डाल': 'add', 'करदो': 'add', 'कर दो': 'add', 'जोड़ दो': 'add',
};

const numberWords: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  ek: 1, aik: 1, do: 2, dono: 2, teen: 3, tin: 3, chaar: 4, char: 4, paanch: 5, panch: 5,
  che: 6, chhe: 6, saat: 7, sat: 7, aath: 8, ath: 8, nau: 9, das: 10,
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
};

const units = new Set([
  'bottle', 'bottles', 'packet', 'packets', 'piece', 'pieces', 'kg', 'kgs', 'kilo', 'kilos',
  'litre', 'litres', 'liter', 'liters', 'l', 'ml', 'bag', 'bags', 'carton', 'cartons',
  'dozen', 'dozens', 'cup', 'cups', 'tube', 'tubes', 'box', 'boxes', 'bar', 'bars', 'bunch', 'bunches',
]);

const fillerWords = new Set([
  'add', 'put', 'buy', 'need', 'want', 'i', 'to', 'my', 'list', 'me', 'get', 'please', 'the', 'a', 'an',
  'of', 'cart', 'mein', 'main', 'me', 'aur', 'and', 'karo', 'kar', 'karna', 'chahiye', 'mujhe', 'in', 'into',
  'mujko', 'mujhko', 'bas', 'de', 'do', 'hai', 'ko', 'ye', 'woh', 'also', 'then', 'mere', 'mera', 'meri',
  'kardo', 'kar do', 'daal do', 'dalo', 'dal do', 'jod do', 'please', 'zaroor', 'na',
]);

function replaceToken(text: string, from: string, to: string) {
  if (/^[a-z0-9]+$/i.test(from)) return text.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
  return text.split(from).join(to);
}

export function normalize(raw: string) {
  let text = raw.toLowerCase().trim();
  // Normalize common compound Hinglish command words before token replacement.
  text = text
    .replace(/\b(?:add\s*)?kar\s*do\b/gi, ' add ')
    .replace(/\bkar\s*do\b/gi, ' add ')
    .replace(/\bkardo\b/gi, ' add ')
    .replace(/\bdaal\s*do\b|\bdal\s*do\b|\bdalo\b|\bdalna\b/gi, ' add ')
    .replace(/\bcart\s*(?:mein|main|me)\b/gi, ' cart ')
    .replace(/\bmere?\s+cart\b/gi, ' cart ');

  for (const [from, to] of Object.entries(dictionary)) text = replaceToken(text, from, to);
  for (const [from, value] of Object.entries(numberWords)) text = replaceToken(text, from, String(value));

  return text
    .replace(/₹|rs\.?|rupees?/g, ' ')
    .replace(/[।]/g, '.')
    .replace(/[.!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanProduct(text: string) {
  return text
    .split(/\s+/)
    .filter((word) => !fillerWords.has(word))
    .filter((word) => !units.has(word))
    .filter((word) => !/^\d+(?:\.\d+)?$/.test(word))
    .join(' ')
    .trim();
}

function parseOrderItem(segment: string): VoiceOrderItem | null {
  const cleanSegment = segment.trim().replace(/^\s*(?:add|put|buy|get|need|want|give me|i need)\s+/i, '');
  if (!cleanSegment) return null;
  const match = cleanSegment.match(/^\s*(\d+(?:\.\d+)?)\s*(bottles?|packets?|pieces?|kgs?|kilos?|litres?|liters?|bags?|cartons?|dozens?|cups?|tubes?|boxes?|bars?|bunches?)?\s*(.*?)\s*$/i);
  if (!match) {
    const product = cleanProduct(cleanSegment);
    return product ? { product, quantity: 1 } : null;
  }
  const quantity = Number(match[1]);
  const unit = match[2]?.replace(/s$/i, '');
  const product = cleanProduct(match[3]);
  return product ? { product, quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1, unit } : null;
}

function orderItems(text: string) {
  const withoutCommand = text
    .replace(/\b(?:please|add|put|buy|get|give me|i need|need|want|to my cart|in my cart|cart mein|cart main|cart me|into cart|mujhe)\b/gi, ' ')
    .replace(/\b(?:karo|kar do|kardo|chahiye|mere|mera|meri|mein|main|me|cart)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return withoutCommand
    .split(/\s*(?:,|\band\b|\baur\b|और)\s*/i)
    .map(parseOrderItem)
    .filter((item): item is VoiceOrderItem => Boolean(item?.product));
}

export function parseCommand(rawText: string): NLPResult {
  const text = normalize(rawText);
  const result: NLPResult = { intent: 'UNKNOWN', rawText };
  const budget = text.match(/(?:set\s+)?(?:my\s+)?budget(?:\s+to|\s+is)?\s*(\d+)/i);
  if (budget) { result.intent = 'SET_BUDGET'; result.budgetAmount = Number(budget[1]); return result; }
  if (/\b(optimize.*(?:cart|list)|save me money)\b/i.test(text)) { result.intent = 'OPTIMIZE_CART'; return result; }
  if (/\b(checkout|place order|proceed to checkout)\b/i.test(text)) { result.intent = 'PROCEED_CHECKOUT'; return result; }
  if (/\b(clear|empty)\b.*\b(list|cart|everything)\b/i.test(text)) { result.intent = 'CLEAR_LIST'; return result; }
  if (/\b(remove|delete|take out|take off)\b/i.test(text)) { result.intent = 'REMOVE_ITEM'; result.product = cleanProduct(text.replace(/\b(remove|delete|take out|take off|from|cart)\b/gi, ' ')); return result; }

  const isOrder = /\b(add|put|buy|need|get|want|give me|i need)\b/i.test(text) ||
    /\b(?:\d+)\s+.+\b(?:and|aur)\b/i.test(text) ||
    (/\b(?:cart|list)\b/i.test(text) && /\b\d+\b/.test(text));
  if (isOrder) {
    const items = orderItems(text);
    if (items.length > 1) { result.intent = 'MULTI_ADD'; result.items = items; return result; }
    if (items.length === 1) { result.intent = 'ADD_ITEM'; result.product = items[0].product; result.quantity = items[0].quantity; result.unit = items[0].unit; return result; }
  }

  if (/\b(find|search|browse|look for|show)\b/i.test(text) && !/\b(list|cart)\b/i.test(text)) { result.intent = 'SEARCH_PRODUCT'; result.product = cleanProduct(text.replace(/\b(find|search|browse|look|for|show)\b/gi, ' ')); return result; }
  if (/\b(show|open|view)\b.*\b(list|cart)\b/i.test(text)) { result.intent = 'SHOW_LIST'; return result; }
  return result;
}
