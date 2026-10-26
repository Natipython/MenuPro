# Whole-project visual, asset and motion brief

18 October 2026. Source-grounded planning proposal for the menu-first release. Preserve useful work from the whole repository; no replacement palette, brand, layout system or animation package is approved by this document. Current release scope: [project reassessment](project-reassessment.md).

## 1. Original visual material and authority

| Material | Useful evidence | What remains to decide/check |
| --- | --- | --- |
| `app/src/app.css`, customer/admin routes and components | Shared typography, light/dark variables, detailed drawer/customizer, broader menu and branch/staff UI | Compare actual screens; separate reusable presentation from prototype handlers and tier assumptions |
| `MenuMini_1/src/app.css`, theme definitions and original customer/admin routes | Compact dining presentation, six themed variants, familiar header/search/chips/cards and simple admin navigation | Preserve recognizable identity while connecting real records; avoid treating all original success claims as correct |
| `src/lib/menu/{MenuCatalog,DishDetails}.svelte` in MenuMini_1 | Extracted shared original browsing presentation for prototype and public route | Current desktop/phone, keyboard/dialog and theme acceptance is still pending |
| New onboarding/workspace/operational boards | Useful validation/state/recovery behavior | Their independent green/white/system-font styling is not an accepted replacement for the original product |
| Historical menu screenshots | Prior original-versus-replacement appearance | Historical evidence only; do not label them screenshots of current rendered code |
| Original PDF/handoff | Product intentions and a list of desired capabilities | Not a verified visual system or proof of performance, fulfilment, payment or live operation |

Both original CSS systems use Plus Jakarta Sans, Playfair Display and JetBrains Mono, but differ in surfaces, radii, easing and light-theme treatment. Resolve those differences through component comparisons rather than concatenating both style sheets. The six existing dining themes are all dark palettes; light variables elsewhere do not establish six complete light theme variants.

## 2. First-release surfaces and composition

### Owner/admin

Retain a familiar original admin shell. Put branch context, draft/publication state and the primary menu task where the owner can find them. Proposed working areas: menu content, appearance/preview, branch details and menu QR/link. This is an information-architecture proposal; do not silently delete the existing orders, payments, staff or print-shop features. Account for them in a reviewed navigation/capability map and keep demonstrations clearly identified.

The menu editor should show section selection, item list/editing and a preview entry. On a phone, use a manageable sequence rather than compressing a desktop multi-column editor. Keep the primary save/review/publish action and validation summary discoverable without losing the current item. Distinguish editing content from changing a business type or replacing a theme.

The publication review shows intended branch, content changes, exact prices, availability and unresolved blockers. A menu-only business should not be told it must configure tables, payment accounts, kitchen duties or a paid ordering plan just to publish a menu. Derive menu readiness separately from the broader workspace's operational readiness; do not reuse every existing blocker indiscriminately.

### Customer

Use the original venue identity/header, search, horizontal category chips, readable cards and detail presentation as evidence. Compare `app` features before selecting the final reusable component. Keep branch identity visible, ETB prices easy to scan, unavailable states textual, and English/Amharic content intact. Empty descriptions/photos must not leave broken layout gaps.

The browse-only first release has no cart/payment promise. Item details still show supported options/base-price adjustments when relevant. Hours/contact and menu sharing remain available without exposing owner/manager private data. A direct link into a missing/unpublished menu has a useful recovery explanation.

### Preparation versus real account

Keep preparation mode visibly truthful without overwhelming the page with technical details. A pending-verification notice should explain what can be done now and what publication still requires. UUIDs, retry keys, database-role names and internal workflow labels belong in contextual support details, not the main menu/editor task.

## 3. Component and state inventory

Before implementation, map each component to its original source, target owner, data input, actions, states and accepted visual capture:

