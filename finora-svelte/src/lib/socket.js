import { browser } from '$app/environment';
import { transactions, budgets, goals, syncStatus, lastSyncTime } from './stores.js';

// Local-first Engine (100% offline-ready, no network errors, instant UI updates)
export function initSocket() {
  if (!browser) return null;
  syncStatus.set('local');
  lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
  return null;
}

export function getSocket() {
  return null;
}

// ==========================================================================
// PURE LOCAL TRANSACTIONS HANDLERS
// ==========================================================================

export function emitAddTransaction(tx) {
  return new Promise((resolve) => {
    const localTx = {
      ...tx,
      id: tx.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: tx.created_at || new Date().toISOString()
    };
    transactions.update((list) => [localTx, ...list]);
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    resolve({ success: true, data: localTx, local: true });
  });
}

export function emitDeleteTransaction(id) {
  return new Promise((resolve) => {
    transactions.update((list) => list.filter((t) => String(t.id) !== String(id)));
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    resolve({ success: true, id, local: true });
  });
}

export function emitUpdateTransaction(id, txData) {
  return new Promise((resolve) => {
    transactions.update((list) => {
      const idx = list.findIndex((t) => String(t.id) === String(id));
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...txData, updated_at: new Date().toISOString() };
        return [...list];
      }
      return list;
    });
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    resolve({ success: true, id, local: true });
  });
}

export function emitResetTransactions() {
  return new Promise((resolve) => {
    const defaultInit = [
      { id: 't1', description: 'Gaji Bulanan', amount: 12000000, category: 'Gaji', type: 'income', payment_method: 'Bank Transfer', date: new Date().toISOString().split('T')[0], time: '09:00', notes: 'Gaji Pokok' },
      { id: 't2', description: 'Belanja Supermarket', amount: 850000, category: 'Makanan & Minuman', type: 'expense', payment_method: 'QRIS', date: new Date().toISOString().split('T')[0], time: '11:00', notes: 'Bahan masakan mingguan' },
      { id: 't3', description: 'Bensin & Tol', amount: 250000, category: 'Transportasi', type: 'expense', payment_method: 'Tunai', date: new Date().toISOString().split('T')[0], time: '13:30', notes: 'Operasional harian' },
      { id: 't4', description: 'Internet Wifi Fiber', amount: 450000, category: 'Tagihan & Utilitas', type: 'expense', payment_method: 'Bank Transfer', date: new Date().toISOString().split('T')[0], time: '15:00', notes: 'Paket 100 Mbps' }
    ];
    transactions.set(defaultInit);
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    resolve({ success: true, data: defaultInit, local: true });
  });
}

// ==========================================================================
// PURE LOCAL BUDGETS HANDLERS
// ==========================================================================

export function emitUpdateBudget(category, limit) {
  return new Promise((resolve) => {
    const trimmedCat = (category || '').trim();
    const numLimit = Number(limit) || 0;

    budgets.update((list) => {
      const idx = list.findIndex((b) => b.category.toLowerCase().trim() === trimmedCat.toLowerCase());
      if (idx >= 0) {
        list[idx] = { ...list[idx], monthly_limit: numLimit };
        return [...list];
      } else {
        const newBudget = {
          id: 'b_' + Date.now(),
          category: trimmedCat,
          monthly_limit: numLimit
        };
        return [...list, newBudget];
      }
    });

    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    resolve({ success: true, local: true });
  });
}

export function emitDeleteBudget(category) {
  return new Promise((resolve) => {
    const trimmedCat = (category || '').trim();
    budgets.update((list) => list.filter((b) => b.category.toLowerCase().trim() !== trimmedCat.toLowerCase()));
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    resolve({ success: true, local: true });
  });
}

// ==========================================================================
// PURE LOCAL GOALS HANDLERS
// ==========================================================================

export function emitDepositGoal(id, amount) {
  return new Promise((resolve) => {
    goals.update((list) => {
      const g = list.find((item) => String(item.id) === String(id));
      if (g) g.current_amount = (Number(g.current_amount) || 0) + Number(amount);
      return [...list];
    });
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    resolve({ success: true, local: true });
  });
}

export function emitAddGoal(goalData) {
  return new Promise((resolve) => {
    const newG = { ...goalData, id: `g-${Date.now()}` };
    goals.update((list) => [...list, newG]);
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    resolve({ success: true, data: newG, local: true });
  });
}

export function emitUpdateGoal(id, goalData) {
  return new Promise((resolve) => {
    goals.update((list) => {
      const idx = list.findIndex((g) => String(g.id) === String(id));
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...goalData };
        return [...list];
      }
      return list;
    });
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    resolve({ success: true, local: true });
  });
}

export function emitDeleteGoal(id) {
  return new Promise((resolve) => {
    goals.update((list) => list.filter((g) => String(g.id) !== String(id)));
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    resolve({ success: true, local: true });
  });
}
