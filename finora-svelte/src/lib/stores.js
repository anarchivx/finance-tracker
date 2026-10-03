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

const initialWallets = [
  { id: 'w1', name: 'BCA Utama', type: 'bank', balance: 8450000, accountNumber: '8830-1928-44', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', icon: 'fa-building-columns', badge: 'Debit Platinum' },
  { id: 'w2', name: 'GoPay & QRIS', type: 'ewallet', balance: 750000, accountNumber: '0812-3456-7890', gradient: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)', icon: 'fa-wallet', badge: 'GoPay Plus' },
  { id: 'w3', name: 'ShopeePay', type: 'ewallet', balance: 320000, accountNumber: '0812-3456-7890', gradient: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)', icon: 'fa-bag-shopping', badge: 'SPay Verified' },
  { id: 'w4', name: 'Dompet Tunai', type: 'cash', balance: 480000, accountNumber: 'Uang Saku', gradient: 'linear-gradient(135deg, #854d0e 0%, #eab308 100%)', icon: 'fa-money-bill-wave', badge: 'Tunai Fisik' }
];

const initialSubscriptions = [
  { id: 's1', name: 'Netflix Premium 4K', amount: 186000, cycle: 'monthly', billingDay: 25, category: 'Hiburan', walletId: 'w1', icon: 'fa-film', color: '#E50914', nextDue: '2026-09-25', isPaidThisMonth: false },
  { id: 's2', name: 'Spotify Duo', amount: 86900, cycle: 'monthly', billingDay: 18, category: 'Hiburan', walletId: 'w2', icon: 'fa-music', color: '#1DB954', nextDue: '2026-09-18', isPaidThisMonth: false },
  { id: 's3', name: 'Indihome Fiber 100M', amount: 420000, cycle: 'monthly', billingDay: 20, category: 'Tagihan & Utilitas', walletId: 'w1', icon: 'fa-wifi', color: '#E11D48', nextDue: '2026-09-20', isPaidThisMonth: false },
  { id: 's4', name: 'BPJS Kesehatan Mandiri', amount: 150000, cycle: 'monthly', billingDay: 10, category: 'Kesehatan', walletId: 'w1', icon: 'fa-heart-pulse', color: '#059669', nextDue: '2026-10-10', isPaidThisMonth: true }
];

const initialDebts = [
  { id: 'd1', personName: 'Budi Santoso', type: 'receivable', amount: 500000, paidAmount: 200000, dueDate: '2026-09-30', phone: '081298765432', note: 'Pinjaman sewa kamera freelance', status: 'partial' },
  { id: 'd2', personName: 'Rian Pratama', type: 'receivable', amount: 150000, paidAmount: 0, dueDate: '2026-09-22', phone: '085712345678', note: 'Split bill makan sushi', status: 'unpaid' },
  { id: 'd3', personName: 'Cicilan Gadget (Toko Prima)', type: 'payable', amount: 3500000, paidAmount: 1500000, dueDate: '2026-10-05', phone: '081345678901', note: 'Sisa cicilan 2 bulan lagi', status: 'partial' }
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
export const wallets = createPersistentStore('finora_wallets', initialWallets);
export const subscriptions = createPersistentStore('finora_subscriptions', initialSubscriptions);
export const debts = createPersistentStore('finora_debts', initialDebts);
export const currency = createPersistentStore('finora_currency', 'IDR'); // IDR, USD, EUR
export const theme = createPersistentStore('finora_theme', 'dark'); // 'dark' or 'light'
export const activeTab = writable('dashboard'); // dashboard, transactions, budgets, goals, wallets, subscriptions, debts, ai, breakdown
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

// Wallet Metrics Derived Store
export const walletMetrics = derived(wallets, ($w) => {
  const totalBalance = ($w || []).reduce((acc, w) => acc + (Number(w.balance) || 0), 0);
  return {
    totalBalance,
    count: ($w || []).length
  };
});

// Subscription Metrics Derived Store
export const subscriptionMetrics = derived(subscriptions, ($subs) => {
  const list = $subs || [];
  let monthlyTotal = 0;
  let unpaidCount = 0;
  const now = new Date();
  const currentDay = now.getDate();

  list.forEach((sub) => {
    const amt = Number(sub.amount) || 0;
    if (sub.cycle === 'yearly') {
      monthlyTotal += Math.round(amt / 12);
    } else {
      monthlyTotal += amt;
    }
    if (!sub.isPaidThisMonth) {
      unpaidCount++;
    }
  });

  return {
    monthlyTotal,
    unpaidCount,
    totalCount: list.length
  };
});

// Debt / Loan Metrics Derived Store
export const debtMetrics = derived(debts, ($debts) => {
  const list = $debts || [];
  let totalReceivable = 0;
  let remainingReceivable = 0;
  let totalPayable = 0;
  let remainingPayable = 0;

  list.forEach((d) => {
    const total = Number(d.amount) || 0;
    const paid = Number(d.paidAmount) || 0;
    const rem = Math.max(0, total - paid);

    if (d.type === 'receivable') {
      totalReceivable += total;
      remainingReceivable += rem;
    } else {
      totalPayable += total;
      remainingPayable += rem;
    }
  });

  return {
    totalReceivable,
    remainingReceivable,
    totalPayable,
    remainingPayable
  };
});

// Wallet Operations
export function transferFunds({ fromId, toId, amount, note = '' }) {
  const amt = Number(amount) || 0;
  if (amt <= 0 || fromId === toId) return false;

  let sourceWalletName = '';
  let targetWalletName = '';
  let updatedSource = null;
  let updatedTarget = null;

  wallets.update((list) => {
    return list.map((w) => {
      if (w.id === fromId) {
        sourceWalletName = w.name;
        updatedSource = { ...w, balance: Math.max(0, (Number(w.balance) || 0) - amt) };
        return updatedSource;
      }
      if (w.id === toId) {
        targetWalletName = w.name;
        updatedTarget = { ...w, balance: (Number(w.balance) || 0) + amt };
        return updatedTarget;
      }
      return w;
    });
  });

  // Automatically record a transfer transaction
  const transferTx = {
    id: `tx-tf-${Date.now()}`,
    description: `Transfer: ${sourceWalletName} ➔ ${targetWalletName}`,
    amount: amt,
    category: 'Transfer Saldo',
    type: 'expense',
    payment_method: 'Transfer',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    notes: note || `Pemindahan dana internal dompet`
  };
  transactions.update((txs) => [transferTx, ...txs]);

  // Synchronize to Supabase Cloud
  import('./supabaseSync.js').then((c) => {
    if (updatedSource && c?.cloudUpdateWallet) c.cloudUpdateWallet(updatedSource);
    if (updatedTarget && c?.cloudUpdateWallet) c.cloudUpdateWallet(updatedTarget);
    if (c?.cloudAddTransaction) c.cloudAddTransaction(transferTx);
  }).catch(() => {});

  return true;
}

export function addWallet(wallet) {
  const newW = {
    ...wallet,
    id: wallet.id || `w-${Date.now()}`,
    balance: Number(wallet.balance) || 0
  };
  wallets.update((list) => [...list, newW]);

  // Synchronize new wallet to Supabase Cloud
  import('./supabaseSync.js').then((c) => {
    if (c?.cloudUpdateWallet) c.cloudUpdateWallet(newW);
  }).catch(() => {});

  return newW;
}

export function updateWallet(id, data) {
  let updatedW = null;
  wallets.update((list) =>
    list.map((w) => {
      if (w.id === id) {
        updatedW = { ...w, ...data, balance: Number(data.balance ?? w.balance) };
        return updatedW;
      }
      return w;
    })
  );

  // Synchronize updated wallet to Supabase Cloud immediately
  if (updatedW) {
    import('./supabaseSync.js').then((c) => {
      if (c?.cloudUpdateWallet) c.cloudUpdateWallet(updatedW);
    }).catch(() => {});
  }
}

export function deleteWallet(id) {
  wallets.update((list) => list.filter((w) => w.id !== id));

  // Synchronize wallet deletion to Supabase Cloud
  import('./supabaseSync.js').then((c) => {
    if (c?.cloudDeleteWallet) c.cloudDeleteWallet(id);
  }).catch(() => {});
}

// Subscription Operations
export function addSubscription(sub) {
  const newSub = {
    ...sub,
    id: sub.id || `sub-${Date.now()}`,
    amount: Number(sub.amount) || 0,
    isPaidThisMonth: false
  };
  subscriptions.update((list) => [...list, newSub]);

  // Synchronize new subscription to Supabase Cloud
  import('./supabaseSync.js').then((c) => {
    if (c?.cloudUpdateSubscription) c.cloudUpdateSubscription(newSub);
  }).catch(() => {});

  return newSub;
}

export function updateSubscription(id, subData) {
  let updatedSub = null;
  subscriptions.update((list) =>
    list.map((s) => {
      if (s.id === id) {
        updatedSub = { ...s, ...subData, amount: Number(subData.amount ?? s.amount) };
        return updatedSub;
      }
      return s;
    })
  );

  // Synchronize subscription edit to Supabase Cloud
  if (updatedSub) {
    import('./supabaseSync.js').then((c) => {
      if (c?.cloudUpdateSubscription) c.cloudUpdateSubscription(updatedSub);
    }).catch(() => {});
  }
}

export function deleteSubscription(id) {
  subscriptions.update((list) => list.filter((s) => s.id !== id));

  // Synchronize subscription deletion to Supabase Cloud
  import('./supabaseSync.js').then((c) => {
    if (c?.cloudDeleteSubscription) c.cloudDeleteSubscription(id);
  }).catch(() => {});
}

export function paySubscription(id, chosenWalletId = null) {
  let paidSub = null;
  subscriptions.update((list) =>
    list.map((s) => {
      if (s.id === id) {
        paidSub = { ...s, isPaidThisMonth: true };
        return paidSub;
      }
      return s;
    })
  );

  if (paidSub) {
    const targetWalletId = chosenWalletId || paidSub.walletId;
    let affectedW = null;
    if (targetWalletId) {
      wallets.update((wList) =>
        wList.map((w) => {
          if (w.id === targetWalletId) {
            affectedW = { ...w, balance: Math.max(0, (Number(w.balance) || 0) - paidSub.amount) };
            return affectedW;
          }
          return w;
        })
      );
      if (affectedW) {
        import('./supabaseSync.js').then((c) => {
          if (c?.cloudUpdateWallet) c.cloudUpdateWallet(affectedW);
        }).catch(() => {});
      }
    }

    // Log as an expense transaction
    const subTx = {
      id: `tx-sub-${Date.now()}`,
      description: `Langganan: ${paidSub.name}`,
      amount: paidSub.amount,
      category: paidSub.category || 'Tagihan & Utilitas',
      type: 'expense',
      payment_method: 'Auto-Debit',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      notes: `Pembayaran langganan ${paidSub.name} siklus ${paidSub.cycle === 'yearly' ? 'Tahunan' : 'Bulanan'}`
    };
    transactions.update((txs) => [subTx, ...txs]);
    import('./supabaseSync.js').then((c) => {
      if (c?.cloudAddTransaction) c.cloudAddTransaction(subTx);
      if (c?.cloudUpdateSubscription) c.cloudUpdateSubscription(paidSub);
    }).catch(() => {});
  }
}

// Debt Operations
export function addDebt(debt) {
  const newD = {
    ...debt,
    id: debt.id || `debt-${Date.now()}`,
    amount: Number(debt.amount) || 0,
    paidAmount: Number(debt.paidAmount) || 0,
    status: (Number(debt.paidAmount) || 0) >= (Number(debt.amount) || 0) ? 'paid' : (Number(debt.paidAmount) || 0) > 0 ? 'partial' : 'unpaid'
  };
  debts.update((list) => [...list, newD]);

  // Synchronize new debt to Supabase Cloud
  import('./supabaseSync.js').then((c) => {
    if (c?.cloudUpdateDebt) c.cloudUpdateDebt(newD);
  }).catch(() => {});

  return newD;
}

export function updateDebt(id, debtData) {
  let updatedD = null;
  debts.update((list) =>
    list.map((d) => {
      if (d.id === id) {
        const amt = Number(debtData.amount ?? d.amount);
        const paid = Number(debtData.paidAmount ?? d.paidAmount);
        const st = paid >= amt ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
        updatedD = { ...d, ...debtData, amount: amt, paidAmount: paid, status: st };
        return updatedD;
      }
      return d;
    })
  );

  // Synchronize debt edit to Supabase Cloud
  if (updatedD) {
    import('./supabaseSync.js').then((c) => {
      if (c?.cloudUpdateDebt) c.cloudUpdateDebt(updatedD);
    }).catch(() => {});
  }
}

export function deleteDebt(id) {
  debts.update((list) => list.filter((d) => d.id !== id));

  // Synchronize debt deletion to Supabase Cloud
  import('./supabaseSync.js').then((c) => {
    if (c?.cloudDeleteDebt) c.cloudDeleteDebt(id);
  }).catch(() => {});
}

export function recordDebtPayment(id, paymentAmount, walletId = null) {
  const payAmt = Number(paymentAmount) || 0;
  if (payAmt <= 0) return;

  let updatedD = null;
  debts.update((list) =>
    list.map((d) => {
      if (d.id === id) {
        const newPaid = (Number(d.paidAmount) || 0) + payAmt;
        const st = newPaid >= (Number(d.amount) || 0) ? 'paid' : 'partial';
        updatedD = { ...d, paidAmount: newPaid, status: st };
        return updatedD;
      }
      return d;
    })
  );

  if (updatedD) {
    // If it's a receivable (someone repaid us), our wallet balance increases (income)
    // If it's a payable (we paid back), our wallet balance decreases (expense)
    const isReceivable = updatedD.type === 'receivable';
    let affectedW = null;

    if (walletId) {
      wallets.update((wList) =>
        wList.map((w) => {
          if (w.id === walletId) {
            const currentBal = Number(w.balance) || 0;
            const newBal = isReceivable ? currentBal + payAmt : Math.max(0, currentBal - payAmt);
            affectedW = { ...w, balance: newBal };
            return affectedW;
          }
          return w;
        })
      );
    }

    const debtTx = {
      id: `tx-debt-${Date.now()}`,
      description: isReceivable
        ? `Pelunasan Piutang: ${updatedD.personName}`
        : `Pembayaran Hutang ke: ${updatedD.personName}`,
      amount: payAmt,
      category: isReceivable ? 'Pelunasan Piutang' : 'Pembayaran Hutang',
      type: isReceivable ? 'income' : 'expense',
      payment_method: 'Transfer',
      walletId: walletId || '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      notes: `${updatedD.note ? updatedD.note + ' - ' : ''}Cicilan/Pelunasan (Sisa: Rp ${Math.max(0, updatedD.amount - updatedD.paidAmount).toLocaleString('id-ID')})`
    };
    transactions.update((txs) => [debtTx, ...txs]);

    // Synchronize to Supabase Cloud
    import('./supabaseSync.js').then((c) => {
      if (c?.cloudUpdateDebt) c.cloudUpdateDebt(updatedD);
      if (affectedW && c?.cloudUpdateWallet) c.cloudUpdateWallet(affectedW);
      if (c?.cloudAddTransaction) c.cloudAddTransaction(debtTx);
    }).catch(() => {});
  }
}

