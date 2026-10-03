import { createClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import {
  transactions,
  wallets,
  budgets,
  goals,
  subscriptions,
  debts,
  syncStatus,
  lastSyncTime
} from './stores.js';

let supabase = null;
let realtimeChannel = null;

// LocalStorage keys for dynamic config
const STORAGE_URL_KEY = 'finora_supabase_url';
const STORAGE_KEY_KEY = 'finora_supabase_anon_key';

export function getSupabaseConfig() {
  if (!browser) return { url: '', key: '' };
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const localUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
  const localKey = localStorage.getItem(STORAGE_KEY_KEY) || '';

  return {
    url: localUrl || envUrl,
    key: localKey || envKey,
    isCustom: !!localUrl
  };
}

export function saveSupabaseConfig(url, key) {
  if (!browser) return;
  if (url && key) {
    localStorage.setItem(STORAGE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_KEY_KEY);
  }
  // Re-init connection
  return initSupabaseSync();
}

export function getSupabaseClient() {
  return supabase;
}

/**
 * Initialize Supabase Client and Realtime Channel
 */
export async function initSupabaseSync() {
  if (!browser) return null;

  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    syncStatus.set('local');
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    return null;
  }

  try {
    syncStatus.set('connecting');

    supabase = createClient(url, key, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });

    // Test connection with a lightweight select
    const { error: testErr } = await supabase.from('transactions').select('id').limit(1);
    if (testErr) {
      console.warn('[Supabase] Connection test returned notice:', testErr.message);
      // Table might not exist yet, but credentials could be valid
    }

    syncStatus.set('cloud_connected');
    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));

    // 1. Initial Pull from Cloud
    await pullAllFromCloud();

    // 2. Setup Realtime Listener
    setupRealtimeSubscription();

    return supabase;
  } catch (err) {
    console.error('[Supabase] Init error:', err);
    syncStatus.set('error');
    return null;
  }
}

/**
 * Pull all data from Supabase Cloud to local Svelte stores
 */
