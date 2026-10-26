# MenuMini product

<!-- impeccable:product-schema 1 -->

18 October 2026. Confirmed product facts and explicitly open decisions. Current direction: [project reassessment](docs/project-reassessment.md). This file does not approve a replacement visual design or claim production readiness.

## Platform

web

## Stack

The user selected SvelteKit, TypeScript and PostgreSQL. Both `app/` and `MenuMini_1/` contain existing work to evaluate. The original Prisma schema and newer SQL implementation require a deliberate domain mapping; neither is permission to migrate existing data automatically.

## Users

Business owners and administrators/general managers prepare and maintain menus. Guests browse the published menu. Floor, preparation and cashier staff are stakeholders in the subsequent ordering/service/settlement scope. The initial setting is cafes and food businesses in Addis Ababa, Ethiopia; there is no confirmed pilot venue.

## Product Purpose

The first usable release must complete **menu creation, preview, publication and customer browsing**. The user confirmed this priority on 18 October. Subsequent releases can connect ordering, service and settlement after their workflows and original interfaces are reconciled.

Success means an authorized business can maintain a menu and a guest can open its stable branch link/QR and read the committed content. A local draft, successful build or fictional preview is not a published business menu.

## Operating Context

The review covers the entire repository. Both existing frontend implementations, the 24 business-type definitions, six visual themes, original customer/admin journeys, backend work, documentation, assets and motion must be accounted for. Preserve useful original work and existing uncommitted changes; do not replace the product's visual direction by default.

Use fictional local records until actual business access is authorized and verified. There is no pilot evidence of staff devices, connection quality, table count, operating procedure or commercial willingness to pay.

## Capabilities and Constraints

- Plans are Free, MenuMini and MenuPro. MenuMini permits a maximum of two active branches; branch two requires a requested price increase while remaining on MenuMini. Exact prices and other plan limits remain undecided.
- Initial business setup asks for the business name used on the business license, one of 24 business types, owner and administrator/general-manager names and phones, with optional emails. Preserve the same-person shortcut rather than demanding duplicate owner/manager input.
- Real OTP is deferred. Preparation can continue with verification pending; actual merchant access and publication cannot be fabricated.
- Published prices use exact ETB decimal values. English and optional Amharic content must survive editing, preview, publication and browsing.
- The later operating model permits staff acceptance while payment is pending. Transfers require manual verification before recording paid state. An opened WhatsApp draft or reported transfer is not proof of an accepted order or received funds.
- The 24 business types supply starting content/schema ideas. The six visual themes are presentation choices. Neither enables every advanced feature described in template JSON.

## Brand Commitments

MenuMini and MenuPro are the product/plan names used by the user. Existing UI, typography, themes, layouts and interaction patterns across the whole repository are the starting evidence. A final brand system or replacement aesthetic has not been approved.

## Evidence on Hand

Original source and supplied handoff/PDF, local fictional database/API checks, preparation/rehearsal screens and historical browser screenshots exist. Shared customer-menu presentation is implemented; current visual/interactive acceptance remains pending. A cart/review model is prepared but is not connected to screens or order transport. No real pilot, authenticated merchant publication, hosted-release acceptance or physical-device acceptance is established by these artifacts.

## Product Principles

1. Complete one usable journey before expanding the operational scope.
2. Preserve the original product experience while connecting verified data and behavior.
3. Distinguish a draft, a saved record, a published menu and an actual service/payment outcome.
4. Make plan limits, permissions and optional capabilities explicit rather than inventing defaults.
5. Assess practical owner/staff/guest effort alongside engineering correctness and visual quality.

## Open Decisions

Final component selection across both frontends; detailed Free/Pro entitlements and prices; item-photo/media scope; authentication implementation and activation timing; hosting and support budget; later table association, combined bills, payer handoff, WhatsApp authority and database-model consolidation. Pro inventory/stations, printing fulfilment and provider/POS connections require their own reviewed scope.
