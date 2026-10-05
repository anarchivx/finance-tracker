import { browser } from '$app/environment';
import { transactions, budgets, goals, wallets, syncStatus, lastSyncTime } from './stores.js';
import {
  cloudAddTransaction,
  cloudUpdateTransaction,
  cloudDeleteTransaction,
  cloudUpdateWallet,
  cloudUpdateBudget,
  cloudDeleteBudget,
  cloudUpdateGoal,
  cloudDeleteGoal
} from './supabaseSync.js';

let socket = null;

function getServerUrl() {
  if (!browser) return '';
  // In local Vite dev mode (port 5173), target backend at port 3001
  if (window.location.port === '5173') {
    return 'http://localhost:3001';
  }
  // In cloud deployment (single host), target same origin
  return window.location.origin;
}

/**
 * Initialize Realtime Cloud & Local Engine
 */
export function initSocket() {
  if (!browser) return null;
  if (socket) return socket;

  const targetUrl = getServerUrl();
  syncStatus.set('connecting');

  // 1. Initial Pull from Backend SQLite Database
  fetch(`${targetUrl}/api/sync`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (data && data.transactions && data.transactions.length > 0) {
        transactions.set(data.transactions);
      }
      if (data && data.budgets && data.budgets.length > 0) {
        budgets.set(data.budgets);
      }
      if (data && data.goals && data.goals.length > 0) {
        goals.set(data.goals);
      }
      syncStatus.set('connected');
      lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    })
    .catch((err) => {
      console.warn('[Sync] Server sync fallback to local store:', err.message);
      syncStatus.set('local');
      lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    });

  // 2. Setup Socket.IO Realtime Connection
  try {
    const ioClient = typeof window !== 'undefined' && window.io ? window.io : null;
    if (ioClient) {
      socket = ioClient(targetUrl, {
        reconnectionAttempts: 10,
        reconnectionDelay: 1500,
        timeout: 8000
      });

      socket.on('connect', () => {
        syncStatus.set('connected');
        lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
      });

      socket.on('disconnect', () => {
        syncStatus.set('offline');
      });

      // Realtime Event Listeners
      socket.on('transaction:created', (newTx) => {
        transactions.update((list) => {
          if (list.some((t) => String(t.id) === String(newTx.id))) return list;
          return [newTx, ...list];
        });
        lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
      });

      socket.on('transaction:updated', (updatedTx) => {
        transactions.update((list) =>
          list.map((t) => (String(t.id) === String(updatedTx.id) ? { ...t, ...updatedTx } : t))
        );
        lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
      });

      socket.on('transaction:deleted', (delId) => {
        transactions.update((list) => list.filter((t) => String(t.id) !== String(delId)));
        lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
      });

      socket.on('budget:updated', (budget) => {
        budgets.update((list) => {
          const idx = list.findIndex((b) => b.category.toLowerCase() === budget.category.toLowerCase());
          if (idx >= 0) {
            list[idx] = budget;
            return [...list];
          }
          return [...list, budget];
        });
        lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
      });

      socket.on('goal:updated', (goal) => {
        goals.update((list) => {
          const idx = list.findIndex((g) => String(g.id) === String(goal.id));
          if (idx >= 0) {
            list[idx] = goal;
            return [...list];
          }
          return [...list, goal];
        });
        lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
      });

      // SECURITY GLOBAL LOCK: Realtime listener across all devices
      socket.on('security:lock_all', (payload) => {
        const ts = payload?.timestamp || Date.now();
        if (typeof window !== 'undefined' && window._handleGlobalLock) {
          window._handleGlobalLock(ts);
        }
      });

      // SECURITY ADMIN RECOVERY KEY: Realtime listener across all devices
      socket.on('security:admin_key_updated', (payload) => {
        const key = payload?.adminKey;
        if (key) {
          const cleanKey = String(key).trim();
          localStorage.setItem('finora_admin_secret', cleanKey);
          if (typeof window !== 'undefined' && window._handleAdminKeySync) {
            window._handleAdminKeySync(cleanKey);
          }
        }
      });
    }
  } catch (e) {
    console.warn('[Socket.IO] Error initializing socket:', e);
  }

  return socket;
}

export function getSocket() {
  return socket;
}

/**
 * Emit Global Lock event to backend and all connected Socket.IO clients
 */
