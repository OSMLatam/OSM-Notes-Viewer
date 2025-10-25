/**
 * @fileoverview Internationalization (i18n) configuration and utilities
 * @module utils/i18n
 */

/**
 * Supported languages configuration
 * @type {Object<string, {code: string, name: string, nativeName: string, flag: string}>}
 */
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

/**
 * Default language code
 * @type {string}
 */
export const DEFAULT_LANGUAGE = 'en';

/**
 * Detect user's preferred language from browser settings or localStorage
 * @returns {string} Language code (en, es, de, fr)
 * @example
 * const lang = detectLanguage(); // Returns 'es' if browser is Spanish
 */
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

/**
 * Set the application language
 * @param {string} langCode - Language code to set (en, es, de, fr)
 * @returns {boolean} True if language was set successfully, false otherwise
 * @example
 * setLanguage('es'); // Switch to Spanish
 */
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

/**
 * Get the current language code
 * @returns {string} Current language code
 * @example
 * const currentLang = getCurrentLanguage(); // Returns 'en'
 */
export function getCurrentLanguage() {
    return localStorage.getItem('osm-notes-lang') || detectLanguage();
}

/**
 * Internationalization utilities
 * @namespace i18n
 */
export const i18n = {
    /** @type {string} Current language code */
    currentLang: getCurrentLanguage(),

    /**
     * Set the application language
     * @param {string} langCode - Language code to set
     * @returns {void}
     */
    setLanguage(langCode) {
        if (setLanguage(langCode)) {
            this.currentLang = langCode;
            this.loadTranslations();
        }
    },

    /**
     * Load translations for the current language
     * @returns {Promise<void>}
     */
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

    /**
     * Get translation for a key with optional parameters
     * @param {string} key - Translation key
     * @param {Object<string, string>} [params={}] - Parameters to replace in translation
     * @returns {string} Translated text
     * @example
     * i18n.t('home.hero.title'); // Returns "Explore OpenStreetMap Notes Analytics"
     * i18n.t('explore.results.showing', { count: 10, total: 100 }); // Returns "Showing 10 of 100 results"
     */
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

    /**
     * Update all page content with current translations
     * Searches for elements with data-i18n attributes and updates their content
     * @returns {void}
     */
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

    /**
     * Initialize the i18n system
     * Detects language, loads translations, and sets up event listeners
     * @returns {Promise<void>}
     */
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

/**
 * Default export of i18n utilities
 * @type {i18n}
 */
export default i18n;


