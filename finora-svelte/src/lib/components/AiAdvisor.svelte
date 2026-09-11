<script>
  import {
    summaryMetrics,
    categoryBreakdown,
    budgets,
    goals,
    transactions,
    currency,
    formatCurrency,
    isPrivacyMode
  } from '$lib/stores.js';

  $: income = $summaryMetrics.totalIncome;
  $: expense = $summaryMetrics.totalExpense;
  $: net = $summaryMetrics.netBalance;
  $: savingsRate = $summaryMetrics.savingsRate;

  // Compute AI Financial Health Score (0 - 100)
  $: healthScore = (() => {
    let score = 50; // base score
    if (income > 0) {
      // Savings rate contribution (max +35 points)
      score += Math.min(35, Math.round(savingsRate * 0.7));
      // Surplus bonus
      if (net > 0) score += 10;
      else score -= 25;
    }
    // Budget violations penalty
    const exceededBudgets = $budgets.filter((b) => {
      const spent = $transactions
        .filter((t) => t.type === 'expense' && t.category === b.category)
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      return spent > Number(b.monthly_limit);
    });
    score -= exceededBudgets.length * 8;

    return Math.max(10, Math.min(99, score));
  })();

  $: healthStatus = (() => {
    if (healthScore >= 85) return { text: 'Sangat Prima (Financially Robust)', color: '#10b981', icon: 'fa-shield-heart' };
    if (healthScore >= 70) return { text: 'Sehat & Stabil', color: '#06b6d4', icon: 'fa-thumbs-up' };
    if (healthScore >= 50) return { text: 'Cukup (Perlu Waspada)', color: '#f59e0b', icon: 'fa-triangle-exclamation' };
    return { text: 'Defisit / Berisiko', color: '#f43f5e', icon: 'fa-circle-exclamation' };
  })();

  // Dynamic AI Insights based on user transactions
  $: topExpenseCategory = $categoryBreakdown.length > 0 ? $categoryBreakdown[0] : null;

  $: dailySafeSpend = (() => {
    const daysInMonth = 30;
    const remainingBudget = Math.max(0, net);
    return Math.round(remainingBudget / daysInMonth);
  })();

  // Interactive AI Chat Assistant State
  let chatMessages = [
    {
      sender: 'ai',
      text: 'Halo! Saya Finora AI Advisor. Saya telah menganalisis keuangan Anda secara real-time. Ada yang ingin Anda diskusikan atau tanyakan tentang arus kas Anda?'
    }
  ];
  let userQuery = '';
  let isTyping = false;

  function askAi(question) {
    userQuery = question;
    handleSendMessage();
  }

  function handleSendMessage() {
    if (!userQuery.trim()) return;

    const q = userQuery.trim();
    chatMessages = [...chatMessages, { sender: 'user', text: q }];
    userQuery = '';
    isTyping = true;

    setTimeout(() => {
      let reply = generateAiAnswer(q);
      chatMessages = [...chatMessages, { sender: 'ai', text: reply }];
      isTyping = false;
    }, 600);
  }

  function generateAiAnswer(q) {
    const qLower = q.toLowerCase();

    if (qLower.includes('aman') || qLower.includes('harian') || qLower.includes('budget') || qLower.includes('belanja')) {
      return `Berdasarkan saldo surplus Anda saat ini (${formatCurrency(net, $currency)}), alokasi pengeluaran harian yang aman untuk sisa bulan ini adalah sekitar **${formatCurrency(dailySafeSpend, $currency)} per hari**. Pastikan tidak melebihi ini agar rasio tabungan tetap positif!`;
    }

    if (qLower.includes('terbesar') || qLower.includes('banyak') || qLower.includes('boros')) {
      if (topExpenseCategory) {
        return `Pengeluaran terbesar Anda saat ini berada di kategori **${topExpenseCategory.category}** dengan total **${formatCurrency(topExpenseCategory.amount, $currency)}** (${topExpenseCategory.percentage}% dari seluruh pengeluaran). Mengurangi 10-15% dari pos ini akan menghemat ratusan ribu rupiah!`;
      }
      return 'Belum ada data pengeluaran yang cukup untuk mendeteksi pos terbesar.';
    }

    if (qLower.includes('target') || qLower.includes('tabungan') || qLower.includes('impian')) {
      if ($goals.length > 0) {
        const g = $goals[0];
        const sisa = Math.max(0, g.target_amount - g.current_amount);
        return `Untuk target utama Anda **"${g.name}"**, masih dibutuhkan **${formatCurrency(sisa, $currency)}**. Dengan surplus tabungan Anda yang mencapai ${savingsRate}%, target ini berada dalam trek yang sangat positif untuk tercapai tepat waktu! 🎯`;
      }
      return 'Anda belum menetapkan target tabungan. Silakan buat di menu Target Tabungan.';
    }

    if (qLower.includes('tips') || qLower.includes('hemat') || qLower.includes('saran')) {
      return `Berikut 3 rekomendasi cerdas dari Finora AI untuk Anda:
1. Terapkan metode alokasi 50/30/20 (50% Kebutuhan, 30% Keinginan, 20% Tabungan/Investasi).
2. Periksa langganan rutin (Tagihan/Wifi/Streaming) yang tidak terpakai optimal.
3. Sisihkan uang tabungan di awal gajian, bukan menunggu sisa akhir bulan!`;
    }

    return `Finora AI mendeteksi arus kas Anda saat ini memiliki rasio tabungan sebesar **${savingsRate}%** dengan total pemasukan ${formatCurrency(income, $currency)} dan pengeluaran ${formatCurrency(expense, $currency)}. Pertahankan tren positif ini untuk menjaga skor finansial Anda tetap prima! 🚀`;
  }
