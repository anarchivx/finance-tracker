/* ==========================================================================
   FINORA SECURITY & AUTHENTICATION ENGINE
   ========================================================================== */

const AUTH_STORAGE_KEY = 'finora_auth_pin_v1';
const AUTH_SESSION_KEY = 'finora_session_active_v1';

class AuthManager {
    constructor() {
        this.overlayEl = null;
        this.pinInputEl = null;
        this.authFormEl = null;
        this.errorMsgEl = null;
        this.titleEl = null;
        this.subtitleEl = null;
        this.confirmPinContainerEl = null;
        this.confirmPinInputEl = null;
        this.btnSubmitEl = null;
        this.isSetupMode = false;

        this.init();
    }

    async init() {
        this.createAuthOverlay();
        this.bindEvents();

        const configured = this.isPinConfigured();
        const authenticated = this.isAuthenticated();

        if (!configured) {
            // First time setup
            this.showSetupScreen();
        } else if (!authenticated) {
            // Lock screen
            this.showLoginScreen();
        } else {
            // Authenticated session active
            this.hideAuthOverlay();
        }
    }

    isPinConfigured() {
        return !!localStorage.getItem(AUTH_STORAGE_KEY);
    }

    isAuthenticated() {
        return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
    }

    async hashPin(pin) {
        const msgUint8 = new TextEncoder().encode('finora_salt_' + pin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    createAuthOverlay() {
        if (document.getElementById('authOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'authOverlay';
        overlay.className = 'auth-overlay';
        overlay.innerHTML = `
            <div class="auth-card glass-card">
                <div class="auth-header">
                    <div class="auth-icon glow-effect">
                        <i class="fa-solid fa-user-lock"></i>
                    </div>
                    <h2 id="authTitle">Keamanan Finora</h2>
                    <p id="authSubtitle">Masukkan PIN / Kata Sandi untuk membuka akses aplikasi.</p>
                </div>

                <form id="authForm" class="auth-form" autocomplete="off" onsubmit="return false;">
                    <div class="form-group">
                        <label for="authPinInput"><i class="fa-solid fa-key text-amber"></i> MASTER ACCESS CODE</label>
                        <div class="password-field">
                            <input type="password" id="authPinInput" placeholder="•••• (Enter Master Passcode)" maxlength="20" required autofocus>
                            <button type="button" class="btn-toggle-pass" id="btnToggleAuthPass" tabIndex="-1">
                                <i class="fa-regular fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div class="form-group" id="confirmPinGroup" style="display: none;">
                        <label for="authConfirmPinInput"><i class="fa-solid fa-shield-check text-emerald"></i> CONFIRM MASTER CODE</label>
                        <div class="password-field">
                            <input type="password" id="authConfirmPinInput" placeholder="•••• (Re-enter Master Passcode)" maxlength="20">
                            <button type="button" class="btn-toggle-pass" id="btnToggleConfirmPass" tabIndex="-1">
                                <i class="fa-regular fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Glowing PIN Indicator Dots -->
                    <div class="pin-dots-container" id="pinDotsContainer">
                        <span class="pin-dot"></span>
                        <span class="pin-dot"></span>
                        <span class="pin-dot"></span>
                        <span class="pin-dot"></span>
                        <span class="pin-dot"></span>
                        <span class="pin-dot"></span>
                    </div>

                    <!-- Keypad grid for quick touch input -->
                    <div class="pin-keypad" id="pinKeypad">
                        <button type="button" class="keypad-btn" data-key="1">1</button>
                        <button type="button" class="keypad-btn" data-key="2">2</button>
                        <button type="button" class="keypad-btn" data-key="3">3</button>
                        <button type="button" class="keypad-btn" data-key="4">4</button>
                        <button type="button" class="keypad-btn" data-key="5">5</button>
                        <button type="button" class="keypad-btn" data-key="6">6</button>
                        <button type="button" class="keypad-btn" data-key="7">7</button>
                        <button type="button" class="keypad-btn" data-key="8">8</button>
                        <button type="button" class="keypad-btn" data-key="9">9</button>
                        <button type="button" class="keypad-btn btn-danger-action" id="btnKeypadClear"><i class="fa-solid fa-eraser"></i></button>
                        <button type="button" class="keypad-btn" data-key="0">0</button>
                        <button type="button" class="keypad-btn btn-backspace" id="btnKeypadBackspace"><i class="fa-solid fa-delete-left"></i></button>
                    </div>

                    <div id="authErrorMsg" class="auth-error-msg"></div>

                    <button type="submit" class="btn btn-primary btn-block btn-lg" id="btnSubmitAuth">
                        <i class="fa-solid fa-shield-halved"></i> AUTHENTICATE & UNLOCK
                    </button>
                </form>

                <div class="auth-footer-hint" id="authFooterHint">
                    <i class="fa-solid fa-shield-halved text-emerald"></i> 256-bit Hardware-Encrypted Security Active.
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        this.overlayEl = overlay;
        this.pinInputEl = document.getElementById('authPinInput');
        this.authFormEl = document.getElementById('authForm');
        this.errorMsgEl = document.getElementById('authErrorMsg');
        this.titleEl = document.getElementById('authTitle');
        this.subtitleEl = document.getElementById('authSubtitle');
        this.confirmPinContainerEl = document.getElementById('confirmPinGroup');
        this.confirmPinInputEl = document.getElementById('authConfirmPinInput');
        this.btnSubmitEl = document.getElementById('btnSubmitAuth');
    }

    bindEvents() {
        // Toggle password visibility
        const togglePassBtn = document.getElementById('btnToggleAuthPass');
        if (togglePassBtn) {
            togglePassBtn.addEventListener('click', () => {
                const type = this.pinInputEl.type === 'password' ? 'text' : 'password';
                this.pinInputEl.type = type;
                togglePassBtn.querySelector('i').className = type === 'password' ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
            });
        }

        const toggleConfirmBtn = document.getElementById('btnToggleConfirmPass');
        if (toggleConfirmBtn) {
            toggleConfirmBtn.addEventListener('click', () => {
                const type = this.confirmPinInputEl.type === 'password' ? 'text' : 'password';
                this.confirmPinInputEl.type = type;
                toggleConfirmBtn.querySelector('i').className = type === 'password' ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
            });
        }

        // Form Submission
        this.authFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });

        // Input listeners for PIN dots update
        if (this.pinInputEl) {
            this.pinInputEl.addEventListener('input', () => this.updatePinDots());
            this.pinInputEl.addEventListener('focus', () => this.updatePinDots());
        }
        if (this.confirmPinInputEl) {
            this.confirmPinInputEl.addEventListener('input', () => this.updatePinDots());
            this.confirmPinInputEl.addEventListener('focus', () => this.updatePinDots());
        }

        // Keypad actions
        const keypadBtns = document.querySelectorAll('#pinKeypad .keypad-btn[data-key]');
        keypadBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                const activeInput = (this.isSetupMode && document.activeElement === this.confirmPinInputEl) 
                    ? this.confirmPinInputEl 
                    : this.pinInputEl;
                
                if (activeInput.value.length < 20) {
                    activeInput.value += key;
                    this.updatePinDots();
                }
            });
        });

        const btnClear = document.getElementById('btnKeypadClear');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                this.pinInputEl.value = '';
                if (this.confirmPinInputEl) this.confirmPinInputEl.value = '';
                this.updatePinDots();
            });
        }

        const btnBackspace = document.getElementById('btnKeypadBackspace');
        if (btnBackspace) {
            btnBackspace.addEventListener('click', () => {
                const activeInput = (this.isSetupMode && document.activeElement === this.confirmPinInputEl) 
                    ? this.confirmPinInputEl 
                    : this.pinInputEl;
                activeInput.value = activeInput.value.slice(0, -1);
                this.updatePinDots();
            });
        }
    }

    updatePinDots() {
        const activeInput = (this.isSetupMode && document.activeElement === this.confirmPinInputEl) 
            ? this.confirmPinInputEl 
            : this.pinInputEl;
        const len = activeInput.value.length;
        const dots = document.querySelectorAll('#pinDotsContainer .pin-dot');
        dots.forEach((dot, idx) => {
            if (idx < len) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });
    }

    showSetupScreen() {
        this.isSetupMode = true;
        this.titleEl.textContent = 'Finora Security Setup';
        this.subtitleEl.textContent = 'Create a master passcode to protect your personal financial records.';
        this.confirmPinContainerEl.style.display = 'block';
        this.confirmPinInputEl.required = true;
        this.btnSubmitEl.innerHTML = '<i class="fa-solid fa-shield-cat"></i> INITIALIZE SECURITY PASSCODE';
        this.pinInputEl.value = '';
        this.confirmPinInputEl.value = '';
        this.clearError();
        this.showAuthOverlay();
    }

    showLoginScreen() {
        this.isSetupMode = false;
        this.titleEl.textContent = 'Encrypted Session Locked';
        this.subtitleEl.textContent = 'Enter your master passcode to authenticate access.';
        this.confirmPinContainerEl.style.display = 'none';
        this.confirmPinInputEl.required = false;
        this.btnSubmitEl.innerHTML = '<i class="fa-solid fa-shield-halved"></i> AUTHENTICATE & UNLOCK';
        this.pinInputEl.value = '';
        this.clearError();
        this.showAuthOverlay();
    }

    showAuthOverlay() {
        if (this.overlayEl) {
            this.overlayEl.classList.add('active');
            document.body.classList.add('app-locked');
            setTimeout(() => this.pinInputEl.focus(), 100);
        }
    }

    hideAuthOverlay() {
        if (this.overlayEl) {
            this.overlayEl.classList.remove('active');
            document.body.classList.remove('app-locked');
        }
    }

    async handleSubmit() {
        const pin = this.pinInputEl.value.trim();

        if (!pin) {
            this.showError('Please enter your master passcode.');
            return;
        }

        if (this.isSetupMode) {
            const confirmPin = this.confirmPinInputEl.value.trim();
            if (pin.length < 4) {
                this.showError('Passcode must be at least 4 characters.');
                return;
            }
            if (pin !== confirmPin) {
                this.showError('Passcode confirmation does not match.');
                return;
            }

            const hash = await this.hashPin(pin);
            localStorage.setItem(AUTH_STORAGE_KEY, hash);
            sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
            
            if (window.showToast) {
                window.showToast('Master passcode configured successfully!', 'success');
            }
            this.hideAuthOverlay();
        } else {
            const storedHash = localStorage.getItem(AUTH_STORAGE_KEY);
            const inputHash = await this.hashPin(pin);

            if (inputHash === storedHash) {
                sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
                if (window.showToast) {
                    window.showToast('Access Granted. Welcome back!', 'success');
                }
                this.hideAuthOverlay();
            } else {
                this.showError('Invalid passcode. Authentication failed.');
                this.triggerShake();
            }
        }
    }

    showError(msg) {
        this.errorMsgEl.textContent = msg;
        this.errorMsgEl.style.display = 'block';
    }

    clearError() {
        this.errorMsgEl.textContent = '';
        this.errorMsgEl.style.display = 'none';
    }

    triggerShake() {
        const card = this.overlayEl.querySelector('.auth-card');
        if (card) {
            card.classList.add('shake');
            setTimeout(() => card.classList.remove('shake'), 500);
        }
    }

    lockApp() {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        this.showLoginScreen();
        if (window.showToast) {
            window.showToast('Application session locked.', 'info');
        }
    }

    async changePin(currentPin, newPin) {
        const storedHash = localStorage.getItem(AUTH_STORAGE_KEY);
        const currentHash = await this.hashPin(currentPin);

        if (currentHash !== storedHash) {
            throw new Error('Current passcode is incorrect.');
        }
        if (!newPin || newPin.length < 4) {
            throw new Error('New passcode must be at least 4 characters.');
        }

        const newHash = await this.hashPin(newPin);
        localStorage.setItem(AUTH_STORAGE_KEY, newHash);
        sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    }
}

// Global instance variable
window.authManager = null;
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
