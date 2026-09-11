<script>
  import { goals, currency, formatCurrency, isPrivacyMode, requestConfirm } from '../stores.js';
  import { emitDepositGoal, emitAddGoal, emitUpdateGoal, emitDeleteGoal } from '../socket.js';
  import confetti from 'canvas-confetti';

  let isDepositing = false;
  let selectedGoal = null;
  let depositAmount = '';

  let isEditingGoal = false;
  let goalForm = {
    id: '',
    name: '',
    target_amount: '',
    current_amount: '0',
    deadline: '',
    icon: '🎯'
  };

  const emojiIcons = ['🎯', '🛡️', '✈️', '💻', '🏠', '🚗', '🎓', '💍', '🏖️', '🚀', '📱', '💰'];

  function openDepositModal(g) {
    selectedGoal = g;
    depositAmount = '500000';
    isDepositing = true;
  }

  async function handleDeposit() {
    if (!selectedGoal || Number(depositAmount) <= 0) return;

    await emitDepositGoal(selectedGoal.id, Number(depositAmount));

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    isDepositing = false;
  }

  function openCreateGoalModal() {
    const nextYear = new Date();
    nextYear.setMonth(nextYear.getMonth() + 6);
    goalForm = {
      id: '',
      name: '',
      target_amount: '',
      current_amount: '0',
      deadline: nextYear.toISOString().split('T')[0],
      icon: '🎯'
    };
    isEditingGoal = true;
  }

  function openEditGoalModal(g) {
    goalForm = {
      id: g.id,
      name: g.name,
      target_amount: String(g.target_amount),
      current_amount: String(g.current_amount || 0),
      deadline: g.deadline || '',
      icon: g.icon || '🎯'
    };
    isEditingGoal = true;
  }

  async function handleSaveGoal() {
    if (!goalForm.name.trim() || Number(goalForm.target_amount) <= 0) {
      alert('Masukkan nama target dan sasaran nominal yang valid!');
      return;
    }

    if (goalForm.id) {
      await emitUpdateGoal(goalForm.id, {
        name: goalForm.name.trim(),
        target_amount: Number(goalForm.target_amount),
        current_amount: Number(goalForm.current_amount),
        deadline: goalForm.deadline,
        icon: goalForm.icon
      });
    } else {
      await emitAddGoal({
        name: goalForm.name.trim(),
        target_amount: Number(goalForm.target_amount),
        current_amount: Number(goalForm.current_amount),
        deadline: goalForm.deadline,
        icon: goalForm.icon
      });
    }

    isEditingGoal = false;
  }

  function handleDeleteGoal(id, name) {
    requestConfirm({
      title: 'Hapus Target Tabungan',
      message: `Apakah Anda yakin ingin menghapus target tabungan "${name}"?`,
      confirmText: 'Ya, Hapus',
      confirmStyle: 'danger',
      icon: 'fa-trash-can',
      onConfirm: async () => {
        await emitDeleteGoal(id);
      }
    });
  }
</script>

