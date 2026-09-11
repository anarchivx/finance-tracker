<script>
  import { budgets, transactions, currency, formatCurrency, isPrivacyMode, requestConfirm } from '../stores.js';
  import { emitUpdateBudget, emitDeleteBudget } from '../socket.js';

  let isEditing = false;
  let editCategory = '';
  let editLimit = '';
  let isNewCategory = false;

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

  // Calculate spent per budget category
  $: budgetCards = $budgets.map((b) => {
    const spent = $transactions
      .filter((t) => t.type === 'expense' && t.category === b.category)
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const limit = Number(b.monthly_limit) || 1;
    const percentage = Math.round((spent / limit) * 100);
    const remaining = limit - spent;

    return {
      ...b,
      spent,
      limit,
      percentage,
      remaining,
      isExceeded: spent > limit
    };
  });

  function openEditModal(cat = '', limit = 1000000) {
    editCategory = cat;
    editLimit = String(limit);
    isNewCategory = !cat;
    isEditing = true;
  }

  async function handleSaveBudget() {
    if (!editCategory.trim() || Number(editLimit) <= 0) {
      alert('Masukkan kategori dan batas anggaran yang valid!');
      return;
    }

    await emitUpdateBudget(editCategory.trim(), Number(editLimit));
    isEditing = false;
  }

  function handleDeleteBudget(cat) {
    requestConfirm({
      title: 'Hapus Batas Anggaran',
      message: `Hapus alokasi batas anggaran untuk kategori "${cat}"?`,
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
  <div class="budget-header">
    <div class="header-text">
      <div class="title-row">
        <i class="fa-solid fa-wallet title-icon"></i>
        <h3>Batas Anggaran Bulanan</h3>
      </div>
      <p class="subtitle">Kendalikan pengeluaran Anda agar tidak melebihi alokasi finansial</p>
    </div>

    <div class="budget-header-actions">
      <button
        class="btn btn-outline"
        on:click={() => openEditModal('', 1500000)}
        title="Tambah batas alokasi untuk kategori baru"
      >
        <i class="fa-solid fa-plus"></i>
        <span>Tambah Alokasi</span>
      </button>
    </div>
  </div>

  <div class="budget-grid">
    {#each budgetCards as item}
      <div class="budget-card" class:exceeded={item.isExceeded}>
        <div class="card-top">
          <div class="cat-title">
            <h4>{item.category}</h4>
            {#if item.isExceeded}
              <span class="warning-tag">
                <i class="fa-solid fa-triangle-exclamation"></i> Melebihi Batas
              </span>
            {/if}
          </div>
          <div class="card-actions">
            <button
              class="edit-btn"
              title="Edit Batas Anggaran"
              on:click={() => openEditModal(item.category, item.limit)}
            >
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button
              class="delete-budget-btn"
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
            <span class="lbl">Alokasi:</span>
            <span class="amt limit-amt">
              {$isPrivacyMode ? '••••' : formatCurrency(item.limit, $currency)}
            </span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-track budget-track">
          <div
            class="progress-fill"
            style="width: {Math.min(100, item.percentage)}%; background: {item.percentage >= 100 ? '#f43f5e' : item.percentage >= 75 ? '#f59e0b' : '#10b981'};"
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
</div>

<!-- Modal Edit / Tambah Budget -->
{#if isEditing}
  <div class="modal-backdrop" on:click={() => (isEditing = false)}>
    <div class="glass-panel modal-card" on:click|stopPropagation>
      <div class="modal-header">
        <h3>{isNewCategory ? 'Tambah Alokasi Anggaran' : `Atur Batas Anggaran: ${editCategory}`}</h3>
        <button class="btn-icon btn-outline" on:click={() => (isEditing = false)}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <form on:submit|preventDefault={handleSaveBudget} class="edit-form">
        <div class="form-group">
          <label>Kategori Pengeluaran</label>
          {#if isNewCategory}
            <select bind:value={editCategory} class="input-custom" style="margin-bottom: 8px;">
              <option value="" disabled>-- Pilih Kategori Standar --</option>
              {#each standardCategories as cat}
                <option value={cat}>{cat}</option>
              {/each}
            </select>
            <input
              type="text"
              bind:value={editCategory}
              required
              class="input-custom"
              placeholder="Atau ketik nama kategori baru..."
            />
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
          <label>Batas Maksimal Bulanan (Rp)</label>
          <input
            type="number"
            bind:value={editLimit}
            required
            min="10000"
            step="10000"
            class="input-custom"
            placeholder="Contoh: 2500000"
          />
        </div>

        <div class="quick-pills">
          <button type="button" class="pill-btn" on:click={() => (editLimit = '500000')}>500rb</button>
          <button type="button" class="pill-btn" on:click={() => (editLimit = '1000000')}>1 Juta</button>
          <button type="button" class="pill-btn" on:click={() => (editLimit = '2500000')}>2.5 Juta</button>
          <button type="button" class="pill-btn" on:click={() => (editLimit = '5000000')}>5 Juta</button>
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
            Simpan Perubahan
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
    gap: 10px;
  }

  .title-icon {
    color: var(--primary);
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

  .budget-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .budget-card {
    padding: 20px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: 14px;
    transition: all 0.2s ease;
  }

  .budget-card:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .budget-card.exceeded {
    border-color: rgba(244, 63, 94, 0.3);
    background: rgba(244, 63, 94, 0.03);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .cat-title h4 {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .warning-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.68rem;
    color: #f43f5e;
    background: rgba(244, 63, 94, 0.15);
    padding: 2px 6px;
    border-radius: 4px;
    margin-top: 4px;
    font-weight: 600;
  }

  .edit-btn {
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 0.9rem;
    transition: color 0.15s ease;
  }

  .edit-btn:hover {
    color: var(--primary);
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

  .lbl {
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .amt {
    font-size: 1.05rem;
    font-weight: 700;
  }

  .limit-amt {
    color: var(--text-muted);
  }

  .budget-track {
    height: 8px;
  }

  .card-bottom {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .remaining-label {
    font-weight: 600;
  }

  /* Modal Edit */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(4, 7, 13, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal-card {
    width: 100%;
    max-width: 440px;
    padding: 28px;
    background: #0f172a;
    border-radius: var(--radius-lg);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .card-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .delete-budget-btn {
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 0.85rem;
    transition: color 0.15s ease;
  }

  .delete-budget-btn:hover {
    color: #f43f5e;
  }

  .quick-pills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: -6px;
  }

  .pill-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-full);
    padding: 4px 10px;
    font-size: 0.75rem;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pill-btn:hover {
    background: rgba(99, 102, 241, 0.15);
    color: var(--primary);
    border-color: rgba(99, 102, 241, 0.4);
  }

  .disabled-input {
    opacity: 0.7;
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.03) !important;
  }

  .modal-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 10px;
  }
</style>
