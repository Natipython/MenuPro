#!/usr/bin/env python3
"""Build the local v2 design contract; no network, credentials or endpoint calls."""
from pathlib import Path
from copy import deepcopy
import json
import yaml
from importlib.util import spec_from_file_location, module_from_spec

ROOT = Path(__file__).resolve().parents[1]
old = yaml.safe_load((ROOT / 'postman/specs/openapi.yaml').read_text())
loader=spec_from_file_location('workflow_examples',ROOT/'scripts/workflow-examples.py')
fixtures=module_from_spec(loader); loader.loader.exec_module(fixtures)
example_values=fixtures.examples(old['paths']['/public/venues/{venueSlug}/menu']['get']['responses']['200']['content']['application/json']['example'])
schemas = deepcopy(old['components']['schemas'])

def ref(name): return {'$ref': '#/components/schemas/' + name}
def obj(properties, required=None):
    return {'type': 'object', 'additionalProperties': False, 'properties': properties,
            'required': list(properties) if required is None else required}
uid = {'type': 'string', 'format': 'uuid'}
version = {'type': 'integer', 'minimum': 1}
money = ref('Money')
text = {'type': 'string', 'minLength': 1, 'maxLength': 160}
note = {'type': 'string', 'maxLength': 1000}
timestamp = {'type': 'string', 'format': 'date-time'}
def enum(*values): return {'type': 'string', 'enum': list(values)}
def array(schema): return {'type': 'array', 'items': schema, 'maxItems': 100}

