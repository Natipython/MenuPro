# Original UI integration and workflow reconciliation

**18 October whole-project update:** the user confirmed review of the entire repository and menu creation/publication/browsing as the first usable release. [Project reassessment](project-reassessment.md) expands this preservation plan and governs the next work; cart wiring now follows the complete menu journey.

16 October 2026. Planning response to the user's objection that backend development displaced the original interface and introduced different operating flows.

Status updated 18 October: the first customer-menu implementation now shares original presentation between the prototype and published route. Search/categories, bilingual item details, exact published prices and theme mapping are implemented. See [customer-menu-integration.md](customer-menu-integration.md) and its separate validation report for checked scope and remaining visual/interaction acceptance. Cart/order integration and merchant-shell reconciliation remain outstanding. No API, database, authentication or operating-policy change is part of this presentation slice.

The next priority is integrating the backend with the existing product experience. Receiving-account feature expansion follows this reconciliation. Existing validation reports remain historical evidence of their stated scopes, not approval of the replacement UI or proof of usability.

## 1. Starting point and working rules

- Use the existing MenuMini customer experience and admin shell as the initial integration baseline. Inspect both `MenuMini_1` and `app`; the latter contains additional components and product flows that must be accounted for, not silently discarded as irrelevant.
- Preserve the existing visual themes, typography, spacing, navigation, menu browsing, item details, cart/drawers and payment presentation wherever they remain useful. Reusing colors alone does not meet this requirement.
- Reuse the new backend's verified capabilities where appropriate. Keep the choice of data-access implementation separate from the choice of interface.
- Map every original feature to one explicit outcome: retain, connect, simplify with a stated reason, propose a product decision, or defer with its current limitation recorded. No silent removal or plan-tier reassignment.
- Distinguish confirmed user requirements, correctness/privacy requirements, and proposed operating defaults. A reasonable possibility is not automatically an approved default.
- Work on one complete journey at a time. Existing routes stay available until their replacement or alias is checked; old and new stores must not both become authorities for the same operational record.
- Internal database names, UUIDs, request keys and recovery mechanisms should appear in support/details views when useful, not dominate a diner's normal journey.
- Preserve existing uncommitted work. Do not reset, delete, commit, push, deploy or convert an existing database as part of this planning/integration preparation.

## 2. Requirements that carry forward

Confirmed by the user:

- SvelteKit, TypeScript and PostgreSQL.
- Free, MenuMini and MenuPro. MenuMini permits at most two active branches; branch two requires a price-increase request while remaining on Mini. Exact commercial prices remain undecided.
- Business name matching the license, one of the 24 business types, owner and administrator/general-manager details and phone numbers, with optional emails. Avoid duplicating owner/manager input when they are the same person.
- Staff may accept orders while payment is pending. Transfers are manually verified before being recorded as paid.
- Real OTP is postponed. Do not invent verified merchant identity to make a demonstration appear operational.
- There is no pilot venue yet. Use fictional local records and describe field assumptions honestly.

Correctness and privacy behavior to retain while adapting the interface:

- Server-confirmed orders, authoritative prices, exact money, scoped access and protection against duplicate requests/receipts.
- Separate service progress from payment progress; a reported transfer is not proof of received funds.
- Preserve drafts and original retry keys appropriately; a timeout must not cause a blind replacement or another bank transfer.
- Keep unrelated guests' orders, transfer references and staff evidence private.
- New look and navigation must not weaken backend permissions or bypass deferred identity.

Choices requiring an explicit comparison before becoming the product default:

