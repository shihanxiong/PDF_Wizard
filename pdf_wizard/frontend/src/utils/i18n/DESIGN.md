# Internationalization (i18n)

**Canonical document** for PDF Wizard’s frontend translations: layout of files, runtime API, supported locales, and how to add a language. For the documentation map, see [SYSTEM_DESIGN.md](../../../../../SYSTEM_DESIGN.md#documentation-map) (repo root).

## Layout

```
frontend/src/utils/i18n/
├── index.ts           # Barrel: useI18n, I18nProvider, getNativeLanguageName, types
├── I18nProvider.tsx   # React context: language state, t(), setLanguage()
├── catalog.ts         # Record<Language, Translations> + lookupTranslation / getTranslationsFor
├── constants.ts       # SUPPORTED_LANGUAGES, isValidLanguage()
├── types.ts           # Language union, Translations interface
├── en.ts … de.ts      # One module per locale (exports Translations)
└── DESIGN.md          # This file
```

`main.tsx` wraps the app in `<I18nProvider>` so any component can call `useI18n()`.

## Supported languages

Codes and UI order are defined in **`constants.ts`** as `SUPPORTED_LANGUAGES`. The backend mirrors the same set in **`pdf_wizard/app.go`** (`validLanguages`). Keep those three places in sync when adding a locale: `catalog.ts`, `constants.ts`, and `app.go`.

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

1. Add **`types.ts`**: extend the `Language` type with the new code.
2. Create **`xx.ts`**: export a complete `Translations` object (copy `en.ts` as a template).
3. **`catalog.ts`**: import the module and add it to the `translations` record.
4. **`index.ts`**: add the code to `getNativeLanguageName`.
5. **`constants.ts`**: append the code to `SUPPORTED_LANGUAGES`.
6. **`pdf_wizard/app.go`**: add the code to `validLanguages`.

The Settings dialog reads `SUPPORTED_LANGUAGES`; no separate hardcoded list is required there.

## Best practices

- Use `t('key')` for all user-visible strings; add the key to **`types.ts`** and every locale file.
- Prefer English fallback: `lookupTranslation` already falls back via `catalog.ts`.
- After adding keys, run the app in at least one non-English locale to verify layout (RTL for `ar`, CJK line heights, etc.).
