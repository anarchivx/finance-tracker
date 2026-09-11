<script>
  import { confirmDialog, closeConfirm } from '$lib/stores.js';

  function handleConfirm() {
    if ($confirmDialog.onConfirm) {
      $confirmDialog.onConfirm();
    }
    closeConfirm();
  }

  function handleKeydown(e) {
    if (!$confirmDialog.isOpen) return;
    if (e.key === 'Escape') {
      closeConfirm();
    } else if (e.key === 'Enter') {
      handleConfirm();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $confirmDialog.isOpen}
  <div class="confirm-backdrop" on:click={closeConfirm} role="dialog" aria-modal="true">
    <div class="glass-panel confirm-card" on:click|stopPropagation role="document">
      <!-- Icon badge -->
      <div class="confirm-icon-box {$confirmDialog.confirmStyle}">
        <i class="fa-solid {$confirmDialog.icon}"></i>
      </div>

      <!-- Title & Message -->
      <h3 class="confirm-title">{$confirmDialog.title}</h3>
      <p class="confirm-message">{$confirmDialog.message}</p>

      <!-- Action Buttons -->
      <div class="confirm-actions">
        <button type="button" class="btn btn-outline cancel-btn" on:click={closeConfirm}>
          Batal
        </button>
        <button
          type="button"
          class="btn confirm-btn {$confirmDialog.confirmStyle}"
          on:click={handleConfirm}
        >
          {$confirmDialog.confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .confirm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(4, 7, 13, 0.75);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.15s ease-out;
  }

  .confirm-card {
    width: 100%;
    max-width: 420px;
    padding: 28px 24px;
    background: var(--bg-card);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .confirm-icon-box {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    margin-bottom: 16px;
  }

  .confirm-icon-box.danger {
    background: rgba(244, 63, 94, 0.15);
    color: #f43f5e;
    border: 1px solid rgba(244, 63, 94, 0.3);
    box-shadow: 0 0 20px rgba(244, 63, 94, 0.2);
  }

  .confirm-icon-box.warning {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
  }

  .confirm-icon-box.primary {
    background: rgba(99, 102, 241, 0.15);
    color: #818cf8;
    border: 1px solid rgba(99, 102, 241, 0.3);
  }

  .confirm-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 8px;
  }

  .confirm-message {
    font-size: 0.92rem;
    color: var(--text-muted);
    line-height: 1.5;
    margin-bottom: 24px;
  }

  .confirm-actions {
    display: flex;
    width: 100%;
    gap: 12px;
  }

  .confirm-actions button {
    flex: 1;
    padding: 12px;
    font-weight: 600;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .cancel-btn {
    border-color: var(--border-color);
    color: var(--text-muted);
  }

  .cancel-btn:hover {
    color: var(--text-main);
    border-color: var(--text-muted);
  }

  .confirm-btn.danger {
    background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
    color: #ffffff;
    border: none;
    box-shadow: 0 4px 15px rgba(244, 63, 94, 0.3);
  }

  .confirm-btn.danger:hover {
    background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
    box-shadow: 0 6px 20px rgba(244, 63, 94, 0.4);
    transform: translateY(-1px);
  }

  .confirm-btn.warning {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: #ffffff;
    border: none;
    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
  }

  .confirm-btn.warning:hover {
    background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
    transform: translateY(-1px);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.92);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