| Choice | Question to resolve | Evidence needed |
| --- | --- | --- |
| Combined bill per table visit | Does this fit the intended Mini service styles, and how should additional rounds or separate payers feel? | Example journeys for one diner, a group, additional orders and staff-assisted service; later venue observation |
| Guest association/pairing | How can legitimate guests enter smoothly while preventing shared-QR misuse? | Normal QR entry, copied/expired QR, wrong seating and staff fallback; avoid assuming routine manual code entry |
| Shared-bill authorization | When is separate authority needed, and how is it handed over without unnecessary typing? | Own-order versus group-bill privacy and actual payer handoff examples |
| Staff queue and WhatsApp | Which channel is authoritative, and what does opening a WhatsApp draft actually promise? | Missed messages, unavailable WhatsApp, staff acknowledgement and browser queue behavior; no delivery claim from opening a link |
| SQL migrations/direct PostgreSQL versus the original Prisma models | Can the existing product model be extended, or is a reviewed migration justified? | Domain mapping, constraints, maintenance cost, data conversion and rollback implications; UI restoration alone decides none of this |
| Navigation, URLs and tier boundaries | What belongs in the existing admin/customer shell and which original features need capability controls? | Route/feature inventory, role permissions, old links and explicit Free/Mini/Pro capability decisions |

No migration of existing data or new operating default is implied by listing a choice here. Prototype/model limitations are to be fixed through a reviewed mapping, not by assuming the original project had no usable structure.

## 3. Initial preservation and connection map

Paths in this table are relative to the repository root. Source presence is checked; rendered fidelity and user acceptance are not yet checked.

| Existing asset or experience | Backend work available | Proposed treatment / constraint |
| --- | --- | --- |
| `MenuMini_1/src/app.css`, `MenuMini_1/src/lib/types/miniTemplates.ts`, root layout and feedback styling | Published menu includes theme and primary-color settings | Reuse the original presentation rules. Check contrast, typography, motion and reduced-motion behavior. Keep 24 business types distinct from the six visual themes. |
| `MenuMini_1/src/routes/[businessSlug]/[branchSlug]/+page.svelte`: search, categories, dish cards and details | `MenuMini_1/src/lib/server/public-catalog.ts`: committed published-menu projection | First implementation slice: present this server data through the original menu experience. Missing/unavailable branches must never fall back to a default cafe in real mode. |
| Same customer page: floating cart, modifiers, quantities, instructions and checkout drawers | Guest command gateway, server-priced order submission and recovery controller | Preserve interactions; replace local success handling with committed responses. Explain changed price/availability and retain a reviewable draft. |
| Same customer page: provider tabs, WhatsApp and direct-order actions | Payer authorization/reporting and existing cashier receipt handling | Map each action to its actual effect. Preserve useful presentation; do not equate an opened WhatsApp draft or transfer report with a received order or paid bill. |
| `MenuMini_1/src/routes/admin/+layout.svelte` and dashboard | Private service, preparation and cashier adapters; verified identity remains closed | Use one familiar, role-aware admin shell. Do not build another disconnected management navigation. Preparation/rehearsal states remain clearly labelled. |
| `MenuMini_1/src/routes/admin/menu/+page.svelte` | Versioned menu/profile drafts and immutable publication | Connect editing/preview/publish states to the original menu-builder experience after the view/data mapping is reviewed. Preserve bilingual fields, options and unsaved changes. |
| `MenuMini_1/src/routes/admin/orders/+page.svelte` | Staff service queue, own-guest tracking and unpaid acceptance | Keep the familiar orders entry point. Show actionable service and payment states separately; preserve the staff-assisted path. |
| `MenuMini_1/src/routes/admin/qr-codes/+page.svelte`, QR/payment template definitions | Public menu URL/QR and scoped table-capability issuance | Separate menu QR, ordering context and payment destination. Existing artwork should be reused where accurate; production scanning/printing needs reachable URLs and device checks. |
| `MenuMini_1/src/routes/admin/print-shop/+page.svelte` | No verified fulfilment integration | Preserve and account for the feature. Quote/request/payment/production/delivery promises require their own agreed scope; a button cannot pretend fulfilment happened. |
| `app/src/lib/components/{CartDrawer,ItemDetailModal,SearchAndFilter,BranchSelector}.svelte` and broader admin routes | Corresponding catalog/branch/role capabilities vary | Review for component reuse and missing feature coverage. Adapt useful components deliberately; do not copy obsolete data handlers or enable unimplemented services. |
| `MenuMini_1/src/routes/onboarding/+page.svelte` and `MenuMini_1/src/lib/onboarding/*` | Approved field validation and preparation flow | Preserve required information and optional emails, fit the original design system, and use manageable steps. Keep account verification distinct from draft preparation. |
| New `MenuMini_1/src/lib/{guest,service,cashier,payer,recovery}` modules | Tested domain clients and recovery behavior | Reuse appropriate logic. Their standalone layouts are not the accepted visual baseline. Keep internal rehearsal tools separate from the normal product journey. |