export async function pullAllFromCloud() {
  if (!supabase) return;

  try {
    // 1. Transactions
    const { data: txData, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (!txErr && txData && txData.length > 0) {
      // Map DB snake_case to frontend camelCase
      const formatted = txData.map(t => ({
        ...t,
        walletId: t.wallet_id || t.walletId || '',
        created_at: t.created_at || new Date().toISOString()
      }));
      transactions.set(formatted);
    }

    // 2. Wallets
    const { data: wData, error: wErr } = await supabase.from('wallets').select('*');
    if (!wErr && wData && wData.length > 0) {
      const formattedWallets = wData.map(w => ({
        ...w,
        accountNumber: w.account_number || w.accountNumber || ''
      }));
      wallets.set(formattedWallets);
    } else if (!wErr && (!wData || wData.length === 0)) {
      const currentWallets = get(wallets);
      if (currentWallets && currentWallets.length > 0) {
        cloudSyncWallets(currentWallets);
      }
    }

    // 3. Budgets
    const { data: bData, error: bErr } = await supabase.from('budgets').select('*');
    if (!bErr && bData && bData.length > 0) {
      budgets.set(bData);
    }

    // 4. Goals
    const { data: gData, error: gErr } = await supabase.from('goals').select('*');
    if (!gErr && gData && gData.length > 0) {
      goals.set(gData);
    }

    // 5. Subscriptions
    const { data: sData, error: sErr } = await supabase.from('subscriptions').select('*');
    if (!sErr && sData && sData.length > 0) {
      const formattedSubs = sData.map(s => ({
        ...s,
        walletId: s.wallet_id || s.walletId || '',
        billingDay: s.billing_day || s.billingDay || 1,
        nextDue: s.next_due || s.nextDue || '',
        isPaidThisMonth: s.is_paid_this_month !== undefined ? s.is_paid_this_month : s.isPaidThisMonth
      }));
      subscriptions.set(formattedSubs);
    }

    // 6. Debts
    const { data: dData, error: dErr } = await supabase.from('debts').select('*');
    if (!dErr && dData && dData.length > 0) {
      const formattedDebts = dData.map(d => ({
        ...d,
        personName: d.person_name || d.personName || '',
        paidAmount: d.paid_amount || d.paidAmount || 0,
        dueDate: d.due_date || d.dueDate || ''
      }));
      debts.set(formattedDebts);
    }

    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
  } catch (err) {
    console.warn('[Supabase] Pull error:', err);
  }
}

/**
 * Setup Realtime WebSocket Channel
 */
function setupRealtimeSubscription() {
  if (!supabase) return;

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel('finora-realtime-hub')
    // TRANSACTIONS Realtime
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === 'INSERT') {
        const item = { ...newRec, walletId: newRec.wallet_id || newRec.walletId || '' };
        transactions.update(list => {
          if (list.some(t => String(t.id) === String(item.id))) return list;
          return [item, ...list];
        });
      } else if (eventType === 'UPDATE') {
        const item = { ...newRec, walletId: newRec.wallet_id || newRec.walletId || '' };
        transactions.update(list => list.map(t => String(t.id) === String(item.id) ? { ...t, ...item } : t));
      } else if (eventType === 'DELETE') {
        transactions.update(list => list.filter(t => String(t.id) !== String(oldRec.id)));
      }
      lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    })
    // WALLETS Realtime
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const item = { ...newRec, accountNumber: newRec.account_number || newRec.accountNumber || '' };
        wallets.update(list => {
          const idx = list.findIndex(w => String(w.id) === String(item.id));
          if (idx >= 0) {
            list[idx] = item;
            return [...list];
          }
          return [...list, item];
        });
      } else if (eventType === 'DELETE') {
        wallets.update(list => list.filter(w => String(w.id) !== String(oldRec.id)));
      }
      lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    })
    // GOALS Realtime
    .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        goals.update(list => {
          const idx = list.findIndex(g => String(g.id) === String(newRec.id));
          if (idx >= 0) {
            list[idx] = newRec;
            return [...list];
          }
          return [...list, newRec];
        });
      } else if (eventType === 'DELETE') {
        goals.update(list => list.filter(g => String(g.id) !== String(oldRec.id)));
      }
      lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    })
    // BUDGETS Realtime
    .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        budgets.update(list => {
          const idx = list.findIndex(b => String(b.id) === String(newRec.id));
          if (idx >= 0) {
            list[idx] = newRec;
            return [...list];
          }
          return [...list, newRec];
        });
      } else if (eventType === 'DELETE') {
        budgets.update(list => list.filter(b => String(b.id) !== String(oldRec.id)));
      }
      lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    })
    // SUBSCRIPTIONS Realtime
    .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const item = {
          ...newRec,
          walletId: newRec.wallet_id || newRec.walletId || '',
          billingDay: newRec.billing_day || newRec.billingDay || 1,
          nextDue: newRec.next_due || newRec.nextDue || '',
          isPaidThisMonth: newRec.is_paid_this_month !== undefined ? newRec.is_paid_this_month : newRec.isPaidThisMonth
        };
        subscriptions.update(list => {
          const idx = list.findIndex(s => String(s.id) === String(item.id));
          if (idx >= 0) {
            list[idx] = item;
            return [...list];
          }
          return [...list, item];
        });
      } else if (eventType === 'DELETE') {
        subscriptions.update(list => list.filter(s => String(s.id) !== String(oldRec.id)));
      }
      lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    })
    // DEBTS Realtime
    .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' }, (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const item = {
          ...newRec,
          personName: newRec.person_name || newRec.personName || '',
          paidAmount: newRec.paid_amount || newRec.paidAmount || 0,
          dueDate: newRec.due_date || newRec.dueDate || ''
        };
        debts.update(list => {
          const idx = list.findIndex(d => String(d.id) === String(item.id));
          if (idx >= 0) {
            list[idx] = item;
            return [...list];
          }
          return [...list, item];
        });
      } else if (eventType === 'DELETE') {
        debts.update(list => list.filter(d => String(d.id) !== String(oldRec.id)));
      }
      lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        syncStatus.set('cloud_connected');
      }
    });

  // Auto-resync when browser tab becomes active or phone wakes up
  if (browser && !window._supabaseVisibilityBound) {
    window._supabaseVisibilityBound = true;
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && supabase) {
        pullAllFromCloud();
      }
    });
    window.addEventListener('focus', () => {
      if (supabase) {
        pullAllFromCloud();
      }
    });
  }
}

/**
 * Cloud Operations (Optimistic Local + Async Supabase Sync)
 */

export async function cloudAddTransaction(tx) {
  if (!supabase) return;
  try {
    const dbPayload = {
      id: tx.id,
      description: tx.description,
      amount: Number(tx.amount) || 0,
      category: tx.category,
      type: tx.type,
      payment_method: tx.payment_method || 'QRIS',
      date: tx.date,
      time: tx.time || '12:00',
      notes: tx.notes || '',
      wallet_id: tx.walletId || '',
      created_at: tx.created_at || new Date().toISOString()
    };
    await supabase.from('transactions').upsert(dbPayload);
  } catch (err) {
    console.warn('[Supabase] push tx error:', err);
  }
}

