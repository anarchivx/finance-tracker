<script>
  export let size = 28;
  export let animated = true;
  export let glow = true;
  let customClass = '';
  export { customClass as class };
</script>

<span
  class="scan-receipt-icon-wrapper {customClass}"
  class:animated
  class:glow
  style="--icon-size: {size}px;"
  role="img"
  aria-label="Scan Struk OCR Icon"
>
  <svg
    viewBox="0 0 48 48"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="scan-receipt-svg"
  >
    <defs>
      <!-- Glass Receipt Body Gradient -->
      <linearGradient id="receiptPaperGrad" x1="8" y1="6" x2="40" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
        <stop offset="50%" stop-color="#e0e7ff" stop-opacity="0.85" />
        <stop offset="100%" stop-color="#c7d2fe" stop-opacity="0.95" />
      </linearGradient>

      <!-- Laser Beam Neon Gradient -->
      <linearGradient id="laserBeamGrad" x1="4" y1="24" x2="44" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#06b6d4" stop-opacity="0" />
        <stop offset="25%" stop-color="#06b6d4" stop-opacity="0.9" />
        <stop offset="50%" stop-color="#ec4899" stop-opacity="1" />
        <stop offset="75%" stop-color="#a855f7" stop-opacity="0.9" />
        <stop offset="100%" stop-color="#a855f7" stop-opacity="0" />
      </linearGradient>

      <!-- Corner Viewfinder Frame Gradient -->
      <linearGradient id="viewfinderGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="50%" stop-color="#818cf8" />
        <stop offset="100%" stop-color="#c084fc" />
      </linearGradient>

      <!-- Neon Laser Glow Filter -->
      <filter id="laserGlowFilter" x="-20%" y="-100%" width="140%" height="300%">
        <feGaussianBlur stdDeviation="1.8" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <!-- Sparkle Drop Shadow -->
      <filter id="sparkleGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.2" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <!-- 1. RECEIPT PAPER BODY (Modern Notched Document Silhouette) -->
    <path
      d="M12 7C12 5.34315 13.3431 4 15 4H33C34.6569 4 36 5.34315 36 7V39L33 37L30 39L27 37L24 39L21 37L18 39L15 37L12 39V7Z"
      fill="url(#receiptPaperGrad)"
      stroke="rgba(255, 255, 255, 0.4)"
      stroke-width="1.2"
    />

    <!-- Receipt Header Badge / Logo Dot -->
    <circle cx="18" cy="11" r="2" fill="#6366f1" />
    <rect x="22" y="10" width="10" height="2.2" rx="1.1" fill="#475569" />

    <!-- Receipt Itemized Lines -->
    <rect x="16" y="16" width="16" height="1.8" rx="0.9" fill="#94a3b8" opacity="0.8" />
    <rect x="16" y="21" width="12" height="1.8" rx="0.9" fill="#94a3b8" opacity="0.8" />
    <rect x="16" y="26" width="14" height="1.8" rx="0.9" fill="#94a3b8" opacity="0.8" />
    <rect x="16" y="31" width="16" height="2" rx="1" fill="#475569" font-weight="bold" />

    <!-- 2. HIGH-TECH VIEWFINDER CAMERA BRACKETS (4 CORNERS) -->
    <!-- Top-Left Bracket -->
    <path
      d="M6 14V8C6 6.89543 6.89543 6 8 6H14"
      stroke="url(#viewfinderGrad)"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- Top-Right Bracket -->
    <path
      d="M34 6H40C41.1046 6 42 6.89543 42 8V14"
      stroke="url(#viewfinderGrad)"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- Bottom-Left Bracket -->
    <path
      d="M6 34V40C6 41.1046 6.89543 42 8 42H14"
      stroke="url(#viewfinderGrad)"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- Bottom-Right Bracket -->
    <path
      d="M34 42H40C41.1046 42 42 41.1046 42 40V34"
      stroke="url(#viewfinderGrad)"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- 3. SCANNING LASER BEAM (Horizontal Neon Ray with Core) -->
    <g class="laser-group" filter="url(#laserGlowFilter)">
      <!-- Outer Glow Line -->
      <line
        x1="3"
        y1="24"
        x2="45"
        y2="24"
        stroke="url(#laserBeamGrad)"
        stroke-width="3"
        stroke-linecap="round"
      />
      <!-- Core Intense Ray -->
      <line
        x1="10"
        y1="24"
        x2="38"
        y2="24"
        stroke="#ffffff"
        stroke-width="1.2"
        stroke-linecap="round"
      />
      <!-- Central Optical Target Indicator -->
      <circle cx="24" cy="24" r="2.2" fill="#ffffff" />
      <circle cx="24" cy="24" r="4.5" stroke="#ec4899" stroke-width="1" stroke-dasharray="2 2" />
    </g>

    <!-- 4. CYBER SPARKLE ACCENT (Top Right Flare) -->
    <path
      d="M40 9L40.8 11.2L43 12L40.8 12.8L40 15L39.2 12.8L37 12L39.2 11.2L40 9Z"
      fill="#38bdf8"
      class="beacon-flare"
      filter="url(#sparkleGlow)"
    />
  </svg>
</span>

<style>
  .scan-receipt-icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--icon-size, 28px);
    height: var(--icon-size, 28px);
    flex-shrink: 0;
    vertical-align: middle;
  }

  .scan-receipt-svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  /* Animated Scanner Laser Sweep */
  .animated .laser-group {
    animation: scanLaserSweep 2.4s ease-in-out infinite alternate;
    transform-origin: center;
  }

  @keyframes scanLaserSweep {
    0% {
      transform: translateY(-8px);
    }
    50% {
      transform: translateY(0px);
    }
    100% {
      transform: translateY(8px);
    }
  }

  /* Sparkle Flare Pulse */
  .animated .beacon-flare {
    animation: beaconFlarePulse 2s ease-in-out infinite alternate;
    transform-origin: 40px 12px;
  }

  @keyframes beaconFlarePulse {
    0% {
      transform: scale(0.7) rotate(0deg);
      opacity: 0.6;
    }
    100% {
      transform: scale(1.3) rotate(45deg);
      opacity: 1;
    }
  }

  .glow .scan-receipt-svg {
    filter: drop-shadow(0 2px 8px rgba(168, 85, 247, 0.45));
  }
</style>
