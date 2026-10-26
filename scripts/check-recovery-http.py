#!/usr/bin/env python3
"""Closed identity and bounded-input recovery HTTP checks; loopback without database configuration."""
from pathlib import Path
from datetime import datetime, timezone
import argparse, http.client, json, uuid
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--origin', default='http://127.0.0.1:5196')
args = parser.parse_args()
origin = urlparse(args.origin)
assert origin.scheme == 'http' and origin.hostname in ('127.0.0.1', 'localhost')
uid = lambda n: f'00000000-0000-4000-8000-{n:012d}'
request_key = str(uuid.uuid4())
guest = 'menu_dining=' + 'G' * 43
payer = guest + '; menu_bill_access=' + 'B' * 43
headers = {'Origin': args.origin, 'Content-Type': 'application/json',
           'Cookie': 'menu_staff_session=FICTIONAL_SPOOF', 'X-User-ID': uid(411),
           'X-Business-ID': uid(41), 'X-Guest-Session-Id': uid(301),
           'X-CSRF-Token': 'F' * 43, 'Idempotency-Key': request_key}
cases = []
requests = 0

def call(method, path, body=None, changes=None):
    global requests
    conn = http.client.HTTPConnection(origin.hostname, origin.port, timeout=20)
    try:
        data = body if isinstance(body, str) else json.dumps(body) if body is not None else None
        conn.request(method, '/api/v2' + path, body=data, headers={**headers, **(changes or {})})
        response = conn.getresponse()
        value = json.loads(response.read())
        requests += 1
        assert response.getheader('Cache-Control') == 'no-store'
        assert response.getheader('Referrer-Policy') == 'no-referrer'
        assert response.getheader('Set-Cookie') is None
        return response.status, value
    finally:
        conn.close()

for domain in ['service', 'cashier']:
    base = '/merchant/branches/' + uid(601) + '/' + domain + '-requests/' + request_key
    for method, path, body in [('GET', base + '?operation=CREATE_TABLE&resourceId=' + uid(601), None),
                               ('POST', base + '/cancellation', {'operation': 'CREATE_TABLE', 'resourceId': uid(601)})]:
        status, value = call(method, path, body)
        assert status == 401 and value['code'] == 'AUTHENTICATION_REQUIRED'
        cases.append(domain + ' ' + method + ' recovery rejects forged merchant identity')

for domain, base, cookie in [
    ('guest', '/guest/visits/' + uid(701) + '/order-requests/' + request_key, guest),
    ('payer', '/payer/bills/' + uid(801) + '/payment-requests/' + request_key, payer),
]:
    for method, path, body in [('GET', base, None), ('POST', base + '/cancellation', {})]:
        status, value = call(method, path, body)
        assert status == 401 and value['code'] == 'GUEST_SESSION_REQUIRED'
        cases.append(domain + ' ' + method + ' recovery needs actual dining capability')
    for method, path, body, changes, expected, code in [
        ('GET', base + '?unknown=true', None, {}, 400, 'INVALID_QUERY'),
        ('POST', base + '/cancellation', {}, {'Origin': 'https://fictional-cross-origin.invalid'}, 403, 'ORIGIN_REJECTED'),
        ('POST', base + '/cancellation', {}, {'Idempotency-Key': str(uuid.uuid4())}, 400, 'RECOVERY_KEY_MISMATCH'),
        ('POST', base + '/cancellation', {'replacementBody': {}}, {}, 422, 'INVALID_RECOVERY'),
        ('POST', base + '/cancellation', '{}', {'Content-Type': 'text/plain'}, 415, 'JSON_REQUIRED'),
        ('POST', base + '/cancellation', '{', {}, 400, 'INVALID_JSON'),
        ('POST', base + '/cancellation', '"' + 'X' * 4200 + '"', {}, 413, 'BODY_TOO_LARGE'),
        ('POST', base + '/cancellation', {}, {'X-CSRF-Token': 'invalid'}, 403, 'CSRF_REJECTED'),
        ('GET', base, None, {}, 503, 'GUEST_UNAVAILABLE'),
    ]:
        status, value = call(method, path, body, {'Cookie': cookie, **changes})
        assert status == expected and value['code'] == code, (domain, code, status, value)
        cases.append(domain + ' recovery boundary: ' + code)

status, value = call('GET', '/payer/bills/' + uid(801) + '/payment-requests/' + request_key, changes={'Cookie': guest})
assert status == 403 and value['code'] == 'PAYER_ACCESS_REQUIRED'
cases.append('dining authority alone cannot resolve a shared-bill payment report')
result = {'verified_at': datetime.now(timezone.utc).isoformat(), 'passed': len(cases), 'failed': 0,
          'http_requests': requests, 'cases': cases,
          'scope': 'actual unconfigured loopback HTTP: closed merchant identity, capability presence, origin/CSRF, body bounds and original-key matching; successful recovery uses a separate limited PostgreSQL fixture'}
(ROOT / 'docs/command-recovery-http-validation.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
