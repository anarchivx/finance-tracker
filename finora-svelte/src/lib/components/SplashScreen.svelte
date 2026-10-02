<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import FinoraLogo from './FinoraLogo.svelte';

  export let minDuration = 1400; // Snappy ~1.4s
  export let onFinish = () => {};

  const dispatch = createEventDispatcher();

  let progress = 0;
  let statusIndex = 0;
  let isClosing = false;
  let isVisible = true;

  const statusMessages = [
    'Menginisialisasi Secure Vault & Enkripsi...',
    'Memuat Finora AI & Analitik Keuangan...',
    'Menyiapkan Dasbor Finansial & Saldo...',
    'Aplikasi Siap Digunakan!'
  ];

  function dismiss() {
    if (isClosing) return;
    isClosing = true;
    progress = 100;
    statusIndex = statusMessages.length - 1;

    setTimeout(() => {
      isVisible = false;
      dispatch('finish');
      onFinish();
    }, 450); // Match CSS transition duration
  }

  onMount(() => {
    // Step 1: initial progress
    const t1 = setTimeout(() => {
      progress = 35;
      statusIndex = 1;
    }, 350);

    // Step 2: intermediate
    const t2 = setTimeout(() => {
      progress = 75;
      statusIndex = 2;
    }, 800);

    // Step 3: ready
    const t3 = setTimeout(() => {
      progress = 100;
      statusIndex = 3;
    }, 1150);

    // Step 4: dismiss
    const t4 = setTimeout(() => {
      dismiss();
    }, minDuration);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        dismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });
</script>

