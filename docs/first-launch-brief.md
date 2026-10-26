# First launch brief

**18 October direction:** the user confirmed menu creation, preview, publication and browsing as the first complete usable release, with the whole repository included in the review. Use the [project reassessment](project-reassessment.md) for the current dependency order, preservation map and identity/publication gate. Operational ordering/settlement descriptions below are later scope.

Working scope, 12 October 2026. This records where to begin; it does not claim that the following application features are implemented.

The latest direction is whole-system orchestration before application implementation. Review the [system and workflow model](system-orchestration.md) first, especially permissions, table visits, combined bills and receipt allocations. This brief remains the subsequent pilot/publication slice once those operating rules are coherent.

## Begin with one venue and one persistent menu

The commercial direction is Free, MenuMini, and MenuPro. MenuMini has a maximum of two active branches per subscription. Branch two requires a requested price increase, owner acceptance and verified billing activation; the business remains on MenuMini. A branch is a physical outlet; its tables and QR codes remain within that branch.

**Pilot status: no pilot yet, confirmed by the user on 12 October 2026.** The working customer hypothesis is one independent cafe or casual restaurant in Addis Ababa, selected within practical reach for setup and observation. Venue type, table count, staff roles, devices, connectivity, and the existing payment/register procedure remain unverified. Development uses clearly fictional cafe and owner fixtures until a venue authorizes its own data.

The shared menu capability comes first. Free can eventually provide menu publication; MenuMini adds daily ordering and settlement; Pro follows demonstrated operational requirements. The workflow migration now represents Free/Mini/Pro terms, capacity and branch scope. Public onboarding, billing handlers and connected app behavior still require implementation; see [workflow foundation](workflow-foundation.md).

## Two tracks to start

**Venue discovery:** Identify the owner/manager who can authorize the pilot and the staff member responsible during service. Observe how one order travels from guest to kitchen to cashier. Record what is entered into the existing register, who checks bank receipts, how extra items join a table bill, and what happens during connection or power loss. Establish the problem the owner wants solved and the time/cost baseline. Any messages or outreach need explicit user authorization.

**Application implementation:** Connect the existing PostgreSQL foundation to authenticated owner access, one stored venue, persistent menu editing, and a published customer menu. Initially, that venue uses fictional data. The existing screens can inform the interface, but acceptance depends on shared server data and observable behavior.

The absence of a pilot does not prevent implementation and local verification of the shared menu foundation. It does prevent claims of merchant adoption, willingness to pay, or fit with a real service workflow. Keep venue-specific billing, hardware, and integration decisions open until discovery supplies evidence.

## Finding the first pilot

Begin by identifying three to five nearby, single-branch prospects for discovery. Prefer an accessible owner/manager, a staff member willing to operate the trial, a practical staff device, and a specific problem such as repeated menu-price changes, lost order notes, or difficult payment reconciliation. These are selection hypotheses, not confirmed demand. Include a conversation with someone satisfied with their current arrangement to avoid learning only from enthusiastic prospects.

Record answers to these questions before promising a live ordering trial:

1. How are orders currently taken, sent to the kitchen, and entered into the register?
2. What recent mistake or repeated task is costing time or money?
3. Who would monitor and acknowledge orders during each shift?
4. Which devices and connections are available, and what happens when they fail?
5. Who checks received funds, handles extra table orders, and closes the day's records?
6. What result would justify paying, and who can approve that purchase?

Ask first for an observation or demonstration opportunity. A live operating trial follows a working, verified application, staff training, and a clear fallback. A venue's interest is not a signed pilot, a paid subscription, or evidence of renewal.

## First implementation slice

1. Finalize owner-session and venue-setup behavior and its contracts. Use the existing menu-draft, publication, and public-menu contracts as the starting point; the current specification does not yet define the complete owner login/setup flow.
2. Add the server database connection, authenticated merchant scope, and persistent owner/venue setup.
3. Connect categories and items to stored data: English/Amharic names, exact ETB prices, and availability. Support draft edits and explicit publication.
4. Load the correct published venue from its public URL in a separate browser. Missing venues return a truthful unavailable/not-found state instead of a default cafe.
5. Generate a QR for that reachable menu URL and confirm the selected pilot phone opens it. Keep initial local browser proof separate from an HTTPS staging/device test.

A readable initial menu and assisted item entry are sufficient for this slice. Additional visual themes, AI generation, physical print-shop fulfillment, multi-branch controls, inventory, and automatic payment integrations are later work driven by the pilot.

## Concrete acceptance example

Use fictional fixtures until a venue authorizes its own menu data:

- Owner A signs in and creates one branch.
- Owner A adds Coffee at 70.00 ETB and publishes the menu.
- Customer Browser B opens the venue URL and sees Coffee at 70.00 ETB.
- Owner A changes the draft to 80.00 ETB. The public menu retains the published 70.00 ETB until publication succeeds.
- After publication, a fresh public load shows 80.00 ETB and the new menu version. Availability changes follow the same explicit publication behavior.
- Reloading the owner screen and restarting the application preserve the saved menu and publication.
- Owner C cannot access or alter Owner A's venue through either the interface or direct requests. An unauthenticated visitor cannot edit it.
- The public page exposes only menu/venue information intended for guests and remains usable on the pilot's phone.

Completion requires live application behavior across separate sessions and a restart, plus access-control checks. Existing database tests and saved API examples do not establish this result.

## Next slices

**Ordering:** Connect table identification, staff-assisted and guest orders, server totals, a durable merchant queue, explicit acceptance, and retry behavior. Test one customer phone, one staff device, and the kitchen's actual handoff. The current workflow model groups extra rounds in one visit bill; its database tests do not establish a connected restaurant service flow.

**Settlement:** Preserve the selected rule: staff may accept an unpaid order. Customers can submit a transfer claim; an authorized operator checks the actual received funds and records verification. Cash needs its own recorded receipt. Verify daily balances, duplicate references, corrections/refunds, and exports. Compatibility with the venue's current register and receipt procedure must be established.

**Controlled pilot:** Resolve the known credential exposure before public release, prepare private configuration, test backup restoration and failure recovery, train the responsible staff, and verify the full flow on real devices. Agree pilot charges and record support/onboarding time and actual renewal. These are operating requirements, not claims already fulfilled.

## Business evidence to collect

Record the baseline and the pilot result for order acknowledgment time, missing or duplicate orders, corrections, cashier closing time/discrepancies, guest requests for help, staff usage, onboarding effort, recurring support time, and willingness to pay/renew. Keep observations factual; scans and signups alone do not establish business value.

The immediate deliverable is a real owner-to-customer menu publication flow. The subsequent commercial test is whether a venue routinely uses and pays for the complete Mini service with manageable support.
