<script>
  import {
    subscriptions,
    subscriptionMetrics,
    wallets,
    currency,
    formatCurrency,
    paySubscription,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    requestConfirm
  } from '../stores.js';
  import confetti from 'canvas-confetti';

  let isModalOpen = false;
  let editingSub = null;

  // Form State
  let subName = '';
  let subAmount = '';
  let subCycle = 'monthly';
  let subBillingDay = 15;
  let subCategory = 'Hiburan';
  let subWalletId = '';
  let subIcon = 'fa-film';
  let subColor = '#E50914';

  const popularPresets = [
    { name: 'Netflix Premium', icon: 'fa-film', color: '#E50914', category: 'Hiburan', defaultAmt: 186000 },
    { name: 'Spotify Duo / Family', icon: 'fa-music', color: '#1DB954', category: 'Hiburan', defaultAmt: 86900 },
    { name: 'YouTube Premium', icon: 'fa-play', color: '#FF0000', category: 'Hiburan', defaultAmt: 69000 },
    { name: 'WiFi Internet Fiber', icon: 'fa-wifi', color: '#0284C7', category: 'Tagihan & Utilitas', defaultAmt: 385000 },
    { name: 'Listrik PLN Pasca/Token', icon: 'fa-bolt', color: '#F59E0B', category: 'Tagihan & Utilitas', defaultAmt: 300000 },
    { name: 'BPJS Kesehatan', icon: 'fa-heart-pulse', color: '#10B981', category: 'Kesehatan', defaultAmt: 150000 },
    { name: 'Sewa Kos / Kontrakan', icon: 'fa-house', color: '#8B5CF6', category: 'Tagihan & Utilitas', defaultAmt: 1500000 },
    { name: 'Gym & Membership', icon: 'fa-dumbbell', color: '#EC4899', category: 'Kesehatan', defaultAmt: 350000 }
  ];

  function openModal(sub = null) {
    editingSub = sub;
    if (sub) {
      subName = sub.name;
      subAmount = String(sub.amount || '');
      subCycle = sub.cycle || 'monthly';
      subBillingDay = sub.billingDay || 1;
      subCategory = sub.category || 'Hiburan';
      subWalletId = sub.walletId || ($wallets[0]?.id || '');
      subIcon = sub.icon || 'fa-receipt';
      subColor = sub.color || '#3B82F6';
    } else {
      subName = '';
      subAmount = '';
      subCycle = 'monthly';
      subBillingDay = new Date().getDate();
      subCategory = 'Hiburan';
      subWalletId = $wallets[0]?.id || '';
      subIcon = 'fa-receipt';
      subColor = '#3B82F6';
    }
    isModalOpen = true;
  }

  function applyPreset(preset) {
    subName = preset.name;
    subIcon = preset.icon;
    subColor = preset.color;
    subCategory = preset.category;
    if (!subAmount) subAmount = String(preset.defaultAmt);
  }

  function handleSaveSub() {
    if (!subName.trim()) return;

    const payload = {
      name: subName.trim(),
      amount: Number(subAmount) || 0,
      cycle: subCycle,
      billingDay: Number(subBillingDay) || 1,
      category: subCategory,
      walletId: subWalletId || ($wallets[0]?.id || ''),
      icon: subIcon,
      color: subColor
    };

    if (editingSub) {
      updateSubscription(editingSub.id, payload);
    } else {
      addSubscription(payload);
    }

    isModalOpen = false;
    editingSub = null;
  }

  function handlePay(sub) {
    const chosenWallet = $wallets.find((w) => w.id === sub.walletId) || $wallets[0];
    const walletName = chosenWallet ? chosenWallet.name : 'Rekening';

    requestConfirm({
      title: 'Bayar & Catat Langganan?',
      message: `Tandai lunas dan potong saldo ${formatCurrency(sub.amount, $currency)} dari "${walletName}"? Transaksi pengeluaran otomatis dicatat.`,
      confirmText: 'Bayar Sekarang',
      confirmStyle: 'primary',
      icon: 'fa-circle-check',
      onConfirm: () => {
        paySubscription(sub.id, chosenWallet?.id);
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.7 }
        });
      }
    });
  }

  function handleDeleteSub(sub) {
    requestConfirm({
      title: 'Hapus Langganan?',
      message: `Apakah Anda yakin ingin menghapus pengingat langganan "${sub.name}"?`,
      confirmText: 'Hapus',
      confirmStyle: 'danger',
      onConfirm: () => {
        deleteSubscription(sub.id);
      }
    });
  }

  function getDueStatus(billingDay, isPaid) {
    if (isPaid) {
      return { text: 'Lunas Bulan Ini', type: 'paid', days: 0 };
    }
    const today = new Date().getDate();
    const diff = billingDay - today;
    if (diff === 0) return { text: 'Jatuh Tempo Hari Ini!', type: 'urgent', days: 0 };
    if (diff === 1) return { text: 'Besok Jatuh Tempo', type: 'warning', days: 1 };
    if (diff > 1 && diff <= 5) return { text: `${diff} hari lagi`, type: 'warning', days: diff };
    if (diff < 0) return { text: `Lewat ${Math.abs(diff)} hari`, type: 'danger', days: diff };
    return { text: `Tgl ${billingDay} (${diff} hr lagi)`, type: 'normal', days: diff };
  }
