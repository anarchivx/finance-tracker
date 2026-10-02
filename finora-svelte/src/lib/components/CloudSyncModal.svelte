<script>
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { syncStatus, lastSyncTime, transactions, wallets, budgets, goals } from '$lib/stores.js';
  import {
    getSupabaseConfig,
    saveSupabaseConfig,
    initSupabaseSync,
    cloudPushAllLocalToCloud
  } from '$lib/supabaseSync.js';

  export let isOpen = false;
  export let onClose = () => {};

  let supabaseUrl = '';
  let supabaseAnonKey = '';
  let isConnecting = false;
  let connectionMessage = '';
  let connectionMessageType = ''; // 'success' | 'error'
  let isMigrating = false;
  let migrateMessage = '';
  let copiedSql = false;

  const SQL_SCHEMA = `-- FINORA CLOUD DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- Salin dan jalankan di Supabase Dashboard -> SQL Editor -> Run

CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL,
    payment_method TEXT DEFAULT 'QRIS',
    date TEXT NOT NULL,
    time TEXT DEFAULT '12:00',
    notes TEXT DEFAULT '',
    wallet_id TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.wallets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance NUMERIC DEFAULT 0 NOT NULL,
    account_number TEXT DEFAULT '',
    gradient TEXT DEFAULT '',
    icon TEXT DEFAULT 'fa-wallet',
    badge TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.budgets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL UNIQUE,
    monthly_limit NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_amount NUMERIC NOT NULL,
    current_amount NUMERIC DEFAULT 0,
    deadline TEXT,
    icon TEXT DEFAULT '🎯',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    cycle TEXT DEFAULT 'monthly',
    billing_day INTEGER DEFAULT 1,
    category TEXT DEFAULT 'Hiburan',
    wallet_id TEXT DEFAULT '',
    icon TEXT DEFAULT 'fa-film',
    color TEXT DEFAULT '#2563eb',
    next_due TEXT,
    is_paid_this_month BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.debts (
    id TEXT PRIMARY KEY,
    person_name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    paid_amount NUMERIC DEFAULT 0,
    due_date TEXT,
    phone TEXT DEFAULT '',
    note TEXT DEFAULT '',
    status TEXT DEFAULT 'unpaid',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write wallets" ON public.wallets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write budgets" ON public.budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write goals" ON public.goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write debts" ON public.debts FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debts;`;

  onMount(() => {
    const config = getSupabaseConfig();
    supabaseUrl = config.url;
    supabaseAnonKey = config.key;
  });

  async function handleConnect() {
    if (!supabaseUrl || !supabaseAnonKey) {
      connectionMessage = 'Mohon isi Project URL dan Anon Key Supabase Anda.';
      connectionMessageType = 'error';
      return;
    }

    isConnecting = true;
    connectionMessage = 'Sedang menguji koneksi ke Supabase...';
    connectionMessageType = 'info';

    try {
      await saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
      setTimeout(() => {
        if ($syncStatus === 'cloud_connected') {
          connectionMessage = '✨ Berhasil terhubung ke Cloud Database! Realtime sync aktif.';
          connectionMessageType = 'success';
        } else {
          connectionMessage = 'Koneksi tersimpan. Jika tabel belum dibuat di Supabase, silakan jalankan SQL Schema di tab Panduan.';
          connectionMessageType = 'info';
        }
        isConnecting = false;
      }, 1000);
    } catch (e) {
      connectionMessage = 'Gagal terhubung: ' + e.message;
      connectionMessageType = 'error';
      isConnecting = false;
    }
  }

  function handleDisconnect() {
    saveSupabaseConfig('', '');
    supabaseUrl = '';
    supabaseAnonKey = '';
    syncStatus.set('local');
    connectionMessage = 'Koneksi Cloud diputus. Aplikasi kini beroperasi dalam Mode Lokal (Offline).';
    connectionMessageType = 'info';
  }

  async function handleMigrateLocal() {
    if ($syncStatus !== 'cloud_connected') {
      migrateMessage = 'Harap hubungkan ke Cloud terlebih dahulu sebelum migrasi data.';
      return;
    }

    isMigrating = true;
    migrateMessage = 'Sedang mengunggah data lokal ke Supabase...';

    const result = await cloudPushAllLocalToCloud({
      txs: $transactions,
      wList: $wallets,
      bList: $budgets,
      gList: $goals
    });

    isMigrating = false;
    if (result.success) {
      migrateMessage = '🎉 Sukses! Semua transaksi, dompet, dan anggaran lokal Anda telah disinkronkan ke Cloud.';
    } else {
      migrateMessage = 'Gagal migrasi: ' + result.error;
    }
  }

  function copySchema() {
    navigator.clipboard.writeText(SQL_SCHEMA);
    copiedSql = true;
    setTimeout(() => {
      copiedSql = false;
    }, 3000);
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" transition:fade={{ duration: 150 }} on:click={onClose} role="dialog" aria-modal="true">
    <div class="modal-card glass-panel" transition:scale={{ start: 0.95, duration: 200 }} on:click|stopPropagation>
      
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-left">
          <div class="cloud-icon-badge">
            <i class="fa-solid fa-cloud-bolt"></i>
          </div>
          <div>
            <h3 class="modal-title">Cloud Database & Realtime Sync</h3>
            <p class="modal-subtitle">Akses data finansial Anda dari HP & Laptop secara instan</p>
          </div>
        </div>
        <button class="close-btn" on:click={onClose} aria-label="Tutup Modal">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Sync Status Banner -->
      <div class="status-banner {$syncStatus === 'cloud_connected' ? 'status-connected' : 'status-local'}">
        <div class="status-indicator">
          <span class="status-dot"></span>
          <div class="status-text-box">
            <span class="status-label">
              {$syncStatus === 'cloud_connected' ? 'Cloud Realtime Aktif' : 'Mode Penyimpanan Lokal (Offline)'}
            </span>
            <span class="status-detail">
              {$syncStatus === 'cloud_connected' 
                ? 'Tersinkronisasi otomatis dengan Supabase. Akses dari HP akan langsung update.' 
                : 'Data hanya tersimpan di browser ini. Hubungkan Supabase untuk multi-device.'}
            </span>
          </div>
        </div>
        {#if $lastSyncTime}
          <div class="sync-time">
            <i class="fa-regular fa-clock"></i> {$lastSyncTime}
          </div>
        {/if}
      </div>

      <!-- Main Form -->
      <div class="config-section">
        <div class="form-group">
          <label for="supabase-url">
            <span>Supabase Project URL</span>
            <span class="label-hint">Contoh: https://xyzcompany.supabase.co</span>
          </label>
          <div class="input-wrapper">
            <i class="fa-solid fa-globe input-icon"></i>
            <input
              id="supabase-url"
              type="text"
              bind:value={supabaseUrl}
              placeholder="https://your-project.supabase.co"
              class="text-input"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="supabase-key">
            <span>Supabase Anon Public API Key</span>
            <span class="label-hint">Project Settings -> API -> anon public</span>
          </label>
          <div class="input-wrapper">
            <i class="fa-solid fa-key input-icon"></i>
            <input
              id="supabase-key"
              type="password"
              bind:value={supabaseAnonKey}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              class="text-input"
            />
          </div>
        </div>

        {#if connectionMessage}
          <div class="connection-alert {connectionMessageType}">
            <i class="fa-solid {connectionMessageType === 'success' ? 'fa-circle-check' : connectionMessageType === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'}"></i>
            <span>{connectionMessage}</span>
          </div>
        {/if}

        <div class="action-buttons">
          <button
            class="btn btn-primary connect-btn"
            on:click={handleConnect}
            disabled={isConnecting}
          >
            {#if isConnecting}
              <i class="fa-solid fa-spinner fa-spin"></i> Menghubungkan...
            {:else}
              <i class="fa-solid fa-link"></i> Simpan & Hubungkan ke Cloud
            {/if}
          </button>

          {#if $syncStatus === 'cloud_connected'}
            <button
              class="btn btn-outline disconnect-btn"
              on:click={handleDisconnect}
            >
              <i class="fa-solid fa-link-slash"></i> Putuskan
            </button>
          {/if}
        </div>
      </div>

      <!-- Cloud Migration & Tools (If Connected) -->
      {#if $syncStatus === 'cloud_connected'}
        <div class="migration-card">
          <div class="migration-info">
            <h4><i class="fa-solid fa-upload"></i> Unggah Data Lokal ke Cloud</h4>
            <p>Pindahkan {$transactions.length} transaksi dan data rekening dari browser ini ke database Cloud agar bisa diakses dari HP Anda.</p>
          </div>
          <button
            class="btn btn-accent migrate-btn"
            on:click={handleMigrateLocal}
            disabled={isMigrating}
          >
            {#if isMigrating}
              <i class="fa-solid fa-spinner fa-spin"></i> Mengunggah...
            {:else}
              <i class="fa-solid fa-cloud-arrow-up"></i> Migrasikan Sekarang
            {/if}
          </button>
        </div>
        {#if migrateMessage}
          <p class="migrate-status-text">{migrateMessage}</p>
        {/if}
      {/if}

      <!-- Quick 2-Minute Setup Guide -->
      <div class="guide-accordion">
        <div class="guide-header">
          <span class="guide-title"><i class="fa-solid fa-circle-question"></i> Cara Cepat Setup Supabase Gratis (2 Menit)</span>
          <button class="copy-sql-btn" on:click={copySchema}>
            <i class="fa-solid {copiedSql ? 'fa-check' : 'fa-copy'}"></i>
            {copiedSql ? 'SQL Tersalin!' : 'Salin Skrip SQL Schema'}
          </button>
        </div>
        <ol class="guide-steps">
          <li>Buka <strong><a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a></strong>, daftar gratis & buat proyek baru.</li>
          <li>Klik menu <strong>SQL Editor</strong> di dashboard Supabase, klik <em>New Query</em>, paste skrip SQL yang disalin di atas, lalu klik <strong>Run</strong>.</li>
          <li>Buka menu <strong>Project Settings -> API</strong>, salin <strong>Project URL</strong> dan <strong>anon public key</strong>, lalu masukkan ke form di atas. Selesai!</li>
        </ol>
      </div>

    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(5, 10, 20, 0.78);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
  }

  .modal-card {
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 1.25rem;
    width: 100%;
    max-width: 620px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 1.75rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    color: #f8fafc;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .cloud-icon-badge {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    color: white;
    box-shadow: 0 8px 16px -4px rgba(56, 189, 248, 0.4);
  }

  .modal-title {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
  }

  .modal-subtitle {
    margin: 0.2rem 0 0;
    font-size: 0.825rem;
    color: #94a3b8;
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.08);
    border: none;
    color: #cbd5e1;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }

  /* Status Banner */
  .status-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.9rem 1.1rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    border: 1px solid transparent;
  }

  .status-connected {
    background: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.3);
    color: #10b981;
  }

  .status-local {
    background: rgba(148, 163, 184, 0.1);
    border-color: rgba(148, 163, 184, 0.2);
    color: #94a3b8;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 10px currentColor;
  }

  .status-connected .status-dot {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }

  .status-label {
    display: block;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .status-detail {
    display: block;
    font-size: 0.775rem;
    color: #cbd5e1;
    margin-top: 0.15rem;
  }

  .sync-time {
    font-size: 0.75rem;
    color: #94a3b8;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
  }

  /* Form */
  .config-section {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }

  .form-group label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.85rem;
    font-weight: 600;
    color: #e2e8f0;
    margin-bottom: 0.4rem;
  }

  .label-hint {
    font-size: 0.75rem;
    color: #64748b;
    font-weight: 400;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon {
    position: absolute;
    left: 1rem;
    color: #64748b;
    font-size: 0.9rem;
  }

  .text-input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    color: white;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .text-input:focus {
    outline: none;
    border-color: #38bdf8;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
  }

  .connection-alert {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .connection-alert.success {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .connection-alert.error {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .connection-alert.info {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  .action-buttons {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .connect-btn {
    flex: 1;
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    color: white;
    border: none;
    padding: 0.8rem 1.25rem;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .connect-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #0369a1 0%, #075985 100%);
    box-shadow: 0 8px 16px -4px rgba(2, 132, 199, 0.4);
  }

  .disconnect-btn {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #f87171;
    padding: 0.8rem 1.25rem;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .disconnect-btn:hover {
    background: rgba(239, 68, 68, 0.25);
  }

  /* Migration Card */
  .migration-card {
    margin-top: 1.5rem;
    padding: 1rem 1.25rem;
    background: rgba(30, 41, 59, 0.6);
    border: 1px dashed rgba(56, 189, 248, 0.3);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .migration-info h4 {
    margin: 0;
    font-size: 0.95rem;
    color: #38bdf8;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .migration-info p {
    margin: 0.25rem 0 0;
    font-size: 0.8rem;
    color: #94a3b8;
  }

  .migrate-btn {
    background: #0284c7;
    color: white;
    border: none;
    padding: 0.65rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .migrate-status-text {
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
    color: #34d399;
    text-align: center;
  }

  /* Guide Accordion */
  .guide-accordion {
    margin-top: 1.5rem;
    padding: 1.1rem;
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  .guide-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .guide-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #cbd5e1;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .copy-sql-btn {
    background: rgba(56, 189, 248, 0.15);
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: #38bdf8;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    transition: all 0.2s;
  }

  .copy-sql-btn:hover {
    background: rgba(56, 189, 248, 0.25);
  }

  .guide-steps {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.8rem;
    color: #94a3b8;
    line-height: 1.6;
  }

  .guide-steps a {
    color: #38bdf8;
    text-decoration: underline;
  }
</style>
