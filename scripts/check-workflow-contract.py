#!/usr/bin/env python3
"""Validate v2 schemas, saved requests/examples and real PostgreSQL projections."""
from pathlib import Path
import json
import re
from datetime import datetime,timezone
import yaml
from jsonschema import Draft202012Validator,FormatChecker
from referencing import Registry,Resource

ROOT=Path(__file__).resolve().parents[1]
spec=yaml.safe_load((ROOT/'postman/specs/workflow-v2.openapi.yaml').read_text())
base={'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'urn:menumini:workflow','components':spec['components']}
registry=Registry().with_resource(base['$id'],Resource.from_contents(base))
def validator(name): return Draft202012Validator({'$ref':base['$id']+'#/components/schemas/'+name},registry=registry,format_checker=FormatChecker())
cases=[]
def check(value,label):
    assert value,label
    cases.append(label)
def refs(value):
    if isinstance(value,dict):
        if '$ref' in value:
            assert value['$ref'].startswith('#/'),'external reference not reviewed'
            target=spec
            for part in value['$ref'][2:].split('/'): target=target[part.replace('~1','/').replace('~0','~')]
        for item in value.values(): refs(item)
    elif isinstance(value,list):
        for item in value: refs(item)
refs(spec); cases.append('all v2 internal references resolve')
for schema in spec['components']['schemas'].values(): Draft202012Validator.check_schema(schema)
cases.append('all v2 component schemas are valid JSON Schema')
operations={}
for route,methods in spec['paths'].items():
    for method,op in methods.items():
        assert op['operationId'] not in operations
        operations[op['operationId']]=(route,method,op)
        declared={p['name'] for p in op['parameters'] if p.get('in')=='path'}
        assert declared==set(re.findall(r'{(\w+)}',route))
        if method!='get' and op['operationId'] not in ('validateBusinessRegistration','validateSetupDraft','validateWorkspacePreparation'):
            assert any(p.get('$ref')=='#/components/parameters/IdempotencyKey' for p in op['parameters'])
            if op['security']: assert 'csrfToken' in op['security'][0]
        if 'requestBody' in op:
            content=op['requestBody']['content']['application/json']
            validator(content['schema']['$ref'].split('/')[-1]).validate(content['example'])
        for code,response in op['responses'].items():
            if code.startswith('2'):
                content=response['content']['application/json']
                validator(content['schema']['$ref'].split('/')[-1]).validate(content['example'])
check(len(operations)==73,'73 unique operations declare paths, security, retries and schema-valid examples')
for name in ('getPayerBill','submitBillClaim','listPayerClaims','leavePayerAccess'):
    check({'billAccess','diningSession'}<=operations[name][2]['security'][0].keys(),name+' requires payer capability and its guest session')

collection=ROOT/'postman/collections/menu-workflow-v2'
seen=set(); saved=0
for path in collection.rglob('*.request.yaml'):
    request=yaml.safe_load(path.read_text()); name=request['name']; assert name not in seen; seen.add(name)
    route,method,op=operations[name]
    assert request['method'].lower()==method
    assert re.sub(r':(\w+)',r'{\1}',request['url'].split('}}',1)[1].split('?',1)[0])==route
    if 'requestBody' in op:
        schema=op['requestBody']['content']['application/json']['schema']['$ref'].split('/')[-1]
        validator(schema).validate(json.loads(request['body']['content']))
    headers={h['key']:h['value'] for h in request['headers']}
    if op['security']:
        for scheme in op['security'][0]:
            definition=spec['components']['securitySchemes'][scheme]
            if definition['in']=='cookie': assert definition['name']+'={{'+scheme+'}}' in headers['Cookie']
            else: assert definition['name'] in headers
        assert not request.get('auth'),'cookie schemes must not be rewritten as API-key headers'
    for example_path in (path.parent/request['examples']).glob('*.example.yaml'):
        response=yaml.safe_load(example_path.read_text())['response']; code=str(response['statusCode'])
        schema=op['responses'][code]['content']['application/json']['schema']['$ref'].split('/')[-1]
        validator(schema).validate(json.loads(response['body']['content'])); saved+=1
check(seen==set(operations),'generated Postman requests cover every v2 operation exactly once')
check(saved>=30,'saved Postman responses and request payloads match their operation schemas')
projections=json.loads((ROOT/'docs/contracts/workflow-v2-db-examples.json').read_text())
for example in projections: validator(example['schema']).validate(example['value'])
check(len(projections)==4,'four actual PostgreSQL bill/receipt projections match HTTP response schemas')
catalog_projections=json.loads((ROOT/'docs/contracts/catalog-db-examples.json').read_text())
for example in catalog_projections: validator(example['schema']).validate(example['value'])
check(len(catalog_projections)==3,'three actual persistent draft/profile/publication projections match HTTP schemas')
workspace_projections=json.loads((ROOT/'docs/contracts/workspace-db-examples.json').read_text())
for example in workspace_projections: validator(example['schema']).validate(example['value'])
check(len(workspace_projections)==2,'two actual service draft/readiness projections match HTTP schemas')
service_projections=json.loads((ROOT/'docs/contracts/staff-service-db-examples.json').read_text())
for example in service_projections:validator(example['schema']).validate(example['value'])
check(len(service_projections)==6,'six actual staff-service projections match the HTTP contracts')

cashier_projections=json.loads((ROOT/'docs/contracts/cashier-db-examples.json').read_text())
for example in cashier_projections:validator(example['schema']).validate(example['value'])
check(len(cashier_projections)==6,'six actual cashier projections match the HTTP contracts')

guest_projections=json.loads((ROOT/'docs/contracts/guest-db-examples.json').read_text())
for example in guest_projections:validator(example['schema']).validate(example['value'])
check(len(guest_projections)==6,'six actual guest adapter projections match the HTTP contracts with secrets replaced by fictional placeholders')

payer_projections=json.loads((ROOT/'docs/contracts/payer-db-examples.json').read_text())
for example in payer_projections:validator(example['schema']).validate(example['value'])
check(len(payer_projections)==7,'seven actual payer authorization, shared bill and own-claim projections match their HTTP schemas with secrets replaced')

recovery_projections=json.loads((ROOT/'docs/contracts/recovery-db-examples.json').read_text())
for example in recovery_projections:validator(example['schema']).validate(example['value'])
check(len(recovery_projections)==5,'five actual committed, cancelled and unknown recovery projections match the HTTP contract without command bodies')

def invalid(schema,value,label): check(bool(list(validator(schema).iter_errors(value))),label)
def valid(schema,value,label): validator(schema).validate(value); cases.append(label)
order=operations['submitGuestOrder'][2]['requestBody']['content']['application/json']['example']
invalid('VisitOrder',{k:v for k,v in order.items() if k!='pricingFingerprint'},'guest order requires reviewed pricing fingerprint')
invalid('CreateDiningSession',{'tableToken':'T'*43},'anonymous start requires private random nonce in addition to retry UUID')
invalid('GuestOrder',{**operations['getGuestOrder'][2]['responses']['200']['content']['application/json']['example'],'allowedTransitions':['ACCEPTED']},'guest response cannot contain staff transition controls')
invalid('VisitOrder',{**order,'paymentStatus':'PAID'},'client cannot assert bill payment status')
invalid('VisitOrder',{**order,'businessId':'00000000-0000-4000-8000-000000000999'},'client cannot choose tenant identity in an order')
invalid('VisitOrder',{**order,'items':[{**order['items'][0],'unitPrice':'0.01'}]},'client cannot supply authoritative item prices')
invalid('VisitOrder',{**order,'items':[]},'empty order rejected')
invalid('VisitOrder',{**order,'items':[{**order['items'][0],'quantity':0}]},'zero quantity rejected')
invalid('VisitOrder',{**order,'items':[{**order['items'][0],'choiceIds':[order['items'][0]['itemId']]*2}]},'duplicate modifier selection rejected')
for amount in (210.0,'210','210.0','210x00','-1.00','01.00','10000000000.00'):
    invalid('Money',amount,'invalid money representation rejected: '+str(amount))
valid('Money','210.00','exact two-decimal money string accepted')
invalid('PositiveMoney','0.00','zero receipt/allocation amount rejected')
invalid('ReviewBillClaim',{'expectedVersion':1,'decision':'APPROVE','verificationNote':'Checked'},'approval requires actual credited and explicit allocation amounts')
invalid('ReviewBillClaim',{'expectedVersion':1,'decision':'REJECT','verificationNote':'Rejected','verifiedAmount':'70.00'},'rejection cannot record received money')
valid('ReviewBillClaim',{'expectedVersion':1,'decision':'APPROVE','verificationNote':'Checked','verifiedAmount':'70.00','allocationAmount':'0.00','fundsConfirmed':True},'funds can be received and deliberately left unapplied')
invalid('RecordReceipt',{'method':'CASH','receivedAmount':'70.00','verificationNote':'Counted'},'cash requires tender and change amounts')
invalid('RecordReceipt',{'method':'BANK_TRANSFER','receivedAmount':'70.00','verificationNote':'Checked'},'transfer requires recipient and provider reference')
cash=operations['recordReceipt'][2]['requestBody']['content']['application/json']['example']
invalid('RecordReceipt',{**cash,'accountId':order['visitId']},'cash receipt cannot carry a bank account')
invalid('BillCredit',{'expectedVersion':1,'amount':'10.00','reason':'Correction'},'bill credit must identify its accepted order')
invalid('PlanRequest',{'requestedPlan':'PRO'},'Pro capacity request must specify branch limit')
plan=operations['applyPlanTerm'][2]['requestBody']['content']['application/json']['example']
invalid('ApplyPlan',{**plan,'branchLimit':2},'generic Mini activation cannot bypass owner price quote consent')
valid('PlanRequest',{'requestedPlan':'MINI','requestedBranchLimit':2},'second branch request can stay on Mini')
invalid('PlanRequest',{'requestedPlan':'MINI','requestedBranchLimit':3},'Mini request cannot exceed two branches')
term=operations['activateMiniBranchQuote'][2]['responses']['201']['content']['application/json']['example']
valid('PlanTerm',term,'quoted two-branch entitlement remains on Mini')
invalid('PlanTerm',{**term,'branchLimit':3},'Mini response cannot report a third branch')
registration=operations['validateBusinessRegistration'][2]['requestBody']['content']['application/json']['example']
invalid('RegistrationInput',{**registration,'businessTypeId':'mini-warm-habesha'},'visual theme cannot stand in for one of the 24 business types')
valid('RegistrationInput',registration,'separate owner and manager with optional emails omitted accepted')
single={k:v for k,v in registration.items() if k!='manager'}
valid('RegistrationInput',{**single,'ownerIsManager':True},'owner can be the manager without duplicate fields')
invalid('RegistrationInput',{**single,'ownerIsManager':False},'separate manager contact required')
invalid('RegistrationInput',{**registration,'authorityConfirmed':False},'registrant must confirm business setup authority')
check(len(spec['components']['schemas']['RegistrationInput']['properties']['businessTypeId']['enum'])==24,'exactly 24 real business types declared')
setup=operations['validateSetupDraft'][2]['requestBody']['content']['application/json']['example']
valid('SetupDraft',setup,'preparation draft has one branch, plan preference and real menu entries')
invalid('SetupDraft',{**setup,'owner':registration['owner']},'export/import contract rejects private registration contacts')
invalid('SetupDraft',{**setup,'phoneVerified':True},'draft cannot assert phone verification')
invalid('SetupDraft',{**setup,'branches':[setup['branch']]*3},'first setup cannot bypass branch capacity with extra branches')
invalid('SetupItem',{'id':setup['menu']['sections'][0]['items'][0]['id'],'name':'Coffee','price':60.50,'available':True},'draft item prices must be exact strings')
invalid('SetupHours',{'day':0,'status':'OPEN'},'open day requires explicit opening, closing and overnight fields')
invalid('SetupHours',{'day':0,'status':'CLOSED','opens':'07:00'},'closed day cannot advertise open hours')
check(setup['branch'].get('publicPhone') is None,'example does not auto-publish a personal registration phone')
invalid('ApplyPlan',{**plan,'plan':'FREE','endsAt':plan['endsAt'],'orderingEnabled':True},'Free entitlement cannot enable ordering')
invalid('ApplyPlan',{k:v for k,v in plan.items() if k!='endsAt'},'paid entitlement must specify expiry')
workspace=operations['validateWorkspacePreparation'][2]['requestBody']['content']['application/json']['example']
valid('WorkspacePreparation',workspace,'rich menu and service preparation have a portable strict contract')
invalid('WorkspacePreparation',{**workspace,'phoneVerified':True},'workspace cannot assert verified identity')
invalid('ServicePreparation',{**workspace['service'],'orderingEnabled':True},'service draft cannot enable ordering')
invalid('ServicePreparation',{**workspace['service'],'receivingAccount':{'number':'fictional'}},'service preparation cannot import receiving accounts')
invalid('ServicePreparation',{**workspace['service'],'paymentMethods':['CASH','CASH']},'duplicate intended payment methods rejected by contract')
invalid('ServicePreparation',{**workspace['service'],'staffing':{'orders':'OWNER','preparation':'STAFF','payments':'CASHIER'}},'planned responsibility cannot grant a staff role')
staff_order=operations['submitStaffOrder'][2]['requestBody']['content']['application/json']['example']
invalid('StaffVisitOrder',{k:v for k,v in staff_order.items() if k!='pricingFingerprint'},'staff order requires reviewed price-policy fingerprint')
invalid('StaffVisitOrder',{**staff_order,'pricingFingerprint':'fake'},'arbitrary price policy assertions rejected')
invalid('UpdateDiningTable',{'expectedVersion':0,'label':'A','active':False},'table edits require a positive version')
invalid('DiningTable',{**operations['createDiningTable'][2]['responses']['201']['content']['application/json']['example'],'qrToken':'fake'},'table projection cannot leak QR secrets')
invalid('RecordReceipt',{k:v for k,v in cash.items() if k!='fundsConfirmed'},'receipt requires explicit actual-funds confirmation')
invalid('ExecuteRefund',{'expectedVersion':2,'executionReference':'Fictional returned funds'},'refund execution requires actual-return confirmation')
invalid('CashierDetail',{**operations['getCashierDetail'][2]['responses']['200']['content']['application/json']['example'],'guestToken':'fake'},'cashier response rejects guest secrets')
payer_detail=operations['getPayerBill'][2]['responses']['200']['content']['application/json']['example']
invalid('PayerDetail',{**payer_detail,'guestSessionId':order['visitId']},'shared bill cannot expose another guest identity')
invalid('PayerLine',{**payer_detail['orders'][0]['items'][0],'specialInstructions':'Private'},'shared charges cannot expose private item instructions')
claim=operations['submitBillClaim'][2]['requestBody']['content']['application/json']['example']
invalid('CreateBillClaim',{**claim,'transferSent':False},'payer must acknowledge a transfer already sent')
invalid('CreateBillClaim',{k:v for k,v in claim.items() if k!='destinationFingerprint'},'report requires the displayed verified destination fingerprint')
invalid('CreateBillClaim',{**claim,'receiptAssetId':order['visitId']},'unimplemented upload cannot be attached as evidence')
invalid('CreateBillClaim',{**claim,'paymentStatus':'PAID'},'reported funds cannot assert settlement')
invalid('IssueBillGrant',{'guestSessionId':order['visitId']},'payer authorization requires reviewed bill version')
invalid('PayerClaim',{**operations['submitBillClaim'][2]['responses']['201']['content']['application/json']['example'],'verificationNote':'Private'},'payer projection excludes staff verification notes')
check('diningSession' in operations['redeemBillGrant'][2]['security'][0] and 'csrfToken' in operations['redeemBillGrant'][2]['security'][0],'bill redemption requires the current dining cookie and its CSRF')
recovered=operations['getGuestOrderRequest'][2]['responses']['200']['content']['application/json']['example']
invalid('RecoveryReceipt',{**recovered,'state':'NOT_RECORDED'},'an unrecorded outcome cannot claim an existing result')
invalid('RecoveryReceipt',{**recovered,'resultId':None},'committed recovery must identify its original result')
invalid('RecoveryReceipt',{**recovered,'operation':'CLAIM'},'guest order recovery cannot masquerade as payer evidence')
invalid('RecoveryReceipt',{**recovered,'body':order},'recovery result cannot disclose a private command body')
invalid('ServiceRecoveryDescriptor',{'operation':'ISSUE_INVITATION','resourceId':order['visitId']},'credential issuance cannot enter durable service recovery')
for name in ('cancelGuestOrderRequest','cancelPayerPaymentRequest','cancelServiceRequest','cancelCashierRequest'):
    request=next(yaml.safe_load(p.read_text()) for p in collection.rglob('*.request.yaml') if yaml.safe_load(p.read_text())['name']==name)
    check(any(h['key']=='Idempotency-Key' and h['value']=='{{requestKey}}' for h in request['headers']),name+' retains the original request UUID in path and header')
result={'verified_at':datetime.now(timezone.utc).isoformat(),'passed':len(cases),'failed':0,'operations':len(operations),
 'schemas':len(spec['components']['schemas']),'postman_requests':len(seen),'saved_examples':saved,'database_projection_examples':len(projections)+len(catalog_projections)+len(workspace_projections)+len(service_projections)+len(cashier_projections)+len(guest_projections)+len(payer_projections)+len(recovery_projections),
 'cases':cases,'scope':'local schema, saved-example and database-projection validation only; no live HTTP requests'}
(ROOT/'docs/workflow-contract-validation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