schemas.update({
 'PositiveMoney': {'allOf':[ref('Money'),{'not':{'const':'0.00'}}]},
 'SaveMenuDraft': obj({'expectedVersion':{'type':'integer','minimum':0},'content':ref('MenuDraftInput')}),
 'BranchRole': enum('MANAGER', 'WAITER', 'CASHIER', 'PREPARATION', 'EDITOR'),
 'Principal': obj({'userId':uid, 'businessId':uid, 'plan':enum('FREE','MINI','PRO'),
                   'branchLimit':version, 'permissions':array(text)}),
 'Branch': obj({'id':uid,'name':text,'publicSlug':text,'orderingEnabled':{'type':'boolean'}}),
 'CreateBranch': obj({'name':text,'publicSlug':{'type':'string','pattern':'^[a-z0-9]+(-[a-z0-9]+)*$'}}),
 'StaffAssignment': obj({'branchId':uid,'userId':uid,'role':ref('BranchRole'),'active':{'type':'boolean'}}),
 'AssignStaff': obj({'userId':uid,'role':ref('BranchRole'),'active':{'type':'boolean'}}),
 'Visit': obj({'id':uid,'branchId':uid,'tableId':uid,'version':version,'status':enum('OPEN','ENDED'),'billId':uid}),
 'OpenVisit': obj({'tableId':uid}),
 'OpenedVisit': obj({'visit':ref('Visit'),'pairingToken':{'type':'string','minLength':43,'maxLength':128},'pairingExpiresAt':timestamp}),
 'VersionCommand': obj({'expectedVersion':version}),
 'PairVisit': obj({'pairingToken':{'type':'string','minLength':43,'maxLength':128}}),
 'PairedContext': obj({'visitId':uid,'tableId':uid,'canSubmitOrders':{'type':'boolean'}}),
 'VisitOrder': obj({'visitId':uid,'menuPublicationId':uid,'items':array(ref('OrderSelection')),'customerNote':note,'pricingFingerprint':{'type':'string','pattern':'^[0-9a-f]{64}$'}},
                   ['visitId','menuPublicationId','items','pricingFingerprint']),
 'ServiceOrder': obj({'id':uid,'visitId':uid,'branchId':uid,'source':enum('GUEST','STAFF'),
                      'status':ref('OrderStatus'),'version':version,'currency':{'const':'ETB','type':'string'},
                      'totalAmount':money,'items':array(ref('OrderLine'))}),
 'OrderTransition': obj({'expectedVersion':version,'status':ref('OrderStatus'),'reason':{'type':'string','maxLength':160}},['expectedVersion','status']),
 'AvailabilityCommand': obj({'expectedRevision':version,'available':{'type':'boolean'},'reason':note},['expectedRevision','available']),
 'Availability': obj({'itemId':uid,'revision':version,'available':{'type':'boolean'}}),
 'Bill': obj({'id':uid,'visitId':uid,'branchId':uid,'version':version,'status':enum('OPEN','FINALIZED','CLOSED'),
              'currency':{'type':'string','const':'ETB'},'chargeAmount':money,'allocatedAmount':money,
              'outstandingAmount':money,'unappliedAmount':money,'refundPendingAmount':money,
              'settlement':enum('UNPAID','PARTIALLY_PAID','PAID','NO_PAYMENT_DUE')}),
 'BillCredit': obj({'expectedVersion':version,'orderId':uid,'amount':ref('PositiveMoney'),'reason':text}),
 'BillPaymentClaim': obj({'id':uid,'billId':uid,'version':version,'status':enum('SUBMITTED','APPROVED','REJECTED'),
                          'reportedAmount':ref('PositiveMoney')}),
 'CreateBillClaim': obj({'accountId':uid,'providerReference':{'type':'string','minLength':1,'maxLength':120},
                         'reportedAmount':ref('PositiveMoney'),'receiptAssetId':uid},
                        ['accountId','providerReference','reportedAmount']),
 'ReviewBillClaim': obj({'expectedVersion':version,'decision':enum('APPROVE','REJECT'),
                         'verifiedAmount':ref('PositiveMoney'),'allocationAmount':money,'verificationNote':text},
                        ['expectedVersion','decision','verificationNote']),
 'Receipt': obj({'id':uid,'billId':uid,'method':enum('CASH','BANK_TRANSFER'),'currency':{'type':'string','const':'ETB'},
                 'receivedAmount':ref('PositiveMoney'),'allocatedAmount':money,'refundedAmount':money,'unappliedAmount':money}),
 'RecordReceipt': obj({'method':enum('CASH','BANK_TRANSFER'),'receivedAmount':ref('PositiveMoney'),
                       'tenderedAmount':ref('PositiveMoney'),'changeAmount':money,'accountId':uid,
                       'providerReference':{'type':'string','minLength':1,'maxLength':120},'verificationNote':text},
                      ['method','receivedAmount','verificationNote']),
 'AllocateReceipt': obj({'billId':uid,'expectedBillVersion':version,'amount':ref('PositiveMoney')}),
 'Allocation': obj({'id':uid,'receiptId':uid,'billId':uid,'amount':ref('PositiveMoney')}),
 'RefundRequest': obj({'id':uid,'receiptId':uid,'version':version,'amount':ref('PositiveMoney'),
                       'status':enum('REQUESTED','APPROVED','EXECUTED','REJECTED')}),
 'RequestRefund': obj({'amount':ref('PositiveMoney'),'reason':text}),
 'ReviewRefund': obj({'expectedVersion':version,'decision':enum('APPROVE','REJECT'),'reason':text}),
 'ExecuteRefund': obj({'expectedVersion':version,'executionReference':{'type':'string','minLength':1,'maxLength':120}}),
 'BillGrant': obj({'billId':uid,'expiresAt':timestamp,'accessToken':{'type':'string','minLength':43,'maxLength':128}}),
 'IssueBillGrant': obj({'guestSessionId':uid}),
 'PlanRequest': obj({'requestedPlan':enum('FREE','MINI','PRO'),'requestedBranchLimit':version},['requestedPlan']),
 'PlanChangeRequest': obj({'id':uid,'requestedPlan':enum('FREE','MINI','PRO'),'status':{'type':'string','const':'REQUESTED'}}),
 'ApplyPlan': obj({'plan':enum('FREE','MINI','PRO'),'branchLimit':version,'orderingEnabled':{'type':'boolean'},
                   'startsAt':timestamp,'endsAt':timestamp,'billingEvidenceReference':text},
                  ['plan','branchLimit','orderingEnabled','startsAt','billingEvidenceReference']),
 'PlanTerm': obj({'id':uid,'businessId':uid,'plan':enum('FREE','MINI','PRO'),'branchLimit':version,
                 'orderingEnabled':{'type':'boolean'},'startsAt':timestamp}),
})
schemas['OrderLine']['properties']['specialInstructions']={'type':'string','maxLength':500}
schemas.update({
 'DiningTable':obj({'id':uid,'branchId':uid,'label':{**text,'maxLength':40},'active':{'type':'boolean'},'version':version,
   'visit':{'anyOf':[ref('Visit'),{'type':'null'}]}}),
 'DiningTables':obj({'branchId':uid,'items':{'type':'array','maxItems':500,'items':ref('DiningTable')}}),
 'CreateDiningTable':obj({'label':{**text,'maxLength':40}}),
 'UpdateDiningTable':obj({'expectedVersion':version,'label':{**text,'maxLength':40},'active':{'type':'boolean'}}),
 'OperationalOrder':obj({**schemas['ServiceOrder']['properties'],'tableLabel':{**text,'maxLength':40},'customerNote':note,'createdAt':timestamp,
   'subtotalAmount':money,'serviceAmount':money,'taxAmount':money,'allowedTransitions':array(ref('OrderStatus'))}),
 'ServiceQueue':obj({'branchId':uid,'items':array(ref('OperationalOrder')),'nextCursor':{'type':['string','null'],'maxLength':100}}),
 'ServiceOffer':obj({'menu':ref('PublicMenu'),'pricingFingerprint':{'type':'string','pattern':'^[0-9a-f]{64}$'},
   'pricing':obj({'taxMode':enum('NONE','ADDED','INCLUDED'),'taxRateBps':{'type':'integer','minimum':0,'maximum':10000},
     'serviceRateBps':{'type':'integer','minimum':0,'maximum':10000},'taxOnService':{'type':'boolean'}})}),
 'StaffVisitOrder':obj({**schemas['VisitOrder']['properties'],'pricingFingerprint':{'type':'string','pattern':'^[0-9a-f]{64}$'}},
   ['visitId','menuPublicationId','items','pricingFingerprint'])
})
schemas.update({
 'TableGuestLink':obj({'tableId':uid,'branchId':uid,'version':version,'tableToken':{'type':'string','pattern':'^[A-Za-z0-9_-]{43}$'},'active':{'type':'boolean'}}),
 'VisitInvitation':obj({'visitId':uid,'tableId':uid,'branchId':uid,'version':version,'pairingToken':{'type':'string','pattern':'^[A-Za-z0-9_-]{43}$'},'expiresAt':timestamp,'active':{'type':'boolean'}}),
 'GuestAssociation':obj({'visitId':uid,'tableId':uid,'visitStatus':enum('OPEN','ENDED'),'canSubmitOrders':{'type':'boolean'}}),
 'GuestContext':obj({'session':ref('DiningSession'),'association':{'anyOf':[ref('GuestAssociation'),{'type':'null'}]},'csrfToken':{'type':'string','pattern':'^[A-Za-z0-9_-]{43}$'}}),
 'GuestOrder':obj({k:v for k,v in schemas['OperationalOrder']['properties'].items() if k!='allowedTransitions'}),
 'GuestOrderList':obj({'items':array(ref('GuestOrder')),'nextCursor':{'type':['string','null'],'maxLength':100}}),
 'GuestRevocation':obj({'revoked':{'type':'boolean','const':True}})
})
schemas['CreateDiningSession']['properties']['tableToken']={'type':'string','pattern':'^[A-Za-z0-9_-]{43}$'}
schemas['CreateDiningSession']['properties']['sessionNonce']={'type':'string','pattern':'^[A-Za-z0-9_-]{43}$','description':'Fresh client-generated cryptographic 32-byte secret. Retain with this command for exact retry; never use a UUID, URL or business identity. Request bodies must be redacted in logs.'}
schemas['CreateDiningSession']['required']=['tableToken','sessionNonce']
schemas.update({
 'PayerGrantState':obj({'id':uid,'version':version,'expiresAt':timestamp,'active':{'type':'boolean'}}),
 'PayerCandidates':obj({'billId':uid,'items':{'type':'array','maxItems':100,'items':obj({'guestSessionId':uid,'deviceCode':{'type':'string','pattern':'^[0-9A-F]{8}$'},'expiresAt':timestamp,'grant':{'anyOf':[ref('PayerGrantState'),{'type':'null'}]}})}}),
 'IssueBillGrant':obj({'guestSessionId':uid,'expectedBillVersion':version}),
 'BillGrant':obj({'id':uid,'version':version,'billId':uid,'guestSessionId':uid,'expiresAt':timestamp,'active':{'type':'boolean'},'accessToken':{'type':'string','pattern':'^[A-Za-z0-9_-]{43}$'}}),
 'RedeemBillGrant':obj({'accessToken':{'type':'string','pattern':'^[A-Za-z0-9_-]{43}$'}}),
 'PayerBinding':obj({'billId':uid,'expiresAt':timestamp}),
 'PayerRevocation':obj({'revoked':{'type':'boolean','const':True}}),
 'PayerAccount':obj({'id':uid,'provider':text,'holderName':text,'accountIdentifier':{'type':'string','minLength':1,'maxLength':160},'destinationFingerprint':{'type':'string','pattern':'^[0-9a-f]{64}$'}}),
 'PayerClaim':obj({'claim':ref('BillPaymentClaim'),'providerReference':{'type':'string','minLength':1,'maxLength':120},'accountLabel':{'type':'string','maxLength':300},'submittedAt':timestamp,'reviewedAt':{'type':['string','null'],'format':'date-time'},'verifiedReceivedAmount':{'anyOf':[money,{'type':'null'}]}}),
 'PayerClaimList':obj({'items':array(ref('PayerClaim')),'nextCursor':{'type':['string','null'],'maxLength':100}}),
 'PayerLine':obj({k:v for k,v in schemas['OrderLine']['properties'].items() if k!='specialInstructions'},[k for k in schemas['OrderLine']['required'] if k!='specialInstructions']),
 'PayerCharge':obj({'id':uid,'status':ref('OrderStatus'),'totalAmount':money,'creditedAmount':money,'netChargeAmount':money,'items':array(ref('PayerLine'))}),
 'PayerDetail':obj({'bill':ref('Bill'),'tableLabel':{'type':'string','maxLength':40},'visitStatus':enum('OPEN','ENDED'),'openedAt':timestamp,'expiresAt':timestamp,'orders':{'type':'array','maxItems':500,'items':ref('PayerCharge')},'accounts':array(ref('PayerAccount')),'claims':ref('PayerClaimList')})
})
schemas['CreateBillClaim']=obj({'accountId':uid,'providerReference':{'type':'string','minLength':1,'maxLength':120},'reportedAmount':ref('PositiveMoney'),'destinationFingerprint':{'type':'string','pattern':'^[0-9a-f]{64}$'},'transferSent':{'type':'boolean','const':True}})
business_types=json.loads((ROOT/'MenuMini_1/src/lib/onboarding/business-types.json').read_text())
theme_ids=['mini-minimal-slate','mini-warm-habesha','mini-bole-bistro','mini-fresh-organic','mini-street-burger','mini-artisan-roastery']
optional_name={'type':'string','maxLength':160}
hours=obj({'day':{'type':'integer','minimum':0,'maximum':6},'status':enum('UNSPECIFIED','CLOSED','OPEN'),
 'opens':{'type':'string','pattern':'^([01][0-9]|2[0-3]):[0-5][0-9]$'},
 'closes':{'type':'string','pattern':'^([01][0-9]|2[0-3]):[0-5][0-9]$'},'overnight':{'type':'boolean'}},['day','status'])
