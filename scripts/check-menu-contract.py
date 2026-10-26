#!/usr/bin/env python3
"""Validate design schemas/examples locally; does not call application endpoints."""
from pathlib import Path
import json
import re

import yaml
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
SPEC = yaml.safe_load((ROOT / 'postman/specs/openapi.yaml').read_text())
SCHEMAS = SPEC['components']['schemas']
SCHEMA_ROOT = {'$schema': 'https://json-schema.org/draft/2020-12/schema',
               '$id': 'urn:menumini:contract', 'components': SPEC['components']}
REGISTRY = Registry().with_resource('urn:menumini:contract', Resource.from_contents(SCHEMA_ROOT))

def validator(name):
    return Draft202012Validator({'$ref': f'urn:menumini:contract#/components/schemas/{name}'},
                               registry=REGISTRY, format_checker=FormatChecker())

def references(value):
    if isinstance(value, dict):
        if '$ref' in value:
            target = SPEC
            assert value['$ref'].startswith('#/'), 'external reference requires separate verification'
            for part in value['$ref'][2:].split('/'):
                target = target[part.replace('~1', '/').replace('~0', '~')]
        for item in value.values():
            references(item)
    elif isinstance(value, list):
        for item in value:
            references(item)

references(SPEC)
for name, schema in SCHEMAS.items():
    Draft202012Validator.check_schema(schema)

operations = {op['operationId']: (path, method, op)
              for path, methods in SPEC['paths'].items()
              for method, op in methods.items() if method in ['get', 'post', 'put', 'patch', 'delete']}
cases = ['all internal references resolve', f'{len(SCHEMAS)} component schemas are valid JSON Schema']
for name, (path, method, op) in operations.items():
    declared = {p['name'] for p in op.get('parameters', []) if '$ref' not in p and p['in'] == 'path'}
    assert declared == set(re.findall(r'{(\w+)}', path)), name
    assert any(code.startswith('2') for code in op['responses']), name
    for response in op['responses'].values():
        for body in response.get('content', {}).values():
            if 'example' in body:
                schema_name = body['schema']['$ref'].split('/')[-1]
                validator(schema_name).validate(body['example'])
cases.append('operation paths and in-spec response examples agree')

checked_examples = 0
for path in (ROOT / 'postman/collections/menu-mini-v1/.resources').glob('*.resources/examples/*.example.yaml'):
    example = yaml.safe_load(path.read_text())
    request_name = path.parent.parent.name.removesuffix('.resources')
    response = example['response']
    payload = json.loads(response['body']['content'])
    if response['statusCode'] >= 400:
        schema_name = 'Problem'
    elif request_name == 'replayOrder':
        schema_name = 'Order'
    else:
        op = operations[request_name][2]
        schema_name = op['responses'][str(response['statusCode'])]['content']['application/json']['schema']['$ref'].split('/')[-1]
    validator(schema_name).validate(payload)
    checked_examples += 1
cases.append(f'{checked_examples} saved response examples match their schemas')

good_order = {'menuPublicationId': '00000000-0000-4000-8000-000000000401',
              'items': [{'itemId': '00000000-0000-4000-8000-000000000601', 'quantity': 2, 'choiceIds': []}]}
validator('CreateOrder').validate(good_order)
for label, bad in [
    ('client paid status rejected', {**good_order, 'paymentStatus': 'PAID'}),
    ('client item price rejected', {**good_order, 'items': [{**good_order['items'][0], 'unitPrice': '0.01'}]}),
    ('zero quantity rejected', {**good_order, 'items': [{**good_order['items'][0], 'quantity': 0}]}),
]:
    assert list(validator('CreateOrder').iter_errors(bad)), label
    cases.append(label)
assert list(validator('ReviewPayment').iter_errors({'decision': 'APPROVE', 'note': 'Checked'}))
cases.append('approval requires an explicit verified amount')
assert list(validator('Money').iter_errors(140.00))
cases.append('money is a decimal string, not a floating-point JSON number')
print(json.dumps({'passed': len(cases), 'failed': 0, 'operations': len(operations),
                  'schemas': len(SCHEMAS), 'saved_examples': checked_examples, 'cases': cases,
                  'scope': 'local schema and example validation; no live endpoint tests'}, indent=2))