{#if isVisible}
  <!-- Splash Screen Overlay -->
  <div
    class="splash-screen"
    class:closing={isClosing}
    on:click={dismiss}
    on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') dismiss(); }}
    role="dialog"
    tabindex="0"
    aria-label="Memuat Finora"
  >
    <!-- Background Ambient Glow Mesh -->
    <div class="ambient-glow glow-indigo"></div>
    <div class="ambient-glow glow-cyan"></div>
    <div class="ambient-glow glow-magenta"></div>

    <!-- Center Content -->
    <div class="splash-card">
      <!-- Animated Logo Presentation with Aura Ring -->
      <div class="logo-spotlight">
        <div class="spotlight-ring ring-1"></div>
        <div class="spotlight-ring ring-2"></div>
        <div class="spotlight-ring ring-3"></div>
        <FinoraLogo size="hero" animated={true} glow={true} />
      </div>

      <!-- Typography -->
      <div class="brand-hero">
        <h1 class="brand-title">
          <span class="fin-text">FIN</span><span class="ora-text">ORA</span>
          <span class="badge-pro">PRO</span>
        </h1>
        <p class="brand-tagline">Intelligent Wealth Hub • AI Financial Copilot</p>
      </div>

      <!-- Futuristic Progress Bar -->
      <div class="loader-box">
        <div class="progress-track">
          <div class="progress-fill" style="width: {progress}%;">
            <div class="progress-glow-head"></div>
          </div>
        </div>

        <div class="loader-meta">
          <span class="status-msg">
            <i class="fa-solid fa-circle-notch fa-spin text-primary"></i>
            {statusMessages[statusIndex]}
          </span>
          <span class="progress-val">{progress}%</span>
        </div>
      </div>

      <!-- Skip hint -->
      <div class="skip-hint">
        <span>Sentuh di mana saja untuk lewati</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .splash-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 99999;
    background: #060913;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow: hidden;
    user-select: none;
    cursor: pointer;
    transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                filter 0.45s ease;
  }

  .splash-screen.closing {
    opacity: 0;
    transform: scale(1.04);
    filter: blur(8px);
    pointer-events: none;
  }

  /* Ambient Glowing Meshes */
  .ambient-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(110px);
    pointer-events: none;
    opacity: 0.38;
  }

  .glow-indigo {
    width: 480px;
    height: 480px;
    background: #4f46e5;
    top: 15%;
    left: 20%;
    animation: driftMesh1 8s ease-in-out infinite alternate;
  }

  .glow-cyan {
    width: 420px;
    height: 420px;
    background: #06b6d4;
    bottom: 15%;
    right: 20%;
    animation: driftMesh2 9s ease-in-out infinite alternate;
  }

  .glow-magenta {
    width: 320px;
    height: 320px;
    background: #c026d3;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0.25;
  }

  @keyframes driftMesh1 {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(60px, 40px) scale(1.15); }
  }

  @keyframes driftMesh2 {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-50px, -30px) scale(1.12); }
  }

  /* Central Showcase Card */
  .splash-card {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 460px;
    width: 100%;
    text-align: center;
    animation: cardAppear 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes cardAppear {
    0% {
      opacity: 0;
      transform: translateY(20px) scale(0.96);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Spotlight & Pulsing Rings */
  .logo-spotlight {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
  }

  .spotlight-ring {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(99, 102, 241, 0.25);
    pointer-events: none;
  }

  .ring-1 {
    width: 130px;
    height: 130px;
    border-color: rgba(99, 102, 241, 0.35);
    animation: pulseRing 3s ease-out infinite;
  }

  .ring-2 {
    width: 175px;
    height: 175px;
    border-color: rgba(6, 182, 212, 0.2);
    animation: pulseRing 3s ease-out infinite 0.9s;
  }

  .ring-3 {
    width: 220px;
    height: 220px;
    border-color: rgba(168, 85, 247, 0.15);
    animation: pulseRing 3s ease-out infinite 1.8s;
  }

  @keyframes pulseRing {
    0% {
      transform: scale(0.8);
      opacity: 0.8;
    }
    100% {
      transform: scale(1.25);
      opacity: 0;
    }
  }

  /* Brand Hero Typography */
  .brand-hero {
    margin-bottom: 32px;
  }

  .brand-title {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    font-size: 2.8rem;
    font-weight: 900;
    letter-spacing: 0.12em;
    margin: 0 0 8px 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    line-height: 1;
    background: none !important;
    -webkit-background-clip: initial !important;
    -webkit-text-fill-color: initial !important;
  }

  .fin-text {
    color: #ffffff !important;
    -webkit-text-fill-color: #ffffff !important;
    text-shadow: 0 0 25px rgba(255, 255, 255, 0.8), 0 2px 10px rgba(0, 0, 0, 0.9) !important;
    font-weight: 900 !important;
  }

  .ora-text {
    background: linear-gradient(135deg, #a5b4fc 0%, #c084fc 50%, #38bdf8 100%) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    filter: drop-shadow(0 0 16px rgba(129, 140, 248, 0.6)) !important;
    font-weight: 900 !important;
  }

  .badge-pro {
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    padding: 3px 8px;
    margin-left: 10px;
    border-radius: 20px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(217, 70, 239, 0.3) 100%);
    border: 1px solid rgba(168, 85, 247, 0.5);
    color: #e0e7ff;
    vertical-align: middle;
  }

  .brand-tagline {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 500;
    color: #94a3b8;
    letter-spacing: 0.06em;
  }

  /* Futuristic Progress Bar */
  .loader-box {
    width: 100%;
    max-width: 380px;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 16px;
    padding: 16px 20px;
    backdrop-filter: blur(16px);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(99, 102, 241, 0.15);
  }

  .progress-track {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 99px;
    overflow: hidden;
    position: relative;
    margin-bottom: 12px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #06b6d4 100%);
    border-radius: 99px;
    position: relative;
    transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .progress-glow-head {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 16px;
    background: #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 12px 2px #38bdf8;
  }

  .loader-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.78rem;
  }

  .status-msg {
    color: #cbd5e1;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
  }

  .progress-val {
    font-family: monospace;
    font-weight: 700;
    color: #38bdf8;
    font-size: 0.82rem;
  }

  .skip-hint {
    margin-top: 24px;
    font-size: 0.72rem;
    color: #64748b;
    letter-spacing: 0.04em;
    opacity: 0.75;
    transition: opacity 0.2s ease;
  }

  .splash-screen:hover .skip-hint {
    opacity: 1;
    color: #94a3b8;
  }

  @media (max-width: 640px) {
    .brand-title {
      font-size: 2.2rem;
    }

    .brand-tagline {
      font-size: 0.78rem;
    }

    .loader-box {
      max-width: 320px;
      padding: 14px 16px;
    }
  }
</style>
