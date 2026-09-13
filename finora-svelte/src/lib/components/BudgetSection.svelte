<script>
  import { budgets, transactions, currency, formatCurrency, isPrivacyMode, requestConfirm } from '../stores.js';
  import { emitUpdateBudget, emitDeleteBudget } from '../socket.js';

  let isEditing = false;
  let editCategory = '';
  let editLimit = '';
  let isNewCategory = false;
  let isCustomCategory = false;
  let customCategoryName = '';
  let formError = '';

  // Period Filter: 'current' (Bulan Ini) vs 'all' (Semua Waktu)
  let selectedPeriod = 'current';

  // Current Month 'YYYY-MM'
  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const standardCategories = [
    'Makanan & Minuman',
    'Transportasi',
    'Belanja',
    'Hiburan',
    'Tagihan & Utilitas',
    'Kesehatan',
    'Pendidikan',
    'Investasi',
    'Lainnya'
  ];

  // Transactions filtered by selected period
  $: activeExpenses = $transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    if (selectedPeriod === 'current') {
      return t.date ? t.date.startsWith(currentMonthYear) : true;
    }
    return true;
  });

  // Calculate spent per budget category
  $: budgetCards = $budgets.map((b) => {
    const bCatClean = (b.category || '').trim().toLowerCase();
    const spent = activeExpenses
      .filter((t) => (t.category || '').trim().toLowerCase() === bCatClean)
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const limit = Number(b.monthly_limit) || 1;
    const percentage = Math.round((spent / limit) * 100);
    const remaining = limit - spent;

    let status = 'safe'; // safe, warning, danger
    if (percentage >= 100) status = 'danger';
    else if (percentage >= 75) status = 'warning';

    return {
      ...b,
      spent,
      limit,
      percentage,
      remaining,
      status,
      isExceeded: spent > limit
    };
  });

  // Overall Budget Metrics
  $: totalAllocated = $budgets.reduce((acc, b) => acc + (Number(b.monthly_limit) || 0), 0);
  $: totalBudgetedSpent = budgetCards.reduce((acc, b) => acc + b.spent, 0);
  $: totalRemainingBudget = totalAllocated - totalBudgetedSpent;
  $: overallUtilization = totalAllocated > 0 ? Math.round((totalBudgetedSpent / totalAllocated) * 100) : 0;

  // Detect unbudgeted expense categories
  $: unbudgetedCategories = (() => {
    const existingCats = new Set($budgets.map((b) => (b.category || '').trim().toLowerCase()));
    const unbudgetedMap = {};

    activeExpenses.forEach((t) => {
      const cat = (t.category || 'Lainnya').trim();
      if (!existingCats.has(cat.toLowerCase())) {
        unbudgetedMap[cat] = (unbudgetedMap[cat] || 0) + (Number(t.amount) || 0);
      }
    });

    return Object.entries(unbudgetedMap).map(([category, spent]) => ({ category, spent }));
  })();

  function openEditModal(cat = '', limit = 1500000) {
    formError = '';
    if (cat) {
      isNewCategory = false;
      isCustomCategory = false;
      editCategory = cat;
      customCategoryName = '';
      editLimit = String(limit);
    } else {
      isNewCategory = true;
      isCustomCategory = false;
      editCategory = standardCategories[0];
      customCategoryName = '';
      editLimit = String(limit);
    }
    isEditing = true;
  }

  function handleCategorySelect(e) {
    const val = e.target.value;
    if (val === '__custom__') {
      isCustomCategory = true;
      editCategory = customCategoryName || '';
    } else {
      isCustomCategory = false;
      editCategory = val;
    }
  }

  async function handleSaveBudget() {
    formError = '';
    const finalCategory = isCustomCategory ? customCategoryName.trim() : editCategory.trim();
    const finalLimit = Number(editLimit);

    if (!finalCategory) {
      formError = 'Pilih atau masukkan nama kategori!';
      return;
    }

    if (!finalLimit || finalLimit <= 0) {
      formError = 'Masukkan batas anggaran yang valid (minimal Rp 10.000)!';
      return;
    }

    await emitUpdateBudget(finalCategory, finalLimit);
    isEditing = false;
  }

  function handleDeleteBudget(cat) {
    requestConfirm({
      title: 'Hapus Alokasi Anggaran',
      message: `Apakah Anda yakin ingin menghapus alokasi anggaran untuk kategori "${cat}"?`,
      confirmText: 'Ya, Hapus',
      confirmStyle: 'danger',
      icon: 'fa-trash-can',
      onConfirm: async () => {
        await emitDeleteBudget(cat);
        if (isEditing && editCategory === cat) isEditing = false;
      }
    });
  }
