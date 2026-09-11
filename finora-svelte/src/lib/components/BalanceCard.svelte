<script>
  import { summaryMetrics, currency, formatCurrency, isPrivacyMode } from '../stores.js';
  export let onQuickAdd = (type) => {};

  $: net = $summaryMetrics.netBalance;
  $: income = $summaryMetrics.totalIncome;
  $: expense = $summaryMetrics.totalExpense;
  $: rate = $summaryMetrics.savingsRate;
</script>

<div class="hero-grid">
  <!-- Main Net Worth Card -->
  <div class="glass-panel main-balance-card">
    <div class="card-bg-gradient"></div>
    <div class="card-header">
      <div class="card-label">
        <span class="dot-accent"></span>
        <span>SALDO BERSIH KESELURUHAN</span>
      </div>
      <div class="live-tag">
        <i class="fa-solid fa-shield-halved"></i> Aman
      </div>
    </div>

    <div class="balance-display">
      {#if $isPrivacyMode}
        <span class="balance-masked">Rp •••••••••</span>
      {:else}
        <span class="balance-val" class:negative={net < 0}>
          {formatCurrency(net, $currency)}
        </span>
      {/if}
    </div>

    <div class="card-footer">
      <div class="savings-metric">
        <div class="metric-info">
          <span class="label">Rasio Tabungan:</span>
          <span class="val highlight">{rate}%</span>
        </div>
        <div class="progress-track mini-track">
          <div
            class="progress-fill"
            style="width: {Math.min(100, rate)}%; background: linear-gradient(90deg, #6366f1, #10b981);"
          ></div>
        </div>
      </div>

      <div class="quick-cta-row">
        <button class="btn btn-outline quick-btn" on:click={() => onQuickAdd('income')}>
          <i class="fa-solid fa-arrow-down-left text-emerald"></i>
          <span>Pemasukan</span>
        </button>
        <button class="btn btn-outline quick-btn" on:click={() => onQuickAdd('expense')}>
          <i class="fa-solid fa-arrow-up-right text-rose"></i>
          <span>Pengeluaran</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Income & Expense Side Cards -->
  <div class="side-metrics">
    <!-- Income Stat Card -->
    <div class="glass-panel stat-card income-stat">
      <div class="stat-top">
        <div class="stat-icon-wrap income-icon">
          <i class="fa-solid fa-arrow-trend-up"></i>
        </div>
        <span class="stat-badge">+ Real-time</span>
      </div>
      <div class="stat-body">
        <span class="stat-sub">Total Pemasukan</span>
        <div class="stat-amount text-emerald">
          {#if $isPrivacyMode}
            ••••••••
          {:else}
            +{formatCurrency(income, $currency)}
          {/if}
        </div>
      </div>
    </div>

    <!-- Expense Stat Card -->
    <div class="glass-panel stat-card expense-stat">
      <div class="stat-top">
        <div class="stat-icon-wrap expense-icon">
          <i class="fa-solid fa-arrow-trend-down"></i>
        </div>
        <span class="stat-badge badge-red">- Bulan Ini</span>
      </div>
      <div class="stat-body">
        <span class="stat-sub">Total Pengeluaran</span>
        <div class="stat-amount text-rose">
          {#if $isPrivacyMode}
            ••••••••
          {:else}
            -{formatCurrency(expense, $currency)}
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .hero-grid {
    display: grid;
    grid-template-columns: 1.6fr 1fr;
    gap: 20px;
    margin-bottom: 28px;
  }

  .main-balance-card {
    position: relative;
    padding: 32px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    min-height: 230px;
  }

  .card-bg-gradient {
    position: absolute;
    top: -50%;
    right: -20%;
    width: 320px;
    height: 320px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
    pointer-events: none;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-muted);
    letter-spacing: 1px;
  }

  .dot-accent {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--primary);
    box-shadow: 0 0 8px var(--primary);
  }

  .live-tag {
    font-size: 0.72rem;
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.25);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
  }

  .balance-display {
    margin: 20px 0;
  }

  .balance-val {
    font-size: 2.75rem;
    font-weight: 800;
    letter-spacing: -1px;
    color: var(--text-main);
  }

  :global([data-theme="dark"]) .balance-val {
    background: linear-gradient(135deg, #ffffff 30%, #cbd5e1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  :global([data-theme="light"]) .balance-val,
  :global(body.light-mode) .balance-val {
    background: linear-gradient(135deg, #0f172a 30%, #334155 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    color: #0f172a;
  }

  .balance-val.negative {
    color: var(--accent-rose);
    background: linear-gradient(135deg, #f43f5e 0%, #fda4af 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .balance-masked {
    font-size: 2.2rem;
    letter-spacing: 4px;
    color: var(--text-dim);
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .savings-metric {
    flex: 1;
    min-width: 180px;
  }

  .metric-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    margin-bottom: 6px;
  }

  .metric-info .label {
    color: var(--text-muted);
  }

  .metric-info .highlight {
    font-weight: 700;
    color: #34d399;
  }

  .mini-track {
    height: 6px;
  }

  .quick-cta-row {
    display: flex;
    gap: 10px;
  }

  .quick-btn {
    padding: 8px 14px;
    font-size: 0.82rem;
    border-radius: var(--radius-md);
  }

  .text-emerald {
    color: #10b981 !important;
  }

  .text-rose {
    color: #f43f5e !important;
  }

  /* Side Metrics */
  .side-metrics {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .stat-card {
    padding: 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
  }

  .stat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .stat-icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
  }

  .income-icon {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }

  .expense-icon {
    background: rgba(244, 63, 94, 0.15);
    color: #fb7185;
  }

  .stat-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: var(--radius-full);
    background: rgba(16, 185, 129, 0.1);
    color: #34d399;
  }

  .badge-red {
    background: rgba(244, 63, 94, 0.1);
    color: #fb7185;
  }

  .stat-sub {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-weight: 500;
    display: block;
    margin-bottom: 4px;
  }

  .stat-amount {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  @media (max-width: 840px) {
    .hero-grid {
      grid-template-columns: 1fr;
      gap: 14px;
      margin-bottom: 20px;
    }
  }

  @media (max-width: 640px) {
    .main-balance-card {
      padding: 20px 16px;
      min-height: auto;
    }
    .balance-display {
      margin: 14px 0;
    }
    .balance-val {
      font-size: clamp(1.85rem, 7.5vw, 2.3rem);
    }
    .balance-masked {
      font-size: 1.6rem;
    }
    .card-footer {
      flex-direction: column;
      align-items: stretch;
      gap: 14px;
    }
    .savings-metric {
      min-width: 100%;
    }
    .quick-cta-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      width: 100%;
    }
    .quick-btn {
      padding: 10px 8px;
      justify-content: center;
      font-size: 0.82rem;
    }
    .side-metrics {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .stat-card {
      padding: 14px 12px;
    }
    .stat-top {
      margin-bottom: 8px;
    }
    .stat-icon-wrap {
      width: 32px;
      height: 32px;
      font-size: 0.95rem;
    }
    .stat-badge {
      display: none;
    }
    .stat-sub {
      font-size: 0.72rem;
    }
    .stat-amount {
      font-size: clamp(0.95rem, 4vw, 1.2rem);
    }
  }
</style>
