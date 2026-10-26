The database and contract checks verify the foundation in isolation. Registration/preparation and the PostgreSQL-backed customer menu now have local HTTP and browser evidence; this does not prove phone authentication, business creation or live restaurant operation. See [onboarding-workflow.md](onboarding-workflow.md) and [workflow-foundation.md](workflow-foundation.md). OTP is deferred by the user. V1 results are retained as the original baseline.

Current workflow checks, in dependency order:

```bash
python3 scripts/check-menu-workflow-db.py
python3 scripts/check-workflow-contract.py
```

The database checker applies eleven migrations to a private temporary PostgreSQL 18+ cluster. Its verified result has 194 cases, including seven actual overlapping-connection cases, publication rollback and restart recovery. It saves four bill/receipt and three catalog projections. The contract checker verifies 95 cases across 73 operations, 114 schemas and 73 Postman requests. It also validates 39 actual database projections across the bill, catalog, preparation, staff-service, cashier and guest suites. See [workflow-db-validation.json](workflow-db-validation.json) and [workflow-contract-validation.json](workflow-contract-validation.json) for exact cases and timestamps. Registration/setup/workspace validation and public-menu reading are four functional public HTTP handlers; 40 private catalog/preparation/readiness/staff-service/cashier/issuance/recovery boundaries return 401 while trusted identity remains deferred. Seventeen guest/payer/recovery capability operations require an explicitly configured limited connection. The other 12 operations remain target HTTP contracts.

Current local Postman lint commands:

```bash
npm exec --yes --package=postman-cli@1.73.0 -- postman spec lint postman/specs/workflow-v2.openapi.yaml --issueType syntax --no-report-events
npm exec --yes --package=postman-cli@1.73.0 -- postman collection lint postman/collections/menu-workflow-v2 --fail-severity warning
```

The reviewed run reported no specification syntax issues and 60 collection requests with zero errors/warnings. Governance lint requires a Postman login and was not run. Real session/authentication and CSRF binding, application workers, real bank evidence, device/offline behavior, backup restoration and field acceptance remain separate gates. The migration deliberately rejects populated v1 order/payment history.

Registration validation and UI:

```bash
# From MenuMini_1, start the local review server without loading .env files:
npm run dev:setup
# From the repository root, in another terminal:
python3 scripts/check-onboarding-http.py
python3 scripts/check-setup-draft-http.py
node scripts/check-menu-cache.cjs
npm exec --yes --package=postman-cli@1.73.0 -- postman collection run postman/collections/menu-workflow-v2 -i validateBusinessRegistration -i validateSetupDraft --env-var baseUrl=http://127.0.0.1:5186/api/v2 --env-var origin=http://127.0.0.1:5186 --no-report-events
# From MenuMini_1:
npm run check
npm run build:isolated
```

The HTTP checker passes 21 checks with 20 actual local requests, including separate/same-person contacts, optional emails, manager approval requirements, invalid fields, origin/content-type/body-size errors (including chunked bodies), source-template consistency and no-store page headers. It validates success/error responses against the OpenAPI schemas. [onboarding-http-validation.json](onboarding-http-validation.json) records the result. The preparation checker passes 45 checks with 44 actual local requests, including strict access/contact-field rejection, overnight consistency, exact-money strings, item limits and streamed request limits. See [setup-draft-http-validation.json](setup-draft-http-validation.json). The earlier preparation-only Postman run executed two validators with eight assertions passing. Its protected target endpoints were not executed; the newer customer run is recorded below. No workspace run events or push were requested. The CLI's `--output` report option requires login, so it was not used for the successful local run.

Earlier browser checks used fictional contacts for duplicate-phone rejection, manager-led review and the owner-is-manager shortcut. Current browser checks cover continuing with verification pending, branch hours/errors, separate public contact, plan preference, menu editing, errors across sections, Amharic names, unavailable items, disabled publication and draft export/import across reload. The exported file excludes the fictional private owner contact. Invalid imports preserve the current draft. Responsive checks use a desktop browser viewport, not real phone/device acceptance. The type check has zero errors and 20 existing warnings in the demonstration pages; none are in the new setup components or setup/sign-in pages. The isolated build is compilation evidence only; a deployment adapter and production configuration still need to be selected.

The cache checker exercises the actual worker with disposable Cache API doubles: private/session HTML and API bypass, query/external assets, no-store responses and removal of the worker's earlier cache without deleting unrelated caches. This is routing regression evidence, not a browser offline or phone-device test.

Original v1 database integrity and concurrent connections:

```bash
python3 scripts/check-menu-db.py
```

Requires local PostgreSQL 18+ binaries. The checker creates a private temporary cluster, disables TCP listening, loads fictional fixtures, runs constraints/RLS/concurrency checks, then stops and removes the cluster. It never reads DATABASE_URL or connects to an existing database.

