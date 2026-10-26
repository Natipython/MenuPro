The current contract is `specs/workflow-v2.openapi.yaml` and the maintained collection is `collections/menu-workflow-v2`. The v1 spec and collection remain historical baselines.

The v2 contract has 73 operations: four functional public validation/menu handlers, 17 guest/payer capability handlers requiring explicit limited configuration, 40 closed merchant boundaries and 12 remaining target HTTP operations. Closed merchant handlers cannot accept forged identity while real OTP is deferred.

Requests are independent fictional examples. Do not run the full collection as a restaurant transaction. Private temporary guest, payer and recovery fixtures execute the relevant maintained request sequences with real local cookie resolution and fresh fictional values; see `scripts/check-guest-ordering.py` and `scripts/check-payer-claims.py`, plus `scripts/check-command-recovery.py`. Merchant successes remain in-process private adapter tests until trusted authentication is implemented.

Never store real session values, credentials or payment references in maintained environments or requests. Local syntax/collection lint verifies structure; dedicated fixture runs establish the stated behavior. No workspace push, cloud reporting, actual payment or production activation is part of this work.
