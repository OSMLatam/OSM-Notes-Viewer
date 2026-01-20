/**
 * @fileoverview Translation utility for note comments using LibreTranslate API
 * @module utils/translator
 */

import { getCurrentLanguage } from './i18n.js';
import { cacheGet, cacheSet } from './cache.js';

// LibreTranslate public API endpoint (free, no API key required)
const LIBRETRANSLATE_API = 'https://libretranslate.com/translate';
// Fallback: MyMemory Translation API (free, limited)
const MYMEMORY_API = 'https://api.mymemory.translated.net/get';

// Cache translations for 24 hours
const TRANSLATION_CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Language code mapping for LibreTranslate
 * Maps our language codes to LibreTranslate language codes
 */
const LANGUAGE_MAP = {
    'en': 'en',
    'es': 'es',
    'fr': 'fr',
    'de': 'de',
    'pt': 'pt'
};

/**
 * Detect language of text (simple heuristic)
 * @param {string} text - Text to detect language
 * @returns {Promise<string>} Language code
 */
async function detectLanguage(text) {
    if (!text || text.length < 10) {
        return 'en'; // Default to English for short text
    }

    // Simple heuristic: check for common language patterns
    // This is a basic implementation; for better accuracy, use a language detection API
    const greekPattern = /[α-ωΑ-Ω]/;
    const cyrillicPattern = /[а-яА-Я]/;
    const arabicPattern = /[ء-ي]/;
    const chinesePattern = /[\u4e00-\u9fff]/;
    const japanesePattern = /[\u3040-\u309f\u30a0-\u30ff]/;
    const koreanPattern = /[\uac00-\ud7a3]/;

    if (greekPattern.test(text)) return 'el';
    if (cyrillicPattern.test(text)) return 'ru';
    if (arabicPattern.test(text)) return 'ar';
    if (chinesePattern.test(text)) return 'zh';
    if (japanesePattern.test(text)) return 'ja';
    if (koreanPattern.test(text)) return 'ko';

    // Default to English for other cases
    return 'en';
}

/**
 * Translate text using LibreTranslate API
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code
 * @param {string} sourceLang - Source language code (optional, auto-detect if not provided)
 * @returns {Promise<string>} Translated text
 */
async function translateWithLibreTranslate(text, targetLang, sourceLang = 'auto') {
    try {
        const response = await fetch(LIBRETRANSLATE_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                source: sourceLang,
                target: targetLang,
                format: 'text'
            })
        });

        if (!response.ok) {
            throw new Error(`LibreTranslate API error: ${response.status}`);
        }

        const data = await response.json();
        return data.translatedText || text;
    } catch (error) {
        console.warn('LibreTranslate translation failed:', error);
        throw error;
    }
}

/**
 * Translate text using MyMemory API (fallback)
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code
 * @param {string} sourceLang - Source language code
 * @returns {Promise<string>} Translated text
 */
async function translateWithMyMemory(text, targetLang, sourceLang = 'en') {
    try {
        const url = `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`MyMemory API error: ${response.status}`);
        }

        const data = await response.json();
        if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }
        throw new Error('Invalid MyMemory response');
    } catch (error) {
        console.warn('MyMemory translation failed:', error);
        throw error;
    }
}

/**
 * Translate text with caching
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code
 * @param {string} sourceLang - Source language code (optional)
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, targetLang = null, sourceLang = null) {
    if (!text || text.trim().length === 0) {
        return text;
    }

    // Use current UI language if target not specified
    const target = targetLang || LANGUAGE_MAP[getCurrentLanguage()] || 'en';

    // Don't translate if target is same as source
    if (sourceLang && sourceLang === target) {
        return text;
    }

    // Check cache first
    const cacheKey = `translation_${sourceLang || 'auto'}_${target}_${text.substring(0, 50)}`;
    const cached = cacheGet(cacheKey, TRANSLATION_CACHE_TTL);
    if (cached) {
        return cached;
    }

    // Detect source language if not provided
    let detectedSourceLang = sourceLang;
    if (!detectedSourceLang) {
        detectedSourceLang = await detectLanguage(text);
    }

    // Map to LibreTranslate language codes
    const mappedSource = LANGUAGE_MAP[detectedSourceLang] || detectedSourceLang;
    const mappedTarget = LANGUAGE_MAP[target] || target;

    // Don't translate if languages are the same
    if (mappedSource === mappedTarget) {
        return text;
    }

    try {
        // Try LibreTranslate first
        const translated = await translateWithLibreTranslate(text, mappedTarget, mappedSource);

        // Cache the result
        cacheSet(cacheKey, translated);

        return translated;
    } catch (error) {
        // Fallback to MyMemory if LibreTranslate fails
        try {
            const translated = await translateWithMyMemory(text, mappedTarget, mappedSource);

            // Cache the result
            cacheSet(cacheKey, translated);

            return translated;
        } catch (fallbackError) {
            console.error('All translation services failed:', fallbackError);
            // Return original text if all translation attempts fail
            return text;
        }
    }
}

/**
 * Check if translation is available for current language
 * @param {string} text - Text to check
 * @returns {Promise<boolean>} True if translation is available/needed
 */
export async function isTranslationAvailable(text) {
    if (!text || text.trim().length === 0) {
        return false;
    }

    const currentLang = LANGUAGE_MAP[getCurrentLanguage()] || 'en';
    const detectedLang = await detectLanguage(text);
    const mappedDetected = LANGUAGE_MAP[detectedLang] || detectedLang;

    // Translation is available if detected language differs from current UI language
    return mappedDetected !== currentLang;
}


/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