Original v1 contract schemas and saved examples:

```bash
python3 scripts/check-menu-contract.py
```

Requires PyYAML, jsonschema and referencing in the Python environment. It validates the contract and examples, including rejection of client-supplied prices/paid state and missing verification amounts. It sends no HTTP requests.

Postman local linting with the reviewed CLI version, without installing into the application dependency tree:

```bash
npm exec --yes --package=postman-cli@1.73.0 -- postman spec lint postman/specs/openapi.yaml --issueType syntax --no-report-events
npm exec --yes --package=postman-cli@1.73.0 -- postman collection lint postman/collections/menu-mini-v1 --fail-severity warning
npm exec --yes --package=postman-cli@1.73.0 -- postman environment lint postman/environments --fail-severity warning
```

The recorded validation is in docs/foundation-validation.json. Full workspace governance, executing authenticated application requests, real bank verification, device/offline tests and release/restore checks are subsequent gates. The saved collection examples include alternative cash/transfer scenarios and require separate fixtures when they are executed against a real implementation.

Persistent catalog and customer verification:

```bash
# From MenuMini_1: pure conversion and production link configuration checks
node scripts/check-catalog-mapping.mjs
node scripts/check-public-menu-link.mjs
# Start a dedicated fictional PostgreSQL-backed site (TCP disabled):
npm run dev:published-demo
# From the repository root, use the fixture directory printed by that runner:
python3 scripts/check-catalog-http.py --fixture-dir /tmp/menumini-public-REPLACE --mapped-catalog /tmp/menumini-mapped-catalog.json
npm exec --yes --package=postman-cli@1.73.0 -- postman collection run postman/collections/menu-workflow-v2 -i getPublishedMenu -i validateBusinessRegistration -i validateSetupDraft --env-var baseUrl=http://127.0.0.1:5196/api/v2 --env-var origin=http://127.0.0.1:5196 --env-var venueSlug=fictional-published-cafe --no-report-events
```

The current catalog HTTP run has 20 checks with 18 actual requests. It verifies spoofed identity rejection, public privacy/headers, draft versus publication prices, restart reconnection and actual preparation-mapper output reaching PostgreSQL then customer HTTP. The Mini preference does not change the fixture's Free plan or enable ordering. The shared mapper has nine checks and the actual server link builder has six checks; production needs an explicit HTTPS origin and cannot derive a printed QR from a caller's Host. Reports: [catalog-http-validation.json](catalog-http-validation.json), [catalog-mapping-validation.json](catalog-mapping-validation.json), [catalog-link-validation.json](catalog-link-validation.json).

The earlier publication-stage Postman customer/validation run executed three requests and passed ten assertions, with no failed requests/assertions. See [catalog-postman-validation.txt](catalog-postman-validation.txt). Closed editing handlers were tested as negative HTTP boundaries, not authenticated successful writes. Protected success cases in the design collection remain future acceptance tests.

An independent ZXing decoder read the actual served QR PNG and confirmed its exact menu URL; see [catalog-qr-validation.json](catalog-qr-validation.json). This is a local loopback review QR, not a real-phone scan. Customer browser checks cover the actual data and responsive layout; configured HTTPS hosting, real device/network acceptance, authenticated owner editing, backup restore and production release remain pending. The isolated build still has no deployment adapter selected.


## Merchant workspace and service preparation

Run from the repository root:

```bash
python3 scripts/check-merchant-workspace.py
python3 scripts/check-workspace-http.py --origin http://127.0.0.1:5196
npm exec --yes --package=postman-cli@1.73.0 -- postman collection run postman/collections/menu-workflow-v2 -i getPublishedMenu -i validateBusinessRegistration -i validateSetupDraft -i validateWorkspacePreparation --env-var baseUrl=http://127.0.0.1:5196/api/v2 --env-var origin=http://127.0.0.1:5196 --env-var venueSlug=fictional-published-cafe --no-report-events
```

The new private fixture checker has 90 passing checks through actual server adapters and PostgreSQL, including role/business isolation, stale versions, exact retries, JSON/Origin/CSRF boundaries, public-menu isolation, unsafe connection rejection and service-draft restart recovery. It supplies trusted fictional principals directly in-process; it does not add a browser login bypass or prove authenticated HTTP. The public identity adapter returns no principal for every request. See [merchant-workspace-validation.json](merchant-workspace-validation.json).

The actual HTTP checker passes 31 checks across 31 requests, including workspace field validation, streamed bounds, invalid UTF-8, controlled rejection of deeply nested unsupported content and all eight spoofed-identity boundaries. The latest local Postman run passes 14 assertions across four requests. Reports: [workspace-http-validation.json](workspace-http-validation.json) and [workspace-postman-validation.txt](workspace-postman-validation.txt). Syntax and collection lint pass; governance remains unrun without login. No workspace push or report publication occurred.

