import { io } from 'socket.io-client';
import { browser } from '$app/environment';
import { transactions, budgets, goals, syncStatus, lastSyncTime } from './stores.js';

let socket = null;

export function getServerUrl() {
  if (browser) {
    const saved = localStorage.getItem('finora_server_url');
    if (saved && saved.trim()) return saved.trim().replace(/\/$/, '');
  }
  return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVER_URL) || 'http://localhost:3001';
}

export function setServerUrl(newUrl) {
  if (browser) {
    const cleanUrl = (newUrl || '').trim().replace(/\/$/, '');
    if (cleanUrl) {
      localStorage.setItem('finora_server_url', cleanUrl);
    } else {
      localStorage.removeItem('finora_server_url');
    }
    reconnectSocket(cleanUrl || null);
  }
}

export function reconnectSocket(overrideUrl = null) {
  if (!browser) return null;
  const targetUrl = overrideUrl || getServerUrl();

  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    } catch (e) {
      console.warn('Socket disconnect error:', e);
    }
  }

  return initSocket(targetUrl);
}

export function initSocket(customUrl = null) {
  if (!browser) return null;
  const targetUrl = customUrl || getServerUrl();

  if (socket && socket.connected) return socket;

  syncStatus.set('connecting');

  socket = io(targetUrl, {
    reconnectionAttempts: 8,
    reconnectionDelay: 2500,
    timeout: 7000,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log(`⚡ Connected to Finora Real-time Backend at ${targetUrl}!`);
    syncStatus.set('connected');
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
  });

  socket.on('disconnect', () => {
    console.warn('⚠️ Disconnected from Finora backend. Running in local cache mode.');
    syncStatus.set('offline');
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connect error:', err.message);
    syncStatus.set('offline');
  });

  // Initial Sync from server SQLite DB
  socket.on('sync:initial', (data) => {
    console.log('📦 Received initial SQLite data sync:', data);
    if (data?.transactions) transactions.set(data.transactions);
    if (data?.budgets) budgets.set(data.budgets);
    if (data?.goals) goals.set(data.goals);
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
  });

  // Real-time broadcast listeners
  socket.on('transaction:created', (newTx) => {
    transactions.update((list) => {
      if (list.some((t) => t.id === newTx.id)) return list;
      return [newTx, ...list];
    });
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
  });

  socket.on('transaction:deleted', (id) => {
    transactions.update((list) => list.filter((t) => String(t.id) !== String(id)));
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
  });

  socket.on('transaction:updated', (updatedTx) => {
    transactions.update((list) => {
      const idx = list.findIndex((t) => t.id === updatedTx.id);
      if (idx >= 0) {
        list[idx] = updatedTx;
        return [...list];
      }
      return [updatedTx, ...list];
    });
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
  });

  socket.on('transaction:reset', (freshList) => {
    transactions.set(freshList);
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
  });

  socket.on('budget:updated', (updatedBudget) => {
    budgets.update((list) => {
      const idx = list.findIndex((b) => b.category.toLowerCase().trim() === updatedBudget.category.toLowerCase().trim());
      if (idx >= 0) {
        list[idx] = updatedBudget;
        return [...list];
      }
      return [...list, updatedBudget];
    });
  });

  socket.on('budget:deleted', (category) => {
    budgets.update((list) => list.filter((b) => b.category.toLowerCase().trim() !== category.toLowerCase().trim()));
  });

  socket.on('goal:created', (newGoal) => {
    goals.update((list) => {
      if (list.some((g) => g.id === newGoal.id)) return list;
      return [...list, newGoal];
    });
  });

  socket.on('goal:updated', (updatedGoal) => {
    goals.update((list) => {
      const idx = list.findIndex((g) => g.id === updatedGoal.id);
      if (idx >= 0) {
        list[idx] = updatedGoal;
        return [...list];
      }
      return [...list, updatedGoal];
    });
  });

  socket.on('goal:deleted', (id) => {
    goals.update((list) => list.filter((g) => g.id !== id));
  });

  return socket;
}

export function getSocket() {
  return socket;
}

// ==========================================================================
// CLOUD CONNECTION TEST & DATA MIGRATION HELPERS
// ==========================================================================

export async function testServerConnection(testUrl = null) {
  const target = (testUrl || getServerUrl()).trim().replace(/\/$/, '');
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${target}/api/sync`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (res.ok) {
      const data = await res.json();
      return { success: true, latency, data, target };
    }
    return { success: false, latency, error: `HTTP ${res.status}: ${res.statusText}`, target };
  } catch (err) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Koneksi timeout (6 detik)' : err.message,
      target
    };
  }
}

export async function pushAllLocalDataToCloud() {
  const target = getServerUrl();
  let localTxs = [];
  let localBudgets = [];
  let localGoals = [];

  transactions.subscribe((v) => (localTxs = v))();
  budgets.subscribe((v) => (localBudgets = v))();
  goals.subscribe((v) => (localGoals = v))();

  const res = await fetch(`${target}/api/sync/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactions: localTxs,
      budgets: localBudgets,
      goals: localGoals
    })
  });

  if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
  const data = await res.json();
  lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
  return data;
}

export async function pullCloudDataToLocal() {
  const target = getServerUrl();
  const res = await fetch(`${target}/api/sync`);
  if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
  const data = await res.json();
  if (data?.transactions) transactions.set(data.transactions);
  if (data?.budgets) budgets.set(data.budgets);
  if (data?.goals) goals.set(data.goals);
  lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
  return data;
}

// ==========================================================================
// REAL-TIME BROADCAST ACTIONS
// ==========================================================================