hours['allOf']=[{'if':{'properties':{'status':{'const':'OPEN'}}},
 'then':{'required':['opens','closes','overnight']},
 'else':{'not':{'anyOf':[{'required':[key]} for key in ['opens','closes','overnight']]}}}]
schemas.update({
 'SetupHours':hours,
 'SetupBranch':obj({'publicName':text,'name':text,'city':text,'area':optional_name,'landmark':{**text,'maxLength':300},
   'publicPhone':{'type':'string','maxLength':32,'description':'Optional public customer contact; never copied from private registration contacts.'},
   'serviceMode':enum('MENU_ONLY','DINE_IN','COUNTER'),'currency':{'type':'string','const':'ETB'},
   'timezone':{'type':'string','const':'Africa/Addis_Ababa'},
   'hours':{'type':'array','items':ref('SetupHours'),'minItems':7,'maxItems':7,'description':'Each day 0 (Monday) through 6 occurs exactly once; checked by the server.'}},
   ['publicName','name','city','landmark','serviceMode','currency','timezone','hours']),
 'SetupItem':obj({'id':uid,'name':text,'nameAm':optional_name,'description':{'type':'string','maxLength':500},
   'price':{'type':'string','pattern':'^(0|[1-9][0-9]{0,7})\\.[0-9]{2}$'},'available':{'type':'boolean'}},['id','name','price','available']),
 'SetupSection':obj({'id':uid,'name':{**text,'maxLength':120},'nameAm':{'type':'string','maxLength':120},
   'items':{'type':'array','items':ref('SetupItem'),'maxItems':50}},['id','name','items']),
 'SetupMenu':obj({'themeId':enum(*theme_ids),'sections':{'type':'array','items':ref('SetupSection'),'minItems':1,'maxItems':30,
   'description':'At most 200 items across all sections; IDs are unique across the draft.'}}),
 'SetupDraft':obj({'format':{'type':'string','const':'menumini-setup-draft'},'version':{'type':'integer','const':1},
   'businessTypeId':enum(*[t['id'] for t in business_types]),'branch':ref('SetupBranch'),
   'planPreference':enum('FREE','MINI','PRO'),'menu':ref('SetupMenu')}),
 'SetupCheck':obj({'valid':{'type':'boolean','const':True},'mode':{'type':'string','const':'DRAFT_ONLY'},
   'nextStep':{'type':'string','const':'VERIFY_BEFORE_LAUNCH'},
   'summary':obj({'sectionCount':{'type':'integer','minimum':1,'maximum':30},'itemCount':{'type':'integer','minimum':0,'maximum':200},
     'availableItemCount':{'type':'integer','minimum':0,'maximum':200}}),
   'blockers':array(enum('PHONE_VERIFICATION','BUSINESS_AUTHORIZATION','MENU_PUBLICATION','SUBSCRIPTION_ACTIVATION',
     'ORDERING_SETUP','MENU_ITEMS','AVAILABLE_ITEMS'))})
})
schemas.update({
 'BranchProfileInput':obj({'businessTypeId':enum(*[t['id'] for t in business_types]),'branch':ref('SetupBranch')}),
 'SaveBranchProfile':obj({'expectedVersion':{'type':'integer','minimum':0},'content':ref('BranchProfileInput')}),
 'BranchProfile':obj({'venueId':uid,'version':version,'content':ref('BranchProfileInput')})
})
responsibility=enum('UNASSIGNED','OWNER','STAFF')
schemas.update({
 'ServicePreparation':obj({'tableLabels':{'type':'array','maxItems':100,'uniqueItems':True,
   'items':{'type':'string','minLength':1,'maxLength':40},'description':'Unique after trimmed case-insensitive comparison; planned labels create no tables.'},
   'staffing':obj({'orders':responsibility,'preparation':responsibility,'payments':responsibility}),
   'paymentMethods':{'type':'array','maxItems':2,'uniqueItems':True,'items':enum('CASH','BANK_TRANSFER')},
   'pricing':enum('UNCONFIRMED','NO_ADDED_CHARGES','REVIEW_REQUIRED')}),
 'SaveServiceDraft':obj({'expectedVersion':{'type':'integer','minimum':0},'content':ref('ServicePreparation')}),
 'ServiceDraft':obj({'venueId':uid,'version':version,'content':ref('ServicePreparation')}),
 'WorkspacePreparation':obj({'format':{'type':'string','const':'menumini-workspace-draft'},'version':{'type':'integer','const':1},
   'planPreference':enum('FREE','MINI','PRO'),'profile':ref('BranchProfileInput'),'menu':ref('MenuDraftInput'),'service':ref('ServicePreparation')}),
 'WorkspaceCheck':obj({'valid':{'type':'boolean','const':True},'mode':{'type':'string','const':'PREPARATION_ONLY'},
   'summary':obj({'sectionCount':{'type':'integer','minimum':1,'maximum':40},'itemCount':{'type':'integer','minimum':0,'maximum':1000},
     'availableItemCount':{'type':'integer','minimum':0,'maximum':1000},'optionGroupCount':{'type':'integer','minimum':0,'maximum':10000},
     'plannedTableCount':{'type':'integer','minimum':0,'maximum':100}}),'blockers':array(text)}),
 'BranchReadiness':obj({'venueId':uid,'mode':{'type':'string','const':'PREPARATION_ONLY'},'serviceDraftVersion':{'type':'integer','minimum':0},
   'facts':obj({**{k:{'type':'boolean'} for k in ['branchActive','menuPublished','subscriptionOrderingActive','branchOrderingEnabled',
     'orderStaffAvailable','preparationStaffAvailable','paymentStaffAvailable','verifiedReceivingAccount']},
     **{k:{'type':'integer','minimum':0} for k in ['availableItemCount','activeTableCount']}}),'blockers':array(text)})
})
schemas['PublishMenu']['properties']['profileVersion']=version
schemas['PublishMenu']['required'].append('profileVersion')
schemas['PublicMenu']['properties']['branch']=ref('SetupBranch')
schemas['PublicMenu']['required'].append('branch')
for name in ('ModifierDraft','ChoiceDraft'): schemas[name]['properties']['label']['minLength']=1
schemas['MenuDraftInput']['description']='Validated persistent catalog content. At most 1000 total items and a 1 MB JSON body; IDs are unique across sections/items/options. Draft edits do not alter a publication. These are technical payload limits, not commercial plan allowances.'
schemas.update({
 'EmptyCommand':obj({}),
 'RegistrationContact':obj({'name':{**text,'maxLength':120},'phone':{'type':'string','minLength':1,'maxLength':32},
   'email':{'type':'string','maxLength':254,'description':'Optional; empty or omitted is allowed. Non-empty addresses are validated by the server.'}},['name','phone']),
 'RegistrationInput':obj({'businessName':text,'businessTypeId':enum(*[t['id'] for t in business_types]),
   'owner':ref('RegistrationContact'),'ownerIsManager':{'type':'boolean'},'manager':ref('RegistrationContact'),
   'registrantRole':enum('OWNER','MANAGER'),'authorityConfirmed':{'type':'boolean','const':True}},
   ['businessName','businessTypeId','owner','ownerIsManager','registrantRole','authorityConfirmed']),
 'RegistrationCheck':obj({'valid':{'type':'boolean','const':True},'nextStep':{'type':'string','const':'VERIFY_REGISTRANT_PHONE'},
   'businessTypeId':enum(*[t['id'] for t in business_types]),'registrationPath':enum('OWNER','MANAGER'),
   'ownerIsManager':{'type':'boolean'},'requiredVerifications':array(enum('REGISTRANT_PHONE','OWNER_PHONE','OWNER_APPROVAL','MANAGER_INVITATION_ACCEPTANCE'))}),
 'MiniBranchQuoteInput':obj({'currentRecurringAmount':ref('PositiveMoney'),'newRecurringAmount':ref('PositiveMoney'),
   'amountDueNow':money,'billingInterval':enum('MONTH','YEAR'),'termStartsAt':timestamp,'termEndsAt':timestamp,'expiresAt':timestamp}),
 'MiniBranchQuote':obj({'id':uid,'requestId':uid,'businessId':uid,'plan':{'type':'string','const':'MINI'},
   'branchLimit':{'type':'integer','const':2},'status':enum('QUOTED','ACCEPTED','ACTIVATED','EXPIRED'),
   'currency':{'type':'string','const':'ETB'},'currentRecurringAmount':ref('PositiveMoney'),
   'newRecurringAmount':ref('PositiveMoney'),'amountDueNow':money,'billingInterval':enum('MONTH','YEAR'),
   'termStartsAt':timestamp,'termEndsAt':timestamp,'expiresAt':timestamp}),
 'AcceptMiniQuote':obj({'accept':{'type':'boolean','const':True}}),
 'ActivateMiniQuote':obj({'billingEvidenceReference':text})
})
schemas['RegistrationInput']['allOf']=[{'if':{'properties':{'ownerIsManager':{'const':True}}},
 'then':{'not':{'required':['manager']},'properties':{'registrantRole':{'const':'OWNER'}}},'else':{'required':['manager']}}]
