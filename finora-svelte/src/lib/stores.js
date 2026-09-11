import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Default initial fallback data
const initialTransactions = [
  { id: 't1', description: 'Gaji Bulanan', amount: 12000000, category: 'Gaji', type: 'income', date: '2026-09-11', notes: 'Gaji Pokok' },
  { id: 't2', description: 'Belanja Supermarket', amount: 850000, category: 'Makanan & Minuman', type: 'expense', date: '2026-09-11', notes: 'Bahan masakan mingguan' },
  { id: 't3', description: 'Bensin & Tol', amount: 250000, category: 'Transportasi', type: 'expense', date: '2026-09-11', notes: 'Operasional harian' },
  { id: 't4', description: 'Internet Wifi Fiber', amount: 450000, category: 'Tagihan & Utilitas', type: 'expense', date: '2026-09-11', notes: 'Paket 100 Mbps' }
];

const initialBudgets = [
  { id: 'b1', category: 'Makanan & Minuman', monthly_limit: 2500000 },
  { id: 'b2', category: 'Transportasi', monthly_limit: 1000000 },
  { id: 'b3', category: 'Belanja', monthly_limit: 1500000 },
  { id: 'b4', category: 'Hiburan', monthly_limit: 750000 },
  { id: 'b5', category: 'Tagihan & Utilitas', monthly_limit: 1200000 }
];

const initialGoals = [
  { id: 'g1', name: 'Dana Darurat 6 Bulan', target_amount: 30000000, current_amount: 12500000, deadline: '2026-12-31', icon: '🛡️' },
  { id: 'g2', name: 'Liburan Akhir Tahun', target_amount: 10000000, current_amount: 4200000, deadline: '2026-11-30', icon: '✈️' },
  { id: 'g3', name: 'Gadget Baru / Laptop', target_amount: 18000000, current_amount: 9000000, deadline: '2026-10-15', icon: '💻' }
];

// Helper to create persistent store with localStorage fallback
function createPersistentStore(key, initial) {
  let startValue = initial;
  if (browser) {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        startValue = JSON.parse(saved);
      } catch (e) {
        console.error(`Error parsing localStorage for ${key}`, e);
      }
    }
  }

  const store = writable(startValue);

  if (browser) {
    store.subscribe((val) => {
      localStorage.setItem(key, JSON.stringify(val));
    });
  }

  return store;
}

// Stores
export const transactions = createPersistentStore('finora_transactions', initialTransactions);
export const budgets = createPersistentStore('finora_budgets', initialBudgets);
export const goals = createPersistentStore('finora_goals', initialGoals);
export const currency = createPersistentStore('finora_currency', 'IDR'); // IDR, USD, EUR
export const theme = createPersistentStore('finora_theme', 'dark'); // 'dark' or 'light'
export const activeTab = writable('dashboard'); // dashboard, transactions, budgets, goals, analytics
export const syncStatus = writable('offline'); // connected, connecting, offline
export const lastSyncTime = writable('');
export const isPrivacyMode = writable(false); // hides balance numbers if true

// Active Filters
export const searchQuery = writable('');
export const filterType = writable('all'); // all, income, expense
export const filterCategory = writable('all');

// Derived Metrics
export const summaryMetrics = derived(transactions, ($txs) => {
  let totalIncome = 0;
  let totalExpense = 0;

  $txs.forEach((t) => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
    } else {
      totalExpense += amt;
    }
  });

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;

  return {
    totalIncome,
    totalExpense,
    netBalance,
    savingsRate
  };
});

// Category Breakdown (Expense)
export const categoryBreakdown = derived(transactions, ($txs) => {
  const breakdown = {};
  let totalExpense = 0;

  $txs
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const amt = Number(t.amount) || 0;
      totalExpense += amt;
      breakdown[t.category] = (breakdown[t.category] || 0) + amt;
    });

  const palette = [
    '#6366F1', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', 
    '#8B5CF6', '#F43F5E', '#14B8A6', '#3B82F6', '#D946EF'
  ];

  return Object.keys(breakdown).map((cat, i) => ({
    category: cat,
    amount: breakdown[cat],
    percentage: totalExpense > 0 ? Math.round((breakdown[cat] / totalExpense) * 100) : 0,
    color: palette[i % palette.length]
  }));
});

// Currency Formatter Helper
export function formatCurrency(amount, cur = 'IDR') {
  const num = Number(amount) || 0;
  if (cur === 'USD') {
    return '$' + (num / 15500).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (cur === 'EUR') {
    return '€' + (num / 16800).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    return 'Rp ' + num.toLocaleString('id-ID');
  }
}

// In-App Confirmation Dialog Store (Replaces unreliable browser window.confirm)
export const confirmDialog = writable({
  isOpen: false,
  title: 'Konfirmasi',
  message: '',
  confirmText: 'Hapus',
  confirmStyle: 'danger', // 'danger' | 'warning' | 'primary'
  icon: 'fa-trash-can',
  onConfirm: null
});

export function requestConfirm({
  title = 'Konfirmasi',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Hapus',
  confirmStyle = 'danger',
  icon = 'fa-trash-can',
  onConfirm = () => {}
}) {
  confirmDialog.set({
    isOpen: true,
    title,
    message,
    confirmText,
    confirmStyle,
    icon,
    onConfirm
  });
}

export function closeConfirm() {
  confirmDialog.update((d) => ({ ...d, isOpen: false, onConfirm: null }));
}
