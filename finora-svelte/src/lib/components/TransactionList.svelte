<script>
  import {
    transactions,
    searchQuery,
    filterType,
    filterCategory,
    currency,
    formatCurrency,
    isPrivacyMode,
    requestConfirm
  } from '../stores.js';
  import { emitDeleteTransaction, emitResetTransactions } from '../socket.js';

  export let onEditTransaction = () => {};

  let sortBy = 'date_desc'; // date_desc, date_asc, amount_desc, amount_asc
  let filterMonth = 'all';
  let filterYear = 'all';
  let filterDate = '';

  const months = [
    { val: 'all', label: 'Bulan (Semua)' },
    { val: '01', label: 'Januari' },
    { val: '02', label: 'Februari' },
    { val: '03', label: 'Maret' },
    { val: '04', label: 'April' },
    { val: '05', label: 'Mei' },
    { val: '06', label: 'Juni' },
    { val: '07', label: 'Juli' },
    { val: '08', label: 'Agustus' },
    { val: '09', label: 'September' },
    { val: '10', label: 'Oktober' },
    { val: '11', label: 'November' },
    { val: '12', label: 'Desember' }
  ];

  $: availableYears = [
    'all',
    ...Array.from(
      new Set($transactions.map((t) => (t.date ? t.date.split('-')[0] : '')).filter(Boolean))
    ).sort((a, b) => b.localeCompare(a))
  ];

  // Category Icon & Color Mapping
  const categoryMeta = {
    'Makanan & Minuman': { icon: 'fa-utensils', color: '#f97316' },
    'Transportasi': { icon: 'fa-car', color: '#06b6d4' },
    'Belanja': { icon: 'fa-bag-shopping', color: '#ec4899' },
    'Hiburan': { icon: 'fa-gamepad', color: '#8b5cf6' },
    'Tagihan & Utilitas': { icon: 'fa-receipt', color: '#ef4444' },
    'Kesehatan': { icon: 'fa-heart-pulse', color: '#10b981' },
    'Pendidikan': { icon: 'fa-graduation-cap', color: '#3b82f6' },
    'Gaji': { icon: 'fa-money-bill-wave', color: '#10b981' },
    'Investasi': { icon: 'fa-chart-line', color: '#06b6d4' },
    'Freelance & Bisnis': { icon: 'fa-laptop-code', color: '#6366f1' },
    'Bonus & Hadiah': { icon: 'fa-gift', color: '#f59e0b' },
    'Pelunasan Piutang': { icon: 'fa-handshake-angle', color: '#10b981' },
    'Pembayaran Hutang': { icon: 'fa-handshake', color: '#0ea5e9' },
    'Transfer Saldo': { icon: 'fa-arrow-right-arrow-left', color: '#8b5cf6' }
  };

  function getMeta(cat) {
    return categoryMeta[cat] || { icon: 'fa-circle-dollar-to-slot', color: '#94a3b8' };
  }

  // Filter and sort transactions
  $: filteredTransactions = $transactions
    .filter((tx) => {
      // Type Filter
      if ($filterType !== 'all' && tx.type !== $filterType) return false;
      // Category Filter
      if ($filterCategory !== 'all' && tx.category !== $filterCategory) return false;
      // Specific Date Filter
      if (filterDate && tx.date !== filterDate) return false;
      // Month & Year Filter
      if (tx.date) {
        const [y, m] = tx.date.split('-');
        if (filterYear !== 'all' && y !== filterYear) return false;
        if (filterMonth !== 'all' && m !== filterMonth) return false;
      }
      // Search Query
      if ($searchQuery.trim()) {
        const query = $searchQuery.toLowerCase();
        const matchesDesc = tx.description?.toLowerCase().includes(query);
        const matchesCat = tx.category?.toLowerCase().includes(query);
        const matchesNote = tx.notes?.toLowerCase().includes(query);
        if (!matchesDesc && !matchesCat && !matchesNote) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'date_asc') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'amount_desc') return Number(b.amount) - Number(a.amount);
      if (sortBy === 'amount_asc') return Number(a.amount) - Number(b.amount);
      return 0;
    });

  // Unique categories list for filter dropdown
  $: allCategories = Array.from(new Set($transactions.map((t) => t.category)));

  function handleDelete(id, desc) {
    requestConfirm({
      title: 'Hapus Transaksi',
      message: `Apakah Anda yakin ingin menghapus transaksi "${desc}"? Tindakan ini akan disinkronkan ke seluruh perangkat secara real-time.`,
      confirmText: 'Ya, Hapus',
      confirmStyle: 'danger',
      icon: 'fa-trash-can',
      onConfirm: async () => {
        await emitDeleteTransaction(id);
      }
    });
  }

  function handleResetAll() {
    requestConfirm({
      title: 'Atur Ulang Seluruh Transaksi',
      message: 'Kembalikan seluruh transaksi ke set data contoh awal? Seluruh perubahan Anda saat ini akan direset.',
      confirmText: 'Atur Ulang',
      confirmStyle: 'warning',
      icon: 'fa-rotate-left',
      onConfirm: async () => {
        await emitResetTransactions();
      }
    });
  }

  function exportCSV() {
    if ($transactions.length === 0) {
      alert('Tidak ada transaksi untuk diekspor!');
      return;
    }

    const headers = ['ID', 'Tanggal', 'Waktu', 'Tipe', 'Kategori', 'Metode', 'Deskripsi', 'Nominal', 'Catatan'];
    const rows = $transactions.map((t) => [
      t.id,
      t.date,
      t.time || '10:00',
      t.type,
      `"${t.category}"`,
      `"${t.payment_method || t.method || 'QRIS'}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Finora_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
</script>

<div class="glass-panel tx-container">
  <!-- Controls Header -->
  <div class="tx-header">
    <div class="tx-title-section">
      <div class="tx-title">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <h3>Riwayat Transaksi</h3>
        <span class="count-badge">{filteredTransactions.length}</span>
      </div>
      <p class="tx-subtitle">Kelola dan pantau seluruh pemasukan & pengeluaran Anda</p>
    </div>

    <!-- Header Actions (Reset & Export) -->
    <div class="header-actions">
      <button class="btn btn-outline reset-btn" on:click={handleResetAll} title="Atur ulang seluruh transaksi ke data awal tanpa utak-atik kode">
        <i class="fa-solid fa-rotate-left"></i>
        <span>Atur Ulang</span>
      </button>
      <button class="btn btn-outline export-btn" on:click={exportCSV} title="Ekspor ke format file CSV">
        <i class="fa-solid fa-file-arrow-down"></i>
        <span>Ekspor CSV</span>
      </button>
    </div>
  </div>

  <!-- Filter & Search Bar -->
  <div class="filter-bar">
    <!-- Search Box -->
    <div class="search-box">
      <i class="fa-solid fa-magnifying-glass search-icon"></i>
      <input
        type="text"
        bind:value={$searchQuery}
        placeholder="Cari transaksi, kategori, atau catatan..."
        class="input-custom search-input"
      />
      {#if $searchQuery}
        <button class="clear-search" on:click={() => ($searchQuery = '')}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      {/if}
    </div>

    <!-- Type Pills -->
    <div class="type-pills">
      <button
        class="pill"
        class:active={$filterType === 'all'}
        on:click={() => ($filterType = 'all')}
      >
        Semua
      </button>
      <button
        class="pill"
        class:active={$filterType === 'expense'}
        on:click={() => ($filterType = 'expense')}
      >
        Pengeluaran
      </button>
      <button
        class="pill"
        class:active={$filterType === 'income'}
        on:click={() => ($filterType = 'income')}
      >
        Pemasukan
      </button>
    </div>

    <!-- Category Dropdown -->
    <select bind:value={$filterCategory} class="filter-select">
      <option value="all">Semua Kategori</option>
      {#each allCategories as cat}
        <option value={cat}>{cat}</option>
      {/each}
    </select>

    <!-- Month Filter -->
    <select bind:value={filterMonth} class="filter-select" title="Filter Bulan">
      {#each months as m}
        <option value={m.val}>{m.label}</option>
      {/each}
    </select>

    <!-- Year Filter -->
    <select bind:value={filterYear} class="filter-select" title="Filter Tahun">
      <option value="all">Tahun (Semua)</option>
      {#each availableYears.filter((y) => y !== 'all') as yr}
        <option value={yr}>{yr}</option>
      {/each}
    </select>

    <!-- Specific Date Input -->
    <input
      type="date"
      bind:value={filterDate}
      class="filter-select date-input-field"
      title="Filter Tanggal Tertentu"
    />

    {#if filterDate || filterMonth !== 'all' || filterYear !== 'all'}
      <button
        class="clear-date-pill"
        title="Reset Filter Tanggal / Bulan"
        on:click={() => { filterDate = ''; filterMonth = 'all'; filterYear = 'all'; }}
      >
        <i class="fa-solid fa-xmark"></i>
        <span>Reset Tanggal</span>
      </button>
    {/if}

    <!-- Sort Dropdown -->
    <select bind:value={sortBy} class="filter-select">
      <option value="date_desc">Terbaru</option>
      <option value="date_asc">Terlama</option>
      <option value="amount_desc">Nominal Terbesar</option>
      <option value="amount_asc">Nominal Terkecil</option>
    </select>
  </div>

  <!-- Transaction List -->
  {#if filteredTransactions.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <i class="fa-solid fa-inbox"></i>
      </div>
      <h4>Tidak ada transaksi ditemukan</h4>
      <p>Coba sesuaikan kata kunci pencarian atau filter yang dipilih.</p>
    </div>
  {:else}
    <div class="tx-list">
      {#each filteredTransactions as tx (tx.id)}
        {@const meta = getMeta(tx.category)}
        <div class="tx-item">
          <!-- Left: Category Icon -->
          <div class="cat-icon-box" style="background-color: {meta.color}20; color: {meta.color}; border-color: {meta.color}40;">
            <i class="fa-solid {meta.icon}"></i>
          </div>

          <!-- Mid: Title, Category, Date -->
          <div class="tx-details">
            <div class="tx-desc-row">
              <span class="tx-desc">{tx.description}</span>
              <span class="badge {tx.type === 'income' ? 'badge-income' : 'badge-expense'}">
                {tx.type === 'income' ? 'Masuk' : 'Keluar'}
              </span>
            </div>
            <div class="tx-meta-row">
              <span class="tx-cat">{tx.category}</span>
              <span class="meta-dot">•</span>
              <span class="tx-date"><i class="fa-regular fa-calendar"></i> {tx.date}</span>
              <span class="meta-dot">•</span>
              <span class="tx-time"><i class="fa-regular fa-clock"></i> {tx.time || '10:00'} WIB</span>
              <span class="meta-dot">•</span>
              <span class="tx-method"><i class="fa-solid fa-wallet"></i> {tx.payment_method || tx.method || 'QRIS'}</span>
              {#if tx.notes}
                <span class="meta-dot">•</span>
                <span class="tx-notes"><i class="fa-solid fa-note-sticky"></i> {tx.notes}</span>
              {/if}
            </div>
          </div>

          <!-- Right: Amount & Actions -->
          <div class="tx-right">
            <div class="tx-amount {tx.type === 'income' ? 'text-emerald' : 'text-rose'}">
              {#if $isPrivacyMode}
                ••••••
              {:else}
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, $currency)}
              {/if}
            </div>
            <div class="tx-item-actions">
              <button
                class="btn-icon edit-btn"
                title="Edit Transaksi (Tanpa utak-atik kode)"
                on:click={() => onEditTransaction(tx)}
              >
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button
                class="btn-icon delete-btn"
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
  {/if}
</div>

<style>
  .tx-container {
    padding: 28px;
    margin-bottom: 28px;
  }

  .tx-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .tx-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .tx-title i {
    color: var(--primary);
    font-size: 1.2rem;
  }

  .tx-title h3 {
    font-size: 1.2rem;
    font-weight: 700;
  }

  .count-badge {
    background: rgba(99, 102, 241, 0.2);
    color: #a5b4fc;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }

  .tx-subtitle {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 4px;
  }

  .filter-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .search-box {
    position: relative;
    flex: 1;
    min-width: 240px;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    color: var(--text-dim);
    font-size: 0.85rem;
  }

  .search-input {
    padding-left: 38px;
    padding-right: 34px;
    font-size: 0.85rem;
  }

  .clear-search {
    position: absolute;
    right: 12px;
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
  }

  .type-pills {
    display: flex;
    background: rgba(255, 255, 255, 0.04);
    padding: 4px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-glass);
    gap: 4px;
  }

  .pill {
    padding: 6px 12px;
    border: none;
    background: transparent;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pill.active {
    background: var(--primary);
    color: #ffffff;
    box-shadow: 0 2px 8px var(--primary-glow);
  }

  .filter-select {
    padding: 9px 12px;
    background: var(--input-bg);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    color: var(--text-main);
    font-size: 0.82rem;
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }

  .filter-select option {
    background: var(--bg-surface);
    color: var(--text-main);
  }

  .date-input-field {
    font-family: inherit;
  }

  .clear-date-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 10px;
    border-radius: var(--radius-full);
    border: 1px solid rgba(244, 63, 94, 0.3);
    background: rgba(244, 63, 94, 0.1);
    color: #f43f5e;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .clear-date-pill:hover {
    background: rgba(244, 63, 94, 0.2);
  }

  /* Transactions list */
  .tx-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .tx-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 18px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
  }

  .tx-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .cat-icon-box {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    border: 1px solid transparent;
    flex-shrink: 0;
  }

  .tx-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .tx-desc-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tx-desc {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .tx-meta-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: var(--text-muted);
    flex-wrap: wrap;
  }

  .tx-cat {
    color: var(--text-muted);
  }

  .meta-dot {
    color: var(--text-dim);
  }

  .tx-notes {
    color: var(--text-dim);
    font-style: italic;
  }

  .tx-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .tx-amount {
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.3px;
    white-space: nowrap;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .reset-btn {
    border-color: var(--border-color);
    color: var(--text-muted);
    font-weight: 500;
  }

  .reset-btn:hover {
    color: #f59e0b;
    border-color: rgba(245, 158, 11, 0.5);
    background: rgba(245, 158, 11, 0.08);
  }

  .tx-item-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .edit-btn {
    opacity: 0.4;
    transition: opacity 0.2s ease, color 0.2s ease, background 0.2s ease;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  .tx-item:hover .edit-btn {
    opacity: 1;
  }

  .edit-btn:hover {
    color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }

  .delete-btn {
    opacity: 0.4;
    transition: opacity 0.2s ease, color 0.2s ease, background 0.2s ease;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  .tx-item:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    color: #f43f5e;
    background: rgba(244, 63, 94, 0.1);
  }

  .empty-state {
    padding: 60px 20px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .empty-icon {
    font-size: 2.5rem;
    color: var(--text-dim);
  }

  .empty-state h4 {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .empty-state p {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  @media (max-width: 640px) {
    .tx-container {
      padding: 18px 12px;
      margin-bottom: 20px;
    }
    .tx-header {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
    .header-actions {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .reset-btn,
    .export-btn {
      width: 100%;
      justify-content: center;
    }
    .filter-bar {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }
    .search-box {
      min-width: 100%;
    }
    .type-pills {
      width: 100%;
    }
    .type-pills .pill {
      flex: 1;
      text-align: center;
    }
    .filter-select {
      width: 100%;
    }
    .tx-item {
      padding: 12px 10px;
      gap: 10px;
    }
    .cat-icon-box {
      width: 36px;
      height: 36px;
      font-size: 0.95rem;
    }
    .tx-desc {
      font-size: 0.88rem;
    }
    .tx-amount {
      font-size: 0.92rem;
    }
    .tx-right {
      gap: 8px;
    }
    .edit-btn,
    .delete-btn {
      opacity: 0.9;
      width: 36px;
      height: 36px;
      font-size: 0.95rem;
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.05);
      touch-action: manipulation;
    }
  }
</style>