schemas['RegistrationCheck']['properties']['requiredVerifications']['minItems']=1
schemas['RegistrationCheck']['properties']['requiredVerifications']['uniqueItems']=True
for name in ['Principal','PlanTerm']:
 schemas[name]['allOf']=[{'if':{'properties':{'plan':{'const':'MINI'}}},'then':{'properties':{'branchLimit':{'maximum':2}}}},
   {'if':{'properties':{'plan':{'const':'FREE'}}},'then':{'properties':{'branchLimit':{'const':1}}}}]
schemas['VisitOrder']['properties']['items']['minItems'] = 1
schemas['VisitOrder']['properties']['items']['maxItems'] = 100
schemas['OrderSelection']['properties']['choiceIds']['uniqueItems'] = True
schemas['PublicMenu']['properties']['availabilityRevision'] = version
schemas['PublicMenu']['required'].append('availabilityRevision')
schemas['RecordReceipt']['properties']['fundsConfirmed']={'type':'boolean','const':True}
schemas['RecordReceipt']['required'].append('fundsConfirmed')
schemas['ReviewBillClaim']['properties']['fundsConfirmed']={'type':'boolean','const':True}
schemas['ExecuteRefund']['properties']['executionConfirmed']={'type':'boolean','const':True}
schemas['ExecuteRefund']['required'].append('executionConfirmed')
schemas['CashierBillSummary']=obj({'bill':ref('Bill'),'tableLabel':text,'visitStatus':enum('OPEN','ENDED'),'openedAt':timestamp})
schemas['CashierBillList']=obj({'branchId':uid,'items':{'type':'array','maxItems':100,'items':ref('CashierBillSummary')},'nextCursor':{'type':['string','null'],'maxLength':100}})
schemas['CashierOrder']=obj({'id':uid,'status':enum('SUBMITTED','ACCEPTED','PREPARING','READY','COMPLETED','CANCELLED'),'totalAmount':money,'remainingChargeAmount':money,'items':{'type':'array','maxItems':100,'items':ref('OrderLine')}})
schemas['CashierReceipt']=obj({'receipt':ref('Receipt'),'recordedAt':timestamp,'verificationNote':text,'providerReference':{'type':['string','null'],'maxLength':120},'accountLabel':{'type':['string','null'],'maxLength':250},'reservedAmount':money})
schemas['CashierClaim']=obj({'claim':ref('BillPaymentClaim'),'providerReference':{'type':'string','maxLength':120},'accountLabel':{'type':'string','maxLength':250}})
schemas['CashierRefund']=obj({'refund':ref('RefundRequest'),'reason':text,'executionReference':{'type':['string','null'],'maxLength':120}})
schemas['CashierAccount']=obj({'id':uid,'label':{'type':'string','maxLength':250}})
schemas['CashierCredit']=obj({'id':uid,'orderId':uid,'amount':ref('PositiveMoney'),'reason':text,'recordedAt':timestamp})
schemas['CashierDetail']=obj({'summary':ref('CashierBillSummary'),'credits':{'type':'array','maxItems':500,'items':ref('CashierCredit')},'orders':{'type':'array','maxItems':500,'items':ref('CashierOrder')},'receipts':{'type':'array','maxItems':500,'items':ref('CashierReceipt')},'claims':{'type':'array','maxItems':500,'items':ref('CashierClaim')},'refunds':{'type':'array','maxItems':500,'items':ref('CashierRefund')},'accounts':{'type':'array','maxItems':100,'items':ref('CashierAccount')},'permissions':obj({'manage':{'type':'boolean'},'adjust':{'type':'boolean'},'refund':{'type':'boolean'}})})
schemas['ReviewBillClaim']['allOf'] = [{
 'if': {'properties': {'decision': {'const':'APPROVE'}}},
 'then': {'required':['verifiedAmount','allocationAmount','fundsConfirmed']},
 'else': {'not':{'anyOf':[{'required':['verifiedAmount']},{'required':['allocationAmount']},{'required':['fundsConfirmed']}]}}
}]
schemas['RecordReceipt']['allOf'] = [{
 'if': {'properties': {'method': {'const':'CASH'}}},
 'then': {'required':['tenderedAmount','changeAmount'], 'not':{'anyOf':[{'required':['accountId']},{'required':['providerReference']}]}},
 'else': {'required':['accountId','providerReference'], 'not':{'anyOf':[{'required':['tenderedAmount']},{'required':['changeAmount']}]}}
}]
schemas['PlanRequest']['allOf'] = [{
 'if': {'properties': {'requestedPlan': {'const':'PRO'}}},
 'then': {'required':['requestedBranchLimit'],'properties':{'requestedBranchLimit':{'minimum':2,'maximum':1000}}},
 'else': {'if':{'properties':{'requestedPlan':{'const':'FREE'}}},
          'then':{'properties':{'requestedBranchLimit':{'const':1}}},
          'else':{'properties':{'requestedBranchLimit':{'maximum':2}}}}
}]
schemas['ApplyPlan']['properties']['branchLimit']={**version,'maximum':1000}
schemas['ApplyPlan']['allOf'] = [{
 'if': {'properties': {'plan': {'enum':['FREE','MINI']}}},
 'then': {'properties': {'branchLimit': {'const':1}}},
 'else': {'properties': {'branchLimit': {'minimum':2}}}
}, {'if': {'properties': {'plan': {'const':'FREE'}}},
    'then': {'properties': {'orderingEnabled': {'const':False}}},
    'else': {'required':['endsAt']}}]

