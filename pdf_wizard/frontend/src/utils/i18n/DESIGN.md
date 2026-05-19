# Internationalization (i18n)

**Canonical document** for PDF Wizard’s frontend translations: layout of files, runtime API, supported locales, and how to add a language. For the documentation map, see [SYSTEM_DESIGN.md](../../../../../SYSTEM_DESIGN.md#documentation-map) (repo root).

## Layout

```
frontend/src/utils/i18n/
├── index.ts           # Barrel: useI18n, I18nProvider, getNativeLanguageName, types
├── I18nProvider.tsx   # React context: language state, t(), setLanguage()
├── catalog.ts         # Record<Language, Translations> + lookupTranslation / getTranslationsFor
├── constants.ts       # SUPPORTED_LANGUAGES from JSON; validates against catalog
├── types.ts           # Translations interface; re-exports Language from catalog
├── en.ts … de.ts      # One module per locale (exports Translations)
└── DESIGN.md          # This file
```

`main.tsx` wraps the app in `<I18nProvider>` so any component can call `useI18n()`.

## Supported languages

Locale codes and UI order are defined in **`pdf_wizard/i18n/supported-languages.json`** (single source of truth for the list and Settings order).

- **Go** embeds that file at build time (`supported_languages.go` → `validLanguages`).
- **Frontend** imports it via the Vite alias `@supported-languages` (`constants.ts`). On module load, `constants.ts` checks that JSON codes match translation modules in **`catalog.ts`** (`Language` = `keyof typeof translations`).

No codegen script — edit the JSON only, then add the locale module and catalog entry.

Current codes: `en`, `zh`, `zh-TW`, `ar`, `fr`, `ja`, `hi`, `es`, `pt`, `ru`, `ko`, `de`.

## Usage in components

```tsx
import { useI18n } from '../utils/i18n';

export const Example = () => {
  const { t, setLanguage } = useI18n();
  return <Button onClick={() => setLanguage('de')}>{t('save')}</Button>;
};
```

`getNativeLanguageName` (from `index.ts`) is used for the Settings language dropdown labels.

## Persistence

On startup, `App.tsx` calls `GetLanguage()` from the Go binding, validates with `isValidLanguage()`, then `setLanguage()`. Saving uses `SetLanguage()` then `setLanguage()`. Config file paths and JSON shape are documented in [pdf_wizard/DESIGN.md](../../../DESIGN.md).

## Adding a new language

1. Append the code to **`pdf_wizard/i18n/supported-languages.json`** (`languages` array, in UI order).
2. Create **`xx.ts`**: export a complete `Translations` object (copy `en.ts` as a template).
3. **`catalog.ts`**: import the module and add it to the `translations` record (defines the `Language` type via `keyof`).
4. **`index.ts`**: add the code to `getNativeLanguageName`.

The app fails fast at frontend startup if JSON and `catalog.ts` disagree. The Settings dialog reads `SUPPORTED_LANGUAGES` from `constants.ts`.

## Phone upload page copy (`imagesPhonePage*`)

The **LAN phone upload** HTML is not React-rendered; the Go server serves static templates with strings from **`models.PhoneUploadPageCopy`**. The **Images to PDF** tab fills that struct via `new models.PhoneUploadPageCopy({ ... })` using keys such as **`imagesPhonePageTitle`**, **`imagesPhonePageSessionClosedTitle`**, **`imagesPhonePageSelectedCount`** (contains `__COUNT__`), **`imagesPhonePageTooManyFiles`** (contains `__MAX__`; replace with the numeric limit in TS), etc. When adding or renaming keys, update **`types.ts`**, every locale file, **`normalizePhoneCopy`** defaults in `services/phone_upload.go`, and run **`wails generate module`**.

## Best practices

- Use `t('key')` for all user-visible strings; add the key to **`types.ts`** and every locale file.
- Prefer English fallback: `lookupTranslation` already falls back via `catalog.ts`.
- After adding keys, run the app in at least one non-English locale to verify layout (RTL for `ar`, CJK line heights, etc.).
