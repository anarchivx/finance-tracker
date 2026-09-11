<script>
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { requestConfirm } from '$lib/stores.js';

  export let isLocked = false;
  export let onClose = () => {};

  let pinInput = '';
  let storedPin = null;
  let isSettingNewPin = false;
  let confirmPin = '';
  let step = 1; // 1: enter pin, 2: confirm pin
  let errorMessage = '';
  let isShaking = false;

  const STORAGE_KEY = 'finora_security_pin';

  // Reactive: Setiap kali dialog kunci terbuka, selalu muat ulang PIN dari localStorage
  $: if (browser && isLocked) {
    storedPin = localStorage.getItem(STORAGE_KEY);
    if (!storedPin) {
      // Hanya masuk mode buat PIN jika belum pernah ada PIN tersimpan sama sekali
      isSettingNewPin = true;
      step = 1;
    } else {
      // Jika sudah pernah buat PIN, selalu masuk ke mode buka kunci (Unlock)
      isSettingNewPin = false;
      step = 1;
    }
    pinInput = '';
    confirmPin = '';
    errorMessage = '';
  }

  const keys = [
    { num: '1', sub: '' },
    { num: '2', sub: 'A B C' },
    { num: '3', sub: 'D E F' },
    { num: '4', sub: 'G H I' },
    { num: '5', sub: 'J K L' },
    { num: '6', sub: 'M N O' },
    { num: '7', sub: 'P Q R S' },
    { num: '8', sub: 'T U V' },
    { num: '9', sub: 'W X Y Z' }
  ];

  function handleKeyPress(num) {
    if (pinInput.length < 4) {
      pinInput += num;
      errorMessage = '';
      if (pinInput.length === 4) {
        evaluatePin();
      }
    }
  }

  function handleBackspace() {
    pinInput = pinInput.slice(0, -1);
    errorMessage = '';
  }

  function evaluatePin() {
    if (isSettingNewPin) {
      if (step === 1) {
        confirmPin = pinInput;
        pinInput = '';
        step = 2;
      } else {
        if (pinInput === confirmPin) {
          localStorage.setItem(STORAGE_KEY, pinInput);
          storedPin = pinInput;
          isLocked = false;
          isSettingNewPin = false;
          step = 1;
          pinInput = '';
          confirmPin = '';
          onClose();
        } else {
          triggerError('Konfirmasi PIN tidak cocok. Silakan ulangi.');
          step = 1;
          pinInput = '';
          confirmPin = '';
        }
      }
    } else {
      if (storedPin) {
        if (pinInput === storedPin) {
          isLocked = false;
          pinInput = '';
          onClose();
        } else {
          triggerError('PIN Salah. Akses keamanan ditolak.');
        }
      } else {
        startSetupPin();
      }
    }
  }

  function triggerError(msg) {
    errorMessage = msg;
    isShaking = true;
    setTimeout(() => {
      isShaking = false;
      pinInput = '';
    }, 550);
  }

  function startSetupPin() {
    isSettingNewPin = true;
    step = 1;
    pinInput = '';
    confirmPin = '';
    errorMessage = '';
  }

  function cancelSetup() {
    isSettingNewPin = false;
    step = 1;
    pinInput = '';
    confirmPin = '';
    errorMessage = '';
  }

  function resetPinConfirm() {
    requestConfirm({
      title: 'Lupa / Reset PIN Keamanan',
      message: 'Apakah Anda ingin mengatur ulang PIN keamanan Finora? PIN lama akan dihapus dan Anda akan diminta membuat 4 angka PIN baru.',
      confirmText: 'Reset PIN',
      confirmStyle: 'warning',
      icon: 'fa-key',
      onConfirm: () => {
        localStorage.removeItem(STORAGE_KEY);
        storedPin = null;
        startSetupPin();
      }
    });
  }
</script>