spec = {'openapi':'3.1.0','info':{'title':'MenuMini workflow v2 contract','version':'0.11.0',
 'description':'73 operations: four functional public validation/menu operations, seventeen guest/payer capability operations requiring an explicitly configured limited connection, and 40 private merchant boundaries locked until verified identity exists; 12 operations remain target contracts. Server adapters and database commands have isolated fictional evidence, not real authenticated HTTP acceptance. OTP is deferred. Unverified preparation and the fictional browser rehearsal never create a business, activate a plan or publish a menu. MenuMini has a maximum of two active branches; branch two requires quoted owner price consent and verified SaaS billing. Visit/bill settlement replaces order-linked v1 settlement. Restaurant receipts and SaaS subscription billing are separate. Protected and current public-menu responses are no-store. Server-derived identity, totals, permissions and capabilities are never taken from client assertions.'},
 'servers':[{'url':'http://localhost:5174/api/v2','description':'Intended local implementation only'}],
 'paths':{},'components':{'schemas':schemas,'parameters':deepcopy(old['components']['parameters']),
 'responses':deepcopy(old['components']['responses']), 'securitySchemes':deepcopy(old['components']['securitySchemes'])}}
spec['components']['securitySchemes']['diningSession']={'type':'apiKey','in':'cookie','name':'__Host-menu_dining','description':'Opaque 256-bit HttpOnly host-only session cookie, Secure and SameSite Strict. Local HTTP fixture uses menu_dining. No UUID/header identity override.'}
spec['components']['securitySchemes']['billAccess']={'type':'apiKey','in':'cookie','name':'__Host-menu_bill_access',
 'description':'Hashed scoped payer capability; issued by authorized staff, HttpOnly and Secure in production. A table QR does not grant this access.'}
spec['components']['securitySchemes']['platformSession']={'type':'apiKey','in':'cookie','name':'menu_platform_session',
 'description':'Separately authenticated active platform operator; cannot be inferred from restaurant owner membership.'}

def operation(path, method, name, request, response, summary, permission, security='staffSession', status='200', detail=''):
    params=[{'name':part,'in':'path','required':True,'schema':uid if part.endswith('Id') or part=='requestKey' else text}
            for part in __import__('re').findall(r'{(\w+)}',path)]
    if method not in ['get','delete']: params.append({'$ref':'#/components/parameters/IdempotencyKey'})
    responses={status:{'description':'Committed result or authorized projection',
                         'content':{'application/json':{'schema':ref(response),'example':fixtures.operation_response(name,response,example_values)}}}}
    responses.update({code:{'$ref':'#/components/responses/'+code} for code in ['400','401','403','404','409','422','429','503']})
    if method not in ['get','delete']: responses['200']=deepcopy(responses[status])
    security_requirement={} if security is None else {security:[]}
    if security=='billAccess': security_requirement['diningSession']=[]
    if security is not None and method not in ['get','delete']: security_requirement['csrfToken']=[]
    op={'operationId':name,'summary':summary,'description':detail or summary,'parameters':params,
        'security':[] if security is None else [security_requirement], 'responses':responses,
        'x-permission':permission, 'x-implementation':'target HTTP contract; database coverage reported separately'}
    if request: op['requestBody']={'required':True,'content':{'application/json':{'schema':ref(request),'example':example_values[request]}}}
    spec['paths'].setdefault(path,{})[method]=op

operation('/public/venues/{venueSlug}/menu','get','getPublishedMenu',None,'PublicMenu','Read published menu with live availability','public',None)
operation('/dining-sessions','post','createDiningSession','CreateDiningSession','GuestContext','Establish own guest session; table QR alone does not associate a visit','public',None,'201')
operation('/merchant/context','get','getMerchantContext',None,'Principal','Read authenticated business capabilities and permissions','membership.active')
operation('/merchant/branches','post','createBranch','CreateBranch','Branch','Create branch within current capacity','business.owner',status='201')
operation('/merchant/branches/{branchId}/staff','put','assignBranchStaff','AssignStaff','StaffAssignment','Assign scoped staff role','business.owner')
operation('/merchant/branches/{branchId}/menu-draft','put','saveMenuDraft','SaveMenuDraft','MenuDraft','Save validated menu draft','catalog.edit')
operation('/merchant/branches/{branchId}/menu-draft','get','getMenuDraft',None,'MenuDraft','Read authorized persistent menu draft','catalog.edit')
operation('/merchant/branches/{branchId}/profile-draft','get','getBranchProfile',None,'BranchProfile','Read authorized public branch-profile draft','catalog.edit')
operation('/merchant/branches/{branchId}/profile-draft','put','saveBranchProfile','SaveBranchProfile','BranchProfile','Owner saves public branch details without publishing them','business.owner')
operation('/merchant/branches/{branchId}/menu-publications','post','publishMenu','PublishMenu','PublicMenu','Publish menu version','catalog.publish',status='201')
operation('/merchant/branches/{branchId}/service-draft','get','getServiceDraft',None,'ServiceDraft','Read private service preparation','orders.manage and payments.record')
operation('/merchant/branches/{branchId}/service-draft','put','saveServiceDraft','SaveServiceDraft','ServiceDraft','Save service preparation without activating ordering','orders.manage and payments.record')
operation('/merchant/branches/{branchId}/readiness','get','getBranchReadiness',None,'BranchReadiness','Read aggregate service readiness without granting launch authority','orders.manage and payments.record')
for path,method in [('/merchant/branches/{branchId}/menu-draft','get'),('/merchant/branches/{branchId}/menu-draft','put'),
 ('/merchant/branches/{branchId}/profile-draft','get'),('/merchant/branches/{branchId}/profile-draft','put'),
 ('/merchant/branches/{branchId}/menu-publications','post')]:
 spec['paths'][path][method]['x-implementation']='database and server command adapter implemented; HTTP access fails closed while trusted identity is deferred'
 spec['paths'][path][method]['description']+=' Requires trusted identity, business/branch permissions and exact versions. HTTP editing is locked until the identity adapter exists; caller headers/UUIDs are not accepted as identity. Database commands have exact-body idempotency and atomic audit/outbox records.'
for path,method in [('/merchant/branches/{branchId}/service-draft','get'),('/merchant/branches/{branchId}/service-draft','put'),('/merchant/branches/{branchId}/readiness','get')]:
 spec['paths'][path][method]['x-implementation']='private command/projection adapter; access fails closed while trusted identity is deferred'
 spec['paths'][path][method]['description']+=' Prepared staffing, tables and payment methods do not create grants, tables, receiving accounts or plan entitlement. No ordering activation occurs. Readiness is PREPARATION_ONLY until connected transaction and field acceptance gates are complete.'
