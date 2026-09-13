<script>
  import { onMount } from 'svelte';
  import { syncStatus, lastSyncTime } from '../stores.js';
  import {
    getServerUrl,
    setServerUrl,
    testServerConnection,
    reconnectSocket,
    pushAllLocalDataToCloud,
    pullCloudDataToLocal
  } from '../socket.js';

  export let isOpen = false;
  export let onClose = () => {};

  let inputUrl = '';
  let isTesting = false;
  let testResult = null; // { success, latency, error }
  let isSyncing = false;
  let syncFeedback = '';
  let activeGuideTab = 'render'; // 'render' or 'tunnel'

  $: if (isOpen) {
    inputUrl = getServerUrl();
    testResult = null;
    syncFeedback = '';
  }

  async function handleTest() {
    isTesting = true;
    testResult = null;
    syncFeedback = '';
    const res = await testServerConnection(inputUrl);
    testResult = res;
    isTesting = false;
  }

  function handleApply() {
    setServerUrl(inputUrl);
    syncFeedback = '✅ Alamat server cloud berhasil diterapkan & dihubungkan!';
    setTimeout(() => {
      syncFeedback = '';
    }, 4000);
  }

  function handleSetPreset(url) {
    inputUrl = url;
    testResult = null;
  }

  async function handlePush() {
    isSyncing = true;
    syncFeedback = '';
    try {
      await pushAllLocalDataToCloud();
      syncFeedback = '🚀 Berhasil! Seluruh data perangkat ini telah terunggah ke database cloud.';
    } catch (e) {
      syncFeedback = `❌ Gagal mengunggah ke cloud: ${e.message}. Pastikan server online.`;
    } finally {
      isSyncing = false;
    }
  }

  async function handlePull() {
    isSyncing = true;
    syncFeedback = '';
    try {
      await pullCloudDataToLocal();
      syncFeedback = '📥 Berhasil! Data lokal telah diperbarui sesuai database cloud.';
    } catch (e) {
      syncFeedback = `❌ Gagal mengunduh dari cloud: ${e.message}. Pastikan server online.`;
    } finally {
      isSyncing = false;
    }
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" on:click={onClose} role="dialog" aria-modal="true">
    <div class="glass-panel sync-modal-card" on:click|stopPropagation role="document">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="title-with-icon">
          <div class="sync-icon-box {$syncStatus}">
            <i class="fa-solid fa-cloud-bolt"></i>
          </div>
          <div>
            <h3>Pusat Integrasi Real-Time & Cloud</h3>
            <p class="subtext">Akses & sinkronisasi data Finora dari mana saja antar-perangkat</p>
          </div>
        </div>
        <button class="btn-icon btn-outline" on:click={onClose}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Current Status Bar -->
      <div class="status-summary-bar {$syncStatus}">
        <div class="status-indicator">
          <span class="pulse-dot"></span>
          <span class="status-text">
            {#if $syncStatus === 'connected'}
              Real-time Terhubung (Cloud Hub Online)
            {:else if $syncStatus === 'connecting'}
              Sedang Menghubungkan ke Server...
            {:else}
              Mode Lokal / Offline (Belum Terhubung ke Cloud)
            {/if}
          </span>
        </div>
        {#if $lastSyncTime}
          <span class="sync-time"><i class="fa-solid fa-clock-rotate-left"></i> {$lastSyncTime}</span>
        {/if}
      </div>

      <!-- Notification Feedback -->
      {#if syncFeedback}
        <div class="feedback-banner" class:error={syncFeedback.startsWith('❌')}>
          <i class="fa-solid {syncFeedback.startsWith('❌') ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i>
          <span>{syncFeedback}</span>
        </div>
      {/if}

      <!-- Server URL Configuration -->
      <div class="config-section">
        <label for="cloudServerInput" class="section-label">
          <i class="fa-solid fa-network-wired text-primary"></i>
          Alamat Backend Cloud (Socket.IO + REST API)
        </label>
        
        <div class="url-input-wrap">
          <input
            id="cloudServerInput"
            type="url"
            bind:value={inputUrl}
            placeholder="Contoh: https://finora-backend.onrender.com"
            class="input-custom url-input"
          />
          <button
            type="button"
            class="btn btn-outline test-btn"
            disabled={isTesting}
            on:click={handleTest}
          >
            {#if isTesting}
              <i class="fa-solid fa-circle-notch fa-spin"></i>
            {:else}
              <i class="fa-solid fa-bolt"></i>
            {/if}
            <span>Tes Ping</span>
          </button>
          <button
            type="button"
            class="btn btn-primary connect-btn"
            on:click={handleApply}
          >
            Terapkan
          </button>
        </div>

        <!-- Ping test result -->
        {#if testResult}
          <div class="ping-badge" class:success={testResult.success} class:fail={!testResult.success}>
            {#if testResult.success}
              <i class="fa-solid fa-circle-check text-emerald"></i>
              <span>Terkoneksi dengan lancar! Latensi: <strong>{testResult.latency}ms</strong>. Server SQLite siap sinkronisasi.</span>
            {:else}
              <i class="fa-solid fa-circle-xmark text-rose"></i>
              <span>Koneksi gagal: {testResult.error}</span>
            {/if}
          </div>
        {/if}

        <!-- Quick Presets -->
        <div class="presets-row">
          <span class="preset-title">Preset Cepat:</span>
          <button type="button" class="preset-chip" on:click={() => handleSetPreset('http://localhost:3001')}>
            🖥️ PC Lokal (localhost:3001)
          </button>
          <button type="button" class="preset-chip" on:click={() => handleSetPreset('https://finora-backend.onrender.com')}>
            ☁️ Cloud Render.com
          </button>
        </div>
      </div>

      <!-- Multi-Device Migration Actions -->
      <div class="migration-section">
        <div class="section-label">
          <i class="fa-solid fa-arrows-rotate text-cyan"></i>
          Sinkronisasi Manual Data Antar-Perangkat
        </div>
        <p class="migration-desc">
          Gunakan tombol di bawah ini untuk menyamakan data saat pertama kali berganti ke HP atau laptop lain:
        </p>

        <div class="sync-actions-grid">
          <button
            type="button"
            class="sync-card-btn"
            disabled={isSyncing}
            on:click={handlePush}
          >
            <div class="sync-btn-icon bg-indigo-soft">
              <i class="fa-solid fa-cloud-arrow-up text-indigo"></i>
            </div>
            <div class="sync-btn-text">
              <span class="btn-head">Unggah ke Cloud</span>
              <span class="btn-sub">Kirim data perangkat ini ke database pusat</span>
            </div>
          </button>

          <button
            type="button"
            class="sync-card-btn"
            disabled={isSyncing}
            on:click={handlePull}
          >
            <div class="sync-btn-icon bg-cyan-soft">
              <i class="fa-solid fa-cloud-arrow-down text-cyan"></i>
            </div>
            <div class="sync-btn-text">
              <span class="btn-head">Unduh dari Cloud</span>
              <span class="btn-sub">Ambil data terbaru dari cloud ke perangkat ini</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Quick Deployment Guide Tabs -->
      <div class="guide-box">
        <div class="guide-header">
          <span class="guide-title"><i class="fa-solid fa-book-open"></i> Panduan Hosting Server Real-Time 24/7:</span>
          <div class="guide-tabs">
            <button
              class="guide-tab-btn"
              class:active={activeGuideTab === 'render'}
              on:click={() => (activeGuideTab = 'render')}
            >
              Render.com (Gratis)
            </button>
            <button
              class="guide-tab-btn"
              class:active={activeGuideTab === 'tunnel'}
              on:click={() => (activeGuideTab = 'tunnel')}
            >
              Cloudflare Tunnel / Ngrok
            </button>
          </div>
        </div>

        <div class="guide-content">
          {#if activeGuideTab === 'render'}
            <ol class="steps-list">
              <li>Buka <a href="https://dashboard.render.com" target="_blank" rel="noreferrer">render.com</a> (Daftar/Login dengan GitHub).</li>
              <li>Pilih <strong>New +</strong> lalu pilih <strong>Web Service</strong>.</li>
              <li>Pilih repositori <strong>anarchivx/finance-tracker</strong>.</li>
              <li>Pilih Root Directory: <code>server</code>, Build Command: <code>npm install</code>, Start Command: <code>npm start</code>.</li>
              <li>Salin URL yang diberikan (contoh: <code>https://finora-backend.onrender.com</code>) dan tempel ke kotak di atas!</li>
            </ol>
          {:else}
            <ol class="steps-list">
              <li>Jalankan backend di PC Anda: <code>cd server && npm start</code>.</li>
              <li>Buka terminal baru dan buat tunnel gratis: <code>npx cloudflared tunnel --url http://localhost:3001</code></li>
              <li>Salin URL HTTPS publik yang muncul di terminal (misal: <code>https://xyz.trycloudflare.com</code>) lalu tempel ke atas.</li>
              <li>Aplikasi di HP Anda kini langsung terhubung secara real-time ke PC Anda dari mana saja!</li>
            </ol>
          {/if}
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" on:click={onClose}>
          Tutup
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(3, 7, 18, 0.78);
    backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .sync-modal-card {
    width: 100%;
    max-width: 620px;
    background: var(--bg-card);
    border: 1px solid var(--border-glass-hover);
    border-radius: 22px;
    padding: 26px;
    box-shadow: 0 24px 50px rgba(0, 0, 0, 0.6);
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .title-with-icon {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .sync-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    background: rgba(99, 102, 241, 0.15);
    color: #818cf8;
    border: 1px solid rgba(99, 102, 241, 0.3);
  }

  .sync-icon-box.connected {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.35);
  }

  .title-with-icon h3 {
    margin: 0 0 3px 0;
    font-size: 1.2rem;
    font-weight: 800;
  }

  .subtext {
    margin: 0;
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  /* Status bar */
  .status-summary-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-glass);
    margin-bottom: 20px;
    font-size: 0.8rem;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }

  .pulse-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #94a3b8;
  }

  .status-summary-bar.connected .pulse-dot {
    background: #10b981;
    box-shadow: 0 0 10px #10b981;
    animation: dotPulse 2s infinite;
  }

  .status-summary-bar.connecting .pulse-dot {
    background: #f59e0b;
    box-shadow: 0 0 10px #f59e0b;
    animation: dotPulse 1s infinite;
  }

  .status-summary-bar.offline .pulse-dot {
    background: #f43f5e;
  }

  @keyframes dotPulse {
    0% { transform: scale(0.9); opacity: 0.7; }
    50% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(0.9); opacity: 0.7; }
  }

  .sync-time {
    font-size: 0.72rem;
    color: var(--text-dim);
  }

  /* Feedback banner */
  .feedback-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.35);
    color: #34d399;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 0.82rem;
    margin-bottom: 16px;
  }

  .feedback-banner.error {
    background: rgba(244, 63, 94, 0.15);
    border-color: rgba(244, 63, 94, 0.35);
    color: #fb7185;
  }

  /* Config Section */
  .config-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 22px;
  }

  .section-label {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .url-input-wrap {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .url-input {
    flex: 1;
    min-width: 220px;
  }

  .input-custom {
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-glass);
    border-radius: 10px;
    color: var(--text-main);
    font-size: 0.88rem;
    outline: none;
  }

  .input-custom:focus {
    border-color: var(--primary);
  }

  .ping-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 0.78rem;
    margin-top: 4px;
  }

  .ping-badge.success {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.25);
    color: #34d399;
  }

  .ping-badge.fail {
    background: rgba(244, 63, 94, 0.1);
    border: 1px solid rgba(244, 63, 94, 0.25);
    color: #fb7185;
  }

  .presets-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 4px;
  }

  .preset-title {
    font-size: 0.72rem;
    color: var(--text-dim);
  }

  .preset-chip {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-glass);
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 0.72rem;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .preset-chip:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: var(--primary);
    color: #ffffff;
  }

  /* Migration Section */
  .migration-section {
    margin-bottom: 22px;
    padding-top: 16px;
    border-top: 1px solid var(--border-glass);
  }

  .migration-desc {
    margin: 4px 0 12px 0;
    font-size: 0.76rem;
    color: var(--text-muted);
  }

  .sync-actions-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .sync-card-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-glass);
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s ease;
  }

  .sync-card-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.07);
    border-color: var(--border-glass-hover);
    transform: translateY(-2px);
  }

  .sync-card-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sync-btn-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .bg-indigo-soft { background: rgba(99, 102, 241, 0.15); }
  .bg-cyan-soft { background: rgba(6, 182, 212, 0.15); }

  .sync-btn-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .btn-head {
    font-size: 0.84rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .btn-sub {
    font-size: 0.68rem;
    color: var(--text-dim);
  }

  /* Guide Box */
  .guide-box {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid var(--border-glass);
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 20px;
  }

  .guide-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .guide-title {
    font-size: 0.78rem;
    font-weight: 700;
    color: #e2e8f0;
  }

  .guide-tabs {
    display: flex;
    gap: 6px;
  }

  .guide-tab-btn {
    background: transparent;
    border: 1px solid var(--border-glass);
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 0.7rem;
    color: var(--text-muted);
    cursor: pointer;
  }

  .guide-tab-btn.active {
    background: var(--primary);
    color: #ffffff;
    border-color: var(--primary);
  }

  .steps-list {
    margin: 0;
    padding-left: 18px;
    font-size: 0.75rem;
    color: var(--text-muted);
    display: flex;
    flex-direction: column;
    gap: 6px;
    line-height: 1.4;
  }

  .steps-list code {
    background: rgba(255, 255, 255, 0.1);
    padding: 1px 5px;
    border-radius: 4px;
    color: #38bdf8;
  }

  .steps-list a {
    color: #818cf8;
    text-decoration: underline;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
  }

  @media (max-width: 600px) {
    .sync-actions-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