Browser evidence covers the direct onboarding handoff, required item options, bilingual text, persistent checkbox selections, the actual downloaded file and recovery after reload. The export is validated against WorkspacePreparation, including exact ETB values, options, table labels and payment preferences. It creates no account, invitation, table, receiving account or ordering entitlement. The workspace continues with its own Branch/Menu/Service/Review navigation after handoff; it does not send edited rich menus back into the simpler initial setup format.

Build and type checks pass with zero errors; the same 20 pre-existing prototype warnings remain. These are desktop/responsive local checks with fictional data. Authenticated ordering, settlement HTTP, workers, hosting, physical phones, backups and a pilot still need acceptance.

## Staff-assisted dine-in service

Run the private adapters/DB suite before contract validation:

```bash
python3 scripts/check-staff-service.py
python3 scripts/check-workflow-contract.py
python3 scripts/check-service-http.py --origin http://127.0.0.1:5196
```

[staff-service-validation.json](staff-service-validation.json) records 75 passing checks against actual server adapters and PostgreSQL with trusted fictional principals supplied in-process. It covers table versioning and permissions, staff-only seating, reviewed-price and availability conflicts, exact modifiers/service/tax totals, unpaid acceptance, preparation roles, additional rounds, resolved seating with an unpaid bill, keyset queue pagination, original-response retries after later transitions, two overlapping-connection cases and restart durability. The suite creates and removes its own isolated cluster; it does not authenticate real users or modify an existing database.

[staff-service-http-validation.json](staff-service-http-validation.json) records 15 actual HTTP checks: 12 private service boundaries reject spoofed identity, the floor/preparation pages stay locked, and the rehearsal page is explicitly fictional with no-store headers and no session. Successful private actions are tested separately in-process; there is no universal OTP, fake cookie or environment identity switch.

The public rehearsal at `/service/rehearsal` uses browser memory only and resets on reload. Its interface shares the service presentation/gateway contract, while server pricing and durability are verified independently. Its illustrative zero-tax prices are not legal tax configuration or evidence of authenticated business operation. Browser results and responsive screenshots are recorded in [staff-service-browser-validation.json](staff-service-browser-validation.json). The latest four functional Postman requests are recorded in [staff-service-postman-validation.txt](staff-service-postman-validation.txt); protected transaction successes are not executed through HTTP.

Real merchant sessions, production guest capability delivery, actual settlement procedures, worker delivery and a commercial pilot remain separate acceptance work. Service status and payment status remain independent throughout.

## Cashier settlement

```bash
python3 scripts/check-cashier-settlement.py
python3 scripts/check-workflow-contract.py
python3 scripts/check-cashier-http.py --origin http://127.0.0.1:5196
```

The cashier checker exercises actual private command/response adapters and PostgreSQL, with trusted fictional principals supplied in-process. It checks role/business isolation, exact counted cash/change, verified receiving-account restrictions, unpaid claims, explicit receipt allocations, partial payment, duplicate transfer references, credits, refund request/approval/execution, original-response retries, revocation, subscription fallback, concurrent allocation/late receipts, receipt conservation and restart durability. It creates and removes a private temporary cluster. [cashier-settlement-validation.json](cashier-settlement-validation.json) records exact cases and timestamps.

The HTTP checker verifies 11 closed private boundaries, the locked cashier page and fictional rehearsal/no-store headers. Successful authenticated HTTP is not claimed. Browser evidence is recorded separately in [cashier-browser-validation.json](cashier-browser-validation.json); the rehearsal changes memory only and has no actual financial effects. Supported pending cashier commands now use encrypted browser recovery and current-authority server resolution; see the recovery section below. Authenticated merchant browser acceptance remains an activation gate because OTP is deferred.

Real identity, production guest/payer handoff, receiving-account onboarding/reference normalization, actual bank/cash/refund evidence, private receipt uploads, fiscal treatment, reconciliation exports, workers, backups, devices and a pilot remain separate acceptance work. None of the local checks starts a real bank transfer or establishes commercial readiness.


Guest association and tracking verification:

```bash
python3 scripts/check-guest-ordering.py
# Against the unconfigured loopback preview:
python3 scripts/check-guest-http.py
```

