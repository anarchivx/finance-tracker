<script>
  import { emitAddTransaction, emitUpdateTransaction } from '../socket.js';
  import confetti from 'canvas-confetti';

  export let isOpen = false;
  export let initialType = 'expense';
  export let editingTransaction = null;
  export let onClose = () => {};

  let type = 'expense';
  let description = '';
  let amount = '';
  let category = 'Makanan & Minuman';
  let date = new Date().toISOString().split('T')[0];
  let time = new Date().toTimeString().slice(0, 5);
  let paymentMethod = 'QRIS';
  let notes = '';
  let isSubmitting = false;

  let prevIsOpen = false;
  $: if (isOpen && !prevIsOpen) {
    if (editingTransaction) {
      type = editingTransaction.type || 'expense';
      description = editingTransaction.description || '';
      amount = String(editingTransaction.amount || '');
      category = editingTransaction.category || (type === 'income' ? 'Gaji' : 'Makanan & Minuman');
      date = editingTransaction.date || new Date().toISOString().split('T')[0];
      time = editingTransaction.time || new Date().toTimeString().slice(0, 5);
      paymentMethod = editingTransaction.payment_method || editingTransaction.method || 'QRIS';
      notes = editingTransaction.notes || '';
    } else {
      type = initialType || 'expense';
      category = type === 'income' ? 'Gaji' : 'Makanan & Minuman';
      description = '';
      amount = '';
      notes = '';
      date = new Date().toISOString().split('T')[0];
      time = new Date().toTimeString().slice(0, 5);
      paymentMethod = type === 'income' ? 'Bank Transfer' : 'QRIS';
    }
    prevIsOpen = true;
  } else if (!isOpen) {
    prevIsOpen = false;
  }

  const expenseCategories = [
    { name: 'Makanan & Minuman', icon: 'fa-utensils', color: '#f97316' },
    { name: 'Transportasi', icon: 'fa-car', color: '#06b6d4' },
    { name: 'Belanja', icon: 'fa-bag-shopping', color: '#ec4899' },
    { name: 'Hiburan', icon: 'fa-gamepad', color: '#8b5cf6' },
    { name: 'Tagihan & Utilitas', icon: 'fa-receipt', color: '#ef4444' },
    { name: 'Kesehatan', icon: 'fa-heart-pulse', color: '#10b981' },
    { name: 'Pendidikan', icon: 'fa-graduation-cap', color: '#3b82f6' },
    { name: 'Lainnya', icon: 'fa-ellipsis', color: '#64748b' }
  ];

  const incomeCategories = [
    { name: 'Gaji', icon: 'fa-money-bill-wave', color: '#10b981' },
    { name: 'Investasi', icon: 'fa-chart-line', color: '#06b6d4' },
    { name: 'Freelance & Bisnis', icon: 'fa-laptop-code', color: '#6366f1' },
    { name: 'Bonus & Hadiah', icon: 'fa-gift', color: '#f59e0b' },
    { name: 'Penjualan', icon: 'fa-store', color: '#ec4899' },
    { name: 'Lainnya', icon: 'fa-circle-plus', color: '#64748b' }
  ];

  $: activeCategories = type === 'income' ? incomeCategories : expenseCategories;

  const quickPills = [10000, 50000, 100000, 500000, 1000000];

  function setTransactionType(newType) {
    type = newType;
    if (newType === 'income') {
      if (!category || expenseCategories.some(c => c.name === category)) category = 'Gaji';
      paymentMethod = 'Bank Transfer';
    } else {
      if (!category || incomeCategories.some(c => c.name === category)) category = 'Makanan & Minuman';
      paymentMethod = 'QRIS';
    }
  }

  function addQuickAmount(val) {
    const current = Number(amount) || 0;
    amount = String(current + val);
  }

  async function handleSubmit() {
    if (!description || !amount || Number(amount) <= 0) {
      alert('Mohon cantumkan deskripsi dan nominal transaksi yang valid!');
      return;
    }

    isSubmitting = true;

    try {
      const tx = {
        description,
        amount: Number(amount),
        category,
        type,
        date,
        time: time || new Date().toTimeString().slice(0, 5),
        payment_method: paymentMethod,
        notes
      };

      if (editingTransaction && editingTransaction.id) {
        await emitUpdateTransaction(editingTransaction.id, tx);
      } else {
        await emitAddTransaction(tx);

        if (type === 'income') {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      }

      // Reset form
      description = '';
      amount = '';
      notes = '';
      onClose();
    } catch (err) {
      alert('Gagal menyimpan transaksi: ' + err.message);
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div class="modal-backdrop" on:click={onClose} role="dialog" aria-modal="true">
    <!-- Modal Dialog -->
    <div class="glass-panel modal-card" on:click|stopPropagation role="document">
      <!-- Mobile Bottom Sheet Handle -->
      <div class="sheet-drag-handle"></div>

      <div class="modal-header">
        <div class="header-left">
          <div class="modal-icon {type}">
            <i class={editingTransaction ? 'fa-solid fa-pen-to-square' : (type === 'income' ? 'fa-solid fa-arrow-down-left' : 'fa-solid fa-arrow-up-right')}></i>
          </div>
          <div>
            <h3>{editingTransaction ? 'Edit Transaksi' : (type === 'income' ? 'Tambah Pemasukan Baru' : 'Tambah Pengeluaran Baru')}</h3>
            <span class="header-subtitle">
              {editingTransaction ? 'Perbarui data transaksi ini secara real-time' : 'Data akan tersinkronisasi otomatis ke SQLite real-time'}
            </span>
          </div>
        </div>
        <button class="btn-icon btn-outline close-btn" on:click={onClose} aria-label="Tutup">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Type Switcher (Pengeluaran vs Pemasukan) -->
      <div class="type-switch">
        <button
          type="button"
          class="type-btn"
          class:active-expense={type === 'expense'}
          on:click={() => setTransactionType('expense')}
        >
          <i class="fa-solid fa-arrow-trend-down"></i>
          <span>Pengeluaran</span>
        </button>
        <button
          type="button"
          class="type-btn"
          class:active-income={type === 'income'}
          on:click={() => setTransactionType('income')}
        >
          <i class="fa-solid fa-arrow-trend-up"></i>
          <span>Pemasukan</span>
        </button>
      </div>

      <form on:submit|preventDefault={handleSubmit} class="modal-form">
        <!-- Amount Input -->
        <div class="form-group">
          <label for="modal-amount">Nominal (Rp)</label>
          <div class="amount-input-wrap">
            <span class="currency-prefix">Rp</span>
            <input
              id="modal-amount"
              type="number"
              bind:value={amount}
              placeholder="0"
              required
              class="input-custom amount-input"
              min="1"
            />
          </div>

          <!-- Quick Amount Pills -->
          <div class="quick-pills-row">
            {#each quickPills as q}
              <button
                type="button"
                class="pill-btn"
                on:click={() => addQuickAmount(q)}
              >
                +{(q >= 1000000 ? (q / 1000000) + ' Jt' : (q / 1000) + 'k')}
              </button>
            {/each}
          </div>
        </div>

        <!-- Description -->
        <div class="form-group">
          <label for="modal-desc">Keterangan / Judul Transaksi</label>
          <input
            id="modal-desc"
            type="text"
            bind:value={description}
            placeholder={type === 'income' ? 'Misal: Gaji Pokok, Bonus Proyek, Hasil Jualan' : 'Misal: Makan Siang Nasi Padang, Bensin Pertamax'}
            required
            class="input-custom"
          />
        </div>

        <!-- Category Picker -->
        <div class="form-group">
          <label id="cat-label">Kategori ({type === 'income' ? 'Pemasukan' : 'Pengeluaran'})</label>
          <div class="category-grid" aria-labelledby="cat-label">
            {#each activeCategories as cat}
              <button
                type="button"
                class="cat-chip"
                class:selected={category === cat.name}
                on:click={() => (category = cat.name)}
              >
                <i class="fa-solid {cat.icon}" style="color: {cat.color};"></i>
                <span>{cat.name}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Date & Time Picker Grid -->
        <div class="row-3">
          <div class="form-group">
            <label for="modal-date"><i class="fa-regular fa-calendar"></i> Tanggal</label>
            <input
              id="modal-date"
              type="date"
              bind:value={date}
              required
              class="input-custom"
            />
          </div>

          <div class="form-group">
            <label for="modal-time"><i class="fa-regular fa-clock"></i> Waktu / Jam</label>
            <input
              id="modal-time"
              type="time"
              bind:value={time}
              required
              class="input-custom"
            />
          </div>

          <div class="form-group">
            <label for="modal-method"><i class="fa-solid fa-wallet"></i> Metode Bayar</label>
            <select id="modal-method" bind:value={paymentMethod} class="input-custom select-custom">
              <option value="QRIS">QRIS</option>
              <option value="Tunai">Tunai / Cash</option>
              <option value="Bank Transfer">Bank Transfer (BCA/Mandiri/BRI)</option>
              <option value="GoPay">GoPay</option>
              <option value="OVO">OVO</option>
              <option value="ShopeePay">ShopeePay</option>
              <option value="Kartu Kredit">Kartu Kredit</option>
            </select>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label for="modal-notes">Catatan Tambahan (Opsional)</label>
          <input
            id="modal-notes"
            type="text"
            bind:value={notes}
            placeholder="Misal: Bersama rekan kantor / transfer via m-BCA"
            class="input-custom"
          />
        </div>

        <!-- Action Buttons -->
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" on:click={onClose}>
            Batal
          </button>
          <button
            type="submit"
            class="btn {type === 'income' ? 'btn-success' : 'btn-danger'} submit-btn"
            disabled={isSubmitting}
          >
            <i class="fa-solid fa-check"></i>
            <span>{isSubmitting ? 'Menyimpan...' : (editingTransaction ? 'Simpan Perubahan' : (type === 'income' ? 'Simpan Pemasukan' : 'Simpan Pengeluaran'))}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(4, 7, 13, 0.8);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-card {
    width: 100%;
    max-width: 540px;
    padding: 28px;
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-xl);
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 40px rgba(99, 102, 241, 0.2);
    max-height: 92vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-subtitle {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .modal-icon {
    width: 42px;
    height: 42px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .modal-icon.expense {
    background: rgba(244, 63, 94, 0.15);
    color: #fb7185;
    border: 1px solid rgba(244, 63, 94, 0.3);
  }

  .modal-icon.income {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .modal-header h3 {
    font-size: 1.18rem;
    font-weight: 800;
  }

  .close-btn {
    border-radius: var(--radius-md);
  }

  /* Type Switcher */
  .type-switch {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    background: rgba(255, 255, 255, 0.04);
    padding: 6px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-glass);
    margin-bottom: 20px;
  }

  .type-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-muted);
    font-weight: 700;
    font-size: 0.92rem;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s ease;
  }

  .type-btn:hover {
    color: var(--text-main);
    background: rgba(255, 255, 255, 0.05);
  }

  .type-btn.active-expense {
    background: linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(225, 29, 72, 0.35) 100%);
    color: #ffffff;
    border: 1px solid rgba(244, 63, 94, 0.5);
    box-shadow: 0 4px 15px rgba(244, 63, 94, 0.25);
  }

  .type-btn.active-income {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.35) 100%);
    color: #ffffff;
    border: 1px solid rgba(16, 185, 129, 0.5);
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.25);
  }

  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-muted);
  }

  .amount-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .currency-prefix {
    position: absolute;
    left: 16px;
    font-weight: 800;
    color: var(--text-dim);
    font-size: 1.15rem;
    pointer-events: none;
  }

  .amount-input {
    padding-left: 48px;
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: 0.5px;
  }

  .quick-pills-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 6px;
  }

  .pill-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-full);
    color: var(--text-muted);
    padding: 5px 12px;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pill-btn:hover {
    background: rgba(99, 102, 241, 0.2);
    color: #a5b4fc;
    border-color: rgba(99, 102, 241, 0.4);
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
    max-height: 140px;
    overflow-y: auto;
    padding: 2px;
  }

  .cat-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.8rem;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s ease;
    text-align: left;
  }

  .cat-chip:hover {
    background: rgba(255, 255, 255, 0.07);
    color: var(--text-main);
  }

  .cat-chip.selected {
    background: rgba(99, 102, 241, 0.2);
    border-color: var(--primary);
    color: #ffffff;
    font-weight: 700;
  }

  .row-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }

  .select-custom {
    cursor: pointer;
    font-size: 0.82rem;
  }

  .select-custom option {
    background: #0f172a;
    color: white;
  }

  .sheet-drag-handle {
    display: none;
  }

  @media (max-width: 768px) {
    .modal-backdrop {
      align-items: flex-end;
      padding: 0;
      background: rgba(4, 7, 13, 0.85);
    }

    .sheet-drag-handle {
      display: block;
      width: 44px;
      height: 5px;
      background: rgba(255, 255, 255, 0.22);
      border-radius: 99px;
      margin: 0 auto 16px;
      flex-shrink: 0;
    }

    .modal-card {
      max-width: 100%;
      border-radius: 28px 28px 0 0;
      padding: 18px 20px max(24px, env(safe-area-inset-bottom));
      max-height: 88vh;
      box-shadow: 0 -15px 40px rgba(0, 0, 0, 0.6);
      animation: slideUpSheet 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUpSheet {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    .category-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .cat-chip {
      min-height: 48px;
      padding: 10px 14px;
      font-size: 0.88rem;
      border-radius: var(--radius-md);
    }

    .row-3 {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .modal-actions {
      position: sticky;
      bottom: 0;
      background: #0f172a;
      padding-top: 10px;
      border-top: 1px solid var(--border-glass);
      margin-top: 16px;
      display: flex;
      gap: 12px;
    }

    .modal-actions button {
      height: 50px;
      font-size: 0.95rem;
      border-radius: var(--radius-md);
      font-weight: 700;
    }

    .modal-actions .btn-outline {
      flex: 1;
    }

    .submit-btn {
      flex: 2;
    }
  }
</style>
