// Internationalization (i18n) configuration and utilities

// Supported languages
export const SUPPORTED_LANGUAGES = {
    en: {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸'
    },
    es: {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        flag: '🇪🇸'
    },
    fr: {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        flag: '🇫🇷'
    },
    de: {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        flag: '🇩🇪'
    }
};

// Default language
export const DEFAULT_LANGUAGE = 'en';

// Language detection
export function detectLanguage() {
    // 1. Check localStorage
    const savedLang = localStorage.getItem('osm-notes-lang');
    if (savedLang && SUPPORTED_LANGUAGES[savedLang]) {
        return savedLang;
    }

    // 2. Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGUAGES[browserLang]) {
        return browserLang;
    }

    // 3. Check browser languages array
    for (const lang of navigator.languages) {
        const langCode = lang.split('-')[0];
        if (SUPPORTED_LANGUAGES[langCode]) {
            return langCode;
        }
    }

    // 4. Default fallback
    return DEFAULT_LANGUAGE;
}

// Set language
export function setLanguage(langCode) {
    if (!SUPPORTED_LANGUAGES[langCode]) {
        console.warn(`Language ${langCode} not supported`);
        return false;
    }

    localStorage.setItem('osm-notes-lang', langCode);
    document.documentElement.lang = langCode;

    // Trigger language change event
    window.dispatchEvent(new CustomEvent('languageChanged', {
        detail: { language: langCode }
    }));

    return true;
}

// Get current language
export function getCurrentLanguage() {
    return localStorage.getItem('osm-notes-lang') || detectLanguage();
}

// Language utilities
export const i18n = {
    currentLang: getCurrentLanguage(),

    // Set language
    setLanguage(langCode) {
        if (setLanguage(langCode)) {
            this.currentLang = langCode;
            this.loadTranslations();
        }
    },

    // Load translations for current language
    async loadTranslations() {
        try {
            const translations = await import(`../locales/${this.currentLang}.js`);
            this.translations = translations.default;
            this.updatePageContent();
        } catch (error) {
            console.error(`Failed to load translations for ${this.currentLang}:`, error);
            // Fallback to English
            if (this.currentLang !== 'en') {
                this.currentLang = 'en';
                this.loadTranslations();
            }
        }
    },

    // Get translation
    t(key, params = {}) {
        if (!this.translations) {
            return key; // Fallback to key if translations not loaded
        }

        let translation = this.translations[key];

        if (!translation) {
            console.warn(`Translation missing for key: ${key}`);
            return key;
        }

        // Replace parameters
        Object.keys(params).forEach(param => {
            translation = translation.replace(`{{${param}}}`, params[param]);
        });

        return translation;
    },

    // Update page content
    updatePageContent() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);

            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translation;
            } else if (element.tagName === 'INPUT' && element.type === 'submit') {
                element.value = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // Update elements with data-i18n-aria-label attribute
        document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
            const key = element.getAttribute('data-i18n-aria-label');
            element.setAttribute('aria-label', this.t(key));
        });

        // Update page title
        const titleKey = document.querySelector('title')?.getAttribute('data-i18n');
        if (titleKey) {
            document.title = this.t(titleKey);
        }

        // Update meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        const descKey = metaDesc?.getAttribute('data-i18n');
        if (descKey) {
            metaDesc.setAttribute('content', this.t(descKey));
        }
    },

    // Initialize i18n
    async init() {
        this.currentLang = detectLanguage();
        document.documentElement.lang = this.currentLang;
        await this.loadTranslations();

        // Listen for language changes
        window.addEventListener('languageChanged', (event) => {
            this.currentLang = event.detail.language;
            this.loadTranslations();
        });
    }
};

// Export default instance
export default i18n;


