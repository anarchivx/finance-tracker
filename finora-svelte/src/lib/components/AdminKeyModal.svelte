<script>
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { cloudSaveAdminKey, cloudGetAdminKey } from '$lib/supabaseSync.js';

  export let isOpen = false;
  export let onClose = () => {};

  let currentKey = 'FINORA-ADMIN-2026';
  let newKey = '';
  let showCurrentKey = false;
  let showNewKey = false;
  let isSaving = false;
  let successNotice = '';
  let errorNotice = '';
  let isCopied = false;

  function getServerUrl() {
    if (!browser) return '';
    if (window.location.port === '5173') return 'http://localhost:3001';
    return window.location.origin;
  }

  async function loadCurrentKey() {
    if (!browser) return;
    // 1. Try local storage
    const local = localStorage.getItem('finora_admin_secret');
    if (local) currentKey = local;

    // 2. Try Supabase Cloud
    try {
      const cloudKey = await cloudGetAdminKey();
      if (cloudKey) {
        currentKey = cloudKey;
        localStorage.setItem('finora_admin_secret', cloudKey);
      }
    } catch (e) {}
  }

  onMount(() => {
    if (browser) {
      window._handleAdminKeySync = (syncedKey) => {
        if (syncedKey) {
          currentKey = syncedKey;
        }
      };
    }
  });

  onDestroy(() => {
    if (browser && window._handleAdminKeySync) {
      window._handleAdminKeySync = null;
    }
  });

  $: if (browser && isOpen) {
    loadCurrentKey();
    newKey = '';
    successNotice = '';
    errorNotice = '';
    isCopied = false;
  }

  async function handleSaveKey() {
    if (!newKey || newKey.trim().length < 4) {
      errorNotice = 'Kode Otorisasi minimal harus 4 karakter.';
      return;
    }

    isSaving = true;
    errorNotice = '';
    successNotice = '';

    const cleanKey = newKey.trim();

    try {
      // 1. Save to local storage
      localStorage.setItem('finora_admin_secret', cleanKey);
      currentKey = cleanKey;

      // 2. Save to Supabase Cloud app_settings
      await cloudSaveAdminKey(cleanKey);

      // 3. Save to backend server
      await fetch(`${getServerUrl()}/api/auth/set-admin-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAdminKey: cleanKey })
      }).catch(() => {});

      successNotice = 'Kode Otorisasi Administrator berhasil diperbarui & otomatis tersinkron ke seluruh perangkat!';
      newKey = '';
      setTimeout(() => {
        successNotice = '';
      }, 4000);
    } catch (err) {
      errorNotice = 'Gagal menyimpan: ' + (err.message || 'Terjadi kesalahan');
    } finally {
      isSaving = false;
    }
  }

  function copyToClipboard() {
    if (!browser) return;
    navigator.clipboard.writeText(currentKey);
    isCopied = true;
    setTimeout(() => (isCopied = false), 2000);
  }
</script>

{#if isOpen}
  <div
    class="modal-backdrop"
    transition:fade={{ duration: 150 }}
    on:click={onClose}
    role="dialog"
    aria-modal="true"
  >
    <div
      class="modal-card glass-panel"
      transition:scale={{ start: 0.95, duration: 200 }}
      on:click|stopPropagation
    >
      <!-- Modal Header -->
      <div class="modal-top">
        <div class="badge-title">
          <i class="fa-solid fa-key text-amber"></i>
          <span>PENGATURAN KODE OTORISASI ADMIN</span>
        </div>
        <button class="btn-close" on:click={onClose} title="Tutup">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Icon & Headline -->
      <div class="modal-head-area">
        <div class="icon-avatar">
          <i class="fa-solid fa-user-shield"></i>
        </div>
        <h3 class="modal-title">Master Recovery Key</h3>
        <p class="modal-subtitle">
          Kode ini adalah kunci darurat pribadi Anda untuk mereset Master PIN jika sewaktu-waktu Anda lupa PIN.
        </p>
      </div>

      <!-- Current Key Box -->
      <div class="current-key-card">
        <div class="box-label-row">
          <span class="box-label"><i class="fa-solid fa-shield-halved"></i> Kode Otorisasi Aktif:</span>
          <button class="btn-copy" on:click={copyToClipboard} title="Salin Kode">
            <i class={isCopied ? "fa-solid fa-check text-emerald" : "fa-solid fa-copy"}></i>
            <span>{isCopied ? "Tersalin!" : "Salin"}</span>
          </button>
        </div>

        <div class="key-display-row">
          <div class="key-value-box">
            {#if showCurrentKey}
              <span class="key-text active-visible">{currentKey}</span>
            {:else}
              <span class="key-text masked">••••••••••••••••</span>
            {/if}
          </div>
          <button
            class="btn-eye"
            on:click={() => (showCurrentKey = !showCurrentKey)}
            title={showCurrentKey ? "Sembunyikan" : "Tampilkan"}
          >
            <i class={showCurrentKey ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
          </button>
        </div>

        <div class="sync-status-indicator">
          <i class="fa-solid fa-cloud-arrow-up text-emerald"></i>
          <span>Tersinkronisasi Real-Time ke Seluruh Perangkat via Cloud</span>
        </div>
      </div>

      <!-- Set New Key Form -->
      <div class="set-new-key-section">
        <label for="new-admin-key-input" class="input-label">
          <i class="fa-solid fa-pen-to-square text-cyan"></i> Ubah Kode Otorisasi Baru:
        </label>
        <div class="new-key-input-wrapper">
          <input
            id="new-admin-key-input"
            type={showNewKey ? "text" : "password"}
            class="styled-input"
            placeholder="Ketik kode baru (misal: RAHASIA-2026)..."
            bind:value={newKey}
            on:keydown={(e) => e.key === 'Enter' && handleSaveKey()}
            autocomplete="off"
            spellcheck="false"
          />
          {#if newKey}
            <button
              type="button"
              class="btn-clear-key"
              on:click={() => { newKey = ''; errorNotice = ''; }}
              title="Hapus / Reset Teks Input"
            >
              <i class="fa-solid fa-circle-xmark"></i>
            </button>
          {/if}
          <button
            type="button"
            class="btn-eye"
            on:click={() => (showNewKey = !showNewKey)}
            title={showNewKey ? "Sembunyikan" : "Tampilkan"}
          >
            <i class={showNewKey ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
          </button>
        </div>

        {#if errorNotice}
          <div class="alert-notice error-alert" transition:fade>
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>{errorNotice}</span>
          </div>
        {/if}

        {#if successNotice}
          <div class="alert-notice success-alert" transition:fade>
            <i class="fa-solid fa-circle-check"></i>
            <span>{successNotice}</span>
          </div>
        {/if}

        <button
          type="button"
          class="btn-save-key"
          disabled={isSaving || !newKey.trim()}
          on:click={handleSaveKey}
        >
          {#if isSaving}
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Menyimpan ke Cloud...</span>
          {:else}
            <i class="fa-solid fa-floppy-disk"></i>
            <span>Simpan Kode Otorisasi Baru</span>
          {/if}
        </button>
      </div>

      <!-- Security Guidance Callout -->
      <div class="security-tip-callout">
        <i class="fa-solid fa-lightbulb text-amber"></i>
        <span>Hanya Anda pemilik yang tahu kode ini. Jangan bagikan kepada siapa pun agar keamanan akun tetap terjaga.</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 6500;
    background: rgba(6, 9, 18, 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal-card {
    width: 100%;
    max-width: 440px;
    background: linear-gradient(165deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
    border: 1px solid rgba(245, 158, 11, 0.25);
    border-radius: 28px;
    padding: 26px 22px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(245, 158, 11, 0.12);
  }

  .modal-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
  }

  .badge-title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.8px;
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.25);
    padding: 4px 10px;
    border-radius: 99px;
  }

  .btn-close {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .btn-close:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
    transform: rotate(90deg);
  }

  .modal-head-area {
    text-align: center;
    margin-bottom: 20px;
  }

  .icon-avatar {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.05) 100%);
    border: 1px solid rgba(245, 158, 11, 0.35);
    color: #f59e0b;
    font-size: 1.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.18);
  }

  .modal-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: #f8fafc;
    margin: 0 0 6px;
  }

  .modal-subtitle {
    font-size: 0.775rem;
    color: #94a3b8;
    line-height: 1.45;
    margin: 0;
  }

  /* Current Key Card */
  .current-key-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 14px 16px;
    margin-bottom: 20px;
  }

  .sync-status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-top: 10px;
    font-size: 0.72rem;
    font-weight: 600;
    color: #cbd5e1;
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.25);
    padding: 5px 12px;
    border-radius: 99px;
  }

  .box-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .box-label {
    font-size: 0.725rem;
    font-weight: 600;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .btn-copy {
    background: transparent;
    border: none;
    color: #38bdf8;
    font-size: 0.725rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 2px 6px;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .btn-copy:hover {
    background: rgba(56, 189, 248, 0.1);
  }

  .key-display-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .key-value-box {
    flex: 1;
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 8px 12px;
  }

  .key-text {
    font-family: monospace;
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .key-text.active-visible {
    color: #fbbf24;
  }

  .key-text.masked {
    color: #64748b;
  }

  .btn-clear-key {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.25);
    color: #ef4444;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .btn-clear-key:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
    transform: scale(1.05);
  }

  .btn-eye {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .btn-eye:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }

  /* Set New Key Form */
  .set-new-key-section {
    margin-bottom: 16px;
  }

  .input-label {
    display: block;
    font-size: 0.775rem;
    font-weight: 700;
    color: #cbd5e1;
    margin-bottom: 6px;
  }

  .new-key-input-wrapper {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .styled-input {
    flex: 1;
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 10px 14px;
    color: #ffffff;
    font-size: 0.85rem;
    font-family: inherit;
    outline: none;
    transition: all 0.2s ease;
  }

  .styled-input:focus {
    border-color: #38bdf8;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
  }

  .btn-save-key {
    width: 100%;
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    border: none;
    border-radius: 12px;
    color: #000000;
    font-weight: 700;
    font-size: 0.825rem;
    padding: 11px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .btn-save-key:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
  }

  .btn-save-key:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .alert-notice {
    padding: 8px 12px;
    border-radius: 10px;
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .error-alert {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.25);
    color: #f87171;
  }

  .success-alert {
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.25);
    color: #34d399;
  }

  .security-tip-callout {
    background: rgba(245, 158, 11, 0.05);
    border: 1px solid rgba(245, 158, 11, 0.15);
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 0.7rem;
    color: #94a3b8;
    line-height: 1.4;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .security-tip-callout i {
    margin-top: 2px;
  }
</style>