export function emitAddTransaction(tx) {
  return new Promise((resolve) => {
    const target = getServerUrl();

    if (socket && socket.connected) {
      socket.emit('transaction:add', tx, (res) => {
        if (res?.success && res?.data) {
          transactions.update((list) => {
            if (list.some((t) => t.id === res.data.id)) return list;
            return [res.data, ...list];
          });
        }
        resolve(res);
      });
    } else {
      // Local optimistic fallback
      const localTx = {
        ...tx,
        id: tx.id || `local-${Date.now()}`,
        created_at: new Date().toISOString()
      };
      transactions.update((list) => [localTx, ...list]);
      resolve({ success: true, data: localTx, local: true });

      // REST API asynchronous backup
      fetch(`${target}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      }).catch(() => {});
    }
  });
}

export function emitDeleteTransaction(id) {
  return new Promise((resolve) => {
    const target = getServerUrl();

    // 1. Optimistic immediate local removal
    transactions.update((list) => list.filter((t) => String(t.id) !== String(id)));

    // 2. Socket.IO broadcast
    if (socket && socket.connected) {
      socket.emit('transaction:remove', id, (res) => resolve(res));
    } else {
      resolve({ success: true, local: true });
    }

    // 3. REST API guarantee
    fetch(`${target}/api/transactions/${id}`, { method: 'DELETE' }).catch(() => {});
  });
}

export function emitUpdateTransaction(id, txData) {
  return new Promise((resolve) => {
    const target = getServerUrl();

    if (socket && socket.connected) {
      socket.emit('transaction:update', { id, txData }, (res) => resolve(res));
    } else {
      transactions.update((list) => {
        const idx = list.findIndex((t) => String(t.id) === String(id));
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...txData };
          return [...list];
        }
        return list;
      });
      resolve({ success: true, local: true });
    }

    fetch(`${target}/api/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txData)
    }).catch(() => {});
  });
}

export function emitResetTransactions() {
  return new Promise((resolve) => {
    const target = getServerUrl();

    if (socket && socket.connected) {
      socket.emit('transaction:reset', (res) => {
        if (res?.data) transactions.set(res.data);
        resolve(res);
      });
    }

    fetch(`${target}/api/transactions/reset`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.transactions) transactions.set(data.transactions);
        resolve({ success: true, data });
      })
      .catch((err) => {
        console.warn('REST reset fallback error:', err);
        resolve({ success: true, local: true });
      });
  });
}

export function emitUpdateBudget(category, limit) {
  return new Promise((resolve) => {
    const target = getServerUrl();
    const trimmedCat = category.trim();
    const numLimit = Number(limit) || 0;

    // 1. Optimistic immediate local store update
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

    // 2. Real-time Socket broadcast
    if (socket && socket.connected) {
      socket.emit('budget:set', { category: trimmedCat, limit: numLimit }, (res) => resolve(res));
    } else {
      resolve({ success: true, local: true });
    }

    fetch(`${target}/api/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: trimmedCat, limit: numLimit })
    }).catch(() => {});
  });
}

export function emitDeleteBudget(category) {
  return new Promise((resolve) => {
    const target = getServerUrl();
    const trimmedCat = category.trim();

    // 1. Optimistic immediate local removal
    budgets.update((list) => list.filter((b) => b.category.toLowerCase().trim() !== trimmedCat.toLowerCase()));

    // 2. Real-time Socket broadcast
    if (socket && socket.connected) {
      socket.emit('budget:remove', trimmedCat, (res) => resolve(res));
    } else {
      resolve({ success: true, local: true });
    }

    // 3. REST API delete fallback
    fetch(`${target}/api/budgets/${encodeURIComponent(trimmedCat)}`, { method: 'DELETE' }).catch(() => {});
  });
}

export function emitDepositGoal(id, amount) {
  return new Promise((resolve) => {
    const target = getServerUrl();

    // 1. Optimistic local update
    goals.update((list) => {
      const g = list.find((item) => String(item.id) === String(id));
      if (g) g.current_amount = (Number(g.current_amount) || 0) + Number(amount);
      return [...list];
    });

    // 2. Socket emit
    if (socket && socket.connected) {
      socket.emit('goal:deposit', { id, amount: Number(amount) }, (res) => resolve(res));
    } else {
      resolve({ success: true, local: true });
    }

    fetch(`${target}/api/goals/${id}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount) })
    }).catch(() => {});
  });
}

export function emitAddGoal(goalData) {
  return new Promise((resolve) => {
    const target = getServerUrl();

    if (socket && socket.connected) {
      socket.emit('goal:add', goalData, (res) => resolve(res));
    } else {
      const newG = { ...goalData, id: `g-local-${Date.now()}` };
      goals.update((list) => [...list, newG]);
      resolve({ success: true, data: newG, local: true });
    }

    fetch(`${target}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalData)
    }).catch(() => {});
  });
}

export function emitUpdateGoal(id, goalData) {
  return new Promise((resolve) => {
    const target = getServerUrl();

    if (socket && socket.connected) {
      socket.emit('goal:update', { id, goalData }, (res) => resolve(res));
    } else {
      goals.update((list) => {
        const idx = list.findIndex((g) => String(g.id) === String(id));
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...goalData };
          return [...list];
        }
        return list;
      });
      resolve({ success: true, local: true });
    }

    fetch(`${target}/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalData)
    }).catch(() => {});
  });
}

export function emitDeleteGoal(id) {
  return new Promise((resolve) => {
    const target = getServerUrl();

    // 1. Optimistic immediate local removal
    goals.update((list) => list.filter((g) => String(g.id) !== String(id)));

    // 2. Socket broadcast
    if (socket && socket.connected) {
      socket.emit('goal:remove', id, (res) => resolve(res));
    } else {
      resolve({ success: true, local: true });
    }

    // 3. REST API delete
    fetch(`${target}/api/goals/${id}`, { method: 'DELETE' }).catch(() => {});
  });
}