</script>

<div class="subs-section">
  <!-- Section Header -->
  <div class="section-header">
    <div class="header-info">
      <div class="title-with-pill">
        <h2>
          <i class="fa-solid fa-repeat gradient-icon"></i>
          Kelola Langganan & Tagihan Rutin
        </h2>
        <span class="count-pill">{$subscriptionMetrics.totalCount} Layanan</span>
      </div>
      <p class="subtitle">
        Pantau fixed expenses, siklus jatuh tempo tagihan, dan catat pelunasan otomatis sekali klik.
      </p>
    </div>

    <button class="btn-primary" on:click={() => openModal()}>
      <i class="fa-solid fa-plus"></i>
      <span>Tambah Langganan</span>
    </button>
  </div>

  <!-- Metric Quick Summary Cards -->
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-icon-box blue-box">
        <i class="fa-solid fa-calendar-check"></i>
      </div>
      <div class="metric-data">
        <span class="m-label">Total Beban Rutin / Bulan</span>
        <h3 class="m-val">{formatCurrency($subscriptionMetrics.monthlyTotal, $currency)}</h3>
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-icon-box orange-box">
        <i class="fa-solid fa-bell"></i>
      </div>
      <div class="metric-data">
        <span class="m-label">Belum Dibayar Bulan Ini</span>
        <h3 class="m-val highlight-orange">{$subscriptionMetrics.unpaidCount} Tagihan</h3>
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-icon-box green-box">
        <i class="fa-solid fa-shield-heart"></i>
      </div>
      <div class="metric-data">
        <span class="m-label">Status Auto-Catat</span>
        <h3 class="m-val text-emerald">Aktif & Siap</h3>
      </div>
    </div>
  </div>

  <!-- Subscriptions Grid -->
  <div class="subs-grid">
    {#each $subscriptions as sub (sub.id)}
      {@const due = getDueStatus(sub.billingDay, sub.isPaidThisMonth)}
      {@const walletObj = $wallets.find((w) => w.id === sub.walletId)}
      <div class="sub-card" class:is-paid={sub.isPaidThisMonth}>
        <!-- Top row: Icon & Status -->
        <div class="sub-card-top">
          <div class="sub-brand">
            <div class="sub-icon-avatar" style="background: {sub.color || '#3b82f6'};">
              <i class="fa-solid {sub.icon || 'fa-receipt'}"></i>
            </div>
            <div>
              <h4 class="sub-name">{sub.name}</h4>
              <span class="sub-cat">{sub.category} • {sub.cycle === 'yearly' ? 'Tahunan' : 'Bulanan'}</span>
            </div>
          </div>

          <!-- Status badge -->
          <span class="status-badge {due.type}">
            {#if due.type === 'paid'}
              <i class="fa-solid fa-check"></i>
            {:else if due.type === 'urgent' || due.type === 'danger'}
              <i class="fa-solid fa-triangle-exclamation"></i>
            {:else}
              <i class="fa-regular fa-clock"></i>
            {/if}
            {due.text}
          </span>
        </div>

        <!-- Middle row: Amount & Wallet Source -->
        <div class="sub-card-middle">
          <div class="amount-group">
            <span class="amt-label">Tarif Langganan</span>
            <div class="amt-val">
              {formatCurrency(sub.amount, $currency)}
              <span class="cycle-text">/{sub.cycle === 'yearly' ? 'thn' : 'bln'}</span>
            </div>
          </div>

          <div class="wallet-source-tag">
            <i class="fa-solid fa-credit-card"></i>
            <span>{walletObj ? walletObj.name : 'Auto-Debit'}</span>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="sub-card-footer">
          {#if sub.isPaidThisMonth}
            <div class="paid-indicator">
              <i class="fa-solid fa-circle-check"></i>
              <span>Sudah Lunas untuk Bulan Ini</span>
            </div>
          {:else}
            <button class="pay-now-btn" on:click={() => handlePay(sub)}>
              <i class="fa-solid fa-bolt"></i>
              <span>Bayar & Catat Sekarang</span>
            </button>
          {/if}

          <div class="icon-actions">
            <button class="icon-btn" title="Ubah langganan" on:click={() => openModal(sub)}>
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="icon-btn danger" title="Hapus" on:click={() => handleDeleteSub(sub)}>
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- ========================================================================= -->
<!-- MODAL TAMBAH / EDIT SUBSCRIPTION -->
<!-- ========================================================================= -->
{#if isModalOpen}
  <div class="modal-backdrop" on:click={() => (isModalOpen = false)} role="dialog">
    <div class="modal-card" on:click|stopPropagation role="document">
      <div class="modal-header">
        <div class="modal-title-box">
          <div class="icon-circle purple-glow">
            <i class="fa-solid fa-repeat"></i>
          </div>
          <div>
            <h3>{editingSub ? 'Ubah Pengingat Langganan' : 'Tambah Langganan & Tagihan'}</h3>
            <p>Jaga fixed expenses tetap terkontrol dan tidak terlambat bayar</p>
          </div>
        </div>
        <button class="modal-close-btn" on:click={() => (isModalOpen = false)}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body">
        <!-- Quick Preset Badges -->
        <div class="form-group mb-3">
          <label>Pilih Layanan Cepat (Opsional)</label>
          <div class="preset-pills">
            {#each popularPresets as p}
              <button
                type="button"
                class="preset-pill"
                on:click={() => applyPreset(p)}
              >
                <i class="fa-solid {p.icon}" style="color: {p.color};"></i>
                <span>{p.name}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Name -->
        <div class="form-group">
          <label for="sub-name">Nama Layanan / Tagihan</label>
          <input
            id="sub-name"
            type="text"
            class="input-field"
            placeholder="Contoh: Netflix 4K, Indihome, Sewa Apartemen"
            bind:value={subName}
          />
        </div>

        <!-- Amount & Cycle -->
        <div class="grid-2-col mt-3">
          <div class="form-group">
            <label for="sub-amt">Tarif Biaya (Rp)</label>
            <input
              id="sub-amt"
              type="number"
              class="input-field"
              placeholder="0"
              bind:value={subAmount}
            />
          </div>
          <div class="form-group">
            <label for="sub-cycle">Siklus Penagihan</label>
            <select id="sub-cycle" class="input-field select-field" bind:value={subCycle}>
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
            </select>
          </div>
        </div>

        <!-- Billing Day & Wallet Payment -->
        <div class="grid-2-col mt-3">
          <div class="form-group">
            <label for="sub-day">Tanggal Jatuh Tempo (1-31)</label>
            <input
              id="sub-day"
              type="number"
              min="1"
              max="31"
              class="input-field"
              placeholder="15"
              bind:value={subBillingDay}
            />
          </div>
          <div class="form-group">
            <label for="sub-wallet">Dibayar Dari Dompet</label>
            <select id="sub-wallet" class="input-field select-field" bind:value={subWalletId}>
              {#each $wallets as w}
                <option value={w.id}>{w.name} ({formatCurrency(w.balance, $currency)})</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Category -->
        <div class="form-group mt-3">
          <label for="sub-cat">Kategori Pengeluaran</label>
          <select id="sub-cat" class="input-field select-field" bind:value={subCategory}>
            <option value="Hiburan">Hiburan & Streaming</option>
            <option value="Tagihan & Utilitas">Tagihan & Utilitas</option>
            <option value="Kesehatan">Kesehatan & Asuransi</option>
            <option value="Pendidikan">Pendidikan / Kursus</option>
            <option value="Lainnya">Pengeluaran Lainnya</option>
          </select>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" on:click={() => (isModalOpen = false)}>
          Batal
        </button>
        <button class="btn-primary" on:click={handleSaveSub}>
          <i class="fa-solid fa-check"></i>
          <span>{editingSub ? 'Simpan Perubahan' : 'Tambahkan Langganan'}</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .subs-section {
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
    background: linear-gradient(135deg, #ec4899, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .count-pill {
    font-size: 0.75rem;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    background: rgba(236, 72, 153, 0.12);
    color: #ec4899;
    font-weight: 600;
    border: 1px solid rgba(236, 72, 153, 0.25);
  }

  .subtitle {
    font-size: 0.88rem;
    color: var(--text-secondary);
    margin: 0.35rem 0 0 0;
  }

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
    background: linear-gradient(135deg, #ec4899 0%, #d946ef 100%);
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(236, 72, 153, 0.25);
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(236, 72, 153, 0.35);
  }

  .btn-secondary {
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  /* Metrics Grid */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .metric-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1.1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .metric-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .blue-box {
    background: rgba(59, 130, 246, 0.12);
    color: #3b82f6;
  }

  .orange-box {
    background: rgba(249, 115, 22, 0.12);
    color: #f97316;
  }

  .green-box {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
  }

  .metric-data {
    display: flex;
    flex-direction: column;
  }

  .m-label {
    font-size: 0.78rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .m-val {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0.15rem 0 0 0;
  }

  .highlight-orange {
    color: #f97316;
  }

  .text-emerald {
    color: #10b981;
  }

  /* Subscriptions Grid */
  .subs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.1rem;
  }

  .sub-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 18px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 1rem;
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .sub-card:hover {
    transform: translateY(-2px);
    border-color: rgba(236, 72, 153, 0.35);
  }

  .sub-card.is-paid {
    opacity: 0.85;
    background: rgba(16, 185, 129, 0.03);
    border-color: rgba(16, 185, 129, 0.2);
  }

  .sub-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.8rem;
  }

  .sub-brand {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .sub-icon-avatar {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 1.15rem;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  }

  .sub-name {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .sub-cat {
    font-size: 0.76rem;
    color: var(--text-secondary);
  }

  /* Status Badges */
  .status-badge {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    white-space: nowrap;
  }

  .status-badge.paid {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.25);
  }

  .status-badge.urgent {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
    animation: pulseGlow 1.5s infinite;
  }

  .status-badge.warning {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  .status-badge.normal {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.2);
  }

  @keyframes pulseGlow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .sub-card-middle {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 0.6rem 0;
    border-top: 1px dashed var(--border-color);
    border-bottom: 1px dashed var(--border-color);
  }

  .amount-group {
    display: flex;
    flex-direction: column;
  }

  .amt-label {
    font-size: 0.74rem;
    color: var(--text-secondary);
  }

  .amt-val {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--text-primary);
    display: flex;
    align-items: baseline;
    gap: 0.2rem;
  }

  .cycle-text {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .wallet-source-tag {
    font-size: 0.76rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--bg-hover);
    padding: 0.25rem 0.55rem;
    border-radius: 8px;
  }

  /* Card Footer Actions */
  .sub-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.6rem;
  }

  .pay-now-btn {
    flex: 1;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #ffffff;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.55rem 0.9rem;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .pay-now-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .paid-indicator {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #10b981;
  }

  .icon-actions {
    display: flex;
    gap: 0.4rem;
  }

  .icon-btn {
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    transition: all 0.15s ease;
  }

  .icon-btn:hover {
    color: #3b82f6;
    border-color: rgba(59, 130, 246, 0.4);
  }

  .icon-btn.danger:hover {
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.4);
  }

  /* Preset Pills in Modal */
  .preset-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: 0.4rem;
  }

  .preset-pill {
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    transition: all 0.15s ease;
  }

  .preset-pill:hover {
    background: rgba(236, 72, 153, 0.12);
    border-color: rgba(236, 72, 153, 0.35);
  }

  /* Modal styling */
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

  .purple-glow {
    background: rgba(236, 72, 153, 0.15);
    color: #ec4899;
  }

  .modal-close-btn {
    background: none;
    border: none;
    font-size: 1.1rem;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.4rem;
    border-radius: 8px;
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
  }

  .input-field:focus {
    border-color: #ec4899;
  }

  .grid-2-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }

  .mt-3 {
    margin-top: 1rem;
  }

  .mb-3 {
    margin-bottom: 1rem;
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
    .btn-primary {
      width: 100%;
      justify-content: center;
    }
    .grid-2-col {
      grid-template-columns: 1fr;
    }
  }

  :global([data-theme="light"]) .sub-card {
    background: #ffffff !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04) !important;
  }

  :global([data-theme="light"]) .sub-name {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .sub-plan-badge {
    background: #f1f5f9 !important;
    color: #475569 !important;
  }

  :global([data-theme="light"]) .sub-amount-value {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .countdown-badge.normal {
    background: #f1f5f9 !important;
    color: #475569 !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
  }
</style>
