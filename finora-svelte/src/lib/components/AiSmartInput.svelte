<script>
  import { SmartParser } from '$lib/parser.js';
  import { emitAddTransaction } from '$lib/socket.js';
  import { currency, formatCurrency } from '$lib/stores.js';
  import confetti from 'canvas-confetti';

  let inputText = '';
  let isProcessing = false;
  let parsedPreview = null;

  // Real-time live AI parsing as the user types
  $: {
    if (inputText.trim().length >= 3) {
      parsedPreview = SmartParser.parse(inputText);
    } else {
      parsedPreview = null;
    }
  }

  async function submitSmartTransaction(txData) {
    if (!txData || !txData.amount || txData.amount <= 0) {
      alert('Mohon cantumkan nominal yang jelas (contoh: 25rb, 50k, 1.5jt, atau 50000)!');
      return;
    }

    isProcessing = true;
    try {
      await emitAddTransaction(txData);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      inputText = '';
      parsedPreview = null;
    } catch (err) {
      alert('Gagal mencatat transaksi: ' + err.message);
    } finally {
      isProcessing = false;
    }
  }

  function handleFormSubmit() {
    const parsed = SmartParser.parse(inputText);
    if (parsed) {
      submitSmartTransaction(parsed);
    } else {
      alert('Masukkan kalimat transaksi, contoh: "Beli kopi 25rb QRIS"');
    }
  }

  // Quick 1-Click Simulator triggers
  const simulators = [
    { title: 'Kopi Espresso', amount: 25000, category: 'Makanan & Minuman', method: 'QRIS', type: 'expense', icon: 'fa-mug-hot', color: '#f59e0b' },
    { title: 'Bensin Shell', amount: 50000, category: 'Transportasi', method: 'Tunai', type: 'expense', icon: 'fa-gas-pump', color: '#06b6d4' },
    { title: 'Makan Siang', amount: 35000, category: 'Makanan & Minuman', method: 'QRIS', type: 'expense', icon: 'fa-utensils', color: '#f97316' },
    { title: 'Gaji Bulanan', amount: 2500000, category: 'Gaji', method: 'Transfer', type: 'income', icon: 'fa-money-bill-wave', color: '#10b981' },
    { title: 'Tagihan Listrik', amount: 200000, category: 'Tagihan & Utilitas', method: 'Transfer', type: 'expense', icon: 'fa-bolt', color: '#ec4899' }
  ];

  function runSimulator(sim) {
    submitSmartTransaction({
      description: sim.title,
      amount: sim.amount,
      category: sim.category,
      payment_method: sim.method,
      type: sim.type,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      notes: `Dicatat instan via Finora 1-Click Simulator (${sim.method})`
    });
  }

  const promptHints = [
    'Beli kopi 22rb QRIS',
    'Isi bensin pertamax 50rb Cash',
    'Makan nasi padang 35rb QRIS',
    'Gaji bulanan 12jt Transfer BCA',
    'Bayar tagihan wifi 350rb Mandiri',
    'Nonton bioskop 85k ShopeePay'
  ];
</script>