export function emitGlobalLock(timestamp = Date.now()) {
  if (!browser) return;
  const targetUrl = getServerUrl();
  // 1. Emit via active Socket.IO connection
  if (socket && socket.connected) {
    socket.emit('security:lock_all', { timestamp });
  }
  // 2. Persist to backend SQLite via REST endpoint
  fetch(`${targetUrl}/api/auth/lock-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timestamp })
  }).catch((err) => {
    // Backend may be offline or in pure cloud mode
  });
}


// ==========================================================================
// TRANSACTIONS HANDLERS
// ==========================================================================

export function emitAddTransaction(tx) {
  return new Promise((resolve) => {
    let targetWalletId = tx.walletId;
    let affectedWallet = null;

    // Auto-update wallet balance
    wallets.update((wList) => {
      if (!targetWalletId && wList.length > 0) {
        targetWalletId = wList[0].id;
      }
      if (!targetWalletId) return wList;

      const amt = Number(tx.amount) || 0;
      return wList.map((w) => {
        if (w.id === targetWalletId) {
          const bal = Number(w.balance) || 0;
          affectedWallet = {
            ...w,
            balance: tx.type === 'income' ? bal + amt : Math.max(0, bal - amt)
          };
          return affectedWallet;
        }
        return w;
      });
    });

    const localTx = {
      ...tx,
      id: tx.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      walletId: targetWalletId || tx.walletId || '',
      created_at: tx.created_at || new Date().toISOString()
    };

    // Optimistic local update
    transactions.update((list) => [localTx, ...list]);
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));

    // Emit via Socket.IO if connected
    if (socket && socket.connected) {
      socket.emit('transaction:add', localTx, (res) => resolve(res));
    } else {
      resolve({ success: true, data: localTx, local: true });
    }

    // Sync to Supabase Cloud if connected
    cloudAddTransaction(localTx);

    // Sync affected wallet balance to Supabase Cloud
    if (affectedWallet) {
      cloudUpdateWallet(affectedWallet);
    }

    // Background REST call to persist in SQLite server
    const targetUrl = getServerUrl();
    fetch(`${targetUrl}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localTx)
    }).catch(() => {});
  });
}

export function emitDeleteTransaction(id) {
  return new Promise((resolve) => {
    let restoredWallet = null;
    transactions.update((list) => {
      const target = list.find((t) => String(t.id) === String(id));
      if (target && target.walletId) {
        const amt = Number(target.amount) || 0;
        wallets.update((wList) =>
          wList.map((w) => {
            if (w.id === target.walletId) {
              const bal = Number(w.balance) || 0;
              restoredWallet = {
                ...w,
                balance: target.type === 'income' ? Math.max(0, bal - amt) : bal + amt
              };
              return restoredWallet;
            }
            return w;
          })
        );
      }
      return list.filter((t) => String(t.id) !== String(id));
    });

    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));

    if (socket && socket.connected) {
      socket.emit('transaction:remove', id, (res) => resolve(res));
    } else {
      resolve({ success: true, id, local: true });
    }

    // Sync deletion to Supabase Cloud
    cloudDeleteTransaction(id);

    // Sync restored wallet balance to Supabase Cloud
    if (restoredWallet) {
      cloudUpdateWallet(restoredWallet);
    }

    const targetUrl = getServerUrl();
    fetch(`${targetUrl}/api/transactions/${id}`, { method: 'DELETE' }).catch(() => {});
  });
}

export function emitUpdateTransaction(idOrTx, maybeTxData) {
  return new Promise((resolve) => {
    let id = idOrTx;
    let updateData = maybeTxData;

    if (typeof idOrTx === 'object' && idOrTx !== null) {
      id = idOrTx.id;
      updateData = idOrTx;
    }

    transactions.update((list) => {
      const idx = list.findIndex((t) => String(t.id) === String(id));
      if (idx >= 0) {
        const oldTx = list[idx];
        const newTx = { ...oldTx, ...updateData, updated_at: new Date().toISOString() };
        list[idx] = newTx;
        return [...list];
      }
      return list;
    });

    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));

    if (socket && socket.connected) {
      socket.emit('transaction:update', { id, txData: updateData }, (res) => resolve(res));
    } else {
      resolve({ success: true, id, local: true });
    }

    // Sync update to Supabase Cloud
    cloudUpdateTransaction(id, updateData);

    const targetUrl = getServerUrl();
    fetch(`${targetUrl}/api/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    }).catch(() => {});
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

    if (socket && socket.connected) {
      socket.emit('transaction:reset', (res) => resolve(res));
    }

    const targetUrl = getServerUrl();
    fetch(`${targetUrl}/api/transactions/reset`, { method: 'POST' }).catch(() => {});
    resolve({ success: true, data: defaultInit, local: true });
  });
}

// ==========================================================================
// BUDGETS & GOALS HANDLERS
// ==========================================================================

export function emitUpdateBudget(category, limit) {
  return new Promise((resolve) => {
    const trimmedCat = (category || '').trim();
    const numLimit = Number(limit) || 0;
    let targetBudget = null;

    budgets.update((list) => {
      const idx = list.findIndex((b) => b.category.toLowerCase().trim() === trimmedCat.toLowerCase());
      if (idx >= 0) {
        targetBudget = { ...list[idx], monthly_limit: numLimit };
        list[idx] = targetBudget;
        return [...list];
      } else {
        targetBudget = {
          id: 'b_' + Date.now(),
          category: trimmedCat,
          monthly_limit: numLimit
        };
        return [...list, targetBudget];
      }
    });

    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));

    if (socket && socket.connected) {
      socket.emit('budget:update', { category: trimmedCat, limit: numLimit }, (res) => resolve(res));
    } else {
      resolve({ success: true, local: true });
    }

    // Sync to Supabase Cloud
    if (targetBudget) {
      cloudUpdateBudget(targetBudget);
    }

    const targetUrl = getServerUrl();
    fetch(`${targetUrl}/api/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: trimmedCat, limit: numLimit })
    }).catch(() => {});
  });
}

