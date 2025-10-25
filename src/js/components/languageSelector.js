// Language selector component
import { SUPPORTED_LANGUAGES, i18n } from '../utils/i18n.js';
import { analytics } from '../utils/analytics.js';

export class LanguageSelector {
    constructor(container) {
        this.container = container;
        this.currentLang = i18n.getCurrentLanguage();
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        const currentLangData = SUPPORTED_LANGUAGES[this.currentLang];
        
        this.container.innerHTML = `
            <div class="language-selector">
                <button class="language-btn" id="languageBtn" aria-label="${i18n.t('language.select')}" aria-expanded="false">
                    <span class="language-flag">${currentLangData.flag}</span>
                    <span class="language-name">${currentLangData.nativeName}</span>
                    <span class="language-arrow">▼</span>
                </button>
                <div class="language-menu" id="languageMenu" style="display: none;">
                    <div class="language-menu-header">
                        <h4>${i18n.t('language.title')}</h4>
                    </div>
                    <div class="language-options">
                        ${Object.values(SUPPORTED_LANGUAGES).map(lang => `
                            <button class="language-option ${lang.code === this.currentLang ? 'active' : ''}" 
                                    data-lang="${lang.code}">
                                <span class="language-flag">${lang.flag}</span>
                                <span class="language-name">${lang.nativeName}</span>
                                <span class="language-name-en">${lang.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const languageBtn = document.getElementById('languageBtn');
        const languageMenu = document.getElementById('languageMenu');
        
        if (!languageBtn || !languageMenu) return;

        // Toggle menu
        languageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = languageMenu.style.display !== 'none';
            
            if (isVisible) {
                this.closeMenu();
            } else {
                this.openMenu();
            }
        });

        // Language selection
        languageMenu.addEventListener('click', (e) => {
            const option = e.target.closest('.language-option');
            if (option) {
                const langCode = option.dataset.lang;
                this.selectLanguage(langCode);
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!languageBtn.contains(e.target) && !languageMenu.contains(e.target)) {
                this.closeMenu();
            }
        });

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            this.currentLang = i18n.getCurrentLanguage();
            this.render();
            this.setupEventListeners();
        });
    }

    openMenu() {
        const languageMenu = document.getElementById('languageMenu');
        const languageBtn = document.getElementById('languageBtn');
        
        if (languageMenu && languageBtn) {
            languageMenu.style.display = 'block';
            languageBtn.setAttribute('aria-expanded', 'true');
            languageBtn.querySelector('.language-arrow').textContent = '▲';
        }
    }

    closeMenu() {
        const languageMenu = document.getElementById('languageMenu');
        const languageBtn = document.getElementById('languageBtn');
        
        if (languageMenu && languageBtn) {
            languageMenu.style.display = 'none';
            languageBtn.setAttribute('aria-expanded', 'false');
            languageBtn.querySelector('.language-arrow').textContent = '▼';
        }
    }

    async selectLanguage(langCode) {
        if (langCode === this.currentLang) {
            this.closeMenu();
            return;
        }

        // Track language change
        analytics.trackEvent('language_change', 'ui', langCode);

        // Change language
        i18n.setLanguage(langCode);
        
        // Close menu
        this.closeMenu();

        // Show feedback
        this.showToast(`${i18n.t('language.current', { lang: SUPPORTED_LANGUAGES[langCode].nativeName })}`);
    }

    showToast(message) {
        // Remove existing toast if any
        const existingToast = document.querySelector('.language-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create toast
        const toast = document.createElement('div');
        toast.className = 'language-toast';
        toast.textContent = message;
        
        // Add styles
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            zIndex: '10000',
            animation: 'slideInUp 0.3s ease',
            maxWidth: '300px',
            fontSize: '0.9rem',
            textAlign: 'center'
        });

        document.body.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOutDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Export singleton instance
export const languageSelector = new LanguageSelector();

// Initialize language selector when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('languageSelector');
    if (container) {
        new LanguageSelector(container);
    }
});









