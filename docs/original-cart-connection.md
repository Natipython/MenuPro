# Original cart: connection preparation

**Priority update, 18 October:** the user selected menu creation/publication/browsing as the first complete release. Keep this model and its evidence for the later ordering slice; it is not the immediate UI connection task. The [project reassessment](project-reassessment.md) governs the revised sequence.

18 October 2026. Frontend preparation only. This slice introduces a tested cart/review model; it does not wire another ordering screen, activate the published menu's order controls, create an identity, call the order API, store a draft or send a message. The restored menu's browser acceptance is still pending because local browser use is disabled in Work settings.

## Existing interface to preserve

Keep the original dish Add controls, detail/customization dialog, floating cart dock and review drawer. Use their familiar layout to show quantities, selected options, special instructions and the order note. Replace the local prototype's numeric-price records and locally generated success handling at the connection boundary. Do not reskin the customer route or replace it with the separate guest rehearsal board.

The published browse route stays read-only until this connection is implemented and checked. The existing prototype remains a prototype: its direct-confirm/WhatsApp handlers do not establish a committed order.

## Prepared model and exact contract

`MenuMini_1/src/lib/menu/cart-draft.ts` prepares the frontend records needed by that interface:

- A cart belongs to one branch and reviewed publication/pricing policy. It can remain an unsent, unbound draft. Binding it to a seating is an explicit call using the existing server-returned guest context; changing session or seating requires separate draft review.
- A line is distinguished by item ID, selected option IDs and exact instructions. The same dish with “no sugar” and “extra hot” stays on separate lines. Selecting the same options in a different order does not create an accidental duplicate line. Quantity and removal controls address that exact variant.
- Quantities, required options, option availability and totals use existing service validation/calculation rules. Money remains decimal strings with BigInt arithmetic. These amounts are estimates for review; PostgreSQL prices the actual command again.
- A changed publication or pricing fingerprint produces `REVIEW_REQUIRED`; unavailable/deleted items or invalid options produce `BLOCKED`. Repricing preserves selections and notes. It never silently drops unavailable lines, changes selected options or accepts new prices. Removal remains possible so the guest can repair the draft.
- A prepared submission contains only the current visit, reviewed publication, pricing fingerprint, item/choice IDs, quantities and notes. It excludes client prices/totals, CSRF secrets, session identity assertions and payment state.
- The caller supplies the original request key. The detached command snapshot fits the existing `CommandRecovery` contract, so later draft edits cannot rewrite that snapshot. The future UI must actually use the existing recovery controller; this helper alone does not prevent duplicate network submissions or provide persistence.

The maintained API remains `POST /api/v2/guest/orders`, using `VisitOrder` in `postman/specs/workflow-v2.openapi.yaml`. No request/response schema, permission, cookie, tenant rule, table-association mechanism or database migration was changed. Client context checks improve the interface; they do not grant authority. The existing server still resolves the cookie and rechecks expiry, revocation, seating, publication, options, prices and request identity.

## Concrete connection sequence

| Step | Guest experience in the original interface | Actual effect and constraint |
| --- | --- | --- |
| Browse | Familiar themed menu, search and category chips | Read the published catalog; no table association or order implied |
| Choose | Open details when options/instructions are needed; keep quick Add for valid simple items | Validate selected options; do not silently select a required paid option |
| Cart | See separate variants, quantities and notes in the original dock/drawer | Unsent local draft; show no order number or acceptance claim |
| Review | Read item subtotal and applicable service/added-tax amounts, with an estimated total | Obtain the existing order offer and preserve the previous review when prices change; ask for explicit review before accepting updates |
| Confirm seating | Clear venue/table context before sending | Use an existing server-confirmed association. The final QR/invitation handoff and pre-association cart-entry presentation remain product decisions, not a new mandatory typing flow introduced by this model |
| Send | One clear action in the review drawer | Bind to the confirmed seating; prepare one request key/body; save through the existing recovery controller before sending |
| Response | “Request saved — waiting for staff acceptance” after the server commits it | `SUBMITTED` is not staff acceptance, a kitchen instruction or payment confirmation |
| Service | Follow staff acceptance, preparation, ready and served states | Staff may accept while unpaid; serving does not settle the bill |
| Interrupted response | Retain the request and explain that its result is unconfirmed | Check/retry the original request; resolve confirmed commitment/cancellation before any replacement. Do not issue a fresh key on timeout |
| Payment | A separate reviewed flow after the relevant bill authority is available | A reported transfer or WhatsApp draft does not prove received funds. Existing cashier verification/receipt/allocation rules remain separate |

After a committed request, clear only the matching submitted draft. Preserve the committed order ID/current status separately. If another draft has changed meanwhile, do not erase it merely because an older response arrives. Disable conflicting edit/send actions while recovery is unresolved; support details should not dominate the normal dining journey.

## People and remaining decisions

For diners, avoid forced re-entry of notes or options after changed prices or weak connectivity. Preserve Amharic content where supplied. Keep the normal path short, label paid options clearly and provide staff assistance.

For floor staff, retain staff-assisted ordering without requiring the diner to own a smartphone. For preparation staff, send work only after the intended staff-acceptance transition. For cashiers, keep service progress and funds separate. For owners/managers, preserve branding and make price changes reviewable rather than quietly rewriting existing drafts.

The combined-bill policy, separate payers, additional rounds, guest-association handoff, WhatsApp's role and original database-model mapping remain the explicit comparisons in `original-ui-integration-plan.md`. This frontend helper does not select new defaults for those decisions.

## Verification and next action

Run `python3 scripts/check-menu-cart-contract.py` from the repository root. It exercises variant merging/removal, exact amounts, option failures, changed-price review, branch/session/seating separation and detached command snapshots, then validates a prepared body against the maintained OpenAPI request schema. It also confirms that client total, identity and paid-state assertions are rejected by that schema. Fictional test contexts are in-process values, not authenticated sessions or a sign-in bypass.

Results are in `menu-cart-draft-validation.json`. Type checking is recorded separately. No new browser, HTTP, database or physical-device acceptance is claimed by these checks.

Next: finish the restored menu's desktop/phone interaction review; then wire this model into the existing cart/customizer/drawer and connect the existing guest gateway plus recovery controller. Do not enable a fake success path to make the journey appear complete while OTP or merchant access remains deferred.
