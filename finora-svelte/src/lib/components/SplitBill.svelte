<script>
  import { wallets, currency, formatCurrency, addDebt } from '../stores.js';
  import { emitAddTransaction } from '../socket.js';
  import confetti from 'canvas-confetti';

  let splitMode = 'equal'; // 'equal' | 'itemized'
  let billTitle = 'Nongkrong Bareng';
  let locationName = 'Cafe / Resto';
  let bankAccountInfo = 'BCA: 8830-1928-44 an Andri';
  let selectedPayerWalletId = '';
  let billSuccessMsg = '';

  $: if ($wallets.length > 0 && !selectedPayerWalletId) {
    selectedPayerWalletId = $wallets[0].id;
  }

  // Equal Mode State
  let subtotalAmount = 240000;
  let taxPercent = 10;
  let servicePercent = 5;
  let discountAmount = 0;

  // People in the bill
  let people = [
    { id: 'p1', name: 'Saya (Pembalap Bill)', isPayer: true, recordedAsDebt: false },
    { id: 'p2', name: 'Budi Santoso', isPayer: false, recordedAsDebt: false },
    { id: 'p3', name: 'Siti Rahma', isPayer: false, recordedAsDebt: false },
    { id: 'p4', name: 'Rian Pratama', isPayer: false, recordedAsDebt: false }
  ];
  let newPersonName = '';

  // Itemized Mode State
  let menuItems = [
    { id: 'i1', name: 'Nasi Goreng Spesial', price: 45000, qty: 1, assignedTo: ['p1'] },
    { id: 'i2', name: 'Beef Burger & Fries', price: 65000, qty: 1, assignedTo: ['p2'] },
    { id: 'i3', name: 'Pasta Carbonara', price: 55000, qty: 1, assignedTo: ['p3'] },
    { id: 'i4', name: 'Iced Caffe Latte', price: 35000, qty: 2, assignedTo: ['p1', 'p4'] },
    { id: 'i5', name: 'Kentang Goreng Platter', price: 40000, qty: 1, assignedTo: ['p1', 'p2', 'p3', 'p4'] }
  ];

  let newItemName = '';
  let newItemPrice = '';
  let newItemQty = 1;
  let newItemAssigned = [];

  // Calculations
  $: calculatedSubtotal = splitMode === 'equal'
    ? Number(subtotalAmount) || 0
    : menuItems.reduce((sum, it) => sum + (Number(it.price) * Number(it.qty)), 0);

  $: taxAmount = Math.round((calculatedSubtotal * (Number(taxPercent) || 0)) / 100);
  $: serviceAmount = Math.round((calculatedSubtotal * (Number(servicePercent) || 0)) / 100);
  $: grandTotal = Math.max(0, calculatedSubtotal + taxAmount + serviceAmount - (Number(discountAmount) || 0));

  // Multiplier for tax & service markup ratio
  $: markupMultiplier = calculatedSubtotal > 0 ? (grandTotal / calculatedSubtotal) : 1;

  // Per Person Breakdown Calculation
  $: breakdownList = people.map((person) => {
    if (splitMode === 'equal') {
      const share = people.length > 0 ? Math.round(grandTotal / people.length) : 0;
      return {
        ...person,
        subtotalShare: Math.round(calculatedSubtotal / (people.length || 1)),
        totalShare: share
      };
    } else {
      // Calculate from itemized
      let myItemSubtotal = 0;
      menuItems.forEach((item) => {
        if (item.assignedTo.includes(person.id)) {
          const splitCount = item.assignedTo.length || 1;
          const portionPrice = (Number(item.price) * Number(item.qty)) / splitCount;
          myItemSubtotal += portionPrice;
        }
      });
      const myTotalShare = Math.round(myItemSubtotal * markupMultiplier);
      return {
        ...person,
        subtotalShare: Math.round(myItemSubtotal),
        totalShare: myTotalShare
      };
    }
  });

  function addPerson() {
    if (!newPersonName.trim()) return;
    people = [
      ...people,
      {
        id: 'p-' + Date.now(),
        name: newPersonName.trim(),
        isPayer: false,
        recordedAsDebt: false
      }
    ];
    newPersonName = '';
  }

  function removePerson(id) {
    if (people.length <= 1) return;
    people = people.filter((p) => p.id !== id);
    // Remove from assigned items
    menuItems = menuItems.map((it) => ({
      ...it,
      assignedTo: it.assignedTo.filter((pid) => pid !== id)
    }));
  }

  function addItem() {
    if (!newItemName.trim() || !Number(newItemPrice)) return;
    const assigned = newItemAssigned.length > 0 ? newItemAssigned : [people[0].id];
    menuItems = [
      ...menuItems,
      {
        id: 'i-' + Date.now(),
        name: newItemName.trim(),
        price: Number(newItemPrice),
        qty: Number(newItemQty) || 1,
        assignedTo: assigned
      }
    ];
    newItemName = '';
    newItemPrice = '';
    newItemQty = 1;
    newItemAssigned = [];
  }

  function removeItem(id) {
    menuItems = menuItems.filter((i) => i.id !== id);
  }

  function togglePersonOnItem(item, personId) {
    menuItems = menuItems.map((it) => {
      if (it.id === item.id) {
        const has = it.assignedTo.includes(personId);
        const next = has
          ? it.assignedTo.filter((p) => p !== personId)
          : [...it.assignedTo, personId];
        return { ...it, assignedTo: next.length > 0 ? next : [personId] };
      }
      return it;
    });
  }

  // 1-Click Save as Receivable / Piutang
  function saveAsReceivable(person) {
    const shareAmt = person.totalShare;
    if (shareAmt <= 0) return;

    addDebt({
      personName: person.name,
      type: 'receivable',
      amount: shareAmt,
      paidAmount: 0,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      phone: '',
      note: `Split bill: ${billTitle} (${locationName})`
    });

    people = people.map((p) => (p.id === person.id ? { ...p, recordedAsDebt: true } : p));

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 }
    });
  }

  // 1-Click Log Entire Bill as Expense Transaction & deduct wallet
  async function recordBillAsExpense() {
    if (grandTotal <= 0) return;

    const chosenWallet = $wallets.find((w) => w.id === selectedPayerWalletId) || $wallets[0];

    const tx = {
      description: `Split Bill: ${billTitle} (${locationName})`,
      amount: grandTotal,
      category: 'Makanan & Minuman',
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      payment_method: 'QRIS',
      walletId: chosenWallet ? chosenWallet.id : '',
      notes: `Talangan patungan ${people.length} orang. Ditalangi oleh ${people[0]?.name || 'Saya'}`
    };

    await emitAddTransaction(tx);

    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 }
    });

    billSuccessMsg = `Total talangan ${formatCurrency(grandTotal, $currency)} berhasil dicatat ke transaksi dan memotong rekening "${chosenWallet?.name || 'Dompet'}"!`;
    setTimeout(() => {
      billSuccessMsg = '';
    }, 5000);
  }

  // Generate & Open WhatsApp share message
  function shareToWhatsApp() {
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    let lines = [];
    lines.push(`🧾 *RINCIAN PATUNGAN FINORA*`);
    lines.push(`📍 *Acara:* ${billTitle} (${locationName})`);
    lines.push(`📅 *Tanggal:* ${today}`);
    lines.push(`💵 *Total Tagihan:* ${formatCurrency(grandTotal, $currency)}`);
    lines.push(`---------------------------------`);
    lines.push(`*Rincian Tagihan per Orang:*`);

    breakdownList.forEach((b, idx) => {
      const mark = b.isPayer ? '👑 (Talangan)' : '';
      lines.push(`${idx + 1}. ${b.name} ${mark}: *${formatCurrency(b.totalShare, $currency)}*`);
    });

    lines.push(`---------------------------------`);
    if (bankAccountInfo.trim()) {
      lines.push(`💳 *Silakan transfer ke:*`);
      lines.push(`${bankAccountInfo.trim()}`);
    }
    lines.push(`\nTerima kasih semuanya! 🙏✨`);

    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  function copyTextSummary() {
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    let lines = [];
    lines.push(`🧾 RINCIAN PATUNGAN FINORA`);
    lines.push(`Acara: ${billTitle} (${locationName})`);
    lines.push(`Tanggal: ${today}`);
    lines.push(`Total Tagihan: ${formatCurrency(grandTotal, $currency)}`);
    lines.push(`---------------------------------`);
    breakdownList.forEach((b, idx) => {
      lines.push(`${idx + 1}. ${b.name}: ${formatCurrency(b.totalShare, $currency)}`);
    });
    lines.push(`---------------------------------`);
    if (bankAccountInfo.trim()) {
      lines.push(`Transfer ke: ${bankAccountInfo.trim()}`);
    }

    navigator.clipboard.writeText(lines.join('\n'));
    alert('Rincian tagihan berhasil disalin ke clipboard!');
  }
</script>

<div class="split-bill-section">
  <!-- Section Header -->
  <div class="section-header">
    <div class="header-info">
      <div class="title-with-pill">
        <h2>
          <i class="fa-solid fa-users-viewfinder gradient-icon"></i>
          Split Bill & Patungan Nongkrong
        </h2>
        <span class="count-pill">{people.length} Orang Terlibat</span>
      </div>
      <p class="subtitle">
        Hitung patungan makan bersama secara akurat (bagi rata / per item menu + pajak), kirim ke WhatsApp, dan catat ke piutang.
      </p>
    </div>

    <!-- Mode Switcher -->
    <div class="mode-toggle-bar">
      <button
        class="mode-btn"
        class:active={splitMode === 'equal'}
        on:click={() => (splitMode = 'equal')}
      >
        <i class="fa-solid fa-scale-balanced"></i>
        <span>Bagi Rata (Equal)</span>
      </button>
      <button
        class="mode-btn"
        class:active={splitMode === 'itemized'}
        on:click={() => (splitMode = 'itemized')}
      >
        <i class="fa-solid fa-list-ol"></i>
        <span>Bagi per Item Menu</span>
      </button>
    </div>
  </div>

  <div class="split-layout-grid">
    <!-- Left: Inputs & Configuration -->
    <div class="config-panel">
      <!-- Event & Location Details -->
      <div class="card-box">
        <h4 class="box-title">
          <i class="fa-solid fa-pen-to-square text-cyan"></i> Detail Acara & Tagihan
        </h4>
        <div class="grid-2-col mt-2">
          <div class="form-group">
            <label for="sb-title">Nama Acara</label>
            <input id="sb-title" type="text" class="input-field" bind:value={billTitle} />
          </div>
          <div class="form-group">
            <label for="sb-loc">Lokasi Tempat</label>
            <input id="sb-loc" type="text" class="input-field" bind:value={locationName} />
          </div>
        </div>

        {#if splitMode === 'equal'}
          <!-- Equal Mode Subtotal -->
          <div class="form-group mt-2">
            <label for="sb-subtotal">Subtotal Tagihan (Sebelum Pajak)</label>
            <div class="cur-box">
              <span class="prefix">Rp</span>
              <input
                id="sb-subtotal"
                type="number"
                class="input-field cur-input"
                bind:value={subtotalAmount}
              />
            </div>
          </div>
        {/if}

        <!-- Tax, Service, Discount -->
        <div class="grid-3-col mt-2">
          <div class="form-group">
            <label for="sb-tax">Pajak PB1 (%)</label>
            <input id="sb-tax" type="number" class="input-field" bind:value={taxPercent} />
          </div>
          <div class="form-group">
            <label for="sb-service">Service (%)</label>
            <input id="sb-service" type="number" class="input-field" bind:value={servicePercent} />
          </div>
          <div class="form-group">
            <label for="sb-disc">Diskon (Rp)</label>
            <input id="sb-disc" type="number" class="input-field" bind:value={discountAmount} />
          </div>
        </div>

        <!-- Bank Account for Transfer Info -->
        <div class="form-group mt-2">
          <label for="sb-bank">Info Rekening Tujuan Transfer (Untuk Pesan WA)</label>
          <input
            id="sb-bank"
            type="text"
            class="input-field"
            placeholder="Contoh: BCA 8830-1928-44 a.n Andri / GoPay 0812..."
            bind:value={bankAccountInfo}
          />
        </div>
      </div>

      <!-- People Management -->
      <div class="card-box mt-3">
        <div class="box-title-row">
          <h4 class="box-title">
            <i class="fa-solid fa-user-group text-purple"></i> Daftar Teman ({people.length})
          </h4>
        </div>

        <!-- Add Person Form -->
        <div class="add-inline-row mt-2">
          <input
            type="text"
            class="input-field"
            placeholder="Nama teman baru..."
            bind:value={newPersonName}
            on:keydown={(e) => e.key === 'Enter' && addPerson()}
          />
          <button class="btn-add-inline" on:click={addPerson}>
            <i class="fa-solid fa-plus"></i> Tambah
          </button>
        </div>

        <!-- Chips of People -->
        <div class="people-pills-list mt-2">
          {#each people as p (p.id)}
            <div class="person-tag-pill" class:is-payer={p.isPayer}>
              <span class="person-pill-name">{p.name}</span>
              {#if !p.isPayer}
                <button
                  class="remove-pill-btn"
                  title="Hapus orang"
                  on:click={() => removePerson(p.id)}
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- If Itemized Mode: Itemized Menu Entry -->
      {#if splitMode === 'itemized'}
        <div class="card-box mt-3">
          <h4 class="box-title">
            <i class="fa-solid fa-utensils text-orange"></i> Rincian Menu Pesanan
          </h4>

          <!-- Add Item Row -->
          <div class="item-input-grid mt-2">
            <input
              type="text"
              class="input-field"
              placeholder="Nama menu (misal: Iced Matcha)"
              bind:value={newItemName}
            />
            <input
              type="number"
              class="input-field"
              placeholder="Harga (Rp)"
              bind:value={newItemPrice}
            />
            <button class="btn-add-inline" on:click={addItem}>
              <i class="fa-solid fa-plus"></i> Tambah Menu
            </button>
          </div>

          <!-- Items Table / List -->
          <div class="menu-items-table mt-3">
            {#each menuItems as item (item.id)}
              <div class="menu-item-card">
                <div class="item-meta">
                  <span class="item-title">{item.name}</span>
                  <span class="item-price">
                    {formatCurrency(item.price, $currency)} x {item.qty} = {formatCurrency(item.price * item.qty, $currency)}
                  </span>
                </div>

                <!-- Assigned People Badges for this item -->
                <div class="assigned-chips-row">
                  <span class="assign-label">Dimakan oleh:</span>
                  {#each people as p}
                    <button
                      type="button"
                      class="assign-chip"
                      class:selected={item.assignedTo.includes(p.id)}
                      on:click={() => togglePersonOnItem(item, p.id)}
                    >
                      {p.name.split(' ')[0]}
                    </button>
                  {/each}
                  <button
                    class="btn-trash-item"
                    title="Hapus menu"
                    on:click={() => removeItem(item.id)}
                  >
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Right: Calculation Summary & WhatsApp Export -->
    <div class="summary-panel">
      <div class="receipt-summary-card">
        <div class="summary-header">
          <div class="summary-brand">
            <i class="fa-solid fa-receipt"></i>
            <div>
              <h3>Kalkulasi Patungan</h3>
              <p>{billTitle} • {locationName}</p>
            </div>
          </div>
          <span class="split-mode-badge">{splitMode === 'equal' ? 'Bagi Rata' : 'Per Item Menu'}</span>
        </div>

        <!-- Bill Totals Breakdown -->
        <div class="sub-totals-box">
          <div class="stat-line">
            <span>Subtotal Makanan & Minuman</span>
            <span>{formatCurrency(calculatedSubtotal, $currency)}</span>
          </div>
          {#if taxAmount > 0}
            <div class="stat-line">
              <span>Pajak Resto PB1 ({taxPercent}%)</span>
              <span>+{formatCurrency(taxAmount, $currency)}</span>
            </div>
          {/if}
          {#if serviceAmount > 0}
            <div class="stat-line">
              <span>Biaya Layanan Service ({servicePercent}%)</span>
              <span>+{formatCurrency(serviceAmount, $currency)}</span>
            </div>
          {/if}
          {#if discountAmount > 0}
            <div class="stat-line discount-line">
              <span>Diskon Promo</span>
              <span>-{formatCurrency(discountAmount, $currency)}</span>
            </div>
          {/if}
          <div class="divider"></div>
          <div class="stat-line grand-total-line">
            <span>TOTAL AKHIR TAGIHAN</span>
            <span class="grand-amt">{formatCurrency(grandTotal, $currency)}</span>
          </div>
        </div>

        <!-- Individual Share Breakdown Cards -->
        <h4 class="breakdown-title">
          <i class="fa-solid fa-hand-holding-dollar"></i> Tagihan per Orang:
        </h4>
        <div class="breakdown-items-list">
          {#each breakdownList as person (person.id)}
            <div class="breakdown-card" class:payer-border={person.isPayer}>
              <div class="breakdown-info">
                <div class="person-head">
                  <span class="b-name">{person.name}</span>
                  {#if person.isPayer}
                    <span class="payer-badge">👑 Talangan Anda</span>
                  {/if}
                </div>
                <div class="b-amt-row">
                  <span class="b-amt">{formatCurrency(person.totalShare, $currency)}</span>
                  {#if splitMode === 'itemized'}
                    <span class="b-sub">(Porsi: {formatCurrency(person.subtotalShare, $currency)})</span>
                  {/if}
                </div>
              </div>

              <!-- Action: Save to Debt/Piutang if not payer -->
              {#if !person.isPayer}
                {#if person.recordedAsDebt}
                  <span class="saved-debt-pill">
                    <i class="fa-solid fa-check"></i> Dicatat di Piutang
                  </span>
                {:else}
                  <button
                    class="btn-debt-add"
                    title="Simpan nominal ini ke modul Piutang"
                    on:click={() => saveAsReceivable(person)}
                  >
                    <i class="fa-solid fa-arrow-down-left"></i>
                    <span>Catat ke Piutang</span>
                  </button>
                {/if}
              {/if}
            </div>
          {/each}
        </div>

        <!-- Record Upfront Bill as Expense to Transactions & Wallet -->
        <div class="log-expense-card mt-3">
          <div class="log-expense-top">
            <i class="fa-solid fa-receipt text-emerald"></i>
            <div>
              <h5>Catat Total Pembayaran Talangan</h5>
              <p>Potong kas dompet Anda & catat pengeluaran resmi</p>
            </div>
          </div>

          <div class="wallet-picker-row mt-2">
            <label for="sb-wallet-select">Pilih Rekening / Dompet Pemotong:</label>
            <select id="sb-wallet-select" bind:value={selectedPayerWalletId} class="input-field select-field">
              {#each $wallets as w}
                <option value={w.id}>{w.name} ({formatCurrency(w.balance, $currency)})</option>
              {/each}
            </select>
          </div>

          <button class="btn-log-bill-tx mt-2" on:click={recordBillAsExpense}>
            <i class="fa-solid fa-wallet"></i>
            <span>Catat Pengeluaran {formatCurrency(grandTotal, $currency)}</span>
          </button>

          {#if billSuccessMsg}
            <div class="success-banner mt-2">
              <i class="fa-solid fa-circle-check"></i>
              <span>{billSuccessMsg}</span>
            </div>
          {/if}
        </div>

        <!-- WhatsApp & Copy Buttons -->
        <div class="action-buttons-stack mt-3">
          <button class="btn-wa-share" on:click={shareToWhatsApp}>
            <i class="fa-brands fa-whatsapp"></i>
            <span>Kirim Rincian ke WhatsApp Grup</span>
          </button>
          <button class="btn-copy-summary" on:click={copyTextSummary}>
            <i class="fa-solid fa-copy"></i>
            <span>Salin Format Teks Ringkasan</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .split-bill-section {
    margin-bottom: 2.2rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.5rem;
    margin-bottom: 1.25rem;
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
    background: linear-gradient(135deg, #06b6d4, #10b981);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .count-pill {
    font-size: 0.75rem;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    background: rgba(6, 182, 212, 0.12);
    color: #06b6d4;
    font-weight: 600;
    border: 1px solid rgba(6, 182, 212, 0.25);
  }

  .subtitle {
    font-size: 0.88rem;
    color: var(--text-secondary);
    margin: 0.35rem 0 0 0;
  }

  /* Mode Switcher */
  .mode-toggle-bar {
    display: flex;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 0.3rem;
    gap: 0.3rem;
  }

  .mode-btn {
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

  .mode-btn.active {
    background: var(--bg-main);
    color: var(--text-primary);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }

  /* Layout Grid */
  .split-layout-grid {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 1.5rem;
  }

  .card-box {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 18px;
    padding: 1.35rem;
  }

  .box-title {
    font-size: 0.96rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .box-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .form-group label {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.35rem;
  }

  .input-field {
    width: 100%;
    padding: 0.62rem 0.85rem;
    font-size: 0.88rem;
    background: var(--bg-main);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    color: var(--text-primary);
    outline: none;
    box-sizing: border-box;
  }

  .input-field:focus {
    border-color: #06b6d4;
  }

  .cur-box {
    position: relative;
    display: flex;
    align-items: center;
  }

  .prefix {
    position: absolute;
    left: 0.9rem;
    font-weight: 700;
    color: var(--text-muted);
  }

  .cur-input {
    padding-left: 2.6rem;
    font-weight: 700;
    font-size: 1.1rem;
    color: #10b981;
  }

  .grid-2-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .grid-3-col {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.75rem;
  }

  .mt-2 { margin-top: 0.75rem; }
  .mt-3 { margin-top: 1rem; }

  /* People Pills */
  .add-inline-row {
    display: flex;
    gap: 0.5rem;
  }

  .btn-add-inline {
    background: rgba(6, 182, 212, 0.15);
    color: #06b6d4;
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 10px;
    padding: 0.6rem 1rem;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .btn-add-inline:hover {
    background: #06b6d4;
    color: #ffffff;
  }

  .people-pills-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .person-tag-pill {
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: 999px;
    padding: 0.35rem 0.75rem;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .person-tag-pill.is-payer {
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.3);
    color: #10b981;
  }

  .remove-pill-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.75rem;
  }

  .remove-pill-btn:hover {
    color: #ef4444;
  }

  /* Itemized Menu Layout */
  .item-input-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr auto;
    gap: 0.5rem;
  }

  .menu-items-table {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .menu-item-card {
    background: var(--bg-main);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 0.75rem 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .item-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .item-title {
    font-weight: 700;
    font-size: 0.88rem;
    color: var(--text-primary);
  }

  .item-price {
    font-size: 0.82rem;
    font-weight: 600;
    color: #10b981;
  }

  .assigned-chips-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .assign-label {
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .assign-chip {
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.2rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .assign-chip.selected {
    background: rgba(6, 182, 212, 0.2);
    border-color: #06b6d4;
    color: #06b6d4;
  }

  .btn-trash-item {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.75rem;
  }

  .btn-trash-item:hover { color: #ef4444; }

  /* Right Summary Card */
  .receipt-summary-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 1.5rem;
  }

  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }

  .summary-brand {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .summary-brand i {
    font-size: 1.5rem;
    color: #06b6d4;
  }

  .summary-brand h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .summary-brand p {
    font-size: 0.78rem;
    color: var(--text-secondary);
    margin: 0.15rem 0 0 0;
  }

  .split-mode-badge {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    background: rgba(6, 182, 212, 0.12);
    color: #06b6d4;
  }

  .sub-totals-box {
    background: var(--bg-main);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .stat-line {
    display: flex;
    justify-content: space-between;
    color: var(--text-secondary);
  }

  .discount-line { color: #f43f5e; }

  .divider {
    border-bottom: 1px dashed var(--border-color);
    margin: 0.35rem 0;
  }

  .grand-total-line {
    font-weight: 800;
    font-size: 0.95rem;
    color: var(--text-primary);
  }

  .grand-amt {
    font-size: 1.25rem;
    color: #10b981;
  }

  .breakdown-title {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 1.25rem 0 0.75rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .breakdown-items-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .breakdown-card {
    background: var(--bg-main);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    padding: 0.85rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.8rem;
  }

  .breakdown-card.payer-border {
    border-color: rgba(16, 185, 129, 0.4);
    background: rgba(16, 185, 129, 0.04);
  }

  .person-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .b-name {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .payer-badge {
    font-size: 0.7rem;
    font-weight: 600;
    color: #10b981;
  }

  .b-amt-row {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    margin-top: 0.2rem;
  }

  .b-amt {
    font-size: 1.1rem;
    font-weight: 800;
    color: #06b6d4;
  }

  .b-sub {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .btn-debt-add {
    background: rgba(6, 182, 212, 0.12);
    border: 1px solid rgba(6, 182, 212, 0.3);
    color: #06b6d4;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.4rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    white-space: nowrap;
    transition: all 0.15s ease;
  }

  .btn-debt-add:hover {
    background: #06b6d4;
    color: #ffffff;
  }

  .saved-debt-pill {
    font-size: 0.75rem;
    font-weight: 600;
    color: #10b981;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  /* Log Expense Card */
  .log-expense-card {
    background: rgba(16, 185, 129, 0.06);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 14px;
    padding: 1rem;
    margin-bottom: 0.8rem;
  }

  .log-expense-top {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .log-expense-top i {
    font-size: 1.3rem;
  }

  .log-expense-top h5 {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .log-expense-top p {
    margin: 0.15rem 0 0 0;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .wallet-picker-row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .wallet-picker-row label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .btn-log-bill-tx {
    width: 100%;
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    color: #ffffff;
    font-size: 0.88rem;
    font-weight: 700;
    padding: 0.7rem;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    transition: transform 0.15s ease;
  }

  .btn-log-bill-tx:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
  }

  .success-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.35);
    border-radius: 10px;
    color: #34d399;
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.4;
  }

  /* Action Buttons Stack */
  .action-buttons-stack {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .btn-wa-share {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: #ffffff;
    font-size: 0.9rem;
    font-weight: 700;
    padding: 0.75rem;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    box-shadow: 0 4px 14px rgba(34, 197, 94, 0.3);
    transition: transform 0.15s ease;
  }

  .btn-wa-share:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(34, 197, 94, 0.4);
  }

  .btn-copy-summary {
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.65rem;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.15s ease;
  }

  .btn-copy-summary:hover {
    background: var(--bg-card);
    border-color: rgba(6, 182, 212, 0.4);
  }

  .text-cyan { color: #06b6d4; }
  .text-purple { color: #a855f7; }
  .text-orange { color: #f97316; }

  @media (max-width: 860px) {
    .split-layout-grid {
      grid-template-columns: 1fr;
    }
  }

  :global([data-theme="light"]) .card-box {
    background: #ffffff !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04) !important;
  }

  :global([data-theme="light"]) .box-title {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .card-box .input-field {
    background: #ffffff !important;
    color: #0f172a !important;
    border-color: rgba(148, 163, 184, 0.35) !important;
  }

  :global([data-theme="light"]) .form-group label {
    color: #334155 !important;
  }

  :global([data-theme="light"]) .mode-toggle-bar {
    background: #f1f5f9 !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
  }

  :global([data-theme="light"]) .mode-btn {
    color: #475569 !important;
  }

  :global([data-theme="light"]) .mode-btn.active {
    background: #ffffff !important;
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .summary-person-card {
    background: #f8fafc !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
  }

  :global([data-theme="light"]) .sp-name {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .btn-copy-summary {
    background: #f1f5f9 !important;
    color: #0f172a !important;
    border-color: rgba(148, 163, 184, 0.35) !important;
  }

  :global([data-theme="light"]) .person-tag-pill {
    background: #f1f5f9 !important;
    color: #0f172a !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
  }
</style>
