<script>
  import {
    transactions,
    summaryMetrics,
    categoryBreakdown,
    wallets,
    walletMetrics,
    currency,
    formatCurrency
  } from '../stores.js';
  import FinoraLogo from './FinoraLogo.svelte';
  import confetti from 'canvas-confetti';

  let reportView = 'statement'; // 'statement' | 'wrapped'
  let reportMonth = 'September 2026';
  let documentRef = 'FIN-REP-202609-' + Math.floor(1000 + Math.random() * 9000);
  let generatedDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  $: topExpenseCategory = ($categoryBreakdown && $categoryBreakdown.length > 0)
    ? $categoryBreakdown[0]
    : { category: 'Belum Ada', amount: 0, percentage: 0 };

  function handlePrint() {
    window.print();
  }

  function triggerCelebrate() {
    confetti({
      particleCount: 75,
      spread: 80,
      origin: { y: 0.5 }
    });
  }
</script>

<div class="executive-report-wrapper">
  <!-- Top Navigation & View Mode -->
  <div class="report-header-row no-print">
    <div class="header-info">
      <div class="title-with-pill">
        <h2>
          <i class="fa-solid fa-file-invoice-dollar gradient-icon"></i>
          Laporan Finansial Eksekutif & Monthly Wrapped
        </h2>
        <span class="period-pill">{reportMonth}</span>
      </div>
      <p class="subtitle">
        Cetak laporan keuangan bulanan berstandar perbankan (Print to PDF) atau bagikan kartu infografis Finora Wrapped.
      </p>
    </div>

    <div class="header-controls">
      <!-- Switch View Mode -->
      <div class="report-tab-toggle">
        <button
          class="toggle-btn"
          class:active={reportView === 'statement'}
          on:click={() => (reportView = 'statement')}
        >
          <i class="fa-solid fa-file-lines"></i>
          <span>Laporan Resmi PDF</span>
        </button>
        <button
          class="toggle-btn"
          class:active={reportView === 'wrapped'}
          on:click={() => {
            reportView = 'wrapped';
            triggerCelebrate();
          }}
        >
          <i class="fa-solid fa-sparkles"></i>
          <span>Finora Wrapped</span>
        </button>
      </div>

      <!-- Action Button -->
      {#if reportView === 'statement'}
        <button class="btn-print-action" on:click={handlePrint}>
          <i class="fa-solid fa-print"></i>
          <span>Cetak / Simpan PDF</span>
        </button>
      {:else}
        <button class="btn-celebrate-action" on:click={triggerCelebrate}>
          <i class="fa-solid fa-party-horn"></i>
          <span>Rayakan Capaian</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- VIEW 1: OFFICIAL FINANCIAL STATEMENT (PRINT TO PDF READY) -->
  {#if reportView === 'statement'}
    <div class="printable-statement-sheet">
      <!-- Official Header -->
      <div class="statement-header">
        <div class="company-brand">
          <FinoraLogo size="md" showText={true} glow={false} />
          <span class="sub-brand-text">Wealth Management & Financial Advisory Engine</span>
        </div>
        <div class="document-metadata">
          <span class="doc-badge">OFFICIAL FINANCIAL STATEMENT</span>
          <table class="meta-mini-table">
            <tbody>
              <tr>
                <td>No. Dokumen:</td>
                <td><strong>{documentRef}</strong></td>
              </tr>
              <tr>
                <td>Periode:</td>
                <td><strong>{reportMonth}</strong></td>
              </tr>
              <tr>
                <td>Tanggal Terbit:</td>
                <td>{generatedDate}</td>
              </tr>
              <tr>
                <td>Pemilik Akun:</td>
                <td>Andri Hermawan</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="statement-divider"></div>

      <!-- Executive Scorecard (3 Columns) -->
      <div class="statement-metrics-grid">
        <div class="stat-card green-tint">
          <span class="stat-title">Total Arus Masuk (Pemasukan)</span>
          <h3 class="stat-num text-emerald">{formatCurrency($summaryMetrics.totalIncome, $currency)}</h3>
          <span class="stat-note">Gaji, freelance & dividen investasi</span>
        </div>

        <div class="stat-card rose-tint">
          <span class="stat-title">Total Arus Keluar (Pengeluaran)</span>
          <h3 class="stat-num text-rose">{formatCurrency($summaryMetrics.totalExpense, $currency)}</h3>
          <span class="stat-note">Biaya operasional, tagihan & belanja</span>
        </div>

        <div class="stat-card blue-tint">
          <span class="stat-title">Surplus Kas Bersih (Net Savings)</span>
          <h3 class="stat-num text-cyan">{formatCurrency($summaryMetrics.netBalance, $currency)}</h3>
          <span class="stat-note">Savings Rate: <strong>{$summaryMetrics.savingsRate}%</strong> dari total pemasukan</span>
        </div>
      </div>

      <!-- Category Breakdown Section -->
      <div class="statement-section-box">
        <h4 class="section-title">
          <i class="fa-solid fa-chart-pie"></i> 1. Perincian Alokasi Pengeluaran per Kategori
        </h4>
        <table class="statement-table">
          <thead>
            <tr>
              <th>Kategori Pengeluaran</th>
              <th>Porsi (%)</th>
              <th>Total Nominal (Rp)</th>
              <th>Status Beban</th>
            </tr>
          </thead>
          <tbody>
            {#each $categoryBreakdown as cat}
              <tr>
                <td>
                  <span class="cat-color-dot" style="background: {cat.color};"></span>
                  <strong>{cat.category}</strong>
                </td>
                <td>
                  <div class="percent-bar-wrapper">
                    <span>{cat.percentage}%</span>
                    <div class="percent-track">
                      <div class="percent-fill" style="width: {cat.percentage}%; background: {cat.color};"></div>
                    </div>
                  </div>
                </td>
                <td class="text-right"><strong>{formatCurrency(cat.amount, $currency)}</strong></td>
                <td>
                  <span class="status-pill {cat.percentage > 35 ? 'warning-pill' : 'normal-pill'}">
                    {cat.percentage > 35 ? 'Alokasi Terbesar' : 'Terkontrol'}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Bank & Wallet Liquidity Table -->
      <div class="statement-section-box mt-4">
        <h4 class="section-title">
          <i class="fa-solid fa-building-columns"></i> 2. Rekapitulasi Likuiditas Rekening & Dompet
        </h4>
        <table class="statement-table">
          <thead>
            <tr>
              <th>Nama Rekening / Dompet</th>
              <th>Jenis Akun</th>
              <th>Nomor Akun / Label</th>
              <th class="text-right">Saldo Saat Ini</th>
            </tr>
          </thead>
          <tbody>
            {#each $wallets as w}
              <tr>
                <td><strong>{w.name}</strong></td>
                <td><span class="type-tag">{w.type.toUpperCase()}</span></td>
                <td>{w.accountNumber || '-'}</td>
                <td class="text-right font-bold text-emerald">{formatCurrency(w.balance, $currency)}</td>
              </tr>
            {/each}
            <tr class="total-row">
              <td colspan="3"><strong>TOTAL LIKUIDITAS SELURUH REKENING:</strong></td>
              <td class="text-right font-bold text-emerald-dark">
                {formatCurrency($walletMetrics.totalBalance, $currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- AI Financial Advisor Assessment Notes -->
      <div class="advisory-notes-box mt-4">
        <div class="advisory-header">
          <i class="fa-solid fa-brain"></i>
          <h5>Catatan Evaluasi Finansial Finora AI Copilot</h5>
        </div>
        <p>
          Berdasarkan rasio arus kas periode <strong>{reportMonth}</strong>, kondisi finansial Anda dinilai berada pada level
          <strong class="text-emerald">Sangat Prima (Financially Healthy)</strong> dengan tingkat tabungan sebesar
          <strong>{$summaryMetrics.savingsRate}%</strong>. Pengeluaran terbesar berfokus pada kategori <em>"{topExpenseCategory.category}"</em> ({topExpenseCategory.percentage}%).
          Disarankan mempertahankan alokasi dana darurat minimal 6 bulan pengeluaran rutin sebelum memperbesar alokasi portofolio investasi berisiko.
        </p>
      </div>

      <!-- Signoff & Footer -->
      <div class="statement-footer-row">
        <div class="signature-box">
          <span class="sig-label">Diotorisasi secara digital oleh:</span>
          <div class="sig-stamp">
            <i class="fa-solid fa-certificate"></i>
            <span>FINORA VERIFIED WEALTH AUDIT</span>
          </div>
          <span class="sig-date">{generatedDate}</span>
        </div>

        <div class="footer-legal">
          <p>Laporan ini dibuat otomatis menggunakan Finora AI Pro Engine.</p>
          <p>Dokumen sah untuk keperluan arsip finansial pribadi atau lampiran evaluasi kas.</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- VIEW 2: FINORA MONTHLY WRAPPED (STYLISH CARD) -->
  {#if reportView === 'wrapped'}
    <div class="wrapped-showcase">
      <div class="wrapped-card">
        <!-- Card Background Accents -->
        <div class="glow-orb orb-1"></div>
        <div class="glow-orb orb-2"></div>

        <div class="wrapped-inner">
          <div class="wrapped-top">
            <FinoraLogo size="sm" showText={true} glow={true} />
            <span class="wrapped-badge">MONTHLY WRAPPED • {reportMonth}</span>
          </div>

          <div class="wrapped-hero-title">
            <span>Kilasan Finansial Anda</span>
            <h2>Performa Spektakuler Bulan Ini! 🚀</h2>
          </div>

          <!-- Key Highlights Grid -->
          <div class="wrapped-grid">
            <div class="wrapped-tile">
              <span class="tile-tag">Rasio Tabungan</span>
              <h3 class="tile-val highlight-green">{$summaryMetrics.savingsRate}%</h3>
              <p class="tile-desc">Jauh melampaui aturan 20% tabungan standar!</p>
            </div>

            <div class="wrapped-tile">
              <span class="tile-tag">Surplus Kas Bersih</span>
              <h3 class="tile-val highlight-cyan">{formatCurrency($summaryMetrics.netBalance, $currency)}</h3>
              <p class="tile-desc">Total tabungan yang berhasil diamankan</p>
            </div>

            <div class="wrapped-tile">
              <span class="tile-tag">Kategori Pengeluaran #1</span>
              <h3 class="tile-val highlight-purple">{topExpenseCategory.category}</h3>
              <p class="tile-desc">{topExpenseCategory.percentage}% dari total pengeluaran</p>
            </div>

            <div class="wrapped-tile">
              <span class="tile-tag">Kekayaan di {$walletMetrics.count} Rekening</span>
              <h3 class="tile-val highlight-amber">{formatCurrency($walletMetrics.totalBalance, $currency)}</h3>
              <p class="tile-desc">Likuiditas siap pakai terproteksi</p>
            </div>
          </div>

          <!-- Motivational Footer -->
          <div class="wrapped-footer">
            <div class="quote-box">
              <i class="fa-solid fa-quote-left"></i>
              <span>"Konsistensi dalam hal-hal kecil finansial adalah awal dari kebebasan finansial sejati."</span>
            </div>
            <div class="user-credit">
              <span>Disusun dengan bangga untuk: <strong>Andri Hermawan</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .executive-report-wrapper {
    margin-bottom: 2.5rem;
  }

  .report-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
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
    background: linear-gradient(135deg, #10b981, #06b6d4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .period-pill {
    font-size: 0.75rem;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
    font-weight: 600;
    border: 1px solid rgba(16, 185, 129, 0.25);
  }

  .subtitle {
    font-size: 0.88rem;
    color: var(--text-secondary);
    margin: 0.35rem 0 0 0;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    flex-wrap: wrap;
  }

  .report-tab-toggle {
    display: flex;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 0.3rem;
    gap: 0.3rem;
  }

  .toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.95rem;
    font-size: 0.82rem;
    font-weight: 600;
    border-radius: 9px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .toggle-btn.active {
    background: var(--bg-main);
    color: var(--text-primary);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }

  .btn-print-action, .btn-celebrate-action {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.15rem;
    font-size: 0.86rem;
    font-weight: 700;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .btn-print-action {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3);
  }

  .btn-celebrate-action {
    background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(168, 85, 247, 0.3);
  }

  /* Printable Sheet Styles (Dark Mode on Screen, Pristine White on Print) */
  .printable-statement-sheet {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 2.5rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
    max-width: 900px;
    margin: 0 auto;
    font-family: inherit;
  }

  .statement-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .company-brand {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .sub-brand-text {
    font-size: 0.78rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .document-metadata {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .doc-badge {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    background: rgba(14, 165, 233, 0.12);
    color: #0ea5e9;
    border: 1px solid rgba(14, 165, 233, 0.3);
    margin-bottom: 0.6rem;
  }

  .meta-mini-table {
    font-size: 0.78rem;
    color: var(--text-secondary);
  }

  .meta-mini-table td {
    padding: 0.15rem 0.4rem;
  }

  .statement-divider {
    border-bottom: 1px solid var(--border-color);
    margin: 1.8rem 0;
  }

  /* Scorecard */
  .statement-metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 1rem;
    margin-bottom: 1.8rem;
  }

  .stat-card {
    border-radius: 14px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border-color);
  }

  .green-tint { background: rgba(16, 185, 129, 0.06); border-color: rgba(16, 185, 129, 0.2); }
  .rose-tint { background: rgba(244, 63, 94, 0.06); border-color: rgba(244, 63, 94, 0.2); }
  .blue-tint { background: rgba(14, 165, 233, 0.06); border-color: rgba(14, 165, 233, 0.2); }

  .stat-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .stat-num {
    font-size: 1.45rem;
    font-weight: 800;
    margin: 0.35rem 0;
  }

  .stat-note {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .text-emerald { color: #10b981; }
  .text-rose { color: #f43f5e; }
  .text-cyan { color: #0ea5e9; }

  /* Tables */
  .statement-section-box {
    margin-top: 1.8rem;
  }

  .section-title {
    font-size: 0.96rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.85rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .statement-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  .statement-table th {
    text-align: left;
    padding: 0.65rem 0.85rem;
    background: var(--bg-hover);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.78rem;
    border-bottom: 2px solid var(--border-color);
  }

  .statement-table td {
    padding: 0.75rem 0.85rem;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
  }

  .text-right { text-align: right; }

  .cat-color-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 0.4rem;
  }

  .percent-bar-wrapper {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .percent-track {
    flex: 1;
    height: 6px;
    background: var(--bg-hover);
    border-radius: 999px;
    overflow: hidden;
  }

  .percent-fill { height: 100%; border-radius: 999px; }

  .status-pill {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
  }

  .normal-pill { background: rgba(16, 185, 129, 0.12); color: #10b981; }
  .warning-pill { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }

  .type-tag {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .total-row td {
    font-size: 0.9rem;
    border-top: 2px solid var(--border-color);
    padding: 1rem 0.85rem;
    background: var(--bg-hover);
  }

  /* Advisory Notes */
  .advisory-notes-box {
    background: rgba(14, 165, 233, 0.05);
    border: 1px solid rgba(14, 165, 233, 0.2);
    border-radius: 14px;
    padding: 1.25rem;
  }

  .advisory-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #0ea5e9;
    margin-bottom: 0.4rem;
  }

  .advisory-header h5 {
    font-size: 0.88rem;
    font-weight: 700;
    margin: 0;
  }

  .advisory-notes-box p {
    font-size: 0.82rem;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  /* Footer & Signature */
  .statement-footer-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 2.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color);
    flex-wrap: wrap;
    gap: 1.25rem;
  }

  .signature-box {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .sig-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .sig-stamp {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.78rem;
    font-weight: 800;
    color: #10b981;
    border: 1px dashed rgba(16, 185, 129, 0.4);
    padding: 0.4rem 0.8rem;
    border-radius: 8px;
  }

  .sig-date {
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .footer-legal {
    font-size: 0.72rem;
    color: var(--text-muted);
    text-align: right;
  }

  .footer-legal p { margin: 0.15rem 0; }

  /* FINORA MONTHLY WRAPPED STYLES */
  .wrapped-showcase {
    display: flex;
    justify-content: center;
  }

  .wrapped-card {
    width: 100%;
    max-width: 520px;
    background: linear-gradient(145deg, #0b0f19 0%, #1e1b4b 50%, #0f172a 100%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 28px;
    padding: 2.2rem;
    color: #ffffff;
    box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.6);
    position: relative;
    overflow: hidden;
  }

  .glow-orb {
    position: absolute;
    width: 250px;
    height: 250px;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.4;
    pointer-events: none;
  }

  .orb-1 { top: -40px; right: -40px; background: #ec4899; }
  .orb-2 { bottom: -40px; left: -40px; background: #06b6d4; }

  .wrapped-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .wrapped-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .wrapped-badge {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .wrapped-hero-title span {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.75;
  }

  .wrapped-hero-title h2 {
    font-size: 1.6rem;
    font-weight: 800;
    margin: 0.25rem 0 0 0;
    background: linear-gradient(90deg, #ffffff, #67e8f9, #f472b6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .wrapped-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .wrapped-tile {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 18px;
    padding: 1.15rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    backdrop-filter: blur(10px);
  }

  .tile-tag {
    font-size: 0.72rem;
    opacity: 0.75;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tile-val {
    font-size: 1.35rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .tile-desc {
    font-size: 0.72rem;
    opacity: 0.7;
    margin: 0;
    line-height: 1.35;
  }

  .highlight-green { color: #34d399; }
  .highlight-cyan { color: #38bdf8; }
  .highlight-purple { color: #c084fc; }
  .highlight-amber { color: #fbbf24; }

  .quote-box {
    background: rgba(0, 0, 0, 0.3);
    border-left: 3px solid #38bdf8;
    padding: 0.75rem 1rem;
    border-radius: 0 12px 12px 0;
    font-size: 0.8rem;
    font-style: italic;
    opacity: 0.85;
    display: flex;
    gap: 0.5rem;
  }

  .user-credit {
    text-align: center;
    font-size: 0.75rem;
    opacity: 0.7;
    margin-top: 0.8rem;
  }

  /* MEDIA PRINT STYLES */
  @media print {
    :global(body) {
      background: #ffffff !important;
      color: #000000 !important;
    }

    .no-print, :global(.navbar-wrapper), :global(.mobile-dock), :global(footer) {
      display: none !important;
    }

    .printable-statement-sheet {
      background: #ffffff !important;
      color: #000000 !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      max-width: 100% !important;
    }

    .statement-table th {
      background: #f1f5f9 !important;
      color: #000000 !important;
    }

    .statement-table td {
      color: #000000 !important;
      border-bottom: 1px solid #cbd5e1 !important;
    }

    .stat-card, .advisory-notes-box {
      border: 1px solid #cbd5e1 !important;
      background: #f8fafc !important;
      color: #000000 !important;
    }
  }

  @media (max-width: 640px) {
    .printable-statement-sheet {
      padding: 1.25rem;
    }
    .wrapped-grid {
      grid-template-columns: 1fr;
    }
    .footer-legal {
      text-align: left;
    }
  }

  :global([data-theme="light"]) .printable-statement-sheet {
    background: #ffffff !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
    color: #0f172a !important;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.06) !important;
  }

  :global([data-theme="light"]) .section-title {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .statement-table th {
    background: #f1f5f9 !important;
    color: #334155 !important;
    border-bottom-color: rgba(148, 163, 184, 0.35) !important;
  }

  :global([data-theme="light"]) .statement-table td {
    color: #0f172a !important;
    border-bottom-color: rgba(148, 163, 184, 0.2) !important;
  }

  :global([data-theme="light"]) .advisory-notes-box {
    background: #f8fafc !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
    color: #334155 !important;
  }

  :global([data-theme="light"]) .advisory-notes-box h5 {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .report-tab-toggle {
    background: #f1f5f9 !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
  }

  :global([data-theme="light"]) .toggle-btn {
    color: #475569 !important;
  }

  :global([data-theme="light"]) .toggle-btn.active {
    background: #ffffff !important;
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .sub-brand-text {
    color: #475569 !important;
  }

  :global([data-theme="light"]) .meta-mini-table {
    color: #475569 !important;
  }
</style>
