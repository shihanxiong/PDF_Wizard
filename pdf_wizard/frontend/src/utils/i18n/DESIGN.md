# Internationalization (i18n) Design

This document describes the internationalization system for PDF Wizard, which supports multiple languages through a modular translation system.

## Overview

The application supports multiple languages through a custom internationalization system located in `frontend/src/utils/i18n/`. The system is designed to be modular, type-safe, and easy to extend with additional languages.

## Supported Languages

- **English (en)** - Default language
- **Chinese Simplified (zh)** - Full translation support

## Directory Structure

```
utils/i18n/
├── index.ts      # Main export file with language management functions
├── types.ts      # TypeScript type definitions
├── en.ts         # English translations
└── zh.ts         # Chinese Simplified translations
```

## Architecture

### Translation Keys

All UI text is accessed via translation keys defined in the `Translations` interface. Keys are organized by feature area:

- App-level (appTitle)
- Tabs (mergeTab, splitTab, rotateTab)
- Settings (settings, language, english, chinese)
- Merge Tab (selectPDFFiles, dragDropHint, etc.)
- Split Tab (selectPDFFile, addSplit, etc.)
- Rotate Tab (addRotate, rotation, etc.)
- Common (modified, selectFiles, etc.)

### Type Definitions

The `types.ts` file defines:

```typescript
export type Language = 'en' | 'zh';

export interface Translations {
  // All translation keys with their string values
  appTitle: string;
  mergeTab: string;
  // ... (see types.ts for complete list)
}
```

### Translation Files

Each language has its own translation file (`en.ts`, `zh.ts`) that exports a complete `Translations` object with all keys translated to that language.

### Main Module (index.ts)

The `index.ts` file provides:

- **Language State Management**: Module-level variable stores current language
- **Translation Function**: `t(key)` returns translated string for current language
- **Language Management**: `setLanguage()`, `getLanguage()`, `getTranslations()`
- **Type Re-exports**: Re-exports `Language` and `Translations` types for convenience

## API

### Functions

#### `t(key: keyof Translations): string`

Returns the translated string for the current language. Falls back to English if translation is missing.

```typescript
import { t } from '../utils/i18n';

// Usage in components
<Typography>{t('appTitle')}</Typography>
<Button>{t('mergePDF')}</Button>
```

#### `setLanguage(lang: Language): void`

Sets the current language. This updates the module-level state but does not trigger UI updates. Components should re-render when language changes.

```typescript
import { setLanguage } from '../utils/i18n';

setLanguage('zh'); // Switch to Chinese
```

#### `getLanguage(): Language`

Returns the current language setting.

```typescript
import { getLanguage } from '../utils/i18n';

const currentLang = getLanguage(); // Returns 'en' or 'zh'
```

#### `getTranslations(): Translations`

Returns the complete translations object for the current language.

```typescript
import { getTranslations } from '../utils/i18n';

const translations = getTranslations();
// Access all translations for current language
```

## Usage in Components

All components import and use the `t()` function for UI text:

```typescript
import { t } from '../utils/i18n';

export const MergeTab = () => {
  return (
    <Box>
      <Button>{t('selectPDFFiles')}</Button>
      <Typography>{t('dragDropHint')}</Typography>
    </Box>
  );
};
```

## Language Loading and Persistence

### Loading on Startup

On application startup, `App.tsx` calls `GetLanguage()` from the backend to load the saved language preference:

```typescript
useEffect(() => {
  const loadLanguage = async () => {
    try {
      const lang = await GetLanguage();
      const language = (lang === 'zh' ? 'zh' : 'en') as Language;
      setLanguage(language);
      forceUpdate({}); // Force re-render to update UI
    } catch (err) {
      console.error('Failed to load language:', err);
    }
  };
  loadLanguage();
}, []);
```

### Saving Language Preference

When the user changes the language in Settings, `SetLanguage()` is called to persist the preference:

```typescript
const handleSave = async () => {
  await SetLanguage(selectedLanguage);
  setLanguage(selectedLanguage);
  onLanguageChange(selectedLanguage);
  onClose();
};
```

The language preference is stored in a JSON configuration file:

- **Location**: `<UserConfigDir>/PDF Wizard/pdf_wizard_config.json`
- **Structure**: `{ "language": "en" }` or `{ "language": "zh" }`

## Dynamic Updates

When the language is changed:

1. `SetLanguage()` is called to save the preference
2. `setLanguage()` updates the module-level state
3. Components re-render (via `forceUpdate()` or state change)
4. All `t()` calls return new translations
5. UI updates immediately with new language

## Adding New Languages

To add a new language:

1. Add the language code to the `Language` type in `types.ts`
2. Create a new translation file (e.g., `fr.ts` for French)
3. Export a complete `Translations` object with all keys translated
4. Add the new language to the `translations` record in `index.ts`
5. Add the language option to the Settings dialog dropdown
6. Update backend `GetLanguage()` and `SetLanguage()` to support the new code

## Translation Key Organization

Translation keys are organized by feature area to make it easy to find and maintain:

- **App**: Application-level strings (appTitle)
- **Tabs**: Tab labels (mergeTab, splitTab, rotateTab)
- **Settings**: Settings dialog strings
- **Merge Tab**: All strings used in MergeTab component
- **Split Tab**: All strings used in SplitTab component
- **Rotate Tab**: All strings used in RotateTab component
- **Common**: Shared strings used across multiple components

## Best Practices

1. **Always use translation keys**: Never hardcode UI text strings
2. **Use descriptive key names**: Keys should clearly indicate their purpose
3. **Group related keys**: Keep keys for the same feature area together
4. **Provide fallbacks**: The system falls back to English if a translation is missing
5. **Test both languages**: Verify UI works correctly in both English and Chinese
6. **Keep translations in sync**: When adding new features, add translations for all supported languages