Before adapting the menu view, map exact-price strings, item IDs, selected option IDs, availability and publication versions explicitly to the original view model. Browser-local carts remain drafts. Browser-local demo catalogs must never override committed server publications. The published projection currently has no public image URL field: retain useful image/fallback treatment, but do not invent a working media pipeline.

## 4. People and practical acceptance

| Perspective | What the experience must support | Failure or burden to check |
| --- | --- | --- |
| Guest: first-time user, low confidence or limited reading | Recognizable menu, clear ETB prices, visible cart, simple review, easy staff assistance; English/Amharic content where provided | Excessive typing, technical warnings, unclear buttons, missing translations, accidentally submitting twice |
| Guest: older phone, limited data, assistive technology | Small initial payloads, resilient image/font fallbacks, readable text, keyboard/focus support, labelled controls and status beyond color | Slow/failed loading, weak connectivity, zoom/overflow, motion discomfort, inability to finish without a powerful phone |
| Owner | Preserve branding and menu presentation, understand readiness and plan limits, see reliable records | Retraining cost, false sales/payment totals, surprise pricing, accidental publication and data loss |
| Administrator/manager | One consistent navigation, clear permissions, service overview and understandable exceptions | Confusing separate consoles, role escalation, lost edits, unclear approval responsibility |
| Waiter/floor or counter staff | Enter orders for guests, identify the correct table/service point, acknowledge requests and release seating | Mandatory guest-phone steps, wrong-table mistakes, crowded-shift clicks, order channel conflicts |
| Kitchen/bar/preparation staff | Read items/options/instructions quickly and update only relevant service progress | Banking details or admin controls in the work queue; missed changes and duplicate preparation |
| Cashier | See correct outstanding amounts, verify actual received funds, apply them clearly, handle partial/excess funds and corrections | Treating screenshots as funds, duplicate receipts, wrong-bill application, unclear partial success and refund status |
| Support, maintainers and business operators | Understand what happened from safe support details and audit records; operate fallback and reconciliation | Sensitive data in logs, no request trace, two conflicting data authorities, irreproducible failures and untested restore procedures |
| Print/service providers and payment integrations | Honest request status and clear responsibilities | Unsupported delivery promises, unreadable/unreachable QRs, assumed provider confirmation or automatic transfer capabilities |

These are acceptance hypotheses until checked. A desktop browser run does not prove physical-device accessibility, busy-shift usability, bank procedures, legal/fiscal fit or merchant willingness to pay.

## 5. Proposed journeys to review

Guest ordering: valid venue/table link -> original themed menu -> choose/customize -> original cart -> review -> send -> server confirms request -> staff acceptance -> service progress. Show payment progress separately. Missing context has a clear explanation and staff fallback; final association policy is a decision above.

Staff-assisted ordering: staff selects the correct table/service point -> enters the guest's choices -> same server pricing and validation -> acceptance/preparation/service. A guest need not own a smartphone to receive service.

Settlement: review the relevant bill -> select cash or a previously sent transfer -> authorized staff verify actual funds -> record/apply them with a clear reviewed amount -> acknowledge the truthful remaining balance. Separate payer authority, grouped bills and handoff mechanics remain subject to the decision review. Do not hide two independently committed financial commands behind a promise of one atomic action; specify partial-success and recovery behavior before simplifying the interaction.

