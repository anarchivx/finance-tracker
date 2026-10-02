<script>
  import {
    debts,
    debtMetrics,
    wallets,
    currency,
    formatCurrency,
    addDebt,
    updateDebt,
    deleteDebt,
    recordDebtPayment,
    requestConfirm
  } from '../stores.js';
  import confetti from 'canvas-confetti';

  let activeFilter = 'receivable'; // 'receivable' (Piutang) or 'payable' (Hutang)
  let isAddModalOpen = false;
  let isPaymentModalOpen = false;
  let editingDebt = null;
  let targetDebtForPayment = null;

  // Form State for Add / Edit
  let personName = '';
  let debtType = 'receivable';
  let totalAmount = '';
  let initialPaidAmount = '0';
  let dueDate = '';
  let phoneNumber = '';
  let noteText = '';

  // Payment Modal State
  let paymentAmountInput = '';
  let paymentWalletId = '';

  $: filteredDebts = ($debts || []).filter((d) => d.type === activeFilter);

  function openAddModal(debt = null) {
    editingDebt = debt;
    if (debt) {
      personName = debt.personName;
      debtType = debt.type || 'receivable';
      totalAmount = String(debt.amount || '');
      initialPaidAmount = String(debt.paidAmount || '0');
      dueDate = debt.dueDate || '';
      phoneNumber = debt.phone || '';
      noteText = debt.note || '';
    } else {
      personName = '';
      debtType = activeFilter;
      totalAmount = '';
      initialPaidAmount = '0';
      dueDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]; // 2 weeks default
      phoneNumber = '';
      noteText = '';
    }
    isAddModalOpen = true;
  }

  function handleSaveDebt() {
    if (!personName.trim() || !Number(totalAmount)) return;

    const payload = {
      personName: personName.trim(),
      type: debtType,
      amount: Number(totalAmount) || 0,
      paidAmount: Number(initialPaidAmount) || 0,
      dueDate: dueDate || '',
      phone: phoneNumber.replace(/[^0-9]/g, ''),
      note: noteText.trim()
    };

    if (editingDebt) {
      updateDebt(editingDebt.id, payload);
    } else {
      addDebt(payload);
    }

    isAddModalOpen = false;
    editingDebt = null;
  }

  function handleDeleteDebt(debt) {
    requestConfirm({
      title: 'Hapus Catatan?',
      message: `Apakah Anda yakin ingin menghapus catatan untuk "${debt.personName}"?`,
      confirmText: 'Hapus',
      confirmStyle: 'danger',
      onConfirm: () => {
        deleteDebt(debt.id);
      }
    });
  }

  function openPaymentModal(debt) {
    targetDebtForPayment = debt;
    const remaining = Math.max(0, (Number(debt.amount) || 0) - (Number(debt.paidAmount) || 0));
    paymentAmountInput = String(remaining);
    paymentWalletId = $wallets[0]?.id || '';
    isPaymentModalOpen = true;
  }

  function handlePaymentSubmit() {
    if (!targetDebtForPayment) return;
    const amt = Number(paymentAmountInput);
    if (!amt || amt <= 0) return;

    recordDebtPayment(targetDebtForPayment.id, amt, paymentWalletId);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });

    isPaymentModalOpen = false;
    targetDebtForPayment = null;
  }

  // Generate polite WhatsApp Reminder text and link
  function sendWaReminder(debt) {
    const remaining = Math.max(0, (Number(debt.amount) || 0) - (Number(debt.paidAmount) || 0));
    const phone = (debt.phone || '').trim();
    let formattedPhone = phone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }

    const message = encodeURIComponent(
      `Halo ${debt.personName}, semoga sehat selalu ya. 🙏\n\n` +
      `Sekadar pengingat sopan mengenai catatan ${debt.note ? `"${debt.note}"` : 'dana'} ` +
      `dengan sisa sebesar ${formatCurrency(remaining, $currency)}.\n` +
      `Jika sudah ada kelonggaran, bisa ditransfer ke rekening saya ya. Terima kasih banyak! ✨`
    );

    const waUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(waUrl, '_blank');
  }

  function getDueStatus(dueDateStr, isPaid) {
    if (isPaid) return { text: 'Lunas', type: 'paid' };
    if (!dueDateStr) return { text: 'Tanpa Tenggat', type: 'normal' };

    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `Terlambat ${Math.abs(diffDays)} hari`, type: 'danger' };
    if (diffDays === 0) return { text: 'Jatuh tempo hari ini!', type: 'urgent' };
    if (diffDays <= 3) return { text: `${diffDays} hari lagi`, type: 'warning' };
    return { text: `Tenggat: ${dueDateStr}`, type: 'normal' };
  }
