# Original customer menu integration

**Priority update, 18 October:** complete the owner menu-editor -> preview -> publication -> customer browsing journey first, under the [whole-project reassessment](project-reassessment.md). The earlier next-cart advice below is historical; cart wiring follows the menu release and reviewed operating decisions.

18 October 2026. First implementation slice: original customer-menu presentation connected to the existing committed public catalog. Cart/order integration is the next slice; this document does not establish merchant activation or production readiness.

## What is shared

`MenuMini_1/src/lib/menu/MenuCatalog.svelte` contains the original themed wrapper, sticky venue header, welcome banner, search, horizontal category chips and dish cards. Both the original `/{businessSlug}/{branchSlug}` prototype and `/menu/{venueSlug}` use this component. The original visual rules were extracted from the existing customer route rather than replaced with another design system.

`DishDetails.svelte` shares the original detail-card presentation. The prototype supplies its instructions, quantity and add controls through slots. Published browsing shows exact base prices, option choices/deltas and availability. Its native dialog supports Escape, modal focus containment and return to the triggering control; browser verification is recorded separately.

`catalog-view.ts` adapts the two data sources. Published prices remain decimal strings, published section IDs drive filters, and both English and Amharic names/descriptions are searchable. Type-only imports do not load the prototype stores or PostgreSQL code into the browser view. Public menu data continues to come from `public-catalog.ts`, using the existing restricted database role and no-store headers. No API, database schema, identity adapter or entitlement rule was changed.

## Preserved and deliberately different behavior

| Feature | Original prototype | Connected published menu |
| --- | --- | --- |
| Themes, typography, header, category chips, cards | Shared original presentation | Same shared presentation, using the published theme/primary color |
| Search and categories | Original browsing retained | Same interactions, bilingual search and stable category IDs |
| Item detail | Instructions and quantity remain available in the local prototype | Read-only base price, modifier choices, availability and return to menu |
| Cart and checkout | Existing local prototype handlers remain; they are not live commerce | Not exposed until server-confirmed cart/order integration is completed |
| Table / open status | Existing prototype context retained | Menu/ETB badge; no invented table association or current opening claim |
| Branch information, hours, QR sharing | Prototype's existing data | Existing published branch information, Addis Ababa hours and canonical branch-menu QR retained |
| Missing menu | Prototype has its own demo data | Explicit unavailable state; never falls back to the prototype cafe |

Bounded usability changes: search/clear controls have labels, category buttons expose their selected state, primary browsing controls have at least 44px targets, visible keyboard focus is provided, long text can wrap, the prototype no longer disables zoom, and reduced-motion preferences disable the extracted transitions. These changes preserve the layout direction; they do not establish complete accessibility compliance.

Six visual themes remain distinct from the 24 business types. The published projection still has no image URL, preparation-time or popularity fields. No fake photos, popularity labels, preparation estimates or upload pipeline were introduced.

## Evidence and practical limits

- `menu-presentation-validation.json`: focused exact-price, bilingual filtering, category identity, availability, theme and input-preservation checks.
- `catalog-http-validation.json`: current restricted PostgreSQL-to-HTTP/HTML checks, privacy and draft/publication separation, spoofed merchant-access rejection, and database restart.
- `customer-menu-integration-validation.json`: final compiler/build and browser evidence, with unresolved checks listed explicitly.
- Original and prior published-menu desktop/390px screenshots were captured on 16 October before extraction. They are historical comparison artifacts, not current runtime proof.

These checks use fictional local records. Real OTP, authenticated merchant workflows, phone/device QR scanning, a reachable hosted site, busy-shift usability and a venue pilot remain unverified. The original prototype's local order-success/WhatsApp handlers must be replaced with committed server outcomes in the ordering slice before treating that route as operational.

## Next implementation slice

Preserve the original floating cart and review drawer while connecting exact server pricing, supported options, draft recovery and committed order responses. First make the normal single-diner path concrete; compare table association, combined bills, additional rounds and payer handoff before changing those operating defaults. Keep staff-assisted ordering available in the system plan, and keep kitchen progress separate from payment verification. Reconcile merchant journeys with the original admin shell after the customer slice; do not add another standalone navigation.

18 October continuation: the pure frontend cart/review/command-preparation model is implemented and checked against the existing order contract. [Original cart connection](original-cart-connection.md) records the exact sequence and remaining decisions. This is preparation for wiring the original controls; it does not enable ordering or close the pending browser-acceptance checks.