| Component group | Required states and variants |
| --- | --- |
| Shell and navigation | Phone/desktop; branch context; active section; keyboard focus; limited permission; preparation mode |
| Business/branch forms | New/returning user distinction; same-person owner/manager; optional email/public phone; errors; hours overnight/closed/not supplied |
| Section and item editing | Empty, typical, long and many items; bilingual fields; exact price errors; duplicate/removed sections; unsaved edits |
| Theme/appearance selection | Six existing themes; preview; rejected/unsupported values; preserve edited content on replacement |
| Save/publication controls | Unchanged, dirty, saving, saved draft, publishing, committed, conflict, failed and unknown result |
| Customer browsing | Loading, normal, empty menu, empty search, unavailable item, long text, no photo and broken optional photo |
| Detail/dialog and notifications | Focus entry/trap/return, Escape, backdrop, narrow height, long options, error text and persistent status |
| Branch/QR information | Public contact absent/present; hours; stable link; copy success/failure; QR generation failure; real print/device acceptance |

Test meaningful content ranges: a single short item, a long bilingual name/description, repeated similar category names, many categories, no description, all items unavailable and a menu too large for the intended request limit. Add realistic option labels and exact decimal edge values. Use fictional material until a merchant authorizes its actual content.

## 4. Visual-system specification to settle

- Typography roles for headings, item names, prices, labels, long descriptions and both scripts. Verify a suitable Ethiopic font/fallback, shaping, line height and real device rendering; Latin font imports alone do not prove Amharic quality.
- Semantic color roles for background/surface/text/border/focus/primary/error/warning/status, mapped to the original themes. Status must have text or an icon/label, not color alone.
- Common spacing, content widths, radii, button/control sizes, borders/elevation and layering. Start from original values and explain departures.
- Responsive behavior around 320px/390px phones and representative desktop/tablet widths; actual zoom/font scaling; horizontal chip scrolling without whole-page overflow.
- One named control/focus/validation pattern and one dialog/drawer pattern, reused across appropriate surfaces. A shared implementation is more dependable than similar-looking copied rules.

Do not choose a new editorial, minimalist, luxury or animated style because a design skill recommends it. The user's original product and reviewed task requirements decide.

## 5. Asset plan and provenance

| Asset | Current evidence | Required artifact before claiming completion |
| --- | --- | --- |
| Product/merchant logo | Text/emoji branding and one source favicon; no complete approved brand pack identified | Reviewed source/SVG/raster variants, permitted usage, contrast/small-size check |
| App icons | Manifests reference `/icon-192.png` and `/icon-512.png`, absent from both static folders | Actual correctly sized icons, maskable treatment if selected, manifest/install checks |
| Menu item/branch images | Fields/components exist in original material; current public projection has no image URL | Decide first-release scope; ownership/license, upload limits, derivatives, accessible alternative/fallback and public/private read rules |
| Fonts | Existing Latin-family imports and system fallbacks | License/provenance, script coverage, measured delivery/fallback strategy |
| UI/category icons | Existing emoji and assorted visual markers | Consistent selected set with labels and accessibility semantics; preserve recognizable originals during comparison |
| Menu QR/artwork | Existing table/payment print templates and branch-menu QR generation | Correct QR purpose/URL, quiet zone/contrast, approved dimensions/export, physical scan/reprint proof |
| Empty/error illustrations | No approved set established | Only create where useful; avoid heavy decorative downloads on the normal customer path |
| Marketing stills/motion | Historic claims/screens are not production marketing proof | Separate later brief using truthful implemented behavior; actual source/editable assets and exports |

Maintain an asset manifest with ID, path, source/owner, license/consent, version, intended role, dimensions/variants, alternate text and approval state. Do not replace missing merchant content with generated food photos or invented claims. Optional illustrative concepts must be clearly labelled. AI translation/descriptions remain drafts for merchant review, especially factual ingredient/allergen/nutrition content.

## 6. Motion: purpose before effects

The first release is a task-focused menu tool. Use motion to show continuity, origin and confirmed state. Normal browsing must stay immediately usable. Search, typing and repeated category changes should not wait for an entrance sequence. No required splash animation, parallax menu, autoplay audio or looping decoration belongs on the core path by default.