</script>

<div class="glass-panel budget-wrapper">
  <!-- Header with Period Controls -->
  <div class="budget-header">
    <div class="header-text">
      <div class="title-row">
        <div class="icon-badge">
          <i class="fa-solid fa-wallet"></i>
        </div>
        <div>
          <h3>Alokasi & Batas Anggaran Bulanan</h3>
          <p class="subtitle">Kendalikan pengeluaran agar sesuai pos keuangan target Anda</p>
        </div>
      </div>
    </div>

    <div class="budget-header-actions">
      <!-- Period Selector Toggle -->
      <div class="period-toggle" role="group" aria-label="Periode Anggaran">
        <button
          type="button"
          class="period-btn"
          class:active={selectedPeriod === 'current'}
          on:click={() => (selectedPeriod = 'current')}
        >
          <i class="fa-regular fa-calendar-check"></i>
          <span>Bulan Ini ({currentMonthLabel})</span>
        </button>
        <button
          type="button"
          class="period-btn"
          class:active={selectedPeriod === 'all'}
          on:click={() => (selectedPeriod = 'all')}
        >
          <i class="fa-solid fa-infinity"></i>
          <span>Semua Waktu</span>
        </button>
      </div>

      <button
        class="btn btn-primary add-btn"
        on:click={() => openEditModal('', 1500000)}
        title="Tambah batas alokasi untuk kategori baru"
      >
        <i class="fa-solid fa-plus"></i>
        <span>Tambah Alokasi</span>
      </button>
    </div>
  </div>

  <!-- Overall Budget Analytics Banner -->
  <div class="overview-banner">
    <div class="metric-block">
      <span class="m-label"><i class="fa-solid fa-vault"></i> Total Anggaran</span>
      <span class="m-value text-indigo">
        {$isPrivacyMode ? '••••••••' : formatCurrency(totalAllocated, $currency)}
      </span>
      <span class="m-sub">{$budgets.length} pos kategori dialokasikan</span>
    </div>

    <div class="metric-block">
      <span class="m-label"><i class="fa-solid fa-arrow-trend-down"></i> Terpakai ({selectedPeriod === 'current' ? 'Bulan Ini' : 'Total'})</span>
      <span class="m-value text-rose">
        {$isPrivacyMode ? '••••••••' : formatCurrency(totalBudgetedSpent, $currency)}
      </span>
      <span class="m-sub">{overallUtilization}% dari total plafon</span>
    </div>

    <div class="metric-block">
      <span class="m-label"><i class="fa-solid fa-shield-halved"></i> Sisa Anggaran Bebas</span>
      <span class="m-value {totalRemainingBudget < 0 ? 'text-rose' : 'text-emerald'}">
        {$isPrivacyMode ? '••••••••' : formatCurrency(totalRemainingBudget, $currency)}
      </span>
      <span class="m-sub">
        {totalRemainingBudget < 0 ? 'Defisit anggaran terlewati!' : 'Kondisi finansial aman'}
      </span>
    </div>

    <div class="metric-gauge-block">
      <div class="gauge-header">
        <span>Penggunaan Plafon Anggaran</span>
        <span class="gauge-pct">{overallUtilization}%</span>
      </div>
      <div class="gauge-track">
        <div
          class="gauge-fill"
          style="width: {Math.min(100, overallUtilization)}%; background: {overallUtilization >= 100 ? 'linear-gradient(90deg, #f59e0b, #f43f5e)' : overallUtilization >= 75 ? 'linear-gradient(90deg, #6366f1, #f59e0b)' : 'linear-gradient(90deg, #10b981, #06b6d4)'};"
        ></div>
      </div>
    </div>
  </div>

  <!-- Unbudgeted Expense Alert / Quick Recommendation -->
  {#if unbudgetedCategories.length > 0}
    <div class="unbudgeted-alert-box">
      <div class="alert-icon">
        <i class="fa-solid fa-lightbulb"></i>
      </div>
      <div class="alert-body">
        <div class="alert-title">Rekomendasi Alokasi Anggaran</div>
        <p class="alert-desc">
          Terdapat pengeluaran pada kategori yang belum memiliki alokasi anggaran:
          {#each unbudgetedCategories as u, idx}
            <strong>{u.category}</strong> ({formatCurrency(u.spent, $currency)}){idx < unbudgetedCategories.length - 1 ? ', ' : ''}
          {/each}.
        </p>
      </div>
      <div class="alert-actions">
        {#each unbudgetedCategories.slice(0, 2) as u}
          <button
            type="button"
            class="btn btn-outline quick-add-budget-btn"
            on:click={() => openEditModal(u.category, Math.ceil((u.spent * 1.3) / 50000) * 50000 || 500000)}
          >
            <i class="fa-solid fa-plus"></i> Alokasikan {u.category}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Budget Cards Grid -->
  {#if budgetCards.length === 0}
    <div class="empty-budget-state">
      <div class="empty-icon">
        <i class="fa-solid fa-wallet"></i>
      </div>
      <h4>Belum Ada Batas Anggaran</h4>
      <p>Mulai atur alokasi bulanan untuk mengendalikan pengeluaran harian dan gaya hidup Anda.</p>
      <button class="btn btn-primary" on:click={() => openEditModal('', 1500000)}>
        <i class="fa-solid fa-plus"></i> Buat Alokasi Pertama
      </button>
    </div>
  {:else}
    <div class="budget-grid">
      {#each budgetCards as item}
        <div class="budget-card" class:exceeded={item.isExceeded}>
          <div class="card-top">
            <div class="cat-title">
              <h4>{item.category}</h4>
              {#if item.status === 'danger'}
                <span class="status-tag tag-danger">
                  <i class="fa-solid fa-triangle-exclamation"></i> Melebihi Batas
                </span>
              {:else if item.status === 'warning'}
                <span class="status-tag tag-warning">
                  <i class="fa-solid fa-bell"></i> Waspada (≥75%)
                </span>
              {:else}
                <span class="status-tag tag-safe">
                  <i class="fa-solid fa-check"></i> Terkendali
                </span>
              {/if}
            </div>
            <div class="card-actions">
              <button
                class="icon-action-btn"
                title="Edit Batas Anggaran"
                on:click={() => openEditModal(item.category, item.limit)}
              >
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button
                class="icon-action-btn delete-btn"
                title="Hapus Anggaran Kategori Ini"
                on:click={() => handleDeleteBudget(item.category)}
              >
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>

          <div class="amounts-row">
            <div class="amount-col">
              <span class="lbl">Terpakai:</span>
              <span class="amt {item.isExceeded ? 'text-rose' : 'text-main'}">
                {$isPrivacyMode ? '••••' : formatCurrency(item.spent, $currency)}
              </span>
            </div>
            <div class="amount-col text-right">
              <span class="lbl">Plafon:</span>
              <span class="amt limit-amt">
                {$isPrivacyMode ? '••••' : formatCurrency(item.limit, $currency)}
              </span>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="progress-track budget-track">
            <div
              class="progress-fill"
              style="width: {Math.min(100, item.percentage)}%; background: {item.status === 'danger' ? '#f43f5e' : item.status === 'warning' ? '#f59e0b' : '#10b981'};"
            ></div>
          </div>

          <div class="card-bottom">
            <span class="percent-label">{item.percentage}% dari alokasi</span>
            <span class="remaining-label">
              {#if item.isExceeded}
                Defisit {$isPrivacyMode ? '••••' : formatCurrency(Math.abs(item.remaining), $currency)}
              {:else}
                Sisa {$isPrivacyMode ? '••••' : formatCurrency(item.remaining, $currency)}
              {/if}
            </span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Modal Edit / Tambah Budget -->
{#if isEditing}
  <div class="modal-backdrop" on:click={() => (isEditing = false)} role="dialog" aria-modal="true">
    <div class="glass-panel modal-card" on:click|stopPropagation role="document">
      <div class="modal-header">
        <div class="modal-title-wrap">
          <i class="fa-solid fa-wallet text-indigo"></i>
          <h3>{isNewCategory ? 'Tambah Alokasi Anggaran' : `Atur Batas Anggaran: ${editCategory}`}</h3>
        </div>
        <button class="btn-icon btn-outline" on:click={() => (isEditing = false)}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      {#if formError}
        <div class="form-error-banner">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>{formError}</span>
        </div>
      {/if}

      <form on:submit|preventDefault={handleSaveBudget} class="edit-form">
        <div class="form-group">
          <label for="budgetCategorySelect">Kategori Pengeluaran</label>
          {#if isNewCategory}
            <select
              id="budgetCategorySelect"
              class="input-custom"
              value={isCustomCategory ? '__custom__' : editCategory}
              on:change={handleCategorySelect}
            >
              <option value="" disabled>-- Pilih Kategori --</option>
              {#each standardCategories as cat}
                <option value={cat}>{cat}</option>
              {/each}
              <option value="__custom__">✨ + Kategori Kustom / Lainnya</option>
            </select>

            {#if isCustomCategory}
              <input
                type="text"
                bind:value={customCategoryName}
                required
                class="input-custom mt-2"
                placeholder="Ketik nama kategori pengeluaran..."
                autofocus
              />
            {/if}
          {:else}
            <input
              type="text"
              bind:value={editCategory}
              disabled
              class="input-custom disabled-input"
            />
          {/if}
        </div>

        <div class="form-group">
          <label for="budgetLimitInput">Batas Maksimal Bulanan ({$currency})</label>
          <input
            id="budgetLimitInput"
            type="number"
            bind:value={editLimit}
            required
            min="10000"
            step="10000"
            class="input-custom"
            placeholder="Contoh: 2500000"
          />
          {#if Number(editLimit) > 0}
            <div class="limit-preview">
              <span class="preview-label">Nominal Preview:</span>
              <span class="preview-value">{formatCurrency(Number(editLimit), $currency)}</span>
            </div>
          {/if}
        </div>

        <div class="quick-pills">
          <button type="button" class="pill-btn" on:click={() => (editLimit = '500000')}>500rb</button>
          <button type="button" class="pill-btn" on:click={() => (editLimit = '1000000')}>1 Juta</button>
          <button type="button" class="pill-btn" on:click={() => (editLimit = '2500000')}>2.5 Juta</button>
          <button type="button" class="pill-btn" on:click={() => (editLimit = '5000000')}>5 Juta</button>
          <button type="button" class="pill-btn" on:click={() => (editLimit = '10000000')}>10 Juta</button>
        </div>

        <div class="modal-actions">
          {#if !isNewCategory}
            <button
              type="button"
              class="btn btn-outline text-rose"
              style="margin-right: auto;"
              on:click={() => handleDeleteBudget(editCategory)}
            >
              <i class="fa-solid fa-trash-can"></i> Hapus
            </button>
          {/if}
          <button type="button" class="btn btn-outline" on:click={() => (isEditing = false)}>
            Batal
          </button>
          <button type="submit" class="btn btn-primary">
            <i class="fa-solid fa-floppy-disk"></i> Simpan Alokasi
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .budget-wrapper {
    padding: 28px;
    margin-bottom: 28px;
  }

  .budget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .icon-badge {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: rgba(99, 102, 241, 0.15);
    border: 1px solid rgba(99, 102, 241, 0.3);
    color: #818cf8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
  }

  .title-row h3 {
    margin: 0 0 4px 0;
    font-size: 1.35rem;
    font-weight: 800;
  }

  .subtitle {
    margin: 0;
    font-size: 0.86rem;
    color: var(--text-muted);
  }

  .budget-header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  /* Period Selector */
  .period-toggle {
    display: inline-flex;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-glass);
    border-radius: 12px;
    padding: 3px;
    gap: 4px;
  }

  .period-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.78rem;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
  }

  .period-btn.active {
    background: var(--primary);
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
  }

  /* Overview Banner */
  .overview-banner {
    display: grid;
    grid-template-columns: repeat(3, 1fr) 1.5fr;
    gap: 16px;
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid var(--border-glass);
    border-radius: 18px;
    padding: 20px;
    margin-bottom: 24px;
  }

  :global([data-theme="light"]) .overview-banner,
  :global(body.light-mode) .overview-banner {
    background: rgba(248, 250, 252, 0.8);
  }

  .metric-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .m-label {
    font-size: 0.76rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .m-value {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .text-indigo { color: #818cf8; }
  .text-rose { color: #f43f5e; }
  .text-emerald { color: #10b981; }

  .m-sub {
    font-size: 0.72rem;
    color: var(--text-dim);
  }

  .metric-gauge-block {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    padding-left: 16px;
    border-left: 1px solid var(--border-glass);
  }

  .gauge-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .gauge-pct {
    font-family: monospace;
    color: #38bdf8;
  }

  .gauge-track {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 99px;
    overflow: hidden;
  }

  .gauge-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Unbudgeted Alert Box */
  .unbudgeted-alert-box {
    display: flex;
    align-items: center;
    gap: 16px;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.08) 100%);
    border: 1px solid rgba(245, 158, 11, 0.35);
    border-radius: 14px;
    padding: 14px 18px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  .alert-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .alert-body {
    flex: 1;
    min-width: 240px;
  }

  .alert-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #fbbf24;
    margin-bottom: 2px;
  }

  .alert-desc {
    margin: 0;
    font-size: 0.78rem;
    color: var(--text-main);
    line-height: 1.4;
  }

  .alert-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .quick-add-budget-btn {
    font-size: 0.76rem;
    padding: 6px 12px;
    border-color: rgba(245, 158, 11, 0.4);
    color: #fbbf24;
  }

  .quick-add-budget-btn:hover {
    background: rgba(245, 158, 11, 0.15);
  }

  /* Empty State */
  .empty-budget-state {
    text-align: center;
    padding: 48px 24px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px dashed var(--border-glass);
    border-radius: 18px;
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 20px;
    background: rgba(99, 102, 241, 0.15);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.75rem;
    margin: 0 auto 16px;
  }

  .empty-budget-state h4 {
    margin: 0 0 8px 0;
    font-size: 1.15rem;
    font-weight: 700;
  }

  .empty-budget-state p {
    margin: 0 0 20px 0;
    color: var(--text-muted);
    font-size: 0.88rem;
    max-width: 420px;
    margin-left: auto;
    margin-right: auto;
  }

  /* Budget Cards Grid */
  .budget-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 18px;
  }

  .budget-card {
    background: var(--bg-card);
    border: 1px solid var(--border-glass);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .budget-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.4);
    border-color: rgba(99, 102, 241, 0.35);
  }

  .budget-card.exceeded {
    border-color: rgba(244, 63, 94, 0.4);
    background: linear-gradient(180deg, var(--bg-card) 0%, rgba(244, 63, 94, 0.05) 100%);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .cat-title h4 {
    margin: 0 0 6px 0;
    font-size: 1.05rem;
    font-weight: 700;
  }

  .status-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.68rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 99px;
  }

  .tag-safe {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .tag-warning {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  .tag-danger {
    background: rgba(244, 63, 94, 0.18);
    color: #fb7185;
    border: 1px solid rgba(244, 63, 94, 0.4);
  }

  .card-actions {
    display: flex;
    gap: 6px;
  }

  .icon-action-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--border-glass);
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.82rem;
    transition: all 0.2s ease;
  }

  .icon-action-btn:hover {
    color: var(--primary);
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.12);
  }

  .icon-action-btn.delete-btn:hover {
    color: #f43f5e;
    border-color: #f43f5e;
    background: rgba(244, 63, 94, 0.12);
  }

  .amounts-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .amount-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .amount-col.text-right {
    text-align: right;
  }

  .amount-col .lbl {
    font-size: 0.72rem;
    color: var(--text-dim);
  }

  .amount-col .amt {
    font-size: 1.05rem;
    font-weight: 800;
  }

  .limit-amt {
    color: var(--text-muted);
  }

  .progress-track {
    width: 100%;
    height: 7px;
    background: rgba(255, 255, 255, 0.07);
    border-radius: 99px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.35s ease;
  }

  .card-bottom {
    display: flex;
    justify-content: space-between;
    font-size: 0.74rem;
    color: var(--text-muted);
  }

  .remaining-label {
    font-weight: 700;
  }

  /* Modal Form */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(2, 6, 23, 0.75);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal-card {
    width: 100%;
    max-width: 460px;
    background: var(--bg-card);
    border: 1px solid var(--border-glass-hover);
    border-radius: 20px;
    padding: 28px;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .modal-title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .modal-title-wrap h3 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
  }

  .form-error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(244, 63, 94, 0.15);
    border: 1px solid rgba(244, 63, 94, 0.4);
    color: #fb7185;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 0.8rem;
    margin-bottom: 16px;
  }

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-muted);
  }

  .input-custom {
    width: 100%;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-glass);
    border-radius: 12px;
    color: var(--text-main);
    font-size: 0.92rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .input-custom:focus {
    border-color: var(--primary);
  }

  .disabled-input {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .mt-2 {
    margin-top: 8px;
  }

  .limit-preview {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-size: 0.76rem;
  }

  .preview-label {
    color: var(--text-dim);
  }

  .preview-value {
    color: #38bdf8;
    font-weight: 700;
  }

  .quick-pills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .pill-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-glass);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 0.74rem;
    font-weight: 600;
    color: var(--text-main);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pill-btn:hover {
    background: rgba(99, 102, 241, 0.2);
    border-color: var(--primary);
    color: #ffffff;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
  }

  @media (max-width: 900px) {
    .overview-banner {
      grid-template-columns: repeat(2, 1fr);
    }

    .metric-gauge-block {
      grid-column: span 2;
      padding-left: 0;
      border-left: none;
      padding-top: 14px;
      border-top: 1px solid var(--border-glass);
    }
  }

  @media (max-width: 640px) {
    .budget-wrapper {
      padding: 18px;
    }

    .overview-banner {
      grid-template-columns: 1fr;
    }

    .metric-gauge-block {
      grid-column: span 1;
    }

    .budget-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