spec['paths']['/public/venues/{venueSlug}/menu']['get']['x-implementation']='implemented safe public PostgreSQL projection; explicitly configured limited database connection required'
operation('/merchant/branches/{branchId}/items/{itemId}/availability','put','setAvailability','AvailabilityCommand','Availability','Change availability without publishing draft prices','catalog.edit')
operation('/merchant/branches/{branchId}/visits','post','openVisit','OpenVisit','OpenedVisit','Open seating and combined bill; privately return pairing capability','visits.manage',status='201')
operation('/merchant/visits/{visitId}/ending','post','endVisit','VersionCommand','Visit','End seating while retaining financial obligations','visits.manage')
operation('/guest/visits/{visitId}/association','post','pairGuestVisit','PairVisit','PairedContext','Join confirmed visit with private pairing token','guest.own-session','diningSession')
operation('/guest/orders','post','submitGuestOrder','VisitOrder','GuestOrder','Submit server-priced guest order','guest.paired-visit','diningSession','201')
operation('/merchant/branches/{branchId}/tables','get','listDiningTables',None,'DiningTables','Read tables and current staff-visible visits without QR secrets','visits.manage')
operation('/merchant/branches/{branchId}/tables','post','createDiningTable','CreateDiningTable','DiningTable','Owner creates a table without issuing public QR access','business.owner',status='201')
operation('/merchant/branches/{branchId}/tables/{tableId}','put','updateDiningTable','UpdateDiningTable','DiningTable','Owner updates an idle table with version checks','business.owner')
operation('/merchant/branches/{branchId}/staff-visits','post','openStaffVisit','OpenVisit','Visit','Open staff-only visit and combined bill; no guest token is issued','visits.manage',status='201')
operation('/merchant/visits/{visitId}','get','getStaffVisit',None,'Visit','Read scoped staff visit without guest association secrets','visits.manage')
operation('/merchant/branches/{branchId}/service-menu','get','getServiceOffer',None,'ServiceOffer','Read committed menu and reviewed price policy for staff order entry','orders.submit')
operation('/merchant/branches/{branchId}/orders','post','submitStaffOrder','StaffVisitOrder','OperationalOrder','Submit server-priced staff order with publication and pricing fingerprint','orders.submit',status='201')
operation('/merchant/branches/{branchId}/orders','get','getServiceQueue',None,'ServiceQueue','Page durable active work; preparation staff see accepted preparation work only','orders.manage-or-prepare')
for parameter in [{'name':'limit','in':'query','schema':{'type':'integer','minimum':1,'maximum':100,'default':50}},
 {'name':'cursor','in':'query','schema':{'type':'string','maxLength':100},'description':'Previous nextCursor. Refresh from the first page for changing queue state.'}]:
 spec['paths']['/merchant/branches/{branchId}/orders']['get']['parameters'].append(parameter)
operation('/merchant/orders/{orderId}','get','getMerchantOrder',None,'OperationalOrder','Read permitted order details and allowed service transitions','orders.manage-or-prepare')
operation('/guest/orders/{orderId}','get','getGuestOrder',None,'GuestOrder','Read only this guest session order','guest.own-order','diningSession')
operation('/merchant/tables/{tableId}/guest-link','post','issueTableGuestLink','VersionCommand','TableGuestLink','Owner issues or rotates a table link; no visit or private data access','business.owner')
operation('/merchant/visits/{visitId}/invitations','post','issueVisitInvitation','VersionCommand','VisitInvitation','Staff issues or rotates a five-minute private visit invitation','visits.manage')
operation('/guest/session','get','getGuestContext',None,'GuestContext','Read own anonymous session and current association','guest.own-session','diningSession')
operation('/guest/menu','get','getGuestOffer',None,'ServiceOffer','Read published menu and reviewed pricing for this table session','guest.own-session','diningSession')
operation('/guest/orders','get','listGuestOrders',None,'GuestOrderList','Page only this guest session orders','guest.own-session','diningSession')
for parameter in [{'name':'limit','in':'query','schema':{'type':'integer','minimum':1,'maximum':100,'default':50}}, {'name':'cursor','in':'query','schema':{'type':'string','maxLength':100}}]:
 spec['paths']['/guest/orders']['get']['parameters'].append(parameter)
operation('/guest/session/revocation','post','revokeGuestSession','EmptyCommand','GuestRevocation','Explicitly leave and revoke own session; prior order access is lost','guest.own-session','diningSession')
for path in ['/dining-sessions','/guest/session','/guest/menu','/guest/orders','/guest/orders/{orderId}','/guest/visits/{visitId}/association','/guest/session/revocation']:
 for method,op in spec['paths'][path].items():
  op['x-implementation']='cookie capability adapter implemented; explicit limited guest connection required; fictional isolated acceptance only'
  op['description']+=' Cookie capability is verified server-side on every request. UUIDs and client identity headers grant no access. Mutations require exact Origin and bounded JSON; authenticated mutations also require session-bound CSRF. Table access never grants a visit or payer access. No private token appears in URLs or server logs. Session creation never silently replaces an existing session.'
for path in ['/merchant/tables/{tableId}/guest-link','/merchant/visits/{visitId}/invitations']:
 spec['paths'][path]['post']['x-implementation']='private issuance adapter implemented; HTTP fails closed while verified merchant identity is deferred'
 spec['paths'][path]['post']['description']+=' Requires current version, permission and explicitly configured server capability key. SQL stores hashes only. Exact retries reconstruct the same token; rotated/expired issuances report active false.'
operation('/merchant/orders/{orderId}/transitions','post','transitionOrder','OrderTransition','OperationalOrder','Advance order with permitted status transition; original response retained for retry','orders.manage-or-prepare')
operation('/merchant/branches/{branchId}/bills','get','getCashierBills',None,'CashierBillList','List unresolved bills including ended visits, or closed history','payments.record')
operation('/merchant/bills/{billId}/settlement','get','getCashierDetail',None,'CashierDetail','Read private charges, receipts, claims and refund obligations','payments.record')
operation('/merchant/bills/{billId}','get','getBill',None,'Bill','Read bill and truthful balances','bills.view')
operation('/merchant/bills/{billId}/finalizations','post','finalizeBill','VersionCommand','Bill','Freeze bill after submitted requests are resolved','bills.manage')
operation('/merchant/bills/{billId}/credits','post','creditBill','BillCredit','Bill','Record credit and linked allocation reversals','bills.adjust')
operation('/merchant/bills/{billId}/closures','post','closeBill','VersionCommand','Bill','Close reconciled bill; pending refunds/unapplied amounts block closure','bills.manage')
operation('/merchant/bills/{billId}/access-grants','post','issueBillGrant','IssueBillGrant','BillGrant','Issue scoped payer capability for linked guest','payments.record',status='201')
operation('/payer/bill','get','getPayerBill',None,'PayerDetail','Read only bill authorized by payer capability','bill-grant.read','billAccess')
operation('/payer/bill/payment-claims','post','submitBillClaim','CreateBillClaim','PayerClaim','Submit evidence without asserting payment','bill-grant.pay','billAccess','201')
operation('/merchant/bills/{billId}/payers','get','listPayerCandidates',None,'PayerCandidates','List joined active guest device codes for explicit payer authorization','payments.record')
operation('/merchant/bill-access-grants/{grantId}/revocation','post','revokeBillGrant','VersionCommand','PayerGrantState','Staff revokes a scoped payer grant without changing bill amounts','payments.record')
operation('/payer/access','post','redeemBillGrant','RedeemBillGrant','PayerBinding','Redeem a private bill code into a cookie bound to own dining session','guest.own-session','diningSession')
operation('/payer/access/revocation','post','leavePayerAccess','EmptyCommand','PayerRevocation','Revoke own bill access while retaining own-order session','bill-grant.leave','billAccess')
operation('/payer/bill/payment-claims','get','listPayerClaims',None,'PayerClaimList','Page only this payer transfer reports without other payers references','bill-grant.read','billAccess')
for parameter in [{'name':'limit','in':'query','schema':{'type':'integer','minimum':1,'maximum':100,'default':50}},{'name':'cursor','in':'query','schema':{'type':'string','maxLength':100}}]:
 spec['paths']['/payer/bill/payment-claims']['get']['parameters'].append(parameter)
