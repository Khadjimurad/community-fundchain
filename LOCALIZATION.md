# FundChain Localization System

## Overview

The FundChain platform now supports internationalization (i18n) with Russian language translation. The system includes:

- **Lightweight JavaScript i18n manager** for client-side localization
- **English and Russian translations** for all UI elements  
- **Language switcher component** in the header
- **Russian demo data script** for testing localized content
- **Persistent language preferences** using localStorage

## Files Structure

```
web/
├── locales/
│   ├── en.json          # English translations
│   └── ru.json          # Russian translations
├── js/
│   └── i18n.js          # Translation manager
├── index.html           # Updated with data-i18n attributes
└── test-i18n.html       # Localization test page

scripts/
└── seed_demo_ru.py      # Russian demo data seeder
```

## Usage

### Language Switching

Users can switch languages using the language switcher button in the header:
- 🇺🇸 EN / 🇷🇺 RU button in top right
- Automatically detects browser language preference
- Remembers user selection in localStorage

### Adding New Translations

1. Add translation keys to both `en.json` and `ru.json`:
```json
{
  "new_section": {
    "new_key": "English Text"
  }
}
```

2. Add `data-i18n` attribute to HTML elements:
```html
<span data-i18n="new_section.new_key">English Text</span>
```

3. For dynamic content in JavaScript:
```javascript
const translatedText = window.i18n.t('new_section.new_key');
```

### Translation Manager API

The `I18nManager` class provides these methods:

- `setLanguage(lang)` - Switch to specific language
- `toggleLanguage()` - Toggle between English/Russian  
- `t(key, params)` - Get translated text with optional parameters
- `getCurrentLanguage()` - Get current language code
- `formatNumber(num)` - Format numbers for current locale
- `formatDate(date)` - Format dates for current locale
- `formatCurrency(amount)` - Format ETH amounts

### Demo Data in Russian

Run the Russian demo data script to populate the database with localized content:

```bash
cd /path/to/community-fundchain
python3 scripts/seed_demo_ru.py
```

This creates Russian project names, descriptions, and other content suitable for testing the localized interface.

## Features

### Automatic Translation

- All static text is automatically translated when language changes
- Supports nested translation keys with dot notation
- Fallback to English if translation missing
- Parameter interpolation with `{{variable}}` syntax

### Language Detection

- Detects browser language on first visit
- Remembers user preference in localStorage
- Falls back to English for unsupported languages

### Responsive Design

The language switcher adapts to different screen sizes and maintains accessibility standards.

## Testing

1. **Start the web server:**
   ```bash
   make web
   ```

2. **Open test page:**
   Visit `http://localhost:8080/test-i18n.html` to test localization features

3. **Test main application:**
   Visit `http://localhost:8080/` and use the language switcher in the header

## Development Notes

### Adding New Languages

To add more languages:

1. Create new translation file (e.g., `es.json` for Spanish)
2. Add language code to `supportedLanguages` array in `i18n.js`
3. Update language switcher UI for multiple languages
4. Add flag icons/names for new languages

### Translation Guidelines

- Keep translation keys descriptive and organized by section
- Use consistent terminology across similar contexts
- Test all translations in context for proper fit
- Consider cultural adaptations beyond literal translation

### Technical Considerations

- Translation files are loaded asynchronously
- System gracefully handles missing translations
- No external dependencies - pure vanilla JavaScript
- Compatible with existing FundChain infrastructure

## Browser Support

The localization system works in all modern browsers that support:
- ES6 classes
- Fetch API  
- localStorage
- addEventListener

## Performance

- Translation files are cached after first load
- Minimal runtime overhead
- No impact on existing functionality
- Lazy loading of non-current language files