<div class="ai-input-card glass-panel">
  <!-- Glowing header banner -->
  <div class="ai-header">
    <div class="ai-badge-group">
      <div class="ai-icon-glow">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
      </div>
      <div class="ai-title-wrap">
        <div class="ai-badge-row">
          <h3>Smart Natural Language Parser</h3>
          <span class="ai-pill"><i class="fa-solid fa-brain"></i> Finora AI Copilot</span>
        </div>
        <p class="ai-desc">
          Ketik transaksi Anda dengan bahasa santai sehari-hari. AI akan membedah nominal, kategori, dan metode pembayaran secara otomatis.
        </p>
      </div>
    </div>
  </div>

  <!-- Smart Input Form -->
  <form on:submit|preventDefault={handleFormSubmit} class="smart-input-form">
    <div class="input-bar-container">
      <i class="fa-solid fa-terminal prompt-icon"></i>
      <input
        type="text"
        bind:value={inputText}
        placeholder="Ketik bebas, misal: 'Makan siang soto ayam 30rb QRIS' atau 'Gaji bonus 3.5jt transfer'..."
        class="smart-text-input"
        disabled={isProcessing}
      />
      <button
        type="submit"
        class="btn btn-primary submit-smart-btn"
        disabled={isProcessing || !inputText.trim()}
      >
        <i class="fa-solid fa-bolt"></i>
        <span>{isProcessing ? 'Memproses...' : 'Catat Seketika'}</span>
      </button>
    </div>
  </form>

  <!-- Live AI Detection HUD -->
  {#if parsedPreview}
    <div class="ai-hud-preview">
      <div class="hud-label">
        <i class="fa-solid fa-eye text-emerald"></i>
        <span>Finora AI Live Recognition:</span>
      </div>
      <div class="hud-chips-row">
        <div class="hud-chip">
          <span class="chip-k">Item:</span>
          <span class="chip-v">{parsedPreview.description}</span>
        </div>
        <div class="hud-chip highlight-amt">
          <span class="chip-k">Nominal:</span>
          <span class="chip-v">{formatCurrency(parsedPreview.amount, $currency)}</span>
        </div>
        <div class="hud-chip">
          <span class="chip-k">Kategori:</span>
          <span class="chip-v">{parsedPreview.category}</span>
        </div>
        <div class="hud-chip">
          <span class="chip-k">Metode:</span>
          <span class="chip-v">{parsedPreview.payment_method}</span>
        </div>
        <div class="hud-chip type-{parsedPreview.type}">
          <span class="chip-v">{parsedPreview.type === 'income' ? '↑ Pemasukan' : '↓ Pengeluaran'}</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Quick Hints Chips -->
  <div class="hints-row">
    <span class="hint-lbl"><i class="fa-regular fa-lightbulb"></i> Contoh Cepat:</span>
    <div class="hint-pills-list">
      {#each promptHints as hint}
        <button
          type="button"
          class="hint-chip"
          on:click={() => (inputText = hint)}
        >
          "{hint}"
        </button>
      {/each}
    </div>
  </div>

  <!-- 1-Click Fast Payment Simulators -->
  <div class="sim-section">
    <div class="sim-header">
      <i class="fa-solid fa-gamepad text-primary"></i>
      <span>Simulator Transaksi 1-Klik (Auto-Record Instant):</span>
    </div>
    <div class="sim-grid">
      {#each simulators as sim}
        <button
          type="button"
          class="sim-action-card"
          on:click={() => runSimulator(sim)}
          disabled={isProcessing}
        >
          <div class="sim-icon" style="background: {sim.color}20; color: {sim.color};">
            <i class="fa-solid {sim.icon}"></i>
          </div>
          <div class="sim-details">
            <div class="sim-top-row">
              <span class="sim-item-title">{sim.title}</span>
              <span class="sim-method-badge">{sim.method}</span>
            </div>
            <div class="sim-amt {sim.type === 'income' ? 'text-emerald' : 'text-rose'}">
              {sim.type === 'income' ? '+' : '-'}{formatCurrency(sim.amount, $currency)}
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .ai-input-card {
    position: relative;
    padding: 28px;
    margin-bottom: 28px;
    background: var(--bg-card);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    overflow: hidden;
    transition: background 0.25s ease, border-color 0.25s ease;
  }

  .ai-input-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #6366f1, #06b6d4, #10b981, #f43f5e);
  }

  .ai-header {
    margin-bottom: 20px;
  }

  .ai-badge-group {
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }

  .ai-icon-glow {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.3rem;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
    flex-shrink: 0;
  }

  .ai-badge-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }

  .ai-badge-row h3 {
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--text-main);
  }

  .ai-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(99, 102, 241, 0.12);
    color: var(--primary);
    border: 1px solid rgba(99, 102, 241, 0.3);
    padding: 3px 10px;
    border-radius: var(--radius-full);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .ai-desc {
    font-size: 0.83rem;
    color: var(--text-muted);
    line-height: 1.45;
  }

  .smart-input-form {
    margin-bottom: 16px;
  }

  .input-bar-container {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--input-bg);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    padding: 6px 8px 6px 18px;
    box-shadow: var(--shadow-subtle);
    transition: all 0.2s ease;
  }

  .input-bar-container:focus-within {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-glow);
  }

  .prompt-icon {
    color: var(--primary);
    font-size: 1.1rem;
    margin-right: 12px;
  }

  .smart-text-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-main);
    font-size: 0.95rem;
    font-family: inherit;
    padding: 10px 0;
  }

  .smart-text-input::placeholder {
    color: var(--text-dim);
  }

  .submit-smart-btn {
    padding: 10px 20px;
    border-radius: var(--radius-md);
    white-space: nowrap;
  }

  /* Live HUD Preview */
  .ai-hud-preview {
    background: rgba(16, 185, 129, 0.08);
    border: 1px dashed rgba(16, 185, 129, 0.35);
    border-radius: var(--radius-md);
    padding: 12px 16px;
    margin-bottom: 16px;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .hud-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--color-emerald);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .hud-chips-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .hud-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--tag-bg);
    border: 1px solid var(--border-glass);
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 0.78rem;
  }

  .chip-k {
    color: var(--text-muted);
  }

  .chip-v {
    font-weight: 700;
    color: var(--text-main);
  }

  .highlight-amt .chip-v {
    color: var(--color-cyan);
    font-size: 0.85rem;
  }

  .type-income {
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.3);
    color: var(--color-emerald);
  }

  .type-expense {
    background: rgba(244, 63, 94, 0.15);
    border-color: rgba(244, 63, 94, 0.3);
    color: var(--color-rose);
  }

  /* Hints */
  .hints-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .hint-lbl {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .hint-pills-list {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .hint-chip {
    background: var(--tag-bg);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-full);
    color: var(--text-muted);
    padding: 4px 11px;
    font-size: 0.72rem;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s ease;
  }

  .hint-chip:hover {
    background: rgba(99, 102, 241, 0.12);
    border-color: var(--primary);
    color: var(--primary);
  }

  /* Simulators */
  .sim-section {
    border-top: 1px solid var(--border-glass);
    padding-top: 16px;
  }

  .sim-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-muted);
    margin-bottom: 12px;
  }

  .sim-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(195px, 1fr));
    gap: 10px;
  }

  @media (min-width: 1100px) {
    .sim-grid {
      grid-template-columns: repeat(5, 1fr);
    }
  }

  .sim-action-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: var(--tag-bg, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    cursor: pointer;
    text-align: left;
    transition: all 0.2s ease;
    font-family: inherit;
    color: var(--text-main);
  }

  .sim-action-card:hover {
    background: rgba(99, 102, 241, 0.12);
    border-color: rgba(99, 102, 241, 0.35);
    transform: translateY(-1px);
  }

  .sim-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .sim-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .sim-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .sim-item-title {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-main);
    white-space: nowrap;
  }

  .sim-amt {
    font-size: 0.82rem;
    font-weight: 800;
    white-space: nowrap;
    line-height: 1.2;
    letter-spacing: -0.2px;
  }

  .sim-amt.text-emerald {
    color: var(--color-emerald, #34d399) !important;
  }

  .sim-amt.text-rose {
    color: var(--color-rose, #fb7185) !important;
  }

  .sim-method-badge {
    font-size: 0.62rem;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--tag-bg, rgba(255, 255, 255, 0.05));
    color: var(--text-dim);
    white-space: nowrap;
    flex-shrink: 0;
    border: 1px solid var(--border-glass);
  }

  @media (max-width: 768px) {
    .ai-input-card {
      padding: 18px 14px;
      margin-bottom: 20px;
    }
    .ai-badge-group {
      gap: 12px;
    }
    .ai-icon-glow {
      width: 40px;
      height: 40px;
      font-size: 1.1rem;
    }
    .ai-badge-row h3 {
      font-size: 1.05rem;
    }
    .input-bar-container {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
      padding: 12px;
    }
    .submit-smart-btn {
      width: 100%;
      padding: 12px;
      font-size: 0.9rem;
    }
    .sim-grid {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .sim-action-card {
      padding: 10px 12px;
    }
    .hints-row {
      margin-bottom: 14px;
    }
  }
</style>