</script>

<div class="debt-section">
  <!-- Section Header -->
  <div class="section-header">
    <div class="header-info">
      <div class="title-with-pill">
        <h2>
          <i class="fa-solid fa-handshake-angle gradient-icon"></i>
          Pencatat Hutang & Piutang
        </h2>
        <span class="count-pill">
          {activeFilter === 'receivable' ? 'Piutang Saya' : 'Kewajiban Hutang'}
        </span>
      </div>
      <p class="subtitle">
        Pantau pinjaman yang dipinjam teman atau kewajiban cicilan, lengkap dengan tombol WhatsApp pengingat sopan.
      </p>
    </div>

    <button class="btn-primary" on:click={() => openAddModal()}>
      <i class="fa-solid fa-plus"></i>
      <span>Catat {activeFilter === 'receivable' ? 'Piutang' : 'Hutang'} Baru</span>
    </button>
  </div>

  <!-- Big Metric Overview -->
  <div class="metrics-grid">
    <div class="metric-card piutang-card" class:active-tab={activeFilter === 'receivable'} on:click={() => (activeFilter = 'receivable')}>
      <div class="m-icon-box emerald-box">
        <i class="fa-solid fa-arrow-down-left"></i>
      </div>
      <div class="m-data">
        <span class="m-title">Sisa Piutang Belum Tertagih</span>
        <h3 class="m-number text-emerald">
          {formatCurrency($debtMetrics.remainingReceivable, $currency)}
        </h3>
        <span class="m-sub">Total pinjaman: {formatCurrency($debtMetrics.totalReceivable, $currency)}</span>
      </div>
    </div>

    <div class="metric-card hutang-card" class:active-tab={activeFilter === 'payable'} on:click={() => (activeFilter = 'payable')}>
      <div class="m-icon-box rose-box">
        <i class="fa-solid fa-arrow-up-right"></i>
      </div>
      <div class="m-data">
        <span class="m-title">Sisa Hutang / Cicilan Saya</span>
        <h3 class="m-number text-rose">
          {formatCurrency($debtMetrics.remainingPayable, $currency)}
        </h3>
        <span class="m-sub">Total hutang: {formatCurrency($debtMetrics.totalPayable, $currency)}</span>
      </div>
    </div>
  </div>

  <!-- Segmented Switcher -->
  <div class="segmented-control">
    <button
      class="segment-btn"
      class:active={activeFilter === 'receivable'}
      on:click={() => (activeFilter = 'receivable')}
    >
      <i class="fa-solid fa-hand-holding-dollar"></i>
      <span>Piutang Saya (Uang Kita di Teman)</span>
    </button>
    <button
      class="segment-btn"
      class:active={activeFilter === 'payable'}
      on:click={() => (activeFilter = 'payable')}
    >
      <i class="fa-solid fa-file-invoice-dollar"></i>
      <span>Hutang Saya (Kewajiban Bayar)</span>
    </button>
  </div>

  <!-- Debt Cards Grid -->
  {#if filteredDebts.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <i class="fa-solid fa-clipboard-check"></i>
      </div>
      <h4>Tidak ada catatan {activeFilter === 'receivable' ? 'piutang' : 'hutang'} saat ini</h4>
      <p>Semua catatan rapi atau sudah lunas! Tekan tombol tambah untuk mencatat pinjaman baru.</p>
    </div>
  {:else}
    <div class="debt-cards-grid">
      {#each filteredDebts as item (item.id)}
        {@const remaining = Math.max(0, (Number(item.amount) || 0) - (Number(item.paidAmount) || 0))}
        {@const isPaid = remaining === 0}
        {@const pct = Math.min(100, Math.round(((Number(item.paidAmount) || 0) / (Number(item.amount) || 1)) * 100))}
        {@const due = getDueStatus(item.dueDate, isPaid)}

        <div class="debt-card" class:is-settled={isPaid}>
          <!-- Card Header -->
          <div class="debt-card-header">
            <div class="person-info">
              <div class="avatar-circle" class:receivable-av={item.type === 'receivable'} class:payable-av={item.type === 'payable'}>
                {item.personName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 class="person-name">{item.personName}</h4>
                {#if item.note}
                  <span class="debt-note">{item.note}</span>
                {/if}
              </div>
            </div>

            <!-- Due status chip -->
            <span class="status-badge {due.type}">
              {due.text}
            </span>
          </div>

          <!-- Progress & Amounts -->
          <div class="debt-card-body">
            <div class="amount-row">
              <div>
                <span class="amt-caption">Sisa Belum Bayar</span>
                <h3 class="remaining-amt" class:text-emerald={item.type === 'receivable'} class:text-rose={item.type === 'payable'}>
                  {formatCurrency(remaining, $currency)}
                </h3>
              </div>
              <div class="paid-stat">
                <span class="amt-caption">Terbayar: {pct}%</span>
                <span class="paid-val">{formatCurrency(item.paidAmount, $currency)} / {formatCurrency(item.amount, $currency)}</span>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="progress-bar-bg">
              <div
                class="progress-bar-fill"
                class:emerald-fill={item.type === 'receivable'}
                class:rose-fill={item.type === 'payable'}
                style="width: {pct}%;"
              ></div>
            </div>
          </div>

          <!-- Actions -->
          <div class="debt-card-footer">
            <div class="action-buttons-left">
              {#if !isPaid}
                <button class="action-btn pay-btn" on:click={() => openPaymentModal(item)}>
                  <i class="fa-solid fa-money-bill-transfer"></i>
                  <span>Catat Pelunasan</span>
                </button>
              {:else}
                <div class="settled-tag">
                  <i class="fa-solid fa-circle-check"></i>
                  <span>Lunas Sempurna</span>
                </div>
              {/if}

              {#if item.type === 'receivable' && !isPaid}
                <button
                  class="action-btn wa-btn"
                  title="Kirim Pesan WhatsApp Pengingat Sopan"
                  on:click={() => sendWaReminder(item)}
                >
                  <i class="fa-brands fa-whatsapp"></i>
                  <span>Ingatkan WA</span>
                </button>
              {/if}
            </div>

            <div class="action-buttons-right">
              <button class="icon-tool-btn" title="Ubah" on:click={() => openAddModal(item)}>
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="icon-tool-btn danger" title="Hapus" on:click={() => handleDeleteDebt(item)}>
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- ========================================================================= -->
<!-- MODAL TAMBAH / EDIT HUTANG / PIUTANG -->
<!-- ========================================================================= -->
{#if isAddModalOpen}
  <div class="modal-backdrop" on:click={() => (isAddModalOpen = false)} role="dialog">
    <div class="modal-card" on:click|stopPropagation role="document">
      <div class="modal-header">
        <div class="modal-title-box">
          <div class="icon-circle cyan-glow">
            <i class="fa-solid fa-handshake"></i>
          </div>
          <div>
            <h3>{editingDebt ? 'Ubah Catatan' : 'Tambah Catatan Baru'}</h3>
            <p>Kelola daftar pinjaman teman atau kewajiban pembayaran</p>
          </div>
        </div>
        <button class="modal-close-btn" on:click={() => (isAddModalOpen = false)}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>Jenis Catatan</label>
          <div class="type-toggle-row">
            <button
              type="button"
              class="type-pill-btn"
              class:active={debtType === 'receivable'}
              on:click={() => (debtType = 'receivable')}
            >
              <i class="fa-solid fa-arrow-down-left"></i>
              <span>Piutang (Orang pinjam ke kita)</span>
            </button>
            <button
              type="button"
              class="type-pill-btn"
              class:active={debtType === 'payable'}
              on:click={() => (debtType = 'payable')}
            >
              <i class="fa-solid fa-arrow-up-right"></i>
              <span>Hutang (Kita berhutang)</span>
            </button>
          </div>
        </div>

        <div class="grid-2-col mt-3">
          <div class="form-group">
            <label for="d-person">Nama Pihak / Teman</label>
            <input
              id="d-person"
              type="text"
              class="input-field"
              placeholder="Contoh: Budi Santoso, Toko Prima"
              bind:value={personName}
            />
          </div>
          <div class="form-group">
            <label for="d-phone">No. WhatsApp (Opsional)</label>
            <input
              id="d-phone"
              type="text"
              class="input-field"
              placeholder="Contoh: 08123456789"
              bind:value={phoneNumber}
            />
          </div>
        </div>

        <div class="grid-2-col mt-3">
          <div class="form-group">
            <label for="d-amt">Total Nominal Pinjaman (Rp)</label>
            <input
              id="d-amt"
              type="number"
              class="input-field"
              placeholder="0"
              bind:value={totalAmount}
            />
          </div>
          <div class="form-group">
            <label for="d-paid">Sudah Dibayar (Rp)</label>
            <input
              id="d-paid"
              type="number"
              class="input-field"
              placeholder="0"
              bind:value={initialPaidAmount}
            />
          </div>
        </div>

        <div class="grid-2-col mt-3">
          <div class="form-group">
            <label for="d-due">Tanggal Jatuh Tempo</label>
            <input
              id="d-due"
              type="date"
              class="input-field"
              bind:value={dueDate}
            />
          </div>
          <div class="form-group">
            <label for="d-note">Keterangan / Keperluan</label>
            <input
              id="d-note"
              type="text"
              class="input-field"
              placeholder="Contoh: Pinjaman sewa kamera"
              bind:value={noteText}
            />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" on:click={() => (isAddModalOpen = false)}>
          Batal
        </button>
        <button class="btn-primary" on:click={handleSaveDebt}>
          <i class="fa-solid fa-check"></i>
          <span>{editingDebt ? 'Simpan Catatan' : 'Tambahkan Catatan'}</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ========================================================================= -->
<!-- MODAL CATAT PELUNASAN / CICILAN -->
<!-- ========================================================================= -->
{#if isPaymentModalOpen && targetDebtForPayment}
  <div class="modal-backdrop" on:click={() => (isPaymentModalOpen = false)} role="dialog">
    <div class="modal-card" on:click|stopPropagation role="document">
      <div class="modal-header">
        <div class="modal-title-box">
          <div class="icon-circle emerald-box">
            <i class="fa-solid fa-money-bill-transfer"></i>
          </div>
          <div>
            <h3>Catat Pelunasan: {targetDebtForPayment.personName}</h3>
            <p>Saldo akan otomatis disinkronkan ke rekening yang dipilih</p>
          </div>
        </div>
        <button class="modal-close-btn" on:click={() => (isPaymentModalOpen = false)}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="pay-amt">Nominal Pembayaran (Rp)</label>
          <input
            id="pay-amt"
            type="number"
            class="input-field"
            placeholder="0"
            bind:value={paymentAmountInput}
          />
        </div>

        <div class="form-group mt-3">
          <label for="pay-wallet">
            {targetDebtForPayment.type === 'receivable' ? 'Masuk ke Rekening / Dompet' : 'Bayar dari Rekening / Dompet'}
          </label>
          <select id="pay-wallet" class="input-field select-field" bind:value={paymentWalletId}>
            {#each $wallets as w}
              <option value={w.id}>{w.name} ({formatCurrency(w.balance, $currency)})</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" on:click={() => (isPaymentModalOpen = false)}>
          Batal
        </button>
        <button class="btn-primary" on:click={handlePaymentSubmit}>
          <i class="fa-solid fa-check-double"></i>
          <span>Konfirmasi Pelunasan</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .debt-section {
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
    background: linear-gradient(135deg, #06b6d4, #3b82f6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .count-pill {
    font-size: 0.75rem;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    background: rgba(6, 182, 212, 0.12);
    color: #06b6d4;
    font-weight: 600;
    border: 1px solid rgba(6, 182, 212, 0.25);
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
    background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(6, 182, 212, 0.25);
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(6, 182, 212, 0.35);
  }

  .btn-secondary {
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  /* Metrics Grid */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .metric-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1.2rem;
    display: flex;
    align-items: center;
    gap: 1.1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .metric-card:hover {
    transform: translateY(-2px);
    border-color: rgba(59, 130, 246, 0.4);
  }

  .metric-card.active-tab {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  .m-icon-box {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    flex-shrink: 0;
  }

  .emerald-box {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
  }

  .rose-box {
    background: rgba(244, 63, 94, 0.12);
    color: #f43f5e;
  }

  .m-data {
    display: flex;
    flex-direction: column;
  }

  .m-title {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .m-number {
    font-size: 1.35rem;
    font-weight: 800;
    margin: 0.15rem 0;
  }

  .m-sub {
    font-size: 0.76rem;
    color: var(--text-muted);
  }

  .text-emerald {
    color: #10b981;
  }

  .text-rose {
    color: #f43f5e;
  }

  /* Segmented Control */
  .segmented-control {
    display: flex;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    padding: 0.35rem;
    gap: 0.35rem;
    margin-bottom: 1.4rem;
  }

  .segment-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 0.65rem 1rem;
    font-size: 0.86rem;
    font-weight: 600;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .segment-btn.active {
    background: var(--bg-main);
    color: var(--text-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  /* Cards Grid */
  .debt-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.1rem;
  }

  .debt-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 18px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 1.1rem;
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .debt-card:hover {
    transform: translateY(-2px);
  }

  .debt-card.is-settled {
    opacity: 0.8;
    background: rgba(16, 185, 129, 0.03);
    border-color: rgba(16, 185, 129, 0.2);
  }

  .debt-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.8rem;
  }

  .person-info {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .avatar-circle {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.95rem;
  }

  .receivable-av {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .payable-av {
    background: rgba(244, 63, 94, 0.15);
    color: #f43f5e;
    border: 1px solid rgba(244, 63, 94, 0.3);
  }

  .person-name {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .debt-note {
    font-size: 0.78rem;
    color: var(--text-secondary);
    display: block;
    margin-top: 0.1rem;
  }

  /* Progress & Amount */
  .debt-card-body {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .amount-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .amt-caption {
    font-size: 0.74rem;
    color: var(--text-secondary);
  }

  .remaining-amt {
    font-size: 1.25rem;
    font-weight: 800;
    margin: 0.15rem 0 0 0;
  }

  .paid-stat {
    text-align: right;
  }

  .paid-val {
    display: block;
    font-size: 0.78rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .progress-bar-bg {
    height: 8px;
    border-radius: 999px;
    background: var(--bg-hover);
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.3s ease;
  }

  .emerald-fill {
    background: linear-gradient(90deg, #10b981, #059669);
  }

  .rose-fill {
    background: linear-gradient(90deg, #f43f5e, #e11d48);
  }

  /* Status Badges */
  .status-badge {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    white-space: nowrap;
  }

  .status-badge.paid {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.25);
  }

  .status-badge.danger {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .status-badge.warning {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  .status-badge.normal {
    background: var(--bg-hover);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  /* Card Footer Actions */
  .debt-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.6rem;
    border-top: 1px solid var(--border-color);
  }

  .action-buttons-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.8rem;
    font-size: 0.78rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    border: none;
    transition: all 0.15s ease;
  }

  .pay-btn {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .pay-btn:hover {
    background: #3b82f6;
    color: #ffffff;
  }

  .wa-btn {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .wa-btn:hover {
    background: #22c55e;
    color: #ffffff;
  }

  .settled-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: #10b981;
    font-weight: 600;
  }

  .action-buttons-right {
    display: flex;
    gap: 0.35rem;
  }

  .icon-tool-btn {
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    width: 30px;
    height: 30px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.78rem;
    transition: all 0.15s ease;
  }

  .icon-tool-btn:hover {
    color: #3b82f6;
    border-color: rgba(59, 130, 246, 0.4);
  }

  .icon-tool-btn.danger:hover {
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.4);
  }

  /* Empty State */
  .empty-state {
    background: var(--bg-card);
    border: 1px dashed var(--border-color);
    border-radius: 20px;
    padding: 3rem 1.5rem;
    text-align: center;
    margin: 1rem 0;
  }

  .empty-icon {
    font-size: 2.5rem;
    color: #10b981;
    margin-bottom: 0.8rem;
  }

  .empty-state h4 {
    font-size: 1.1rem;
    color: var(--text-primary);
    margin: 0 0 0.4rem 0;
  }

  .empty-state p {
    font-size: 0.88rem;
    color: var(--text-secondary);
    max-width: 420px;
    margin: 0 auto;
  }

  /* Modal Styling */
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

  .cyan-glow {
    background: rgba(6, 182, 212, 0.15);
    color: #06b6d4;
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
    border-color: #06b6d4;
  }

  .type-toggle-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }

  .type-pill-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.65rem;
    font-size: 0.82rem;
    font-weight: 600;
    border-radius: 10px;
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .type-pill-btn.active {
    background: rgba(6, 182, 212, 0.15);
    border-color: #06b6d4;
    color: #06b6d4;
  }

  .grid-2-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }

  .mt-3 {
    margin-top: 1rem;
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
    .grid-2-col, .type-toggle-row {
      grid-template-columns: 1fr;
    }
  }

  :global([data-theme="light"]) .debt-card {
    background: #ffffff !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04) !important;
  }

  :global([data-theme="light"]) .metric-card {
    background: #ffffff !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
  }

  :global([data-theme="light"]) .debt-modal-card {
    background: #ffffff !important;
    color: #0f172a !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.15) !important;
  }

  :global([data-theme="light"]) .debt-modal-card h3 {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .debt-modal-card .input-field {
    background: #ffffff !important;
    color: #0f172a !important;
    border-color: rgba(148, 163, 184, 0.35) !important;
  }

  :global([data-theme="light"]) .debt-modal-card label {
    color: #334155 !important;
  }

  :global([data-theme="light"]) .status-badge.normal {
    background: #f1f5f9 !important;
    color: #475569 !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
  }

  :global([data-theme="light"]) .debt-table-box {
    background: #ffffff !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
  }

  :global([data-theme="light"]) .debt-table th {
    background: #f1f5f9 !important;
    color: #334155 !important;
  }

  :global([data-theme="light"]) .debt-table td {
    color: #0f172a !important;
  }
</style>
