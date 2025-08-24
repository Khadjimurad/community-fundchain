/**
 * FundChain Internationalization (i18n) System
 * Lightweight localization manager for vanilla JavaScript
 */

class I18nManager {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = {};
    this.fallbackLanguage = 'en';
    this.supportedLanguages = ['en', 'ru'];
    this.initialized = false;
    
    // Storage key for language preference
    this.storageKey = 'fundchain_language';
    
    // DOM ready check
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  /**
   * Initialize the i18n system
   */
  async init() {
    try {
      // Load user's preferred language from storage
      this.currentLanguage = this.getStoredLanguage();
      
      // Load translation files
      await this.loadTranslations();
      
      // Apply translations to DOM
      this.applyTranslations();
      
      // Update language switcher
      this.updateLanguageSwitcher();
      
      this.initialized = true;
      console.log(`I18n initialized with language: ${this.currentLanguage}`);
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('i18nInitialized', {
        detail: { language: this.currentLanguage }
      }));
      
    } catch (error) {
      console.error('Failed to initialize i18n system:', error);
      // Fallback to English if initialization fails
      this.currentLanguage = 'en';
    }
  }

  /**
   * Get stored language preference or detect from browser
   */
  getStoredLanguage() {
    // Check localStorage first
    const stored = localStorage.getItem(this.storageKey);
    if (stored && this.supportedLanguages.includes(stored)) {
      return stored;
    }
    
    // Check browser language
    const browserLang = navigator.language.substring(0, 2);
    if (this.supportedLanguages.includes(browserLang)) {
      return browserLang;
    }
    
    // Default to English
    return 'en';
  }

  /**
   * Store language preference
   */
  storeLanguage(language) {
    localStorage.setItem(this.storageKey, language);
  }

  /**
   * Load translation files for current and fallback languages
   */
  async loadTranslations() {
    const promises = [];
    
    // Load current language
    if (this.currentLanguage !== this.fallbackLanguage) {
      promises.push(this.loadLanguageFile(this.currentLanguage));
    }
    
    // Load fallback language
    promises.push(this.loadLanguageFile(this.fallbackLanguage));
    
    await Promise.all(promises);
  }

  /**
   * Load a specific language file
   */
  async loadLanguageFile(language) {
    try {
      const response = await fetch(`./locales/${language}.json?v=1.4.25`);
      if (!response.ok) {
        throw new Error(`Failed to load ${language}.json: ${response.statusText}`);
      }
      
      const translations = await response.json();
      this.translations[language] = translations;
      
      console.log(`Loaded translations for ${language}`);
    } catch (error) {
      console.error(`Error loading ${language} translations:`, error);
      
      // If we can't load the fallback language, use empty object
      if (language === this.fallbackLanguage) {
        this.translations[language] = {};
      }
    }
  }

  /**
   * Get translated text by key path
   * @param {string} key - Dot-notation key path (e.g., 'navigation.dashboard')
   * @param {Object} params - Optional parameters for string interpolation
   * @returns {string} Translated text or key if not found
   */
  t(key, params = {}) {
    let translation = this.getNestedValue(this.translations[this.currentLanguage], key);
    
    // Fallback to English if not found
    if (translation === null && this.currentLanguage !== this.fallbackLanguage) {
      translation = this.getNestedValue(this.translations[this.fallbackLanguage], key);
    }
    
    // Return key if no translation found
    if (translation === null) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    
    // Handle parameter interpolation
    return this.interpolate(translation, params);
  }

  /**
   * Get nested object value by dot notation
   */
  getNestedValue(obj, path) {
    if (!obj) return null;
    
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Simple string interpolation
   * @param {string} template - Template string with {{key}} placeholders
   * @param {Object} params - Parameters object
   */
  interpolate(template, params) {
    if (typeof template !== 'string' || Object.keys(params).length === 0) {
      return template;
    }
    
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  /**
   * Switch to a different language
   */
  async setLanguage(language) {
    if (!this.supportedLanguages.includes(language)) {
      console.error(`Unsupported language: ${language}`);
      return;
    }
    
    if (language === this.currentLanguage) {
      return; // No change needed
    }
    
    const previousLanguage = this.currentLanguage;
    this.currentLanguage = language;
    
    try {
      // Load new language if not already loaded
      if (!this.translations[language]) {
        await this.loadLanguageFile(language);
      }
      
      // Store preference
      this.storeLanguage(language);
      
      // Apply translations
      this.applyTranslations();
      
      // Update language switcher
      this.updateLanguageSwitcher();
      
      // Update HTML lang attribute
      document.documentElement.lang = language;
      
      // Dispatch language change event
      window.dispatchEvent(new CustomEvent('languageChanged', {
        detail: { 
          from: previousLanguage,
          to: language 
        }
      }));
      
      console.log(`Language switched to: ${language}`);
      
    } catch (error) {
      console.error(`Failed to switch to ${language}:`, error);
      // Revert to previous language
      this.currentLanguage = previousLanguage;
    }
  }

  /**
   * Apply translations to all elements with data-i18n attributes
   */
  applyTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      // Handle different element types
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        if (element.type === 'text' || element.type === 'search' || element.tagName === 'TEXTAREA') {
          element.placeholder = translation;
        } else {
          element.value = translation;
        }
      } else if (element.tagName === 'IMG') {
        element.alt = translation;
      } else if (element.tagName === 'OPTION') {
        element.textContent = translation;
      } else {
        // For most elements, update text content
        element.textContent = translation;
      }
    });

    // Update page title
    const titleElement = document.querySelector('title');
    if (titleElement) {
      titleElement.textContent = this.t('app.title');
    }
  }

  /**
   * Update language switcher state
   */
  updateLanguageSwitcher() {
    const languageSwitcher = document.getElementById('language-switcher');
    if (languageSwitcher) {
      const currentFlag = this.currentLanguage === 'ru' ? '🇷🇺' : '🇺🇸';
      const currentName = this.currentLanguage === 'ru' ? 'RU' : 'EN';
      languageSwitcher.innerHTML = `${currentFlag} ${currentName}`;
      
      // Update title
      const switchKey = this.currentLanguage === 'ru' ? 'language.switch_to_english' : 'language.switch_to_russian';
      languageSwitcher.title = this.t(switchKey);
    }
  }

  /**
   * Toggle between supported languages
   */
  toggleLanguage() {
    const newLanguage = this.currentLanguage === 'en' ? 'ru' : 'en';
    this.setLanguage(newLanguage);
  }

  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages() {
    return [...this.supportedLanguages];
  }

  /**
   * Check if i18n system is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Translate dynamic content (for use in JavaScript)
   */
  translateDynamicContent(contentObject) {
    if (typeof contentObject === 'string') {
      return this.t(contentObject);
    }
    
    if (Array.isArray(contentObject)) {
      return contentObject.map(item => this.translateDynamicContent(item));
    }
    
    if (typeof contentObject === 'object' && contentObject !== null) {
      const translated = {};
      for (const [key, value] of Object.entries(contentObject)) {
        translated[key] = this.translateDynamicContent(value);
      }
      return translated;
    }
    
    return contentObject;
  }

  /**
   * Format numbers according to current locale
   */
  formatNumber(number, options = {}) {
    const locale = this.currentLanguage === 'ru' ? 'ru-RU' : 'en-US';
    return new Intl.NumberFormat(locale, options).format(number);
  }

  /**
   * Format dates according to current locale
   */
  formatDate(date, options = {}) {
    const locale = this.currentLanguage === 'ru' ? 'ru-RU' : 'en-US';
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  /**
   * Format currency according to current locale
   */
  formatCurrency(amount, currency = 'ETH') {
    if (currency === 'ETH') {
      return `${this.formatNumber(amount, { 
        minimumFractionDigits: 4, 
        maximumFractionDigits: 4 
      })} ETH`;
    }
    
    const locale = this.currentLanguage === 'ru' ? 'ru-RU' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
}

// Create global instance
window.i18n = new I18nManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = I18nManager;
}