<div class="glass-panel goals-wrapper">
  <div class="goals-header">
    <div class="header-info">
      <div class="title-row">
        <i class="fa-solid fa-bullseye title-icon"></i>
        <h3>Target & Impian Tabungan</h3>
      </div>
      <p class="subtitle">Pantau kemajuan menabung Anda untuk masa depan yang lebih cerah</p>
    </div>

    <button class="btn btn-outline" on:click={openCreateGoalModal} title="Tambah target tabungan baru">
      <i class="fa-solid fa-plus"></i>
      <span>Tambah Target</span>
    </button>
  </div>

  <div class="goals-grid">
    {#each $goals as goal}
      {@const target = Number(goal.target_amount) || 1}
      {@const current = Number(goal.current_amount) || 0}
      {@const percent = Math.min(100, Math.round((current / target) * 100))}

      <div class="goal-card">
        <div class="card-header">
          <div class="header-left-info">
            <div class="goal-icon-badge">{goal.icon || '🎯'}</div>
            <div class="goal-title-wrap">
              <h4>{goal.name}</h4>
              <span class="deadline-tag">
                <i class="fa-regular fa-calendar"></i> Target: {goal.deadline || 'Tidak ada batas'}
              </span>
            </div>
          </div>
          <div class="goal-card-actions">
            <button
              class="goal-action-btn"
              title="Edit Target Tabungan"
              on:click={() => openEditGoalModal(goal)}
            >
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button
              class="goal-action-btn del-btn"
              title="Hapus Target Tabungan"
              on:click={() => handleDeleteGoal(goal.id, goal.name)}
            >
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>

        <div class="goal-body">
          <div class="goal-numbers">
            <div class="number-item">
              <span class="lbl">Terkumpul:</span>
              <span class="val text-emerald">
                {$isPrivacyMode ? '••••' : formatCurrency(current, $currency)}
              </span>
            </div>
            <div class="number-item text-right">
              <span class="lbl">Sasaran:</span>
              <span class="val">
                {$isPrivacyMode ? '••••' : formatCurrency(target, $currency)}
              </span>
            </div>
          </div>

          <div class="progress-track goal-track">
            <div
              class="progress-fill"
              style="width: {percent}%; background: linear-gradient(90deg, #6366f1, #10b981);"
            ></div>
          </div>

          <div class="goal-footer">
            <span class="percent-badge">{percent}% Tercapai</span>
            <button class="btn btn-primary deposit-btn" on:click={() => openDepositModal(goal)}>
              <i class="fa-solid fa-coins"></i>
              <span>Nabung</span>
            </button>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- Modal Nabung -->
{#if isDepositing && selectedGoal}
  <div class="modal-backdrop" on:click={() => (isDepositing = false)}>
    <div class="glass-panel modal-card" on:click|stopPropagation>
      <div class="modal-header">
        <div class="modal-title-wrap">
          <span class="modal-icon">{selectedGoal.icon}</span>
          <h3>Nabung ke "{selectedGoal.name}"</h3>
        </div>
        <button class="btn-icon btn-outline" on:click={() => (isDepositing = false)}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <form on:submit|preventDefault={handleDeposit} class="deposit-form">
        <div class="form-group">
          <label>Jumlah Tabungan yang Ditambahkan (Rp)</label>
          <input
            type="number"
            bind:value={depositAmount}
            required
            min="10000"
            step="10000"
            class="input-custom"
            placeholder="Contoh: 500000"
          />
        </div>

        <div class="quick-deposit-pills">
          <button type="button" class="pill-btn" on:click={() => (depositAmount = '100000')}>+100rb</button>
          <button type="button" class="pill-btn" on:click={() => (depositAmount = '250000')}>+250rb</button>
          <button type="button" class="pill-btn" on:click={() => (depositAmount = '500000')}>+500rb</button>
          <button type="button" class="pill-btn" on:click={() => (depositAmount = '1000000')}>+1 Juta</button>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-outline" on:click={() => (isDepositing = false)}>
            Batal
          </button>
          <button type="submit" class="btn btn-success">
            <i class="fa-solid fa-check"></i>
            <span>Konfirmasi Tabungan</span>
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Modal Tambah / Edit Target Tabungan -->
{#if isEditingGoal}
  <div class="modal-backdrop" on:click={() => (isEditingGoal = false)}>
    <div class="glass-panel modal-card" on:click|stopPropagation>
      <div class="modal-header">
        <div class="modal-title-wrap">
          <span class="modal-icon">{goalForm.icon}</span>
          <h3>{goalForm.id ? 'Edit Target Tabungan' : 'Tambah Target Impian Baru'}</h3>
        </div>
        <button class="btn-icon btn-outline" on:click={() => (isEditingGoal = false)}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <form on:submit|preventDefault={handleSaveGoal} class="deposit-form">
        <!-- Emoji Icon Selector -->
        <div class="form-group">
          <label>Pilih Ikon</label>
          <div class="emoji-picker-row">
            {#each emojiIcons as em}
              <button
                type="button"
                class="emoji-choice-btn"
                class:selected={goalForm.icon === em}
                on:click={() => (goalForm.icon = em)}
              >
                {em}
              </button>
            {/each}
          </div>
        </div>

        <div class="form-group">
          <label>Nama Target / Impian</label>
          <input
            type="text"
            bind:value={goalForm.name}
            required
            class="input-custom"
            placeholder="Contoh: Beli Rumah, Dana Darurat, Umrah..."
          />
        </div>

        <div class="form-group">
          <label>Sasaran Nominal Target (Rp)</label>
          <input
            type="number"
            bind:value={goalForm.target_amount}
            required
            min="50000"
            step="50000"
            class="input-custom"
            placeholder="Contoh: 30000000"
          />
        </div>

        <div class="form-group">
          <label>Dana Terkumpul Saat Ini (Rp)</label>
          <input
            type="number"
            bind:value={goalForm.current_amount}
            min="0"
            step="10000"
            class="input-custom"
            placeholder="0"
          />
        </div>

        <div class="form-group">
          <label>Target Tanggal Selesai (Deadline)</label>
          <input
            type="date"
            bind:value={goalForm.deadline}
            class="input-custom"
          />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-outline" on:click={() => (isEditingGoal = false)}>
            Batal
          </button>
          <button type="submit" class="btn btn-primary">
            {goalForm.id ? 'Simpan Perubahan' : 'Buat Target Baru'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .goals-wrapper {
    padding: 28px;
    margin-bottom: 28px;
  }

  .goals-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
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

  .goals-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  .goal-card {
    padding: 24px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 18px;
    transition: all 0.2s ease;
  }

  .goal-card:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
  }

  .header-left-info {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
  }

  .goal-card-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .goal-action-btn {
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 0.85rem;
    padding: 6px;
    border-radius: var(--radius-sm);
    transition: all 0.15s ease;
  }

  .goal-action-btn:hover {
    color: var(--primary);
    background: rgba(99, 102, 241, 0.1);
  }

  .goal-action-btn.del-btn:hover {
    color: #f43f5e;
    background: rgba(244, 63, 94, 0.1);
  }

  .emoji-picker-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 4px;
  }

  .emoji-choice-btn {
    font-size: 1.4rem;
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .emoji-choice-btn:hover {
    background: rgba(99, 102, 241, 0.2);
    border-color: var(--primary);
  }

  .emoji-choice-btn.selected {
    background: rgba(99, 102, 241, 0.3);
    border-color: var(--primary);
    transform: scale(1.1);
  }

  .goal-icon-badge {
    font-size: 1.8rem;
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .goal-title-wrap h4 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .deadline-tag {
    font-size: 0.72rem;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 2px;
  }

  .goal-numbers {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .number-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .number-item.text-right {
    text-align: right;
  }

  .lbl {
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .val {
    font-size: 1.05rem;
    font-weight: 700;
  }

  .text-emerald {
    color: #10b981;
  }

  .goal-track {
    height: 10px;
  }

  .goal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 14px;
  }

  .percent-badge {
    font-size: 0.78rem;
    font-weight: 700;
    color: #a5b4fc;
    background: rgba(99, 102, 241, 0.15);
    padding: 3px 8px;
    border-radius: var(--radius-full);
  }

  .deposit-btn {
    padding: 7px 14px;
    font-size: 0.82rem;
  }

  /* Modal */
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

  .modal-title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .modal-icon {
    font-size: 1.4rem;
  }

  .deposit-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .quick-deposit-pills {
    display: flex;
    gap: 6px;
  }

  .pill-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-full);
    color: var(--text-muted);
    padding: 4px 10px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }

  .pill-btn:hover {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 10px;
  }
</style>