for path in ['/merchant/bills/{billId}/access-grants','/merchant/bills/{billId}/payers','/merchant/bill-access-grants/{grantId}/revocation']:
 for op in spec['paths'][path].values():
  op['x-implementation']='private payer authorization adapter; merchant HTTP stays closed while verified identity is deferred'
  op['description']+=' Requires payments.record for this business/branch. Device codes identify a server-listed session and grant no access. Issuance checks bill version, binds a joined active session, rotates previous grants and returns active status on stable issuance replay. No plaintext token is stored in SQL results/events.'
for path in ['/payer/access','/payer/access/revocation','/payer/bill','/payer/bill/payment-claims']:
 for op in spec['paths'][path].values():
  op['x-implementation']='limited guest connection resolves actual guest/payer cookie capabilities; isolated fictional acceptance only'
  op['description']+=' Same guest and bill binding, expiry, revocation and CSRF are checked server-side. No caller UUID/header is identity. Shared details exclude other diners notes and payment references. A transfer report records no received or allocated funds. Destination changes and duplicate pending/recorded references require cashier review. No bank transfer is initiated.'
operation('/merchant/payment-claims/{claimId}/reviews','post','reviewBillClaim','ReviewBillClaim','BillPaymentClaim','Verify funds, record receipt, explicitly allocate or reject','payments.record')
operation('/merchant/bills/{billId}/receipts','post','recordReceipt','RecordReceipt','Receipt','Record actual received amount once','payments.record',status='201')
operation('/merchant/receipts/{receiptId}/allocations','post','allocateReceipt','AllocateReceipt','Allocation','Allocate receipt to its original visit bill without double counting funds','payments.record',status='201')
operation('/merchant/receipts/{receiptId}/refund-requests','post','requestRefund','RequestRefund','RefundRequest','Reserve unapplied funds for refund review','payments.record',status='201')
operation('/merchant/refund-requests/{refundId}/reviews','post','reviewRefund','ReviewRefund','RefundRequest','Approve or reject refund obligation','payments.refund')
operation('/merchant/refund-requests/{refundId}/executions','post','executeRefund','ExecuteRefund','RefundRequest','Record actual executed refund; does not initiate fund transfer','payments.refund')
operation('/merchant/plan-change-requests','post','requestPlanChange','PlanRequest','PlanChangeRequest','Request software plan change without activating it','business.owner',status='201')
operation('/platform/businesses/{businessId}/plan-terms','post','applyPlanTerm','ApplyPlan','PlanTerm','Apply verified SaaS entitlement term within branch capacity','platform.billing','platformSession','201')
spec['paths']['/platform/businesses/{businessId}/plan-terms']['post']['description']='Generic activation supports a one-branch Mini term. A two-branch Mini term must use the accepted-quote activation endpoint; this route cannot bypass owner price consent.'
operation('/merchant/mini-second-branch-requests','post','requestMiniSecondBranch','EmptyCommand','PlanChangeRequest','Request a price increase for a second branch while staying on MenuMini','business.owner',status='201')
operation('/platform/mini-second-branch-requests/{requestId}/quotes','post','quoteMiniSecondBranch','MiniBranchQuoteInput','MiniBranchQuote','Quote all-inclusive recurring prices and immediate amount due; no capacity change','platform.billing','platformSession','201',
 'Amounts are fictional in examples, not approved pricing. Current and new totals use the same interval and include applicable fees/taxes. New recurring total must exceed current. Immediate amount may differ due to proration. Quote terms and expiry are immutable; an expired offer requires a new request. No automatic charges or external fund transfer.')
operation('/merchant/mini-branch-quotes/{quoteId}','get','getMiniBranchQuote',None,'MiniBranchQuote','Read private second-branch price offer and derived lifecycle status','business.owner')
operation('/merchant/mini-branch-quotes/{quoteId}/acceptance','post','acceptMiniBranchQuote','AcceptMiniQuote','MiniBranchQuote','Owner accepts the exact price offer without asserting payment','business.owner')
operation('/platform/mini-branch-quotes/{quoteId}/activation','post','activateMiniBranchQuote','ActivateMiniQuote','PlanTerm','Record verified subscription billing and activate two-branch Mini term','platform.billing','platformSession','201',
 'Requires an accepted, unexpired offer and verified subscription billing evidence. Applies the quote term once, keeps plan MINI, and never creates the second branch automatically. Initial manual billing only; renewal and invoice reconciliation handlers remain pending.')
operation('/onboarding/validation','post','validateBusinessRegistration','RegistrationInput','RegistrationCheck','Check registration fields and report the next verification step','public',None,detail=
 'Implemented stateless validation only. Same Origin required; no cookies, identity, SMS, persistence or invitations. Body limit 16 KB. Does not echo private contacts. Ethiopian local phone inputs are normalized for format checking; phone possession and legal-business authority remain unverified. Owner/manager contacts are private. Naming someone never creates membership. Retry is safe without an idempotency key because no state changes.')
validation=spec['paths']['/onboarding/validation']['post']
validation['parameters']=[]
validation['x-implementation']='implemented HTTP format validation; no authentication or persistence'
validation['x-idempotency']='stateless validation; no key needed'
for code in ['413','415']: validation['responses'][code]={'description':'Oversized body' if code=='413' else 'JSON content type required',
 'content':{'application/problem+json':{'schema':ref('Problem')}}}
validation['responses']['200']['headers']={'Cache-Control':{'schema':{'type':'string','const':'no-store'}}}
operation('/onboarding/setup-validation','post','validateSetupDraft','SetupDraft','SetupCheck',
 'Check a first-branch and menu preparation draft without activating access','public',None,detail=
 'Implemented stateless validation. Same Origin and application/json required; body limit 256 KB. Exactly one first-branch draft; no branch entitlement, identity, OTP, persistence, billing, invitations or publication. Does not echo the draft or private contacts. Pro is an expression of interest, not an available paid entitlement. Unspecified hours are not interpreted as open. Money is an exact two-decimal string. Retry is safe without an idempotency key.')
setup_validation=spec['paths']['/onboarding/setup-validation']['post']
setup_validation['parameters']=[]
setup_validation['x-implementation']='implemented HTTP draft validation; no authentication, persistence or publication'
setup_validation['x-idempotency']='stateless validation; no key needed'
for code in ['413','415']: setup_validation['responses'][code]={'description':'Oversized body' if code=='413' else 'JSON content type required',
 'content':{'application/problem+json':{'schema':ref('Problem')}}}
setup_validation['responses']['200']['headers']={'Cache-Control':{'schema':{'type':'string','const':'no-store'}}}
spec['paths']['/merchant/branches/{branchId}/bills']['get']['parameters'] += [
 {'in':'query','name':'limit','schema':{'type':'integer','minimum':1,'maximum':100,'default':50}},
 {'in':'query','name':'cursor','schema':{'type':'string','maxLength':100}},
 {'in':'query','name':'view','schema':{'type':'string','enum':['UNRESOLVED','CLOSED'],'default':'UNRESOLVED'}}]
