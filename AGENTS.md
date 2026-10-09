# Project Architecture

- Keep French as the canonical UI copy and centralize instant French-to-English presentation through `src/lib/i18n.ts` and the root DOM synchronization layer, so dynamically mounted dialogs and alerts follow the active language.
- Keep `/` session-aware: signed-out visitors get the public phone OTP access page, while signed-in users keep the financial dashboard and their persisted profile data.
- Store account visual keys, hierarchy and targets on accounts and PIN hashes in a private account_security table; use create_subaccount and account_outflow RPCs so creation and outgoing-money checks cannot be bypassed by the browser.
- Use the shared account-visuals catalog and VisualPicker for creation and existing-card editing so photographic choices remain consistent across both flows.
- Centralize closed-by-default, exclusive, outside-click and route-change behavior in Coffre; keep photo menus controlled so they reset on navigation.
- Load personal transaction history in stable paginated batches without a fixed row cap; derive objective charts only from recorded movements and show a single current-value point when history is unavailable.