Proposed ranges below are review targets drawn from the installed motion guidance, not measured behavior or approved final timings. Reuse/tune existing easing when it fits. Prefer explicit transform/opacity transitions, interruption from the current state and minimal movement. Reduced-motion mode can use immediate changes/text feedback; it must not remove information.

| Interaction | Intended motion | Reduced-motion / failure behavior |
| --- | --- | --- |
| Press/selection feedback | Immediate state; optional subtle 100-160ms pointer feedback | Immediate selected/focus state; no keyboard delay |
| Category/search results | Immediate filtering; preserve orientation and scroll | No staged card entrance or input lag |
| Details/dialog | Short origin/opacity transition, typically 150-250ms within existing composition | Immediate or restrained opacity; correct focus/Escape remains essential |
| Save status | Clear text and busy/committed states; optional brief transition | Text remains visible; no spinner-only feedback or false success animation |
| Publication success | Show committed publication/link first, then restrained feedback | No timed celebration implying publication before a response |
| Validation/conflict | Reveal actionable message and focus where appropriate | No shake/flashing/forced scrolling that hides the field |
| Reorder/preview changes | Maintain item identity and editing focus; animate only if it helps orientation | Immediate repositioning; keyboard operations remain usable |
| Brand/marketing sequence | Separate later storyboard tied to actual product behavior | Never blocks menu/editor; provide static alternative |

Sound is a separate preference. `SoundFXEngine.enabled` currently defaults true; the existence of a sound engine is not a reason to play every action in a quiet cafe. Proposed behavior is optional sound with a clear control; do not change that default silently in this planning pass.

## 7. Source motion findings

| Before: observed source | After: proposed review action | Why |
| --- | --- | --- |
| `transition: all` across both frontends, including shared menu search/chips | Name intended properties and inspect whether motion is needed | Avoid unintended transitions and make behavior predictable; this source pattern alone does not prove dropped frames |
| `app/src/lib/components/CartDrawer.svelte:206` and `ItemDetailModal.svelte:320` keyframe entrances | Evaluate interruptible open/close treatment when these later components are selected | Rapid close/reopen must not restart from an unrelated state; ordering is outside release one |
| Root toast keyframes in both layouts | Review focus/status and repeated notifications; prefer interruption-safe feedback | Repeated toasts should not create motion noise or hide useful status |
| Indefinite live/urgent pulses in original tracking/KDS; no local reduced-motion rule in those files | Reconsider necessity and provide persistent textual state plus reduced-motion behavior | Operational urgency is not established by a pulsing decoration; later operational scope |
| Many original motion-bearing files have no local `prefers-reduced-motion` rule; shared menu coverage is partial | Define and verify a coherent reduced-motion policy across selected components | Presence/absence of a CSS string is a signal, not a complete accessibility audit |
| `SoundFXEngine.enabled = true` | Review explicit opt-in/preferences and task frequency | Auditory feedback needs its own user benefit and controls |

Verdict: **hold visual/motion acceptance pending rendered review**. Source findings identify cleanup candidates, not proof that an animation feels wrong at runtime. No new motion has been implemented or approved in this reassessment. Check actual timing, interruption, hover/pointer behavior, reduced motion and frame performance on representative devices before acceptance.

## 8. Review artifacts and finish criteria

Produce a small traceable set: original/source comparison board; owner/editor/customer journey; component/state sheet; chosen token mapping; asset manifest; short motion state/timing specification; and matched desktop/phone captures of the connected menu journey. A rendered prototype may demonstrate a proposal, but must be labelled independently from the operational application.

Review an owner editing/saving/previewing/publishing and a customer opening the resulting menu. Verify long bilingual text, missing media, keyboard/dialog behavior, no results, failed/unknown saves, stale edits, reduced motion and private/public separation. Check older phones/weak connections and real QR prints separately. Only then record the corresponding visual, functional or device acceptance.

No Figma/Canva file, generated image, video or external artifact is needed merely to say work started. Use those tools when a concrete editable design/brand/storyboard artifact adds value, with the intended file and permissions established. For this planning pass, Markdown/JSON and diagrams remain the reviewable local artifacts.