export function emitDeleteBudget(category) {
  return new Promise((resolve) => {
    const trimmedCat = (category || '').trim();
    budgets.update((list) => list.filter((b) => b.category.toLowerCase().trim() !== trimmedCat.toLowerCase()));
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));

    if (socket && socket.connected) {
      socket.emit('budget:remove', trimmedCat, (res) => resolve(res));
    } else {
      resolve({ success: true, local: true });
    }

    // Sync deletion to Supabase Cloud
    cloudDeleteBudget(trimmedCat);

    const targetUrl = getServerUrl();
    fetch(`${targetUrl}/api/budgets/${encodeURIComponent(trimmedCat)}`, { method: 'DELETE' }).catch(() => {});
  });
}

export function emitDepositGoal(id, amount) {
  return new Promise((resolve) => {
    let updatedGoal = null;
    goals.update((list) => {
      const g = list.find((item) => String(item.id) === String(id));
      if (g) {
        g.current_amount = (Number(g.current_amount) || 0) + Number(amount);
        updatedGoal = { ...g };
      }
      return [...list];
    });
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));

    if (socket && socket.connected) {
      socket.emit('goal:deposit', { id, amount: Number(amount) }, (res) => resolve(res));
    } else {
      resolve({ success: true, local: true });
    }

    // Sync to Supabase Cloud
    if (updatedGoal) {
      cloudUpdateGoal(updatedGoal);
    }

    const targetUrl = getServerUrl();
    fetch(`${targetUrl}/api/goals/${id}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount) })
    }).catch(() => {});
  });
}

export function emitAddGoal(goalData) {
  return new Promise((resolve) => {
    const newG = { ...goalData, id: `g-${Date.now()}` };
    goals.update((list) => [...list, newG]);
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));

    if (socket && socket.connected) {
      socket.emit('goal:add', newG, (res) => resolve(res));
    } else {
      resolve({ success: true, data: newG, local: true });
    }

    // Sync to Supabase Cloud
    cloudUpdateGoal(newG);

    const targetUrl = getServerUrl();
    fetch(`${targetUrl}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newG)
    }).catch(() => {});
  });
}

export function emitUpdateGoal(id, goalData) {
  return new Promise((resolve) => {
    let updatedG = null;
    goals.update((list) => {
      const idx = list.findIndex((g) => String(g.id) === String(id));
      if (idx >= 0) {
        updatedG = { ...list[idx], ...goalData };
        list[idx] = updatedG;
        return [...list];
      }
      return list;
    });
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));

    if (socket && socket.connected) {
      socket.emit('goal:update', { id, goalData }, (res) => resolve(res));
    } else {
      resolve({ success: true, local: true });
    }

    // Sync to Supabase Cloud
    if (updatedG) {
      cloudUpdateGoal(updatedG);
    }

    const targetUrl = getServerUrl();
    fetch(`${targetUrl}/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalData)
    }).catch(() => {});
  });
}

export function emitDeleteGoal(id) {
  return new Promise((resolve) => {
    goals.update((list) => list.filter((g) => String(g.id) !== String(id)));
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));

    if (socket && socket.connected) {
      socket.emit('goal:remove', id, (res) => resolve(res));
    } else {
      resolve({ success: true, local: true });
    }

    // Sync to Supabase Cloud
    cloudDeleteGoal(id);

    const targetUrl = getServerUrl();
    fetch(`${targetUrl}/api/goals/${id}`, { method: 'DELETE' }).catch(() => {});
  });
}