The guest suite now covers 81 distinct cases with real capability/cookie validation, twelve direct local HTTP requests, an eight-request maintained Postman workflow with 25 assertions, three actual overlapping-connection cases and PostgreSQL restart. It replaces secrets with fictional placeholders in its six saved projections and removes private temporary request files. Merchant fixture principals are supplied only in-process; anonymous guest HTTP uses actual cookie resolution and no identity override. The guest database login cannot access tables or staff roles. Static QR/table access cannot join a seating, read another guest's order or grant bill/payment access. Browser rehearsal and viewport evidence are separate in `docs/guest-browser-validation.json`; they use fictional memory and do not establish real Android/iPhone acceptance. Real OTP and merchant sign-in remain deferred. See [guest-ordering-design.md](guest-ordering-design.md).

Authorized payer and transfer-report verification:

```bash
python3 scripts/check-payer-claims.py
python3 scripts/check-workflow-contract.py
# Against the unconfigured loopback preview:
python3 scripts/check-payer-http.py
```

The payer suite records 71 passing cases in [payer-claims-validation.json](payer-claims-validation.json), including five direct real local HTTP requests, five maintained Postman requests with 17 assertions, three overlapping connection cases and PostgreSQL restart. It verifies separate authorization, both guest/bill capabilities, copied-code rejection, expiry/revocation, own-reference privacy, shared-charge privacy, exact retry results, destination changes, pending evidence, actual received versus allocated funds, report rate bounds and duplicate references across different branches sharing an account. Cashier issuance remains private in-process fixture evidence because real merchant identity is deferred. Database tests use private disposable fictional clusters; no existing database or actual receiving account is changed.

The connected browser rehearsal at `/service/rehearsal` adds device-code selection, private payer code handoff, shared bill access, already-sent transfer review and existing cashier claim verification. Its grants, accounts and financial records are fictional browser memory and reset on reload. Backend cookie HTTP and database evidence are independent. [payer-http-validation.json](payer-http-validation.json) records ten actual rejection/configuration boundary requests; [payer-browser-validation.json](payer-browser-validation.json) records 42 UI checks with no console errors and no overflow at 390px/320px. See [payer-claims-design.md](payer-claims-design.md) for privacy, destination locking, conservative reference guards and remaining launch dependencies. Pending-command recovery across full reload is implemented separately for supported operations; see [command-recovery-design.md](command-recovery-design.md).

## Interrupted command recovery

```sh
python3 scripts/check-command-recovery.py
python3 scripts/check-recovery-http.py --origin http://127.0.0.1:5196
python3 scripts/check-workflow-contract.py
python3 scripts/run-command-recovery-preview.py --port 5197
```

The recovery suite runs all eleven migrations in a private disposable PostgreSQL cluster. Its 69 passing checks include four real overlapping-connection races, restart, five direct cookie HTTP requests, four maintained Postman requests and the actual encryption/recovery controller with an explicitly identified memory-storage double. It checks original-key ownership, current permission/grant revocation, cancellation versus original delivery, no financial reversal, encrypted private fields, unchanged replay, unavailable storage, changed session secret, corrupted ciphertext and two controllers competing for one journal. See [command-recovery-validation.json](command-recovery-validation.json) and [recovery-postman-validation.txt](recovery-postman-validation.txt). The unconfigured HTTP checker separately verifies 27 closed identity/input/configuration boundaries.

The private browser fixture is a script, never an application route or production import. It creates a disposable database, fictional table/seating and verified fictional destination, accepts guest requests and issues grants privately in-process. It exposes no merchant identity bypass. Its loopback middleware can drop delivery until explicitly released, or lose one response after successful commit, controlled through a private temporary faults file. Holding the BEFORE fault prevents an automatic browser connection retry from accidentally delivering the command. Actual guest/payer capabilities are entered through the ordinary interface, and HTTP resolves the real local cookies. Recorded browser evidence belongs in [command-recovery-browser-validation.json](command-recovery-browser-validation.json), separately from the memory-only service rehearsal. Stop the fixture with Ctrl+C to remove its database. Never use it with real accounts, an existing database or a public origin.

Browser storage remains best effort; clearing it or losing the original session can make local recovery unavailable. Credential issuance/entry, unsent drafts, catalog/preparation commands and device-to-device recovery are outside this module. Staff/cashier browser recovery still requires real verified merchant identity. Local checks do not prove production, independent physical devices, provider-specific reference rules, backup restoration or supervised operational reconciliation.

The final browser run records 40 observed checks in [command-recovery-browser-validation.json](command-recovery-browser-validation.json), including real IndexedDB decryption after reload, persistent loss before delivery, a streamed response lost after commit, exact unchanged retry, two-tab blocking/cancellation and retained independent drafts. Read-only SQL confirms two original order requests, one pending payer claim, one cancelled order tombstone, no cancelled order, and zero receipts/allocations. Phone widths 390px and 320px have no horizontal overflow. No JavaScript console errors were captured. The helper only exposes fictional guest/payer HTTP; merchant login stays closed.