export async function cloudUpdateTransaction(id, txData) {
  if (!supabase) return;
  try {
    const payload = {};
    if (txData.description !== undefined) payload.description = txData.description;
    if (txData.amount !== undefined) payload.amount = Number(txData.amount);
    if (txData.category !== undefined) payload.category = txData.category;
    if (txData.type !== undefined) payload.type = txData.type;
    if (txData.payment_method !== undefined) payload.payment_method = txData.payment_method;
    if (txData.date !== undefined) payload.date = txData.date;
    if (txData.time !== undefined) payload.time = txData.time;
    if (txData.notes !== undefined) payload.notes = txData.notes;
    if (txData.walletId !== undefined) payload.wallet_id = txData.walletId;

    await supabase.from('transactions').update(payload).eq('id', id);
  } catch (err) {
    console.warn('[Supabase] update tx error:', err);
  }
}

export async function cloudDeleteTransaction(id) {
  if (!supabase) return;
  try {
    await supabase.from('transactions').delete().eq('id', id);
  } catch (err) {
    console.warn('[Supabase] delete tx error:', err);
  }
}

export async function cloudUpdateWallet(wallet) {
  if (!supabase || !wallet) return;
  try {
    const payload = {
      id: String(wallet.id),
      name: wallet.name || 'Dompet',
      type: wallet.type || 'bank',
      balance: Number(wallet.balance) || 0,
      account_number: wallet.accountNumber || wallet.account_number || '',
      gradient: wallet.gradient || 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
      icon: wallet.icon || 'fa-wallet',
      badge: wallet.badge || 'Aktif'
    };
    const { error } = await supabase.from('wallets').upsert(payload);
    if (error) {
      console.warn('[Supabase] update wallet error:', error.message);
    } else {
      lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    }
  } catch (err) {
    console.warn('[Supabase] update wallet exception:', err);
  }
}

export async function cloudDeleteWallet(id) {
  if (!supabase || !id) return;
  try {
    const { error } = await supabase.from('wallets').delete().eq('id', String(id));
    if (error) {
      console.warn('[Supabase] delete wallet error:', error.message);
    } else {
      lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    }
  } catch (err) {
    console.warn('[Supabase] delete wallet exception:', err);
  }
}

export async function cloudSyncWallets(walletList) {
  if (!supabase || !walletList || walletList.length === 0) return;
  try {
    const formatted = walletList.map((w) => ({
      id: String(w.id),
      name: w.name || 'Dompet',
      type: w.type || 'bank',
      balance: Number(w.balance) || 0,
      account_number: w.accountNumber || w.account_number || '',
      gradient: w.gradient || 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
      icon: w.icon || 'fa-wallet',
      badge: w.badge || 'Aktif'
    }));
    const { error } = await supabase.from('wallets').upsert(formatted);
    if (!error) {
      lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    }
  } catch (err) {
    console.warn('[Supabase] sync wallets error:', err);
  }
}

export async function cloudPushAllLocalToCloud(currentData) {
  if (!supabase) return { success: false, error: 'Supabase client not initialized' };

  try {
    const { txs, wList, bList, gList } = currentData;

    if (wList && wList.length > 0) {
      const formattedW = wList.map(w => ({
        id: w.id,
        name: w.name,
        type: w.type,
        balance: Number(w.balance) || 0,
        account_number: w.accountNumber || '',
        gradient: w.gradient || '',
        icon: w.icon || 'fa-wallet',
        badge: w.badge || ''
      }));
      await supabase.from('wallets').upsert(formattedW);
    }

    if (txs && txs.length > 0) {
      const formattedTx = txs.map(t => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount) || 0,
        category: t.category,
        type: t.type,
        payment_method: t.payment_method || 'QRIS',
        date: t.date,
        time: t.time || '12:00',
        notes: t.notes || '',
        wallet_id: t.walletId || '',
        created_at: t.created_at || new Date().toISOString()
      }));
      await supabase.from('transactions').upsert(formattedTx);
    }

    if (bList && bList.length > 0) {
      await supabase.from('budgets').upsert(bList);
    }

    if (gList && gList.length > 0) {
      await supabase.from('goals').upsert(gList);
    }

    lastSyncTime.set(new Date().toLocaleTimeString('id-ID'));
    return { success: true };
  } catch (err) {
    console.error('[Supabase] Batch push error:', err);
    return { success: false, error: err.message };
  }
}
