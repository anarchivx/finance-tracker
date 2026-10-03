<script>
  import {
    wallets,
    walletMetrics,
    currency,
    formatCurrency,
    isPrivacyMode,
    transferFunds,
    addWallet,
    updateWallet,
    deleteWallet,
    requestConfirm,
    syncStatus,
    lastSyncTime
  } from '../stores.js';
  import confetti from 'canvas-confetti';
  import { fade, fly } from 'svelte/transition';

  // Modals state
  let isTransferModalOpen = false;
  let isWalletModalOpen = false;
  let editingWallet = null;

  // Real-time Cloud Sync Feedback Toast
  let syncSuccessToast = '';
  let toastTimeout = null;

  function showToast(msg) {
    syncSuccessToast = msg;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      syncSuccessToast = '';
    }, 4500);
  }

  // Transfer form state
  let transferFromId = '';
  let transferToId = '';
  let transferAmount = '';
  let transferNote = '';
  let transferError = '';

  // Wallet form state
  let walletName = '';
  let walletType = 'bank';
  let walletBalance = '';
  let walletAccountNumber = '';
  let walletBadge = 'Debit';
  let walletGradient = 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)';
  let walletIcon = 'fa-building-columns';

  const gradientPresets = [
    { label: 'BCA Deep Blue', val: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', icon: 'fa-building-columns' },
    { label: 'GoPay Emerald', val: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)', icon: 'fa-wallet' },
    { label: 'Shopee Tangerine', val: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)', icon: 'fa-bag-shopping' },
    { label: 'Cash Gold', val: 'linear-gradient(135deg, #854d0e 0%, #eab308 100%)', icon: 'fa-money-bill-wave' },
    { label: 'Neon Cyber Purple', val: 'linear-gradient(135deg, #581c87 0%, #a855f7 100%)', icon: 'fa-gem' },
    { label: 'Rose Gold Luxury', val: 'linear-gradient(135deg, #881337 0%, #f43f5e 100%)', icon: 'fa-credit-card' },
    { label: 'Midnight Onyx', val: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', icon: 'fa-shield-halved' }
  ];

  // Initialize transfer defaults when opening
  function openTransferModal(defaultFromId = null) {
    if ($wallets.length < 2) {
      alert('Anda membutuhkan minimal 2 dompet untuk melakukan transfer.');
      return;
    }
    transferFromId = defaultFromId || $wallets[0]?.id || '';
    const otherWallets = $wallets.filter((w) => w.id !== transferFromId);
    transferToId = otherWallets[0]?.id || '';
    transferAmount = '';
    transferNote = '';
    transferError = '';
    isTransferModalOpen = true;
  }

  function handleTransferSubmit() {
    transferError = '';
    const amt = Number(transferAmount);
    if (!transferFromId || !transferToId) {
      transferError = 'Silakan pilih dompet asal dan tujuan.';
      return;
    }
    if (transferFromId === transferToId) {
      transferError = 'Dompet asal dan tujuan tidak boleh sama.';
      return;
    }
    if (!amt || amt <= 0) {
      transferError = 'Masukkan jumlah transfer yang valid.';
      return;
    }

    const source = $wallets.find((w) => w.id === transferFromId);
    if (source && (Number(source.balance) || 0) < amt) {
      transferError = `Saldo ${source.name} tidak mencukupi (Tersedia: ${formatCurrency(source.balance, $currency)}).`;
      return;
    }

    const ok = transferFunds({
      fromId: transferFromId,
      toId: transferToId,
      amount: amt,
      note: transferNote
    });

    if (ok) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
      isTransferModalOpen = false;
      showToast(`Transfer Rp ${amt.toLocaleString('id-ID')} berhasil & otomatis tersinkron ke Cloud!`);
    }
  }

  function openWalletModal(wallet = null) {
    editingWallet = wallet;
    if (wallet) {
      walletName = wallet.name;
      walletType = wallet.type || 'bank';
      walletBalance = String(wallet.balance || 0);
      walletAccountNumber = wallet.accountNumber || '';
      walletBadge = wallet.badge || 'Debit';
      walletGradient = wallet.gradient || gradientPresets[0].val;
      walletIcon = wallet.icon || 'fa-building-columns';
    } else {
      walletName = '';
      walletType = 'bank';
      walletBalance = '';
      walletAccountNumber = '';
      walletBadge = 'Debit';
      walletGradient = gradientPresets[0].val;
      walletIcon = gradientPresets[0].icon;
    }
    isWalletModalOpen = true;
  }

  function handleSaveWallet() {
    if (!walletName.trim()) return;

    const payload = {
      name: walletName.trim(),
      type: walletType,
      balance: Number(walletBalance) || 0,
      accountNumber: walletAccountNumber.trim() || 'Utama',
      badge: walletBadge.trim() || 'Aktif',
      gradient: walletGradient,
      icon: walletIcon
    };

    if (editingWallet) {
      updateWallet(editingWallet.id, payload);
      showToast(`Akun "${payload.name}" berhasil diperbarui & otomatis tersinkron ke Cloud Supabase!`);
    } else {
      addWallet(payload);
      showToast(`Akun baru "${payload.name}" berhasil ditambahkan & tersinkron ke Cloud!`);
    }
    isWalletModalOpen = false;
    editingWallet = null;
  }

  function handleDeleteWallet(wallet) {
    requestConfirm({
      title: 'Hapus Dompet / Rekening?',
      message: `Apakah Anda yakin ingin menghapus akun "${wallet.name}"? Transaksi yang sudah tersimpan tidak akan terhapus.`,
      confirmText: 'Hapus Akun',
      confirmStyle: 'danger',
      onConfirm: () => {
        const delName = wallet.name;
        deleteWallet(wallet.id);
        showToast(`Akun "${delName}" telah dihapus & otomatis tersinkron ke Cloud.`);
      }
    });
  }
</script>

<div class="wallet-section">
  <!-- Header & Balance Overview -->
  <div class="section-header">
    <div class="header-info">
      <div class="title-with-pill">
        <h2>
          <i class="fa-solid fa-credit-card gradient-icon"></i>
          Pusat Rekening & Dompet Digital
        </h2>
        <span class="count-pill">{$walletMetrics.count} Akun Aktif</span>
        <span class="cloud-sync-pill" class:cloud-active={$syncStatus === 'connected' || $syncStatus === 'cloud_connected'}>
          <i class="fa-solid {$syncStatus === 'connected' || $syncStatus === 'cloud_connected' ? 'fa-cloud-check' : 'fa-cloud'}"></i>
          <span>{$syncStatus === 'connected' || $syncStatus === 'cloud_connected' ? 'Cloud Auto-Sync Aktif' : 'Tersimpan Lokal'}</span>
        </span>
      </div>
      <p class="subtitle">
        Kelola mutasi saldo kartu ATM, e-wallet, uang fisik, dan pindah dana antar rekening secara instan dengan sinkronisasi Cloud otomatis.
      </p>
    </div>

    <!-- Actions -->
    <div class="header-actions">
      <button class="btn-secondary" on:click={() => openTransferModal()}>
        <i class="fa-solid fa-arrow-right-arrow-left"></i>
        <span>Transfer Antar Dompet</span>
      </button>
      <button class="btn-primary" on:click={() => openWalletModal()}>
        <i class="fa-solid fa-plus"></i>
        <span>Tambah Dompet</span>
      </button>
    </div>
  </div>

  <!-- Realtime Sync Notification Banner -->
  {#if syncSuccessToast}
    <div class="wallet-sync-toast" transition:fly={{ y: -8, duration: 250 }}>
      <div class="toast-left">
        <i class="fa-solid fa-circle-check toast-icon"></i>
        <span>{syncSuccessToast}</span>
      </div>
      <div class="toast-badge">
        <i class="fa-solid fa-shield-halved"></i>
        <span>Supabase Sync</span>
      </div>
    </div>
  {/if}

  <!-- Total Multi-Wallet Wealth Bar -->
  <div class="total-wealth-banner">
    <div class="wealth-col">
      <span class="wealth-label">Total Dana di Seluruh Rekening</span>
      <span class="wealth-value">
        {#if $isPrivacyMode}
          Rp ••••••••
        {:else}
          {formatCurrency($walletMetrics.totalBalance, $currency)}
        {/if}
      </span>
    </div>
    <div class="wealth-hint">
      <i class="fa-solid fa-shield-halved"></i>
      <span>Saldo terenkripsi & tersinkronisasi otomatis dengan mutasi transaksi</span>
    </div>
  </div>

  <!-- Wallet Cards Grid -->
  <div class="cards-grid">
    {#each $wallets as w (w.id)}
      <div class="card-item" style="background: {w.gradient};">
        <!-- Top row: Badge & Chip -->
        <div class="card-top">
          <div class="card-chip-box">
            <div class="sim-chip"></div>
            <i class="fa-solid fa-wifi contactless-icon"></i>
          </div>
          <span class="card-badge">{w.badge || w.type.toUpperCase()}</span>
        </div>

        <!-- Middle row: Balance -->
        <div class="card-middle">
          <span class="card-bal-label">Saldo Saat Ini</span>
          <h3 class="card-balance">
            {#if $isPrivacyMode}
              Rp ••••••••
            {:else}
              {formatCurrency(w.balance, $currency)}
            {/if}
          </h3>
        </div>

        <!-- Bottom row: Account Number & Name -->
        <div class="card-bottom">
          <div class="card-holder">
            <span class="acc-num">{w.accountNumber || '•••• ••••'}</span>
            <h4 class="holder-name">{w.name}</h4>
          </div>
          <div class="card-logo-badge">
            <i class="fa-solid {w.icon || 'fa-building-columns'}"></i>
          </div>
        </div>

        <!-- Mobile & Touch Action Strip (Always visible and easily tappable on phones) -->
        <div class="card-mobile-strip">
          <button
            class="mobile-mini-btn"
            title="Transfer dari dompet ini"
            on:click|stopPropagation={() => openTransferModal(w.id)}
          >
            <i class="fa-solid fa-arrow-right-arrow-left"></i>
            <span>Transfer</span>
          </button>
          <button
            class="mobile-mini-btn"
            title="Ubah info dompet"
            on:click|stopPropagation={() => openWalletModal(w)}
          >
            <i class="fa-solid fa-pen-to-square"></i>
            <span>Edit</span>
          </button>
          <button
            class="mobile-mini-btn danger"
            title="Hapus dompet"
            on:click|stopPropagation={() => handleDeleteWallet(w)}
          >
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>

        <!-- Desktop Hover Quick Action Bar -->
        <div class="card-overlay-actions">
          <button
            class="action-pill-btn"
            title="Transfer dari dompet ini"
            on:click={() => openTransferModal(w.id)}
          >
            <i class="fa-solid fa-arrow-right-arrow-left"></i>
            <span>Transfer</span>
          </button>
          <button
            class="action-pill-btn"
            title="Ubah info dompet"
            on:click={() => openWalletModal(w)}
          >
            <i class="fa-solid fa-pen"></i>
            <span>Edit</span>
          </button>
          <button
            class="action-pill-btn danger"
            title="Hapus dompet"
            on:click={() => handleDeleteWallet(w)}
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- ========================================================================= -->
<!-- MODAL TRANSFER ANTAR DOMPET -->
<!-- ========================================================================= -->
{#if isTransferModalOpen}
  <div class="modal-backdrop" on:click={() => (isTransferModalOpen = false)} role="dialog">
    <div class="modal-card" on:click|stopPropagation role="document">
      <div class="modal-header">
        <div class="modal-title-box">
          <div class="icon-circle primary-glow">
            <i class="fa-solid fa-arrow-right-arrow-left"></i>
          </div>
          <div>
            <h3>Transfer Antar Dompet</h3>
            <p>Pindah dana antar rekening internal tanpa biaya admin</p>
          </div>
        </div>
        <button class="modal-close-btn" on:click={() => (isTransferModalOpen = false)}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body">
        {#if transferError}
          <div class="alert-box danger">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>{transferError}</span>
          </div>
        {/if}

        <div class="transfer-exchange-grid">
          <!-- From Wallet -->
          <div class="form-group">
            <label for="tf-from">Dari Rekening / Dompet Asal</label>
            <select id="tf-from" class="input-field select-field" bind:value={transferFromId}>
              {#each $wallets as w}
                <option value={w.id}>
                  {w.name} (Tersedia: {formatCurrency(w.balance, $currency)})
                </option>
              {/each}
            </select>
          </div>

          <div class="exchange-arrow">
            <i class="fa-solid fa-circle-arrow-right"></i>
          </div>

          <!-- To Wallet -->
          <div class="form-group">
            <label for="tf-to">Ke Rekening / Dompet Tujuan</label>
            <select id="tf-to" class="input-field select-field" bind:value={transferToId}>
              {#each $wallets as w}
                {#if w.id !== transferFromId}
                  <option value={w.id}>
                    {w.name} ({formatCurrency(w.balance, $currency)})
                  </option>
                {/if}
              {/each}
            </select>
          </div>
        </div>

        <!-- Amount -->
        <div class="form-group mt-3">
          <label for="tf-amt">Jumlah Transfer (Rp)</label>
          <div class="amount-input-box">
            <span class="cur-prefix">Rp</span>
            <input
              id="tf-amt"
              type="number"
              class="input-field amount-input"
              placeholder="0"
              bind:value={transferAmount}
            />
          </div>
          <!-- Quick Amount Chips -->
          <div class="quick-chips">
            {#each [50000, 100000, 250000, 500000, 1000000] as chip}
              <button
                type="button"
                class="chip-btn"
                on:click={() => (transferAmount = chip)}
              >
                +{(chip / 1000).toLocaleString('id-ID')}k
              </button>
            {/each}
          </div>
        </div>

        <!-- Notes -->
        <div class="form-group mt-3">
          <label for="tf-note">Catatan Transfer (Opsional)</label>
          <input
            id="tf-note"
            type="text"
            class="input-field"
            placeholder="Contoh: Top-up GoPay untuk makan siang"
            bind:value={transferNote}
          />
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" on:click={() => (isTransferModalOpen = false)}>
          Batal
        </button>
        <button class="btn-primary" on:click={handleTransferSubmit}>
          <i class="fa-solid fa-paper-plane"></i>
          <span>Konfirmasi Transfer</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ========================================================================= -->
<!-- MODAL TAMBAH / EDIT DOMPET -->
<!-- ========================================================================= -->
{#if isWalletModalOpen}
  <div class="modal-backdrop" on:click={() => (isWalletModalOpen = false)} role="dialog">
    <div class="modal-card" on:click|stopPropagation role="document">
      <div class="modal-header">
        <div class="modal-title-box">
          <div class="icon-circle primary-glow">
            <i class="fa-solid fa-credit-card"></i>
          </div>
          <div>
            <h3>{editingWallet ? 'Ubah Informasi Dompet' : 'Tambah Rekening / Dompet Baru'}</h3>
            <p>Atur kartu bank, e-wallet, atau tabungan fisik Anda</p>
          </div>
        </div>
        <button class="modal-close-btn" on:click={() => (isWalletModalOpen = false)}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="w-name">Nama Dompet / Rekening</label>
          <input
            id="w-name"
            type="text"
            class="input-field"
            placeholder="Contoh: BCA Prioritas, GoPay, Dompet Saku"
            bind:value={walletName}
          />
        </div>

        <div class="grid-2-col mt-3">
          <div class="form-group">
            <label for="w-type">Kategori Akun</label>
            <select id="w-type" class="input-field select-field" bind:value={walletType}>
              <option value="bank">Rekening Bank</option>
              <option value="ewallet">E-Wallet (GoPay, OVO, dll)</option>
              <option value="cash">Uang Tunai / Fisik</option>
              <option value="investment">Investasi / Sekuritas</option>
            </select>
          </div>
          <div class="form-group">
            <label for="w-badge">Label / Badge</label>
            <input
              id="w-badge"
              type="text"
              class="input-field"
              placeholder="Contoh: Debit Platinum, Verified"
              bind:value={walletBadge}
            />
          </div>
        </div>

        <div class="grid-2-col mt-3">
          <div class="form-group">
            <label for="w-bal">Saldo Saat Ini (Rp)</label>
            <input
              id="w-bal"
              type="number"
              class="input-field"
              placeholder="0"
              bind:value={walletBalance}
            />
          </div>
          <div class="form-group">
            <label for="w-acc">Nomor Rekening / No. HP</label>
            <input
              id="w-acc"
              type="text"
              class="input-field"
              placeholder="Contoh: 8830-1928-44 / 0812..."
              bind:value={walletAccountNumber}
            />
          </div>
        </div>

        <!-- Color Gradient Preset Selector -->
        <div class="form-group mt-3">
          <label>Tema Desain Kartu</label>
          <div class="preset-theme-grid">
            {#each gradientPresets as p}
              <button
                type="button"
                class="theme-chip"
                class:active={walletGradient === p.val}
                style="background: {p.val};"
                on:click={() => {
                  walletGradient = p.val;
                  walletIcon = p.icon;
                }}
              >
                <span>{p.label}</span>
                {#if walletGradient === p.val}
                  <i class="fa-solid fa-check check-icon"></i>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" on:click={() => (isWalletModalOpen = false)}>
          Batal
        </button>
        <button class="btn-primary" on:click={handleSaveWallet}>
          <i class="fa-solid fa-check"></i>
          <span>{editingWallet ? 'Simpan Perubahan' : 'Tambahkan Akun'}</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .wallet-section {
    margin-bottom: 2.2rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.5rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .title-with-pill {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .title-with-pill h2 {
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0;
  }

  .gradient-icon {
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .count-pill {
    font-size: 0.75rem;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.12);
    color: #3b82f6;
    font-weight: 600;
    border: 1px solid rgba(59, 130, 246, 0.25);
  }

  .cloud-sync-pill {
    font-size: 0.73rem;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.12);
    color: var(--text-muted);
    font-weight: 600;
    border: 1px solid rgba(148, 163, 184, 0.2);
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .cloud-sync-pill.cloud-active {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.3);
  }

  /* Realtime Sync Notification Banner */
  .wallet-sync-toast {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 95, 70, 0.25) 100%);
    border: 1px solid rgba(16, 185, 129, 0.4);
    border-radius: 12px;
    padding: 0.75rem 1.1rem;
    margin-bottom: 1.1rem;
    color: #ffffff;
    font-size: 0.88rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.15);
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .toast-left {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-weight: 600;
  }

  .toast-icon {
    color: #10b981;
    font-size: 1.05rem;
  }

  .toast-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: rgba(16, 185, 129, 0.2);
    color: #a7f3d0;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    border: 1px solid rgba(16, 185, 129, 0.35);
  }

  .subtitle {
    font-size: 0.88rem;
    color: var(--text-secondary);
    margin: 0.35rem 0 0 0;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  /* Buttons */
  .btn-primary, .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.1rem;
    font-size: 0.88rem;
    font-weight: 600;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .btn-primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
  }

  .btn-secondary {
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover {
    background: var(--bg-hover);
    border-color: rgba(59, 130, 246, 0.4);
  }

  /* Wealth Banner */
  .total-wealth-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1rem 1.4rem;
    margin-bottom: 1.4rem;
    backdrop-filter: blur(12px);
    flex-wrap: wrap;
    gap: 0.8rem;
  }

  .wealth-col {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .wealth-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .wealth-value {
    font-size: 1.4rem;
    font-weight: 800;
    color: #10b981;
    letter-spacing: -0.02em;
  }

  .wealth-hint {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* Cards Grid */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.25rem;
  }

  .card-item {
    position: relative;
    border-radius: 20px;
    padding: 1.4rem;
    color: #ffffff;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3);
    min-height: 185px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
  }

  .card-item:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.4);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-chip-box {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .sim-chip {
    width: 34px;
    height: 25px;
    background: linear-gradient(135deg, #d4af37 0%, #ffd700 50%, #b8860b 100%);
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.25);
    box-shadow: inset 0 1px 3px rgba(255, 255, 255, 0.5);
    position: relative;
  }

  .contactless-icon {
    font-size: 1.1rem;
    opacity: 0.8;
  }

  .card-badge {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(8px);
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .card-middle {
    margin: 0.75rem 0;
  }

  .card-bal-label {
    font-size: 0.72rem;
    opacity: 0.85;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-balance {
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0.2rem 0 0 0;
    letter-spacing: -0.02em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  }

  .card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .acc-num {
    font-size: 0.8rem;
    opacity: 0.85;
    letter-spacing: 0.1em;
    font-family: monospace;
  }

  .holder-name {
    font-size: 0.98rem;
    font-weight: 700;
    margin: 0.15rem 0 0 0;
    letter-spacing: 0.02em;
  }

  .card-logo-badge {
    font-size: 1.6rem;
    opacity: 0.85;
  }

  /* Overlay Quick Actions on Hover */
  .card-overlay-actions {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.6rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  .card-item:hover .card-overlay-actions {
    opacity: 1;
    pointer-events: auto;
  }

  .action-pill-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.9rem;
    font-size: 0.82rem;
    font-weight: 600;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.35);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-pill-btn:hover {
    background: rgba(255, 255, 255, 0.35);
    transform: scale(1.05);
  }

  .action-pill-btn.danger:hover {
    background: rgba(239, 68, 68, 0.8);
    border-color: #ef4444;
  }

  /* Mobile & Touch Action Strip */
  .card-mobile-strip {
    display: none;
    align-items: center;
    gap: 0.45rem;
    margin-top: 0.75rem;
    padding-top: 0.65rem;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
  }

  @media (max-width: 768px), (hover: none) {
    .card-mobile-strip {
      display: flex;
    }
  }

  .mobile-mini-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.4rem 0.7rem;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 600;
    color: #ffffff;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.25);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .mobile-mini-btn:active {
    transform: scale(0.95);
    background: rgba(255, 255, 255, 0.25);
  }

  .mobile-mini-btn.danger {
    margin-left: auto;
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.4);
    background: rgba(220, 38, 38, 0.25);
  }

  /* Modal Backdrop & Card */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }

  .modal-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    width: 100%;
    max-width: 520px;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-title-box {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .modal-title-box h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .modal-title-box p {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0.2rem 0 0 0;
  }

  .icon-circle {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
  }

  .icon-circle.primary-glow {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
  }

  .modal-close-btn {
    background: none;
    border: none;
    font-size: 1.1rem;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.4rem;
    border-radius: 8px;
    transition: color 0.15s;
  }

  .modal-close-btn:hover {
    color: var(--text-primary);
  }

  .modal-body {
    padding: 1.5rem;
    max-height: 75vh;
    overflow-y: auto;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: var(--bg-hover);
    border-top: 1px solid var(--border-color);
  }

  /* Form Elements */
  .form-group label {
    display: block;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.4rem;
  }

  .input-field {
    width: 100%;
    padding: 0.65rem 0.9rem;
    font-size: 0.9rem;
    background: var(--bg-main);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    color: var(--text-primary);
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s ease;
  }

  .input-field:focus {
    border-color: #3b82f6;
  }

  .select-field {
    cursor: pointer;
  }

  .amount-input-box {
    position: relative;
    display: flex;
    align-items: center;
  }

  .cur-prefix {
    position: absolute;
    left: 1rem;
    font-weight: 700;
    color: var(--text-muted);
    font-size: 1rem;
  }

  .amount-input {
    padding-left: 2.8rem;
    font-size: 1.15rem;
    font-weight: 700;
  }

  .quick-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.6rem;
  }

  .chip-btn {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.3rem 0.6rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .chip-btn:hover {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
    border-color: rgba(59, 130, 246, 0.3);
  }

  .transfer-exchange-grid {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .transfer-exchange-grid .form-group {
    flex: 1;
  }

  .exchange-arrow {
    font-size: 1.3rem;
    color: #3b82f6;
    margin-top: 1.2rem;
  }

  .grid-2-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }

  .mt-3 {
    margin-top: 1rem;
  }

  .alert-box {
    padding: 0.75rem 1rem;
    border-radius: 10px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 1rem;
  }

  .alert-box.danger {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.25);
  }

  /* Preset theme selector */
  .preset-theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 0.5rem;
    margin-top: 0.4rem;
  }

  .theme-chip {
    border: 2px solid transparent;
    border-radius: 10px;
    padding: 0.55rem 0.7rem;
    color: #ffffff;
    font-size: 0.72rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    text-align: left;
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3);
    transition: transform 0.15s ease;
  }

  .theme-chip:hover {
    transform: scale(1.02);
  }

  .theme-chip.active {
    border-color: #ffffff;
    box-shadow: 0 0 0 2px #3b82f6;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleUp {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @media (max-width: 640px) {
    .section-header {
      flex-direction: column;
      align-items: stretch;
    }
    .header-actions {
      flex-direction: column;
    }
    .btn-primary, .btn-secondary {
      width: 100%;
      justify-content: center;
    }
    .transfer-exchange-grid {
      flex-direction: column;
    }
    .exchange-arrow {
      transform: rotate(90deg);
      margin: 0.2rem auto;
    }
    .grid-2-col {
      grid-template-columns: 1fr;
    }
  }

  :global([data-theme="light"]) .total-wealth-banner {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
    border: 1px solid rgba(148, 163, 184, 0.35) !important;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.05) !important;
  }

  :global([data-theme="light"]) .wealth-label {
    color: #475569 !important;
  }

  :global([data-theme="light"]) .wealth-value {
    color: #059669 !important;
  }

  :global([data-theme="light"]) .wealth-hint {
    color: #64748b !important;
  }

  :global([data-theme="light"]) .btn-card-add {
    background: #ffffff !important;
    border-color: rgba(148, 163, 184, 0.35) !important;
  }

  :global([data-theme="light"]) .btn-card-add:hover {
    background: #f8fafc !important;
    border-color: #3b82f6 !important;
  }

  :global([data-theme="light"]) .btn-card-add span {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .btn-card-add p {
    color: #64748b !important;
  }

  :global([data-theme="light"]) .chip-btn {
    background: #f1f5f9 !important;
    color: #334155 !important;
    border-color: rgba(148, 163, 184, 0.35) !important;
  }

  :global([data-theme="light"]) .chip-btn:hover {
    background: #e2e8f0 !important;
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .wallet-modal-card,
  :global([data-theme="light"]) .modal-card {
    background: #ffffff !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
  }

  :global([data-theme="light"]) .modal-title-box h3 {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .modal-title-box p {
    color: #64748b !important;
  }

  :global([data-theme="light"]) .modal-footer {
    background: #f8fafc !important;
    border-top-color: rgba(148, 163, 184, 0.25) !important;
  }
</style>
