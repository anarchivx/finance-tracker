import { io } from 'socket.io-client';
import { browser } from '$app/environment';
import { transactions, budgets, goals, syncStatus, lastSyncTime } from './stores.js';

let socket = null;
const SERVER_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVER_URL) || 'http://localhost:3001';

export function initSocket() {
  if (!browser || socket) return socket;

  syncStatus.set('connecting');

  socket = io(SERVER_URL, {
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    timeout: 5000
  });

  socket.on('connect', () => {
    console.log('⚡ Connected to Finora SQLite backend!');
    syncStatus.set('connected');
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
  });

  socket.on('disconnect', () => {
    console.warn('⚠️ Disconnected from Finora backend. Switching to local mode.');
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
      const idx = list.findIndex((b) => b.category === updatedBudget.category);
      if (idx >= 0) {
        list[idx] = updatedBudget;
        return [...list];
      }
      return [...list, updatedBudget];
    });
  });

  socket.on('budget:deleted', (category) => {
    budgets.update((list) => list.filter((b) => b.category !== category));
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
    goals.update((list) => list.filter((g) => String(g.id) !== String(id)));
  });

  return socket;
}

export function emitAddTransaction(tx) {
  return new Promise((resolve) => {
    if (socket && socket.connected) {
      socket.emit('transaction:add', tx, (res) => resolve(res));
    } else {
      // Local fallback
      const localTx = {
        ...tx,
        id: tx.id || `local-${Date.now()}`,
        created_at: new Date().toISOString()
      };
      transactions.update((list) => [localTx, ...list]);
      resolve({ success: true, data: localTx, local: true });
    }
  });
}

export function emitDeleteTransaction(id) {
  return new Promise((resolve) => {
    // 1. Optimistic immediate local removal
    transactions.update((list) => list.filter((t) => String(t.id) !== String(id)));

    // 2. Socket.IO broadcast to all clients
    if (socket && socket.connected) {
      socket.emit('transaction:remove', id, (res) => resolve(res));
    }

    // 3. REST API guarantee to SQLite database
    fetch(`${SERVER_URL}/api/transactions/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => resolve({ success: true, data }))
      .catch((err) => {
        console.warn('REST delete fallback error:', err);
        resolve({ success: true, local: true });
      });
  });
}

export function emitUpdateTransaction(id, txData) {
  return new Promise((resolve) => {
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
  });
}

export function emitResetTransactions() {
  return new Promise((resolve) => {
    // 1. Socket broadcast
    if (socket && socket.connected) {
      socket.emit('transaction:reset', (res) => {
        if (res?.data) transactions.set(res.data);
        resolve(res);
      });
    }

    // 2. REST API call to reset SQLite DB
    fetch(`${SERVER_URL}/api/transactions/reset`, { method: 'POST' })
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
    const trimmedCat = category.trim();
    const numLimit = Number(limit) || 0;

    // 1. Optimistic immediate local store update (Ensures 100% offline & Netlify reliability)
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
  });
}

export function emitDeleteBudget(category) {
  return new Promise((resolve) => {
    const trimmedCat = category.trim();

    // 1. Optimistic immediate local removal
    budgets.update((list) => list.filter((b) => b.category.toLowerCase().trim() !== trimmedCat.toLowerCase()));

    // 2. Real-time Socket broadcast
    if (socket && socket.connected) {
      socket.emit('budget:remove', trimmedCat, (res) => resolve(res));
    } else {
      resolve({ success: true, local: true });
    }

    // 3. REST API delete fallback (if server is running)
    fetch(`${SERVER_URL}/api/budgets/${encodeURIComponent(trimmedCat)}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => resolve({ success: true, data }))
      .catch(() => resolve({ success: true, local: true }));
  });
}

export function emitDepositGoal(id, amount) {
  return new Promise((resolve) => {
    if (socket && socket.connected) {
      socket.emit('goal:deposit', { id, amount }, (res) => resolve(res));
    } else {
      goals.update((list) => {
        const item = list.find((g) => String(g.id) === String(id));
        if (item) item.current_amount = (item.current_amount || 0) + Number(amount);
        return [...list];
      });
      resolve({ success: true, local: true });
    }
  });
}

export function emitAddGoal(goalData) {
  return new Promise((resolve) => {
    if (socket && socket.connected) {
      socket.emit('goal:add', goalData, (res) => resolve(res));
    } else {
      const newG = { ...goalData, id: `g-local-${Date.now()}` };
      goals.update((list) => [...list, newG]);
      resolve({ success: true, data: newG, local: true });
    }
  });
}

export function emitUpdateGoal(id, goalData) {
  return new Promise((resolve) => {
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
  });
}

export function emitDeleteGoal(id) {
  return new Promise((resolve) => {
    // 1. Optimistic immediate local removal
    goals.update((list) => list.filter((g) => String(g.id) !== String(id)));

    // 2. Socket broadcast
    if (socket && socket.connected) {
      socket.emit('goal:remove', id, (res) => resolve(res));
    }

    // 3. REST API delete
    fetch(`${SERVER_URL}/api/goals/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => resolve({ success: true, data }))
      .catch((err) => {
        console.warn('REST delete goal error:', err);
        resolve({ success: true, local: true });
      });
  });
}
