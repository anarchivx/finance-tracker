<script>
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { requestConfirm } from '$lib/stores.js';
  import FinoraLogo from './FinoraLogo.svelte';

  export let isLocked = false;
  export let onClose = () => {};

  let pinInput = '';
  let storedPin = null;
  let isSettingNewPin = false;
  let confirmPin = '';
  let step = 1; // 1: enter pin, 2: confirm pin
  let errorMessage = '';
  let isShaking = false;
  let activeKeyIndex = null; // For keyboard press feedback animation
  let rememberDevice = true; // By default remember this device so PIN is not repeatedly asked

  const STORAGE_KEY = 'finora_security_pin';

  function getServerUrl() {
    if (!browser) return '';
    if (window.location.port === '5173') return 'http://localhost:3001';
    return window.location.origin;
  }

  async function checkServerPinStatus() {
    if (!browser) return;
    try {
      const res = await fetch(`${getServerUrl()}/api/auth/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.hasPin) {
          isSettingNewPin = false;
        } else {
          isSettingNewPin = true;
        }
      } else {
        fallbackToLocalPin();
      }
    } catch (e) {
      fallbackToLocalPin();
    }
  }

  function fallbackToLocalPin() {
    storedPin = localStorage.getItem(STORAGE_KEY);
    isSettingNewPin = !storedPin;
  }

  // Reactive: Setiap kali dialog kunci terbuka, periksa status PIN dari server
  $: if (browser && isLocked) {
    checkServerPinStatus();
    pinInput = '';
    confirmPin = '';
    errorMessage = '';
    step = 1;
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

  function disablePinLock() {
    if (browser) {
      localStorage.setItem('finora_pin_enabled', 'false');
      localStorage.setItem('finora_device_unlocked', 'true');
      sessionStorage.setItem('finora_session_unlocked', 'true');
    }
    isLocked = false;
    onClose();
  }

  function performUnlockSuccess() {
    if (browser) {
      const now = Date.now();
      localStorage.setItem('finora_last_unlocked_at', String(now));
      sessionStorage.setItem('finora_session_unlocked', 'true');
      if (rememberDevice) {
        localStorage.setItem('finora_device_unlocked', 'true');
      }
    }
    isLocked = false;
    pinInput = '';
    confirmPin = '';
    errorMessage = '';
    onClose();
  }

  async function evaluatePin() {
    if (isSettingNewPin) {
      if (step === 1) {
        confirmPin = pinInput;
        pinInput = '';
        step = 2;
      } else {
        if (pinInput === confirmPin) {
          try {
            const res = await fetch(`${getServerUrl()}/api/auth/set-pin`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ newPin: pinInput })
            });
            const data = await res.json();
            if (data.success) {
              localStorage.setItem(STORAGE_KEY, pinInput);
              localStorage.setItem('finora_pin_enabled', 'true');
              storedPin = pinInput;
              isSettingNewPin = false;
              step = 1;
              performUnlockSuccess();
            } else {
              triggerError(data.error || 'Gagal menyimpan PIN ke server.');
            }
          } catch (e) {
            // Offline / Cloud fallback
            localStorage.setItem(STORAGE_KEY, pinInput);
            localStorage.setItem('finora_pin_enabled', 'true');
            storedPin = pinInput;
            isSettingNewPin = false;
            step = 1;
            performUnlockSuccess();
          }
        } else {
          triggerError('Konfirmasi PIN tidak cocok. Silakan ulangi.');
          step = 1;
          pinInput = '';
          confirmPin = '';
        }
      }
    } else {
      try {
        const res = await fetch(`${getServerUrl()}/api/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pinInput })
        });
        const data = await res.json();
        if (data.success) {
          performUnlockSuccess();
        } else {
          triggerError('PIN Salah. Akses keamanan ditolak.');
        }
      } catch (e) {
        // Offline / Cloud fallback
        storedPin = localStorage.getItem(STORAGE_KEY);
        if (storedPin && pinInput === storedPin) {
          performUnlockSuccess();
        } else {
          triggerError('PIN Salah. Akses keamanan ditolak.');
        }
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
      message: 'Apakah Anda ingin mengatur ulang Master PIN Finora di server? Anda akan diminta membuat 4 angka PIN baru yang berlaku di seluruh perangkat.',
      confirmText: 'Reset PIN',
      confirmStyle: 'warning',
      icon: 'fa-key',
      onConfirm: async () => {
        try {
          await fetch(`${getServerUrl()}/api/auth/reset`, { method: 'POST' });
        } catch (e) {}
        localStorage.removeItem(STORAGE_KEY);
        storedPin = null;
        startSetupPin();
      }
    });
  }

  function handleKeydown(e) {
    if (!isLocked) return;

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      activeKeyIndex = e.key;
      setTimeout(() => (activeKeyIndex = null), 150);
      handleKeyPress(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      activeKeyIndex = 'backspace';
      setTimeout(() => (activeKeyIndex = null), 150);
      handleBackspace();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isLocked}
  <div class="lock-overlay" role="dialog" aria-modal="true">
    <!-- Ambient Security Cyber-Glows & Laser Radar -->
    <div class="vault-bg-radar">
      <div class="radar-ring ring-1"></div>
      <div class="radar-ring ring-2"></div>
      <div class="radar-ring ring-3"></div>
      <div class="radar-laser-sweep"></div>
    </div>
    <div class="ambient-glow glow-cyan"></div>
    <div class="ambient-glow glow-violet"></div>

    <div class="lock-modal-card" class:shake={isShaking}>
      <!-- Top Close button: Hanya jika sedang ubah PIN dan sudah punya PIN tersimpan -->
      {#if isSettingNewPin && storedPin}
        <button class="dismiss-btn" on:click={cancelSetup} title="Batal Ganti PIN">
          <i class="fa-solid fa-xmark"></i>
        </button>
      {/if}

      <!-- Top Security Protocol Badge -->
      <div class="security-protocol-badge">
        <span class="protocol-dot"></span>
        <span>256-BIT CLOUD VAULT ENCRYPTED</span>
      </div>

      <!-- 3D Holographic Vault Bezel with Laser Scan -->
      <div class="vault-emblem-container">
        <div class="vault-outer-ring"></div>
        <div class="vault-bezel-box">
          <FinoraLogo size="lg" animated={true} glow={true} />
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
            {step === 1 ? 'Buat 4-digit PIN rahasia untuk melindungi aset finansial Anda' : 'Masukkan kembali 4 angka PIN yang sama untuk verifikasi'}
          {:else}
            Masukkan 4-digit kode akses untuk membuka data finansial Anda
          {/if}
        </p>
        {#if !isSettingNewPin}
          <div class="device-sync-tag">
            <i class="fa-solid fa-shield-halved text-emerald"></i>
            <span>Terkunci Serentak di Seluruh Perangkat</span>
          </div>
        {/if}
      </div>

      <!-- Glowing Futuristic PIN Indicator Pods -->
      <div class="dots-wrapper">
        {#each [0, 1, 2, 3] as idx}
          {@const isFilled = pinInput.length > idx}
          <div class="pin-capsule-pod" class:filled={isFilled}>
            <div class="pod-inner-core"></div>
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

      <!-- Tactile Cyber-Keypad (Apple / Revolut High-End Feel) -->
      <div class="keypad-layout">
        {#each keys as key}
          <button
            type="button"
            class="keypad-button"
            class:pressed={activeKeyIndex === key.num}
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
          <div class="utility-icon-box">
            <i class={isSettingNewPin ? 'fa-solid fa-arrow-rotate-left' : 'fa-solid fa-key'}></i>
          </div>
          <span class="utility-label">{isSettingNewPin ? 'Batal' : 'Ganti PIN'}</span>
        </button>

        <!-- Zero Digit -->
        <button
          type="button"
          class="keypad-button"
          class:pressed={activeKeyIndex === '0'}
          on:click={() => handleKeyPress('0')}
        >
          <span class="key-digit">0</span>
          <span class="key-subtext">+</span>
        </button>

        <!-- Backspace -->
        <button
          type="button"
          class="keypad-button utility-btn backspace"
          class:pressed={activeKeyIndex === 'backspace'}
          on:click={handleBackspace}
          title="Hapus Digit Terakhir"
        >
          <div class="utility-icon-box danger">
            <i class="fa-solid fa-delete-left"></i>
          </div>
          <span class="utility-label">Hapus</span>
        </button>
      </div>

      <!-- Bottom Security Footer -->
      <div class="lock-footer">
        <label class="remember-device-checkbox" title="Jika dicentang, aplikasi tidak akan meminta PIN lagi saat dibuka di perangkat ini">
          <input type="checkbox" bind:checked={rememberDevice} />
          <span>Ingat perangkat ini (jangan minta PIN lagi)</span>
        </label>

        <div class="footer-action-links">
          <button type="button" class="footer-link-btn disable-btn" on:click={disablePinLock} title="Buka aplikasi langsung dan matikan fitur kunci PIN">
            <i class="fa-solid fa-lock-open"></i>
            <span>Matikan Kunci PIN</span>
          </button>

          {#if storedPin && !isSettingNewPin}
            <button type="button" class="footer-link-btn" on:click={resetPinConfirm}>
              <i class="fa-solid fa-unlock-keyhole"></i>
              <span>Reset PIN</span>
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ========================================================================= */
  /* FULLSCREEN CYBER-VAULT OVERLAY                                            */
  /* ========================================================================= */
  .lock-overlay {
    position: fixed;
    inset: 0;
    z-index: 5000;
    background: radial-gradient(circle at 50% 35%, rgba(15, 23, 42, 0.96) 0%, rgba(6, 9, 18, 0.99) 100%);
    backdrop-filter: blur(32px);
    -webkit-backdrop-filter: blur(32px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow: hidden;
    animation: lockFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes lockFadeIn {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }

  /* Ambient Radar & Halos */
  .vault-bg-radar {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    pointer-events: none;
    z-index: 0;
  }

  .radar-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 1px dashed rgba(99, 102, 241, 0.15);
    pointer-events: none;
  }

  .ring-1 { width: 300px; height: 300px; animation: radarSpin 30s linear infinite; }
  .ring-2 { width: 460px; height: 460px; animation: radarSpinReverse 45s linear infinite; border-color: rgba(6, 182, 212, 0.12); }
  .ring-3 { width: 620px; height: 620px; border-color: rgba(168, 85, 247, 0.08); }

  @keyframes radarSpin {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }

  @keyframes radarSpinReverse {
    from { transform: translate(-50%, -50%) rotate(360deg); }
    to { transform: translate(-50%, -50%) rotate(0deg); }
  }

  .ambient-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(140px);
    pointer-events: none;
    z-index: 0;
  }

  .glow-cyan {
    bottom: 10%;
    left: 20%;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.16) 0%, transparent 70%);
  }

  .glow-violet {
    top: 10%;
    right: 20%;
    width: 450px;
    height: 450px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%);
  }

  /* ========================================================================= */
  /* VAULT MODAL CARD                                                          */
  /* ========================================================================= */
  .lock-modal-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 440px;
    padding: 38px 32px 30px;
    background: linear-gradient(165deg, rgba(22, 32, 54, 0.88) 0%, rgba(10, 15, 29, 0.96) 100%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 34px;
    box-shadow: 
      0 35px 80px -15px rgba(0, 0, 0, 0.85),
      0 0 50px -10px rgba(99, 102, 241, 0.3),
      inset 0 1px 1px rgba(255, 255, 255, 0.25);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
  }

  .dismiss-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .dismiss-btn:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.25);
    transform: scale(1.08);
  }

  /* Security Protocol Pill */
  .security-protocol-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.85rem;
    border-radius: 99px;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.25);
    color: #34d399;
    font-size: 0.675rem;
    font-weight: 800;
    letter-spacing: 1px;
    margin-bottom: 22px;
  }

  .protocol-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 8px #10b981;
    animation: dotPulse 1.8s infinite;
  }

  @keyframes dotPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(1.3); }
  }

  /* Vault Emblem */
  .vault-emblem-container {
    position: relative;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .vault-outer-ring {
    position: absolute;
    width: 92px;
    height: 92px;
    border-radius: 30px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, transparent 70%);
    animation: beaconPulse 3s infinite ease-in-out;
  }

  @keyframes beaconPulse {
    0%, 100% { transform: scale(0.9); opacity: 0.5; }
    50% { transform: scale(1.2); opacity: 0.85; }
  }

  .vault-bezel-box {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Typography */
  .lock-typography {
    margin-bottom: 24px;
    width: 100%;
  }

  .lock-title {
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .lock-subtitle {
    font-size: 0.8rem;
    color: #94a3b8;
    line-height: 1.45;
  }

  .device-sync-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.08);
    border: 1px solid rgba(56, 189, 248, 0.22);
    padding: 4px 12px;
    border-radius: 999px;
    margin-top: 10px;
    letter-spacing: 0.3px;
  }

  /* ========================================================================= */
  /* GLOWING PIN INDICATOR PODS                                                */
  /* ========================================================================= */
  .dots-wrapper {
    display: flex;
    justify-content: center;
    gap: 18px;
    margin-bottom: 28px;
  }

  .pin-capsule-pod {
    position: relative;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .pod-inner-core {
    width: 0;
    height: 0;
    border-radius: 50%;
    background: transparent;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .pin-capsule-pod.filled {
    border-color: #38bdf8;
    background: rgba(56, 189, 248, 0.2);
    box-shadow: 
      0 0 16px rgba(56, 189, 248, 0.8),
      0 0 30px rgba(99, 102, 241, 0.5);
    transform: scale(1.18);
  }

  .pin-capsule-pod.filled .pod-inner-core {
    width: 11px;
    height: 11px;
    background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%);
    box-shadow: 0 0 8px #38bdf8;
  }

  /* Error Banner */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    color: #fb7185;
    background: rgba(244, 63, 94, 0.14);
    border: 1px solid rgba(244, 63, 94, 0.35);
    padding: 7px 16px;
    border-radius: 99px;
    margin-bottom: 22px;
    box-shadow: 0 0 20px rgba(244, 63, 94, 0.25);
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ========================================================================= */
  /* TACTILE KEYPAD LAYOUT                                                     */
  /* ========================================================================= */
  .keypad-layout {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    width: 100%;
    max-width: 310px;
    margin-bottom: 18px;
  }

  .keypad-button {
    width: 76px;
    height: 76px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 
      0 6px 16px -4px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .keypad-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-3px);
    box-shadow: 
      0 10px 24px -4px rgba(0, 0, 0, 0.5),
      0 0 20px rgba(99, 102, 241, 0.3);
  }

  .keypad-button:active,
  .keypad-button.pressed {
    transform: scale(0.92);
    background: rgba(99, 102, 241, 0.3);
    border-color: #6366f1;
    box-shadow: 0 0 25px rgba(99, 102, 241, 0.6);
  }

  .key-digit {
    font-size: 1.7rem;
    font-weight: 800;
    color: #f8fafc;
    line-height: 1.1;
  }

  .key-subtext {
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 1.8px;
    color: #64748b;
    margin-top: 1px;
  }

  /* Utility Buttons (Bottom Row) */
  .utility-btn {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    gap: 4px;
  }

  .utility-icon-box {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: rgba(245, 158, 11, 0.14);
    color: #f59e0b;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    transition: all 0.2s ease;
  }

  .utility-icon-box.danger {
    background: rgba(244, 63, 94, 0.14);
    color: #f43f5e;
  }

  .utility-label {
    font-size: 0.675rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #94a3b8;
  }

  .utility-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .utility-btn:hover .utility-label {
    color: #ffffff;
  }

  /* Footer Links */
  .lock-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
  }

  .remember-device-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.775rem;
    color: #94a3b8;
    cursor: pointer;
    user-select: none;
    transition: color 0.2s;
  }

  .remember-device-checkbox:hover {
    color: #cbd5e1;
  }

  .remember-device-checkbox input[type="checkbox"] {
    accent-color: #6366f1;
    width: 15px;
    height: 15px;
    cursor: pointer;
  }

  .footer-action-links {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .footer-link-btn {
    background: transparent;
    border: none;
    color: #64748b;
    font-size: 0.775rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
  }

  .footer-link-btn:hover {
    color: #818cf8;
    transform: translateY(-1px);
  }

  .footer-link-btn.disable-btn:hover {
    color: #38bdf8;
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

  @media (max-width: 440px) {
    .lock-modal-card {
      padding: 30px 20px 24px;
      border-radius: 28px;
    }
    .keypad-layout {
      gap: 12px;
      max-width: 280px;
    }
    .keypad-button {
      width: 68px;
      height: 68px;
    }
    .key-digit {
      font-size: 1.5rem;
    }
  }
</style>
