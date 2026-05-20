import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const I18N_DIR = join(import.meta.dirname!, '..', 'src', 'utils', 'i18n');
const REFERENCE_LOCALE = 'en.ts';
const SKIP_FILES = new Set(['types.ts', 'index.ts', 'catalog.ts', 'constants.ts', 'I18nProvider.tsx', 'DESIGN.md']);

function extractKeys(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8');
  const keys: string[] = [];
  const keyRegex = /^\s+(\w+)\s*:/gm;
  let match: RegExpExecArray | null;
  while ((match = keyRegex.exec(content)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

function main(): void {
  const referenceFile = join(I18N_DIR, REFERENCE_LOCALE);
  const referenceKeys = extractKeys(referenceFile);
  const referenceSet = new Set(referenceKeys);

  console.log(`Reference locale (${REFERENCE_LOCALE}): ${referenceKeys.length} keys\n`);

  const localeFiles = readdirSync(I18N_DIR)
    .filter((f) => f.endsWith('.ts') && f !== REFERENCE_LOCALE && !SKIP_FILES.has(f))
    .sort();

  let hasErrors = false;

  for (const file of localeFiles) {
    const filePath = join(I18N_DIR, file);
    const localeKeys = extractKeys(filePath);
    const localeSet = new Set(localeKeys);

    const missing = referenceKeys.filter((k) => !localeSet.has(k));
    const extra = localeKeys.filter((k) => !referenceSet.has(k));

    if (missing.length > 0) {
      hasErrors = true;
      console.error(`❌ ${file}: ${missing.length} missing key(s)`);
      for (const k of missing) {
        console.error(`     - ${k}`);
      }
    } else {
      console.log(`✅ ${file}: all keys present`);
    }

    if (extra.length > 0) {
      console.warn(`   ⚠️  ${file}: ${extra.length} extra key(s) not in ${REFERENCE_LOCALE}`);
      for (const k of extra) {
        console.warn(`     - ${k}`);
      }
    }
  }

  console.log('');
  if (hasErrors) {
    console.error('FAILED: Some locales are missing keys from ' + REFERENCE_LOCALE);
    process.exit(1);
  } else {
    console.log('PASSED: All locales have every key from ' + REFERENCE_LOCALE);
  }
}

main();
