<script>
  import { categoryBreakdown, summaryMetrics, currency, formatCurrency, isPrivacyMode } from '../stores.js';

  $: breakdown = $categoryBreakdown;
  $: totalExpense = $summaryMetrics.totalExpense;
  $: totalIncome = $summaryMetrics.totalIncome;

  // Compute SVG Donut segments
  $: donutSegments = (() => {
    let accumulatedAngle = 0;
    const radius = 70;
    const circumference = 2 * Math.PI * radius;

    return breakdown.map((item) => {
      const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle;
      accumulatedAngle += (item.percentage / 100) * circumference;

      return {
        ...item,
        strokeDasharray,
        strokeDashoffset
      };
    });
  })();

  let hoveredCat = null;
</script>

<div class="charts-grid">
  <!-- Category Breakdown Donut Card -->
  <div class="glass-panel chart-card">
    <div class="chart-header">
      <div class="title-wrap">
        <i class="fa-solid fa-chart-pie chart-icon"></i>
        <h3>Distribusi Pengeluaran</h3>
      </div>
      <span class="badge-period">Bulan Ini</span>
    </div>

    {#if breakdown.length === 0}
      <div class="empty-chart">
        <i class="fa-solid fa-receipt"></i>
        <p>Belum ada transaksi pengeluaran bulan ini.</p>
      </div>
    {:else}
      <div class="donut-content">
        <!-- SVG Donut -->
        <div class="svg-container">
          <svg viewBox="0 0 200 200" class="donut-svg">
            <circle
              cx="100"
              cy="100"
              r="70"
              fill="transparent"
              stroke="rgba(255,255,255,0.05)"
              stroke-width="22"
            />
            {#each donutSegments as seg}
              <circle
                cx="100"
                cy="100"
                r="70"
                fill="transparent"
                stroke={seg.color}
                stroke-width={hoveredCat === seg.category ? 26 : 22}
                stroke-dasharray={seg.strokeDasharray}
                stroke-dashoffset={seg.strokeDashoffset}
                transform="rotate(-90 100 100)"
                class="donut-segment"
                on:mouseenter={() => (hoveredCat = seg.category)}
                on:mouseleave={() => (hoveredCat = null)}
              />
            {/each}
          </svg>
          <div class="donut-center-info">
            <span class="center-sub">Total Keluar</span>
            <span class="center-amt">
              {#if $isPrivacyMode}
                ••••
              {:else}
                {formatCurrency(totalExpense, $currency)}
              {/if}
            </span>
          </div>
        </div>

        <!-- Donut Legend -->
        <div class="legend-list">
          {#each breakdown as item}
            <div
              class="legend-item"
              class:highlighted={hoveredCat === item.category}
              on:mouseenter={() => (hoveredCat = item.category)}
              on:mouseleave={() => (hoveredCat = null)}
            >
              <div class="legend-left">
                <span class="color-dot" style="background-color: {item.color};"></span>
                <span class="category-name">{item.category}</span>
              </div>
              <div class="legend-right">
                <span class="percentage">{item.percentage}%</span>
                <span class="amount">
                  {#if $isPrivacyMode}
                    ••••
                  {:else}
                    {formatCurrency(item.amount, $currency)}
                  {/if}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Cash Flow Comparison Card -->
  <div class="glass-panel chart-card">
    <div class="chart-header">
      <div class="title-wrap">
        <i class="fa-solid fa-chart-column chart-icon"></i>
        <h3>Arus Kas & Tabungan</h3>
      </div>
      <span class="badge-period">Ringkasan</span>
    </div>

    <div class="flow-container">
      <div class="comparison-bars">
        <!-- Income Bar -->
        <div class="bar-group">
          <div class="bar-label-row">
            <span class="label"><i class="fa-solid fa-arrow-down-left text-emerald"></i> Pemasukan</span>
            <span class="value text-emerald">
              {$isPrivacyMode ? '••••' : formatCurrency(totalIncome, $currency)}
            </span>
          </div>
          <div class="progress-track big-track">
            <div
              class="progress-fill"
              style="width: 100%; background: linear-gradient(90deg, #059669, #10b981);"
            ></div>
          </div>
        </div>

        <!-- Expense Bar -->
        <div class="bar-group">
          <div class="bar-label-row">
            <span class="label"><i class="fa-solid fa-arrow-up-right text-rose"></i> Pengeluaran</span>
            <span class="value text-rose">
              {$isPrivacyMode ? '••••' : formatCurrency(totalExpense, $currency)}
            </span>
          </div>
          <div class="progress-track big-track">
            <div
              class="progress-fill"
              style="width: {totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0}%; background: linear-gradient(90deg, #e11d48, #f43f5e);"
            ></div>
          </div>
        </div>
      </div>

      <!-- Financial Health Cards -->
      <div class="health-badges">
        <div class="health-card">
          <span class="health-title">Kondisi Finansial</span>
          <span class="health-status {totalIncome >= totalExpense ? 'safe' : 'danger'}">
            <i class={totalIncome >= totalExpense ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
            {totalIncome >= totalExpense ? 'Surplus (Sehat)' : 'Defisit (Waspada)'}
          </span>
        </div>
        <div class="health-card">
          <span class="health-title">Persentase Belanja</span>
          <span class="health-status">
            {totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0}% dari pemasukan
          </span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .charts-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 20px;
    margin-bottom: 28px;
  }

  .chart-card {
    padding: 24px;
    display: flex;
    flex-direction: column;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .chart-icon {
    color: var(--primary);
    font-size: 1.1rem;
  }

  .chart-header h3 {
    font-size: 1.05rem;
    font-weight: 700;
  }

  .badge-period {
    font-size: 0.72rem;
    padding: 3px 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-full);
    color: var(--text-muted);
  }

  .donut-content {
    display: flex;
    align-items: center;
    gap: 24px;
    flex: 1;
  }

  .svg-container {
    position: relative;
    width: 170px;
    height: 170px;
    flex-shrink: 0;
  }

  .donut-svg {
    width: 100%;
    height: 100%;
    transform: rotate(0deg);
  }

  .donut-segment {
    transition: stroke-width 0.2s ease, opacity 0.2s ease;
    cursor: pointer;
  }

  .donut-segment:hover {
    opacity: 0.9;
  }

  .donut-center-info {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
  }

  .center-sub {
    font-size: 0.65rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: block;
  }

  .center-amt {
    font-size: 0.9rem;
    font-weight: 800;
    color: var(--text-main);
  }

  .legend-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 190px;
    overflow-y: auto;
  }

  .legend-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    transition: background 0.2s ease;
    cursor: default;
  }

  .legend-item:hover,
  .legend-item.highlighted {
    background: rgba(255, 255, 255, 0.06);
  }

  .legend-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .color-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }

  .category-name {
    font-size: 0.82rem;
    color: var(--text-main);
  }

  .legend-right {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
  }

  .percentage {
    color: var(--text-muted);
    font-weight: 600;
  }

  .amount {
    font-weight: 700;
    color: var(--text-main);
  }

  .flow-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
    gap: 20px;
  }

  .comparison-bars {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .bar-label-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .big-track {
    height: 12px;
  }

  .health-badges {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .health-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    padding: 12px;
  }

  .health-title {
    font-size: 0.72rem;
    color: var(--text-muted);
    display: block;
    margin-bottom: 4px;
  }

  .health-status {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .health-status.safe {
    color: #10b981;
  }

  .health-status.danger {
    color: #f43f5e;
  }

  .empty-chart {
    padding: 40px;
    text-align: center;
    color: var(--text-dim);
  }

  .empty-chart i {
    font-size: 2rem;
    margin-bottom: 8px;
  }

  @media (max-width: 960px) {
    .charts-grid {
      grid-template-columns: 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
  }

  @media (max-width: 640px) {
    .chart-card {
      padding: 18px 14px;
    }
    .donut-content {
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .legend-list {
      width: 100%;
      max-height: none;
    }
    .health-badges {
      grid-template-columns: 1fr;
      gap: 8px;
    }
  }
</style>