for path,methods in spec['paths'].items():
 for op in methods.values():
  if op['operationId'] in ('getCashierBills','getCashierDetail','finalizeBill','closeBill','creditBill','recordReceipt','allocateReceipt','reviewBillClaim','requestRefund','reviewRefund','executeRefund'):
   op['x-implementation']='private cashier server/DB adapter; external HTTP remains closed until verified identity'
   op['description']+=' Manual settlement records evidence; it never moves money. Receipt and allocation are separate. Exact original responses survive retries. Real identity, receiving-account procedures and field acceptance remain pending.'
for methods in spec['paths'].values():
 for op in methods.values():
  if op['operationId'] in ('listDiningTables','createDiningTable','updateDiningTable','openStaffVisit','getStaffVisit','getServiceOffer',
    'submitStaffOrder','getServiceQueue','getMerchantOrder','transitionOrder','endVisit','getBill'):
   op['x-implementation']='database and server adapter; external HTTP stays closed until verified merchant sessions are connected'
   op['description']+=' Staff-assisted dine-in slice; no customer/payer token or table QR secret is returned. Commands retain exact original responses. Acceptance and serving do not record payment. A changed publication or reviewed pricing fingerprint requires confirmation. Real identity and field acceptance remain pending.'
operation('/onboarding/workspace-validation','post','validateWorkspacePreparation','WorkspacePreparation','WorkspaceCheck',
 'Check richer menu and service preparation without activation','public',None,detail=
 'Stateless same-origin JSON validation; body limit 1152 KB, menu component 1 MB, profile and service components 16 KB each. Returns counts and blockers only. No submitted content, sessions, identity, persistence, staff grants, tables, billing, receiving accounts or publication. Exact prices and modifier selection rules are enforced. Safe retry needs no idempotency key.')
workspace_validation=spec['paths']['/onboarding/workspace-validation']['post']
workspace_validation['parameters']=[]
workspace_validation['x-implementation']='implemented stateless preparation validation'
workspace_validation['x-idempotency']='stateless validation; no key needed'
for code in ['413','415']: workspace_validation['responses'][code]={'description':'Oversized body' if code=='413' else 'JSON content type required',
 'content':{'application/problem+json':{'schema':ref('Problem')}}}
workspace_validation['responses']['200']['headers']={'Cache-Control':{'schema':{'type':'string','const':'no-store'}}}

# Durable command recovery: status does not imply cancellation of a delayed request.
service_recovery_ops=['CREATE_TABLE','UPDATE_TABLE','OPEN_STAFF_VISIT','END_VISIT','SUBMIT_STAFF_ORDER','TRANSITION_ORDER']
cashier_recovery_ops=['FINALIZE_BILL','CLOSE_BILL','CREDIT_BILL','RECORD_RECEIPT','ALLOCATE_RECEIPT','REVIEW_CLAIM','REQUEST_REFUND','REVIEW_REFUND','EXECUTE_REFUND']
schemas['ServiceRecoveryDescriptor']=obj({'operation':enum(*service_recovery_ops),'resourceId':uid})
schemas['CashierRecoveryDescriptor']=obj({'operation':enum(*cashier_recovery_ops),'resourceId':uid})
schemas['RecoveryReceipt']=obj({'domain':enum('GUEST','PAYER','SERVICE','CASHIER'),'operation':enum('SUBMIT','CLAIM',*service_recovery_ops,*cashier_recovery_ops),'requestKey':uid,'resourceId':uid,'state':enum('COMMITTED','NOT_RECORDED','CANCELLED'),'resultId':{'anyOf':[uid,{'type':'null'}]},'recordedAt':{'anyOf':[timestamp,{'type':'null'}]}})
schemas['RecoveryReceipt']['allOf']=[{'if':{'properties':{'state':{'const':'COMMITTED'}}},'then':{'properties':{'resultId':uid,'recordedAt':timestamp}},'else':{'properties':{'resultId':{'type':'null'}}}}, {'if':{'properties':{'state':{'const':'NOT_RECORDED'}}},'then':{'properties':{'recordedAt':{'type':'null'}}},'else':{'properties':{'recordedAt':timestamp}}}]
for domain,operations in [('GUEST',['SUBMIT']),('PAYER',['CLAIM']),('SERVICE',service_recovery_ops),('CASHIER',cashier_recovery_ops)]:
 schemas['RecoveryReceipt']['allOf'].append({'if':{'properties':{'domain':{'const':domain}}},'then':{'properties':{'operation':enum(*operations)}}})
for prefix,path,security,descriptor in [('GuestOrder','/guest/visits/{visitId}/order-requests/{requestKey}','diningSession',None),('PayerPayment','/payer/bills/{billId}/payment-requests/{requestKey}','billAccess',None),('Service','/merchant/branches/{branchId}/service-requests/{requestKey}','staffSession','ServiceRecoveryDescriptor'),('Cashier','/merchant/branches/{branchId}/cashier-requests/{requestKey}','staffSession','CashierRecoveryDescriptor')]:
 for method,suffix,name,request in [('get','','get'+prefix+'Request',None),('post','/cancellation','cancel'+prefix+'Request',descriptor or 'EmptyCommand')]:
  operation(path+suffix,method,name,request,'RecoveryReceipt','Check original command outcome' if method=='get' else 'Cancel only an unrecorded command before replacing it','own-command.current-authority',security,detail='Original actor, business, branch and target scope are resolved and authorized. No command bodies or secrets are returned. COMMITTED identifies the original result, not current operational state. NOT_RECORDED never proves a delayed request cannot commit. Cancellation requires Idempotency-Key equal to requestKey in the path and serializes with original commands, persisting a tombstone, or returns COMMITTED if the original won. Ten new cancellations per actor/branch/minute; repeat cancellation is safe. A cancellation never reverses committed business facts. No automatic replay or fund transfer. HTTP merchant access stays closed while OTP is deferred.')
  spec['paths'][path+suffix][method]['x-implementation']='scoped recovery adapter; local fictional acceptance only; merchant identity remains closed'
  if method=='get' and descriptor:
   spec['paths'][path][method]['parameters'] += [{'in':'query','name':'operation','required':True,'schema':schemas[descriptor]['properties']['operation']},{'in':'query','name':'resourceId','required':True,'schema':uid}]

# Retain only schemas reachable from target operations/components. No obsolete
# order-linked payment shape may accidentally look like a v2 resource.
reachable=set()
def walk(value):
    if isinstance(value,dict):
        target=value.get('$ref','')
        if target.startswith('#/components/schemas/'):
            name=target.rsplit('/',1)[1]
            if name not in reachable: reachable.add(name); walk(schemas[name])
        for k,v in value.items():
            if k!='$ref': walk(v)
    elif isinstance(value,list):
        for v in value: walk(v)
walk(spec['paths']); walk(spec['components']['responses']); walk(spec['components']['parameters'])
spec['components']['schemas']={k:v for k,v in schemas.items() if k in reachable}
destination=ROOT/'postman/specs/workflow-v2.openapi.yaml'
destination.write_text(yaml.safe_dump(spec, sort_keys=False, allow_unicode=True))
print(f'Wrote {destination}: {len(spec["paths"])} paths, {len(spec["components"]["schemas"])} schemas')
