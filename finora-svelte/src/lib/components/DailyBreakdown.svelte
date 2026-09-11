<script>
  import { transactions, currency, formatCurrency, isPrivacyMode, requestConfirm } from '$lib/stores.js';
  import { emitDeleteTransaction } from '$lib/socket.js';

  export let onEditTransaction = () => {};

  // Filter State (Date, Month, Year, Range)
  let filterPeriod = 'all'; // 'all', 'month', 'date', 'range'
  let selectedYear = 'all';
  let selectedMonth = 'all';
  let specificDate = '';
  let startDate = '';
  let endDate = '';

  const monthOptions = [
    { val: 'all', label: 'Semua Bulan' },
    { val: '01', label: 'Januari (01)' },
    { val: '02', label: 'Februari (02)' },
    { val: '03', label: 'Maret (03)' },
    { val: '04', label: 'April (04)' },
    { val: '05', label: 'Mei (05)' },
    { val: '06', label: 'Juni (06)' },
    { val: '07', label: 'Juli (07)' },
    { val: '08', label: 'Agustus (08)' },
    { val: '09', label: 'September (09)' },
    { val: '10', label: 'Oktober (10)' },
    { val: '11', label: 'November (11)' },
    { val: '12', label: 'Desember (12)' }
  ];

  // Dynamically extract available years from transactions
  $: availableYears = [
    'all',
    ...Array.from(
      new Set(
        $transactions
          .map((t) => (t.date ? t.date.split('-')[0] : ''))
          .filter(Boolean)
      )
    ).sort((a, b) => b.localeCompare(a))
  ];

  // Filter transactions based on date criteria
  $: filteredTransactions = $transactions.filter((tx) => {
    if (!tx.date) return filterPeriod === 'all';
    const parts = tx.date.split('-');
    const y = parts[0];
    const m = parts[1];

    if (filterPeriod === 'month') {
      if (selectedYear !== 'all' && y !== selectedYear) return false;
      if (selectedMonth !== 'all' && m !== selectedMonth) return false;
      return true;
    }

    if (filterPeriod === 'date') {
      if (specificDate && tx.date !== specificDate) return false;
      return true;
    }

    if (filterPeriod === 'range') {
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      return true;
    }

    return true;
  });

  // Calculate filtered period metrics
  $: periodStats = filteredTransactions.reduce(
    (acc, t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') acc.income += amt;
      else acc.expense += amt;
      acc.count += 1;
      return acc;
    },
    { income: 0, expense: 0, count: 0 }
  );

  $: periodNet = periodStats.income - periodStats.expense;

  // Group filtered transactions by date
  $: groupedByDate = (() => {
    const groups = {};
    filteredTransactions.forEach((tx) => {
      const d = tx.date || 'Lainnya';
      if (!groups[d]) {
        groups[d] = {
          date: d,
          transactions: [],
          totalIncome: 0,
          totalExpense: 0
        };
      }
      groups[d].transactions.push(tx);
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') groups[d].totalIncome += amt;
      else groups[d].totalExpense += amt;
    });

    // Sort dates descending
    return Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a))
      .map((k) => groups[k]);
  })();

  function resetDateFilter() {
    filterPeriod = 'all';
    selectedYear = 'all';
    selectedMonth = 'all';
    specificDate = '';
    startDate = '';
    endDate = '';
  }

  function setThisMonth() {
    const now = new Date();
    selectedYear = String(now.getFullYear());
    selectedMonth = String(now.getMonth() + 1).padStart(2, '0');
    filterPeriod = 'month';
  }

  function formatDateLabel(dateStr) {
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    if (dateStr === today) return 'Hari Ini (' + dateStr + ')';
    if (dateStr === yesterday) return 'Kemarin (' + dateStr + ')';

    try {
      const parts = dateStr.split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  function handleDelete(id, desc) {
    requestConfirm({
      title: 'Hapus Transaksi',
      message: `Hapus transaksi "${desc}" dari perincian harian?`,
      confirmText: 'Ya, Hapus',
      confirmStyle: 'danger',
      icon: 'fa-trash-can',
      onConfirm: async () => {
        await emitDeleteTransaction(id);
      }
    });
  }
</script>

<div class="glass-panel breakdown-wrapper">
  <div class="breakdown-header">
    <div class="header-titles">
      <div class="title-row">
        <i class="fa-solid fa-calendar-day text-primary"></i>
        <h3>Perincian Keuangan Harian Otomatis</h3>
      </div>
      <p class="subtitle">
        Transaksi dikelompokkan per hari secara cerdas lengkap dengan kalkulasi sub-total pemasukan vs pengeluaran harian.
      </p>
    </div>
  </div>

  <!-- Date / Month / Year Filter Toolbar -->
  <div class="date-filter-panel">
    <div class="filter-mode-pills">
      <button
        class="filter-pill"
        class:active={filterPeriod === 'all'}
        on:click={() => (filterPeriod = 'all')}
      >
        <i class="fa-solid fa-layer-group"></i>
        <span>Semua Waktu</span>
      </button>
      <button
        class="filter-pill"
        class:active={filterPeriod === 'month'}
        on:click={setThisMonth}
      >
        <i class="fa-solid fa-calendar"></i>
        <span>Bulan & Tahun</span>
      </button>
      <button
        class="filter-pill"
        class:active={filterPeriod === 'date'}
        on:click={() => { filterPeriod = 'date'; if (!specificDate) specificDate = new Date().toISOString().split('T')[0]; }}
      >
        <i class="fa-regular fa-calendar-check"></i>
        <span>Tanggal Spesifik</span>
      </button>
      <button
        class="filter-pill"
        class:active={filterPeriod === 'range'}
        on:click={() => (filterPeriod = 'range')}
      >
        <i class="fa-solid fa-arrows-left-right"></i>
        <span>Rentang Tanggal</span>
      </button>
    </div>

    <!-- Active Filter Controls Row -->
    {#if filterPeriod !== 'all'}
      <div class="filter-controls-row">
        {#if filterPeriod === 'month'}
          <div class="control-group">
            <label for="month-sel"><i class="fa-regular fa-calendar"></i> Pilih Bulan:</label>
            <select id="month-sel" bind:value={selectedMonth} class="filter-input-select">
              {#each monthOptions as m}
                <option value={m.val}>{m.label}</option>
              {/each}
            </select>
          </div>

          <div class="control-group">
            <label for="year-sel"><i class="fa-solid fa-calendar-days"></i> Pilih Tahun:</label>
            <select id="year-sel" bind:value={selectedYear} class="filter-input-select">
              <option value="all">Semua Tahun</option>
              {#each availableYears.filter(y => y !== 'all') as yr}
                <option value={yr}>{yr}</option>
              {/each}
            </select>
          </div>
        {:else if filterPeriod === 'date'}
          <div class="control-group">
            <label for="date-sel"><i class="fa-regular fa-calendar-check"></i> Pilih Tanggal:</label>
            <input id="date-sel" type="date" bind:value={specificDate} class="filter-date-input" />
          </div>
        {:else if filterPeriod === 'range'}
          <div class="control-group">
            <label for="start-date-sel">Dari Tanggal:</label>
            <input id="start-date-sel" type="date" bind:value={startDate} class="filter-date-input" />
          </div>
          <div class="control-group">
            <label for="end-date-sel">Sampai Tanggal:</label>
            <input id="end-date-sel" type="date" bind:value={endDate} class="filter-date-input" />
          </div>
        {/if}

        <button class="btn btn-outline reset-filter-btn" on:click={resetDateFilter} title="Kembali ke semua waktu">
          <i class="fa-solid fa-rotate-left"></i>
          <span>Reset Filter</span>
        </button>
      </div>
    {/if}

    <!-- Filtered Summary Indicator Strip -->
    <div class="filter-summary-strip">
      <div class="strip-left">
        <span class="active-badge">
          <i class="fa-solid fa-filter text-primary"></i>
          {#if filterPeriod === 'all'}
            Menampilkan Seluruh Riwayat ({periodStats.count} transaksi)
          {:else if filterPeriod === 'month'}
            Bulan: {monthOptions.find(m => m.val === selectedMonth)?.label || selectedMonth} {selectedYear !== 'all' ? selectedYear : ''} ({periodStats.count} transaksi)
          {:else if filterPeriod === 'date'}
            Tanggal: {specificDate || 'Pilih tanggal'} ({periodStats.count} transaksi)
          {:else if filterPeriod === 'range'}
            Periode: {startDate || 'Awal'} s/d {endDate || 'Sekarang'} ({periodStats.count} transaksi)
          {/if}
        </span>
      </div>

      <div class="strip-right">
        <span class="summary-tag text-emerald">
          +{$isPrivacyMode ? '••••' : formatCurrency(periodStats.income, $currency)}
        </span>
        <span class="summary-tag text-rose">
          -{$isPrivacyMode ? '••••' : formatCurrency(periodStats.expense, $currency)}
        </span>
        <span class="summary-tag net-tag {periodNet >= 0 ? 'text-emerald' : 'text-rose'}">
          Saldo: {periodNet >= 0 ? '+' : ''}{$isPrivacyMode ? '••••' : formatCurrency(periodNet, $currency)}
        </span>
      </div>
    </div>
  </div>

  {#if groupedByDate.length === 0}
    <div class="empty-notice">
      <i class="fa-solid fa-inbox"></i>
      <p>Belum ada data perincian harian.</p>
    </div>
  {:else}
    <div class="date-groups-list">
      {#each groupedByDate as group}
        <div class="date-group-card">
          <!-- Date Header with Sub-totals -->
          <div class="date-header-row">
            <div class="date-badge-box">
              <i class="fa-regular fa-calendar text-primary"></i>
              <span class="date-text">{formatDateLabel(group.date)}</span>
              <span class="tx-count">({group.transactions.length} transaksi)</span>
            </div>

            <div class="date-subtotals">
              {#if group.totalIncome > 0}
                <span class="sub-inc text-emerald">
                  +{$isPrivacyMode ? '••••' : formatCurrency(group.totalIncome, $currency)}
                </span>
              {/if}
              {#if group.totalExpense > 0}
                <span class="sub-exp text-rose">
                  -{$isPrivacyMode ? '••••' : formatCurrency(group.totalExpense, $currency)}
                </span>
              {/if}
            </div>
          </div>

          <!-- Transactions in this day -->
          <div class="group-tx-items">
            {#each group.transactions as tx}
              <div class="daily-item">
                <div class="item-left">
                  <div class="type-indicator {tx.type}">
                    <i class={tx.type === 'income' ? 'fa-solid fa-arrow-down-left' : 'fa-solid fa-arrow-up-right'}></i>
                  </div>
                  <div class="item-info">
                    <div class="item-title-row">
                      <span class="title">{tx.description}</span>
                      <span class="cat-tag">{tx.category}</span>
                    </div>
                    <div class="item-sub-row">
                      <span class="time-tag">
                        <i class="fa-regular fa-clock"></i> {tx.time || '10:00'} WIB
                      </span>
                      <span class="meta-dot">•</span>
                      <span class="method-tag">
                        <i class="fa-solid fa-wallet"></i> {tx.payment_method || tx.method || 'QRIS'}
                      </span>
                      {#if tx.notes}
                        <span class="meta-dot">•</span>
                        <span class="notes-txt">{tx.notes}</span>
                      {/if}
                    </div>
                  </div>
                </div>

                <div class="item-right">
                  <span class="daily-amount {tx.type === 'income' ? 'text-emerald' : 'text-rose'}">
                    {$isPrivacyMode ? '••••' : (tx.type === 'income' ? '+' : '-') + formatCurrency(tx.amount, $currency)}
                  </span>
                  <div class="item-actions">
                    <button
                      class="edit-btn"
                      title="Edit Transaksi"
                      on:click={() => onEditTransaction(tx)}
                    >
                      <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      class="del-btn"
                      title="Hapus Transaksi"
                      on:click={() => handleDelete(tx.id, tx.description)}
                    >
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .breakdown-wrapper {
    padding: 28px;
    margin-bottom: 28px;
  }

  .breakdown-header {
    margin-bottom: 24px;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .title-row i {
    font-size: 1.2rem;
  }

  .title-row h3 {
    font-size: 1.2rem;
    font-weight: 700;
  }

  .subtitle {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 4px;
  }

  .date-groups-list {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .date-group-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .date-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 18px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    flex-wrap: wrap;
    gap: 10px;
  }

  .date-badge-box {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 0.88rem;
  }

  .tx-count {
    font-size: 0.72rem;
    color: var(--text-dim);
    font-weight: 500;
  }

  .date-subtotals {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.82rem;
    font-weight: 700;
  }

  .group-tx-items {
    display: flex;
    flex-direction: column;
  }

  .daily-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    transition: background 0.15s ease;
  }

  .daily-item:last-child {
    border-bottom: none;
  }

  .daily-item:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .item-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .type-indicator {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
  }

  .type-indicator.income {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }

  .type-indicator.expense {
    background: rgba(244, 63, 94, 0.15);
    color: #fb7185;
  }

  .item-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .item-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .cat-tag {
    font-size: 0.68rem;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-muted);
  }

  .item-sub-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.72rem;
    color: var(--text-dim);
  }

  .time-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #38bdf8;
    font-weight: 600;
  }

  .method-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #a5b4fc;
  }

  .item-right {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .daily-amount {
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: -0.3px;
  }

  .item-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .edit-btn {
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 0.82rem;
    transition: color 0.15s ease;
  }

  .edit-btn:hover {
    color: #6366f1;
  }

  .del-btn {
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 0.82rem;
    transition: color 0.15s ease;
  }

  .del-btn:hover {
    color: #f43f5e;
  }

  .empty-notice {
    text-align: center;
    padding: 40px;
    color: var(--text-dim);
  }

  .empty-notice i {
    font-size: 2rem;
    margin-bottom: 8px;
  }

  /* Date / Month / Year Filter Panel */
  .date-filter-panel {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    padding: 16px 18px;
    margin-bottom: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .filter-mode-pills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .filter-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border-glass);
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-muted);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-pill:hover {
    color: var(--text-main);
    background: rgba(255, 255, 255, 0.08);
  }

  .filter-pill.active {
    background: var(--primary);
    color: #ffffff;
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .filter-controls-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-glass);
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .filter-input-select,
  .filter-date-input {
    padding: 6px 12px;
    background: var(--input-bg);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    color: var(--text-main);
    font-size: 0.82rem;
    outline: none;
    cursor: pointer;
    font-family: inherit;
  }

  .filter-input-select option {
    background: var(--bg-surface);
    color: var(--text-main);
  }

  .reset-filter-btn {
    font-size: 0.78rem;
    padding: 6px 12px;
    margin-left: auto;
    border-color: var(--border-color);
  }

  .reset-filter-btn:hover {
    color: #f59e0b;
    border-color: rgba(245, 158, 11, 0.4);
  }

  .filter-summary-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.8rem;
  }

  .active-badge {
    color: var(--text-muted);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .strip-right {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 700;
  }

  .summary-tag {
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.03);
    font-size: 0.78rem;
  }

  .net-tag {
    background: rgba(99, 102, 241, 0.1);
  }

  @media (max-width: 640px) {
    .filter-period-pills {
      flex-wrap: nowrap;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 6px;
      scrollbar-width: none;
    }
    .filter-period-pills::-webkit-scrollbar {
      display: none;
    }
    .filter-pill {
      flex-shrink: 0;
      min-height: 42px;
      padding: 8px 16px;
      font-size: 0.85rem;
      touch-action: manipulation;
    }
    .filter-controls-row {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
    .control-group {
      flex-direction: column;
      align-items: stretch;
      gap: 6px;
    }
    .filter-input-select,
    .filter-date-input {
      min-height: 44px;
      font-size: 0.9rem;
    }
    .reset-filter-btn {
      margin-left: 0;
      width: 100%;
      height: 44px;
      justify-content: center;
      font-size: 0.88rem;
    }
    .filter-summary-strip {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    .strip-right {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