{#if isLocked}
  <div class="lock-overlay" role="dialog" aria-modal="true">
    <div class="lock-modal-card" class:shake={isShaking}>
      <!-- Top Close button: Hanya jika sedang ubah PIN dan sudah punya PIN tersimpan -->
      {#if isSettingNewPin && storedPin}
        <button class="dismiss-btn" on:click={cancelSetup} title="Batal Ganti PIN">
          <i class="fa-solid fa-xmark"></i>
        </button>
      {/if}

      <!-- Glowing 3D Shield Badge -->
      <div class="shield-badge-container">
        <div class="shield-pulse-ring"></div>
        <div class="shield-icon-box">
          <i class="fa-solid fa-shield-halved"></i>
        </div>
      </div>

      <!-- Title & Subtitle Hierarchy -->
      <div class="lock-typography">
        <h2 class="lock-title">
          {#if isSettingNewPin}
            {step === 1 ? 'Atur PIN Keamanan' : 'Konfirmasi PIN Baru'}
          {:else}
            Finora Vault Terkunci
          {/if}
        </h2>
        <p class="lock-subtitle">
          {#if isSettingNewPin}
            {step === 1 ? 'Buat 4-digit PIN rahasia untuk melindungi data finansial Anda' : 'Masukkan kembali 4 angka PIN yang sama untuk verifikasi'}
          {:else}
            Masukkan 4-digit kode akses untuk membuka data finansial Anda
          {/if}
        </p>
      </div>

      <!-- PIN Indicator Dots -->
      <div class="dots-wrapper">
        {#each [0, 1, 2, 3] as idx}
          <div class="pin-pill" class:active={pinInput.length > idx}>
            <div class="pin-pill-inner"></div>
          </div>
        {/each}
      </div>

      <!-- Error Notification -->
      {#if errorMessage}
        <div class="error-banner">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>{errorMessage}</span>
        </div>
      {/if}

      <!-- Elegant iOS / Revolut Style Keypad -->
      <div class="keypad-layout">
        {#each keys as key}
          <button
            type="button"
            class="keypad-button"
            on:click={() => handleKeyPress(key.num)}
          >
            <span class="key-digit">{key.num}</span>
            {#if key.sub}
              <span class="key-subtext">{key.sub}</span>
            {/if}
          </button>
        {/each}

        <!-- Bottom Row -->
        <!-- Reset / Ganti PIN -->
        <button
          type="button"
          class="keypad-button utility-btn"
          on:click={isSettingNewPin ? cancelSetup : startSetupPin}
          title={isSettingNewPin ? 'Batal Atur' : 'Atur / Ganti PIN'}
        >
          <i class={isSettingNewPin ? 'fa-solid fa-arrow-rotate-left' : 'fa-solid fa-key'}></i>
          <span class="utility-label">{isSettingNewPin ? 'Batal' : 'Ubah PIN'}</span>
        </button>

        <!-- Zero Digit -->
        <button
          type="button"
          class="keypad-button"
          on:click={() => handleKeyPress('0')}
        >
          <span class="key-digit">0</span>
          <span class="key-subtext">+</span>
        </button>

        <!-- Backspace -->
        <button
          type="button"
          class="keypad-button utility-btn"
          on:click={handleBackspace}
          title="Hapus Digit Terakhir"
        >
          <i class="fa-solid fa-delete-left"></i>
          <span class="utility-label">Hapus</span>
        </button>
      </div>

      <!-- Bottom Security Footer -->
      <div class="lock-footer">
        {#if storedPin && !isSettingNewPin}
          <button type="button" class="footer-link-btn" on:click={resetPinConfirm}>
            <i class="fa-solid fa-unlock-keyhole"></i>
            <span>Lupa atau Reset PIN?</span>
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .lock-overlay {
    position: fixed;
    inset: 0;
    z-index: 5000;
    background: radial-gradient(circle at 50% 30%, rgba(30, 27, 75, 0.95) 0%, rgba(6, 9, 18, 0.98) 100%);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: lockFadeIn 0.25s ease-out;
  }

  @keyframes lockFadeIn {
    from { opacity: 0; transform: scale(0.97); }
    to { opacity: 1; transform: scale(1); }
  }

  .lock-modal-card {
    position: relative;
    width: 100%;
    max-width: 480px;
    padding: 36px 30px 28px;
    background: linear-gradient(180deg, rgba(22, 30, 49, 0.9) 0%, rgba(11, 16, 30, 0.98) 100%);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 32px;
    box-shadow: 
      0 30px 70px -15px rgba(0, 0, 0, 0.9),
      0 0 50px rgba(99, 102, 241, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .dismiss-btn {
    position: absolute;
    top: 18px;
    right: 18px;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-dim);
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .dismiss-btn:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.2);
  }

  /* 3D Shield Badge with ambient glow */
  .shield-badge-container {
    position: relative;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .shield-pulse-ring {
    position: absolute;
    width: 80px;
    height: 80px;
    border-radius: 26px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%);
    animation: ringGlow 3s infinite ease-in-out;
  }

  @keyframes ringGlow {
    0%, 100% { transform: scale(0.9); opacity: 0.5; }
    50% { transform: scale(1.15); opacity: 0.85; }
  }

  .shield-icon-box {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: 22px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.75rem;
    color: #ffffff;
    box-shadow: 
      0 10px 25px -5px rgba(99, 102, 241, 0.5),
      inset 0 2px 4px rgba(255, 255, 255, 0.3);
  }

  /* Typography */
  .lock-typography {
    margin-bottom: 26px;
    width: 100%;
    max-width: 100%;
  }

  .lock-title {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #ffffff 30%, #cbd5e1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .lock-subtitle {
    font-size: 0.82rem;
    color: #94a3b8;
    line-height: 1.45;
    white-space: nowrap;
  }

  @media (max-width: 480px) {
    .lock-modal-card {
      max-width: 100%;
      padding: 28px 18px 24px;
    }
    .lock-subtitle {
      font-size: 0.76rem;
      white-space: normal;
    }
  }

  /* Passcode Dots */
  .dots-wrapper {
    display: flex;
    justify-content: center;
    gap: 18px;
    margin-bottom: 26px;
  }

  .pin-pill {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.03);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .pin-pill-inner {
    width: 0;
    height: 0;
    border-radius: 50%;
    background: transparent;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .pin-pill.active {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.2);
    box-shadow: 0 0 14px rgba(99, 102, 241, 0.6);
    transform: scale(1.15);
  }

  .pin-pill.active .pin-pill-inner {
    width: 10px;
    height: 10px;
    background: linear-gradient(135deg, #6366f1, #38bdf8);
  }

  /* Error Banner */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    font-weight: 600;
    color: #fb7185;
    background: rgba(244, 63, 94, 0.12);
    border: 1px solid rgba(244, 63, 94, 0.25);
    padding: 6px 14px;
    border-radius: var(--radius-full);
    margin-bottom: 20px;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Keypad Layout */
  .keypad-layout {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    width: 100%;
    max-width: 290px;
    margin-bottom: 16px;
  }

  .keypad-button {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.035);
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .keypad-button:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .keypad-button:active {
    transform: scale(0.92);
    background: rgba(99, 102, 241, 0.35);
    border-color: var(--primary);
  }

  .key-digit {
    font-size: 1.6rem;
    font-weight: 700;
    color: #f8fafc;
    line-height: 1.1;
  }

  .key-subtext {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #64748b;
    margin-top: 1px;
  }

  /* Utility Buttons (Bottom Row) */
  .utility-btn {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    color: #94a3b8;
    gap: 4px;
  }

  .utility-btn i {
    font-size: 1.25rem;
  }

  .utility-label {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: #94a3b8;
  }

  .utility-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .utility-btn:hover .utility-label {
    color: #ffffff;
  }

  /* Footer Links */
  .lock-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    margin-top: 6px;
  }

  .footer-link-btn {
    background: transparent;
    border: none;
    color: #64748b;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: color 0.15s ease;
  }

  .footer-link-btn:hover {
    color: #a5b4fc;
  }

  /* Shake animation */
  .shake {
    animation: pinShake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  @keyframes pinShake {
    10%, 90% { transform: translate3d(-3px, 0, 0); }
    20%, 80% { transform: translate3d(5px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-7px, 0, 0); }
    40%, 60% { transform: translate3d(7px, 0, 0); }
  }

  @media (max-width: 400px) {
    .lock-modal-card {
      padding: 28px 18px 20px;
    }
    .keypad-layout {
      gap: 10px;
    }
    .keypad-button {
      width: 64px;
      height: 64px;
    }
    .key-digit {
      font-size: 1.45rem;
    }
  }
</style>