Owner setup: required business/owner/manager information -> verification when implemented -> branch/plan/menu preparation -> original-style preview -> explicit publication/readiness steps. While OTP is deferred, preparation and local fictional testing can progress, but neither grants actual merchant authority.

## 6. Implementation order and concrete review points

1. Preserve and compare. Record the current source baseline and existing uncommitted work; capture original/new screens at representative desktop and phone widths without submitting real transactions. Finish the feature, route, component and data-model map. Source-based initial mapping is supplied above; visual capture remains to do.
2. Resolve the normal journeys. Show concise before/after journeys and the practical alternatives for combined bills, QR association, bill handoff and WhatsApp. Record the selected rules and leave unsupported operating modes visibly unimplemented.
3. Connect one original customer menu. Reuse the original presentation with the existing committed public-menu projection. Keep search/categories/details and theme behavior. Deliver a side-by-side visual comparison and a separate fictional-data functional check before expanding to mutations.
4. Connect cart, orders and recovery. Reuse the cart/checkout interactions and existing command protections. Check one normal order plus unavailable items, changed prices, lost responses, reload and duplicate attempts. Keep the normal path short and move technical recovery details into contextual help.
5. Integrate merchant journeys into the original shell. Menu editing/publication, tables, staff ordering, preparation and cashier actions become coherent role-aware views. Keep verified-identity gates closed until real authentication exists; do not add a development login bypass.
6. Verify the connected journey and then resume missing modules. Check guest -> staff -> preparation -> cashier flows on the stated local fixtures, compare visual fidelity and practical task effort, and record unresolved device/pilot limits. Then progress receiving-account setup, reconciliation/exports, worker delivery, backups/restore and other original features in an explicit order.

Independent menu presentation and source/visual comparison work can continue while billing or handoff choices are reviewed. Only behavior that depends on an unresolved decision waits for that decision.

The first implementation deliverable is the original customer menu displaying server-backed published data with its familiar browsing interactions. It is not a new dashboard or another independently styled ordering form. Authentication-dependent merchant activation and production/device acceptance remain later gates.

Routine internal implementation within the chosen slice can proceed without repeated approval questions. A changed visual direction, operating rule, feature removal, tier reassignment or destructive migration must be presented as a concrete product decision with its before/after effect; it must not be smuggled into a technical refactor.

## 7. What counts as successful integration

- Original design and interaction patterns are recognizable, with explicit reasons for any departure.
- Normal tasks have clear labels and sensible steps; counts of taps, text entries and staff handoffs are measured against the original flow rather than invented targets.
- Role-appropriate views share navigation and data; original URLs are preserved or have an explicit alias/redirect plan.
- Bilingual content, exact ETB values, selected options, draft edits and confirmed outcomes survive the applicable transitions and recovery cases.
- Missing, unavailable, loading, pending, rejected, expired and partially completed states are truthful and understandable.
- Keyboard/focus, text size, narrow layout, target usability, reduced motion and slow-network behavior are checked; no blanket accessibility compliance claim from a width test.
- Guest/privacy, role, tenant, pricing and duplicate protections still hold. Client-side hidden buttons are not authorization.
- No automatic fake success, default-venue fallback, actual payment, external message, production publication or real verified identity appears merely to complete a demo.
- Reports separate source review, visual checks, local fixture behavior, authenticated merchant acceptance and physical-device/pilot evidence.

Tests are targeted to changed behavior and preserved critical paths. Existing passing backend checks are retained as evidence; adding many tests is not a substitute for checking the product experience.

## 8. Work performed for the initial plan

Rechecked the repository state, original customer/admin entry points, visual-theme definitions, reusable `app` components, registration field contracts, public catalog projection and closed merchant-identity adapter. Created this plan and a current-priority note in the build sequence. No application code, API contract, schema, data, theme or route was modified. No tests or deployment were needed for this documentation-only step.

The subsequent 18 October implementation is recorded separately in [customer-menu-integration.md](customer-menu-integration.md); the paragraph above describes the original planning step only.
