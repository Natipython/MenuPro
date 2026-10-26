#!/usr/bin/env python3
"""Check frontend cart preparation against the maintained order contract; no HTTP."""
from pathlib import Path
import json
import os
import subprocess
import tempfile
import yaml
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
safe_env = {key: value for key, value in os.environ.items()
            if not key.startswith('PG') and 'DATABASE_URL' not in key
            and not key.startswith(('MENU_PUBLIC_', 'MENU_MERCHANT_', 'MENU_GUEST_'))}

with tempfile.TemporaryDirectory(prefix='menumini-cart-contract-') as temporary:
    sample = Path(temporary) / 'command.json'
    result = subprocess.run(['node', 'scripts/check-menu-cart.mjs', str(sample)],
                            cwd=ROOT / 'MenuMini_1', env=safe_env,
                            text=True, capture_output=True, timeout=90)
    if result.returncode:
        raise SystemExit(result.stderr[-3000:] or result.stdout[-3000:])
    body = json.loads(sample.read_text())
    spec = yaml.safe_load((ROOT / 'postman/specs/workflow-v2.openapi.yaml').read_text())
    base = {'$schema': 'https://json-schema.org/draft/2020-12/schema',
            '$id': 'urn:menumini:cart-command', 'components': spec['components']}
    registry = Registry().with_resource(base['$id'], Resource.from_contents(base))
    schema = spec['paths']['/guest/orders']['post']['requestBody']['content']['application/json']['schema']
    validator = Draft202012Validator({'$ref': base['$id'] + schema['$ref']},
                                      registry=registry, format_checker=FormatChecker())
    validator.validate(body)
    for field, value in [('totalAmount', '0.01'),
                         ('userId', '00000000-0000-4000-8000-000000000001'), ('paid', True)]:
        assert list(validator.iter_errors({**body, field: value})), field
    report_path = ROOT / 'docs/menu-cart-draft-validation.json'
    report = json.loads(report_path.read_text())
    report['contract'] = {'spec': 'postman/specs/workflow-v2.openapi.yaml',
                          'operation': 'POST /guest/orders', 'schema': schema['$ref'],
                          'valid_payloads': 1, 'forbidden_field_cases': 3, 'failed': 0}
    report_path.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'cart_checks_passed': report['passed'], 'failed': report['failed'],
                      'contract': report['contract']}, indent=2))