</script>

<div class="ai-advisor-wrapper glass-panel">
  <div class="advisor-header">
    <div class="title-col">
      <div class="badge-title">
        <span class="ai-sparkle"><i class="fa-solid fa-brain"></i></span>
        <h3>Finora AI Financial Copilot</h3>
        <span class="version-tag">GPT Smart Model</span>
      </div>
      <p class="sub">Diagnosis kesehatan finansial, rekomendasi taktis, dan konsultan keuangan otomatis</p>
    </div>

    <!-- Health Score Badge -->
    <div class="score-card" style="border-color: {healthStatus.color}40; background: {healthStatus.color}10;">
      <div class="score-circle" style="border-color: {healthStatus.color}; color: {healthStatus.color};">
        <span>{healthScore}</span>
      </div>
      <div class="score-details">
        <span class="score-lbl">Skor Finansial</span>
        <span class="score-status" style="color: {healthStatus.color};">
          <i class="fa-solid {healthStatus.icon}"></i> {healthStatus.text}
        </span>
      </div>
    </div>
  </div>

  <!-- 3 Strategic AI Insights Cards -->
  <div class="insights-grid">
    <!-- Card 1: Pengeluaran Terbesar -->
    <div class="insight-card">
      <div class="card-icon-wrap bg-amber">
        <i class="fa-solid fa-chart-pie"></i>
      </div>
      <div class="insight-content">
        <h4>Pos Pengeluaran Terbesar</h4>
        <p>
          {#if topExpenseCategory}
            Kategori <strong>{topExpenseCategory.category}</strong> memakan <strong>{topExpenseCategory.percentage}%</strong> total belanja ({formatCurrency(topExpenseCategory.amount, $currency)}).
          {:else}
            Belum ada pengeluaran yang terdeteksi.
          {/if}
        </p>
        <span class="action-hint"><i class="fa-solid fa-lightbulb text-amber"></i> AI Tip: Alokasikan batas anggaran di kategori ini.</span>
      </div>
    </div>

    <!-- Card 2: Batas Belanja Harian -->
    <div class="insight-card">
      <div class="card-icon-wrap bg-cyan">
        <i class="fa-solid fa-calculator"></i>
      </div>
      <div class="insight-content">
        <h4>Batas Belanja Harian Aman</h4>
        <p>
          Untuk mempertahankan surplus, batas pengeluaran harian ideal Anda adalah:
        </p>
        <div class="safe-num">
          {$isPrivacyMode ? '••••' : formatCurrency(dailySafeSpend, $currency)} <span class="per-day">/ hari</span>
        </div>
        <span class="action-hint"><i class="fa-solid fa-shield text-cyan"></i> Menjaga Anda dari pengeluaran impulsif.</span>
      </div>
    </div>

    <!-- Card 3: Proyeksi Target Tabungan -->
    <div class="insight-card">
      <div class="card-icon-wrap bg-emerald">
        <i class="fa-solid fa-rocket"></i>
      </div>
      <div class="insight-content">
        <h4>Proyeksi Target Impian</h4>
        <p>
          {#if $goals.length > 0}
            Target <strong>"{$goals[0].name}"</strong> sudah terkumpul <strong>{Math.round(($goals[0].current_amount / $goals[0].target_amount) * 100)}%</strong>.
          {:else}
            Belum ada target tabungan yang aktif.
          {/if}
        </p>
        <span class="action-hint"><i class="fa-solid fa-circle-check text-emerald"></i> On Track! Disiplin menabung membuahkan hasil.</span>
      </div>
    </div>
  </div>

  <!-- Interactive AI Chat Assistant Box -->
  <div class="ai-chat-box">
    <div class="chat-header">
      <div class="chat-title">
        <i class="fa-solid fa-comments text-primary"></i>
        <span>Tanya Langsung ke Finora AI Advisor</span>
      </div>
      <div class="quick-prompts">
        <button class="prompt-pill" on:click={() => askAi('Berapa batas belanja harian yang aman untuk saya?')}>
          Batas belanja aman?
        </button>
        <button class="prompt-pill" on:click={() => askAi('Apa pos pengeluaran terbesar saya bulan ini?')}>
          Pengeluaran terbesar?
        </button>
        <button class="prompt-pill" on:click={() => askAi('Berikan 3 tips berhemat berdasarkan data saya')}>
          Tips hemat?
        </button>
      </div>
    </div>

    <!-- Message stream -->
    <div class="chat-messages-container">
      {#each chatMessages as msg}
        <div class="chat-bubble-row {msg.sender}">
          {#if msg.sender === 'ai'}
            <div class="ai-avatar">
              <i class="fa-solid fa-robot"></i>
            </div>
          {/if}
          <div class="chat-bubble {msg.sender}">
            <p>{msg.text}</p>
          </div>
        </div>
      {/each}

      {#if isTyping}
        <div class="chat-bubble-row ai">
          <div class="ai-avatar"><i class="fa-solid fa-robot"></i></div>
          <div class="chat-bubble ai typing">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>
      {/if}
    </div>

    <!-- Chat Input -->
    <form on:submit|preventDefault={handleSendMessage} class="chat-input-bar">
      <input
        type="text"
        bind:value={userQuery}
        placeholder="Tanyakan analisis keuangan, simulasi belanja, atau tips menabung..."
        class="input-custom chat-input"
      />
      <button type="submit" class="btn btn-primary send-btn" disabled={!userQuery.trim()}>
        <i class="fa-solid fa-arrow-up"></i>
      </button>
    </form>
  </div>
</div>

<style>
  .ai-advisor-wrapper {
    padding: 28px;
    margin-bottom: 28px;
    border: 1px solid var(--border-glass);
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    transition: background 0.25s ease, border-color 0.25s ease;
  }

  .advisor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .badge-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }

  .ai-sparkle {
    color: #a855f7;
    font-size: 1.2rem;
  }

  .badge-title h3 {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--text-main);
  }

  .version-tag {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    background: rgba(168, 85, 247, 0.15);
    color: #a855f7;
    border: 1px solid rgba(168, 85, 247, 0.3);
  }

  .sub {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .score-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 18px;
    border-radius: var(--radius-lg);
    border: 1px solid transparent;
  }

  .score-circle {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 3px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 800;
  }

  .score-details {
    display: flex;
    flex-direction: column;
  }

  .score-lbl {
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .score-status {
    font-size: 0.85rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* 3 Grid cards */
  .insights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .insight-card {
    padding: 18px;
    background: var(--tag-bg);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    display: flex;
    gap: 14px;
    transition: all 0.2s ease;
  }

  .insight-card:hover {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.25);
  }

  .card-icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .bg-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
  .bg-cyan { background: rgba(6, 182, 212, 0.15); color: #38bdf8; }
  .bg-emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; }

  .insight-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .insight-content h4 {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .insight-content p {
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.45;
  }

  .safe-num {
    font-size: 1.15rem;
    font-weight: 800;
    color: #0284c7;
    margin: 2px 0;
  }

  [data-theme="dark"] .safe-num {
    color: #38bdf8;
  }

  .per-day {
    font-size: 0.75rem;
    color: var(--text-dim);
    font-weight: 500;
  }

  .action-hint {
    font-size: 0.72rem;
    color: var(--text-muted);
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* Chat Box */
  .ai-chat-box {
    background: var(--bg-surface);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    transition: background 0.25s ease, border-color 0.25s ease;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .chat-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .quick-prompts {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .prompt-pill {
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

  .prompt-pill:hover {
    background: rgba(99, 102, 241, 0.12);
    color: var(--primary);
    border-color: var(--primary);
  }

  .chat-messages-container {
    max-height: 240px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-right: 6px;
  }

  .chat-bubble-row {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .chat-bubble-row.user {
    justify-content: flex-end;
  }

  .ai-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--primary-gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    color: white;
    flex-shrink: 0;
  }

  .chat-bubble {
    padding: 10px 16px;
    border-radius: var(--radius-md);
    font-size: 0.83rem;
    line-height: 1.5;
    max-width: 80%;
  }

  .chat-bubble.ai {
    background: var(--tag-bg);
    border: 1px solid var(--border-glass);
    color: var(--text-main);
  }

  .chat-bubble.user {
    background: var(--primary-gradient);
    color: white !important;
  }

  .chat-bubble.typing {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 12px 18px;
  }

  .dot {
    width: 6px;
    height: 6px;
    background: #a5b4fc;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
  }

  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }

  .chat-input-bar {
    display: flex;
    gap: 8px;
  }

  .chat-input {
    flex: 1;
    padding: 10px 14px;
    font-size: 0.85rem;
    background: var(--input-bg);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    color: var(--text-main);
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
  }

  .chat-input:focus {
    border-color: var(--primary);
  }

  .send-btn {
    width: 42px;
    height: 42px;
    padding: 0;
    border-radius: var(--radius-md);
  }
</style>
