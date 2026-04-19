# Code optimization report

Living document for performance and maintainability work in PDF Wizard. **Last updated:** 2026 (issues #57, #62).

---

## Snapshot

| Area | Status |
|------|--------|
| Go PDF / path validation (`isPDFFile`, `validatePDFFile`, `validateOutputDirectory`) | **Done** — `services/validation.go` |
| Go shared constants (`PDFExtension`, file/dir permissions) | **Done** — `services/constants.go` |
| Frontend limits / PDF extension constants | **Done** — `frontend/src/utils/constants.ts` |
| Merge: avoid double-read on success path | **Done** — `MergePDFs` merges first, `mergeDiagnoseInputs` on failure (#53) |
| TypeScript `any` in catch / strictness | **Partial** — e.g. `WatermarkTab` uses `unknown`; several tabs/hooks still use bare `catch (err)` |
| Shared tab UI logic | **Partial** — `usePDFDrop`, `useOutputDirectory`, `useProcessingState`, `useErrorHandler` exist; Split/Rotate still overlap |
| `GetPDFMetadata` / redundant `Stat` | **Open** — see backlog |
| Split: single read + per-segment extract | **Done** — `SplitPDF` (#57) |

---

## Completed work (reference)

### Go services

- **`services/validation.go`** — Centralized `isPDFFile`, `validatePDFFile`, `validateOutputDirectory` (replaces duplicated extension and directory checks).
- **`services/constants.go`** — `PDFExtension`, `DefaultFilePerm`, `DefaultDirPerm`.
- **`services/pdf_service.go`** — `MergePDFs` calls `api.MergeCreateFile` first; per-input `ReadContextFile` only runs when merge fails, to pinpoint a bad file without doubling work on successful merges (#53). `SplitPDF` uses one `ReadValidateAndOptimize` on the source and `ExtractPages` per segment instead of N× `TrimFile` (#57).

### Frontend

- **`frontend/src/utils/constants.ts`** — `MAX_SPLITS`, `MAX_ROTATIONS`, `PDF_EXTENSION`.
- **`frontend/src/utils/formatters.ts`** — `convertToSelectedFile` uses generated `models.PDFMetadata` (not `any`).
- **Hooks** — Shared behavior extracted into `usePDFDrop`, `useOutputDirectory`, `useProcessingState`, `useErrorHandler` (tabs compose these; further consolidation is optional).

---

## Backlog (prioritized)

### Medium

1. **TypeScript error handling** — Prefer `catch (err: unknown)` and a small `getErrorMessage(err)` helper across `MergeTab`, `SplitTab`, `RotateTab`, `SettingsDialog`, and hooks; optionally enable `useUnknownInCatchVariables` in `tsconfig.json` (#61).
2. **`GetPDFMetadata` / `GetPDFPageCount`** — `GetPDFMetadata` calls `os.Stat` then `GetPDFPageCount` → `validatePDFFile` stats again; reuse one stat or a single validated entry point (#54).
3. **`parseInt` in page-range parsing** — Replace `fmt.Sscanf` in `parseInt` with `strconv.Atoi` in `pdf_service.go` (#55).
4. **`removeIfExists`** — Prefer `os.Remove` + `errors.Is(…, fs.ErrNotExist)` over stat-then-remove (#56).
5. **Go error style** — Standardize `fmt.Errorf` wrapping and messages across services (no functional change required for consistency alone).

### Low

6. **React** — `React.memo` / `useCallback` where profiling shows benefit; `React.lazy` for heavy tabs if bundle size matters.
7. **Organization** — Group related helpers; optional small `validation` subpackage if the service layer grows.

---

## Roadmap (suggested)

| Phase | Focus |
|-------|--------|
| **A** | TS `unknown` + error helper; `strconv.Atoi`; `removeIfExists` tidy |
| **B** | `GetPDFMetadata` stat dedup |
| **C** | React perf and deeper tab abstraction as needed |

---

## Outdated claims (removed)

Earlier versions of this file listed “extract validation helpers” and “extract constants” as high-priority *future* work; those are **implemented** as above. Estimates such as “100% elimination of `any`” are not current and were dropped in favor of the snapshot table.
