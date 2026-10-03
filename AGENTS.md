# Project Architecture

- Keep French as the canonical UI copy and centralize instant French-to-English presentation through `src/lib/i18n.ts` and the root DOM synchronization layer, so dynamically mounted dialogs and alerts follow the active language.