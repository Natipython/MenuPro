"""Fictional, independent contract scenarios; these are not live API responses."""
from copy import deepcopy

def uid(number): return f'00000000-0000-4000-8000-{number:012d}'
WHEN='2026-10-12T17:00:00Z'
LATER='2026-10-12T18:00:00Z'

def examples(public_menu):
    menu=deepcopy(public_menu); menu['availabilityRevision']=1
    content=menu['content']
    visit={'id':uid(501),'branchId':uid(101),'tableId':uid(201),'version':1,'status':'OPEN','billId':uid(801)}
    selection={'itemId':uid(601),'quantity':1,'choiceIds':[]}
    order={'id':uid(701),'visitId':uid(501),'branchId':uid(101),'source':'GUEST','status':'SUBMITTED',
           'version':1,'currency':'ETB','totalAmount':'70.00','items':[{'id':uid(711),'nameEn':'Macchiato',
           'quantity':1,'unitPrice':'70.00','lineTotal':'70.00','selectedOptions':[]}]}
    bill={'id':uid(801),'visitId':uid(501),'branchId':uid(101),'version':3,'status':'FINALIZED','currency':'ETB',
          'chargeAmount':'70.00','allocatedAmount':'0.00','outstandingAmount':'70.00','unappliedAmount':'0.00',
          'refundPendingAmount':'0.00','settlement':'UNPAID'}
    branch={'id':uid(101),'name':'Fictional Cafe','publicSlug':'fictional-cafe','orderingEnabled':False}
    claim={'id':uid(851),'billId':uid(801),'version':1,'status':'SUBMITTED','reportedAmount':'70.00'}
    refund={'id':uid(871),'receiptId':uid(861),'version':1,'amount':'10.00','status':'REQUESTED'}
    e={
      'PublicMenu':menu,'CreateDiningSession':{'tableToken':'FICTIONAL_TABLE_'+'T'*26+'0','sessionNonce':'FICTIONAL_NONCE_'+'N'*26+'0'},
      'DiningSession':{'id':uid(301),'venueId':uid(101),'tableId':uid(201),'tableLabel':'Table 1','expiresAt':LATER},
      'Principal':{'userId':uid(11),'businessId':uid(1),'plan':'MINI','branchLimit':1,'permissions':['visits.manage','payments.record']},
      'CreateBranch':{'name':'Fictional Cafe','publicSlug':'fictional-cafe'},'Branch':branch,
      'AssignStaff':{'userId':uid(21),'role':'WAITER','active':True},
      'StaffAssignment':{'branchId':uid(101),'userId':uid(21),'role':'WAITER','active':True},
      'SaveMenuDraft':{'expectedVersion':1,'content':content},'MenuDraft':{'venueId':uid(101),'version':2,'content':content},
      'PublishMenu':{'draftVersion':2,'profileVersion':1},'AvailabilityCommand':{'expectedRevision':1,'available':False,'reason':'Sold out'},
      'Availability':{'itemId':uid(601),'revision':2,'available':False},
      'OpenVisit':{'tableId':uid(201)},'Visit':visit,
      'OpenedVisit':{'visit':visit,'pairingToken':'FICTIONAL_PRIVATE_VISIT_TOKEN_'+'P'*32,'pairingExpiresAt':LATER},
      'VersionCommand':{'expectedVersion':3},'PairVisit':{'pairingToken':'FICTIONAL_PRIVATE_VISIT_TOKEN_'+'P'*32},
      'PairedContext':{'visitId':uid(501),'tableId':uid(201),'canSubmitOrders':True},
      'VisitOrder':{'visitId':uid(501),'menuPublicationId':uid(401),'items':[selection],'pricingFingerprint':'a'*64},'ServiceOrder':order,
      'OrderTransition':{'expectedVersion':1,'status':'ACCEPTED'},'Bill':bill,
      'BillCredit':{'expectedVersion':3,'orderId':uid(701),'amount':'10.00','reason':'Fictional order correction'},
      'IssueBillGrant':{'guestSessionId':uid(301),'expectedBillVersion':3},
      'BillGrant':{'id':uid(899),'version':1,'billId':uid(801),'guestSessionId':uid(301),'expiresAt':LATER,'active':True,'accessToken':'FICTIONAL_PAYER_'+'B'*26+'0'},
      'CreateBillClaim':{'accountId':uid(811),'providerReference':'FICTIONAL-TXN-ONE','reportedAmount':'70.00','destinationFingerprint':'c'*64,'transferSent':True},
      'BillPaymentClaim':claim,'ReviewBillClaim':{'expectedVersion':1,'decision':'APPROVE','verifiedAmount':'70.00',
            'allocationAmount':'70.00','verificationNote':'Fictional credited funds checked'},
      'RecordReceipt':{'method':'CASH','receivedAmount':'70.00','tenderedAmount':'100.00','changeAmount':'30.00',
            'verificationNote':'Fictional cash counted; change returned'},
      'Receipt':{'id':uid(861),'billId':uid(801),'method':'CASH','currency':'ETB','receivedAmount':'70.00',
                 'allocatedAmount':'0.00','refundedAmount':'0.00','unappliedAmount':'70.00'},
      'AllocateReceipt':{'billId':uid(801),'expectedBillVersion':4,'amount':'70.00'},
      'Allocation':{'id':uid(862),'receiptId':uid(861),'billId':uid(801),'amount':'70.00'},
      'RequestRefund':{'amount':'10.00','reason':'Fictional unapplied excess'},'RefundRequest':refund,
      'ReviewRefund':{'expectedVersion':1,'decision':'APPROVE','reason':'Fictional manager check'},
      'ExecuteRefund':{'expectedVersion':2,'executionReference':'FICTIONAL-REFUND-EXECUTED'},
      'PlanRequest':{'requestedPlan':'MINI','requestedBranchLimit':1},
      'PlanChangeRequest':{'id':uid(881),'requestedPlan':'MINI','status':'REQUESTED'},
      'ApplyPlan':{'plan':'MINI','branchLimit':1,'orderingEnabled':True,'startsAt':WHEN,
                    'endsAt':'2026-11-12T17:00:00Z','billingEvidenceReference':'FICTIONAL-SAAS-PAYMENT'},
      'PlanTerm':{'id':uid(891),'businessId':uid(1),'plan':'MINI','branchLimit':1,'orderingEnabled':True,'startsAt':WHEN},
      'EmptyCommand':{},
      'RegistrationInput':{'businessName':'Fictional Cafe PLC','businessTypeId':'cafe-and-restaurant',
         'owner':{'name':'Fictional Owner','phone':'+251900000011'},'ownerIsManager':False,
         'manager':{'name':'Fictional Manager','phone':'+251900000012'},'registrantRole':'OWNER','authorityConfirmed':True},
      'RegistrationCheck':{'valid':True,'nextStep':'VERIFY_REGISTRANT_PHONE','businessTypeId':'cafe-and-restaurant',
         'registrationPath':'OWNER','ownerIsManager':False,'requiredVerifications':['REGISTRANT_PHONE','MANAGER_INVITATION_ACCEPTANCE']},
      'MiniBranchQuoteInput':{'currentRecurringAmount':'600.00','newRecurringAmount':'900.00','amountDueNow':'150.00',
         'billingInterval':'MONTH','termStartsAt':WHEN,'termEndsAt':'2026-11-12T17:00:00Z','expiresAt':'2026-10-13T17:00:00Z'},
      'MiniBranchQuote':{'id':uid(892),'requestId':uid(881),'businessId':uid(1),'plan':'MINI','branchLimit':2,'status':'QUOTED',
         'currency':'ETB','currentRecurringAmount':'600.00','newRecurringAmount':'900.00','amountDueNow':'150.00',
         'billingInterval':'MONTH','termStartsAt':WHEN,'termEndsAt':'2026-11-12T17:00:00Z','expiresAt':'2026-10-13T17:00:00Z'},
      'AcceptMiniQuote':{'accept':True},'ActivateMiniQuote':{'billingEvidenceReference':'FICTIONAL-VERIFIED-SAAS-ADDON'},
      'Problem':{'type':'https://example.test/problems/version-conflict','title':'Version conflict','status':409,
                  'detail':'Reload current state and confirm the command.','code':'VERSION_CONFLICT','requestId':'fictional-request'}
    }
    e['RecordReceipt']['fundsConfirmed']=True
    e['ReviewBillClaim']['fundsConfirmed']=True
    e['ExecuteRefund']['executionConfirmed']=True
    summary={'bill':bill,'tableLabel':'Table 1','visitStatus':'ENDED','openedAt':WHEN}
    e['CashierBillList']={'branchId':uid(101),'items':[summary],'nextCursor':None}
    e['CashierDetail']={'summary':summary,'credits':[],'orders':[{'id':order['id'],'status':order['status'],'totalAmount':order['totalAmount'],'remainingChargeAmount':order['totalAmount'],'items':order['items']}],
      'receipts':[],'claims':[],'refunds':[],'accounts':[],'permissions':{'manage':True,'adjust':False,'refund':False}}
    e['SetupDraft']={'format':'menumini-setup-draft','version':1,'businessTypeId':'cafe-and-restaurant',
      'branch':{'publicName':'Fictional Addis Cafe','name':'Main branch','city':'Addis Ababa','area':'Bole',
        'landmark':'Fictional landmark','serviceMode':'DINE_IN','currency':'ETB','timezone':'Africa/Addis_Ababa',
        'hours':[{'day':day,'status':'UNSPECIFIED'} for day in range(7)]},
      'planPreference':'MINI','menu':{'themeId':'mini-warm-habesha',
        'sections':[{'id':uid(950),'name':'Coffee','items':[{'id':uid(951),'name':'Fictional coffee',
          'nameAm':'ሙከራ ቡና','price':'60.50','available':True}]}]}}
    e['SetupCheck']={'valid':True,'mode':'DRAFT_ONLY','nextStep':'VERIFY_BEFORE_LAUNCH',
      'summary':{'sectionCount':1,'itemCount':1,'availableItemCount':1},
      'blockers':['PHONE_VERIFICATION','BUSINESS_AUTHORIZATION','MENU_PUBLICATION','SUBSCRIPTION_ACTIVATION','ORDERING_SETUP']}
    e['PublicMenu']['branch']=deepcopy(e['SetupDraft']['branch'])
    e['BranchProfileInput']={'businessTypeId':e['SetupDraft']['businessTypeId'],'branch':deepcopy(e['SetupDraft']['branch'])}
    e['SaveBranchProfile']={'expectedVersion':0,'content':deepcopy(e['BranchProfileInput'])}
    e['BranchProfile']={'venueId':uid(101),'version':1,'content':deepcopy(e['BranchProfileInput'])}
    e['ServicePreparation']={'tableLabels':['Table 1'], 'staffing':{'orders':'OWNER','preparation':'STAFF','payments':'OWNER'},
      'paymentMethods':['CASH','BANK_TRANSFER'],'pricing':'UNCONFIRMED'}
    e['SaveServiceDraft']={'expectedVersion':0,'content':deepcopy(e['ServicePreparation'])}
    e['ServiceDraft']={'venueId':uid(101),'version':1,'content':deepcopy(e['ServicePreparation'])}
    e['WorkspacePreparation']={'format':'menumini-workspace-draft','version':1,'planPreference':'MINI',
      'profile':deepcopy(e['BranchProfileInput']),'menu':deepcopy(content),'service':deepcopy(e['ServicePreparation'])}
    e['WorkspaceCheck']={'valid':True,'mode':'PREPARATION_ONLY','summary':{'sectionCount':len(content['sections']),
      'itemCount':sum(len(s['items']) for s in content['sections']),
      'availableItemCount':sum(i['availableNow'] for s in content['sections'] for i in s['items']),
      'optionGroupCount':sum(len(i['modifiers']) for s in content['sections'] for i in s['items']), 'plannedTableCount':1},
      'blockers':['PHONE_VERIFICATION','BUSINESS_AUTHORIZATION','MENU_PUBLICATION','SUBSCRIPTION_ACTIVATION',
        'VERIFIED_STAFF_ACCESS','VERIFIED_RECEIVING_ACCOUNT','PRICE_POLICY_REVIEW','ORDERING_WORKFLOW','PAYMENT_WORKFLOW','FIELD_ACCEPTANCE']}
    e['BranchReadiness']={'venueId':uid(101),'mode':'PREPARATION_ONLY','serviceDraftVersion':1,
      'facts':{'branchActive':True,'menuPublished':True,'availableItemCount':1,'subscriptionOrderingActive':True,
        'branchOrderingEnabled':False,'activeTableCount':0,'orderStaffAvailable':True,'preparationStaffAvailable':True,
        'paymentStaffAvailable':True,'verifiedReceivingAccount':False},
      'blockers':['BRANCH_ORDERING_DISABLED','ACTIVE_TABLE_REQUIRED','VERIFIED_RECEIVING_ACCOUNT',
        'PRICE_POLICY_REVIEW','ORDERING_WORKFLOW','PAYMENT_WORKFLOW','FIELD_ACCEPTANCE']}
    e['DiningTable']={'id':uid(201),'branchId':uid(101),'label':'Table 1','active':True,'version':1,'visit':None}
    e['DiningTables']={'branchId':uid(101),'items':[deepcopy(e['DiningTable'])]}
    e['CreateDiningTable']={'label':'Table 1'}
    e['UpdateDiningTable']={'expectedVersion':1,'label':'Table 1','active':False}
    e['OperationalOrder']={**deepcopy(order),'tableLabel':'Table 1','customerNote':'','createdAt':WHEN,
      'subtotalAmount':'70.00','serviceAmount':'0.00','taxAmount':'0.00','allowedTransitions':['ACCEPTED','CANCELLED']}
    e['ServiceQueue']={'branchId':uid(101),'items':[deepcopy(e['OperationalOrder'])],'nextCursor':None}
    e['ServiceOffer']={'menu':deepcopy(menu),'pricingFingerprint':'a'*64,'pricing':{'taxMode':'NONE','taxRateBps':0,'serviceRateBps':0,'taxOnService':False}}
    e['StaffVisitOrder']={**deepcopy(e['VisitOrder']),'pricingFingerprint':'a'*64}
    e['TableGuestLink']={'tableId':uid(201),'branchId':uid(101),'version':2,'tableToken':'FICTIONAL_TABLE_'+'T'*26+'0','active':True}
    e['VisitInvitation']={'visitId':uid(501),'tableId':uid(201),'branchId':uid(101),'version':2,'pairingToken':'FICTIONAL_VISIT_'+'P'*26+'0','expiresAt':LATER,'active':True}
    e['GuestAssociation']={'visitId':uid(501),'tableId':uid(201),'visitStatus':'OPEN','canSubmitOrders':True}
    e['GuestContext']={'session':e['DiningSession'],'association':None,'csrfToken':'FICTIONAL_CSRF_'+'C'*27+'0'}
    e['GuestOrder']={k:v for k,v in e['OperationalOrder'].items() if k!='allowedTransitions'}
    e['GuestOrderList']={'items':[deepcopy(e['GuestOrder'])],'nextCursor':None}
    e['GuestRevocation']={'revoked':True}
    e['PayerGrantState']={'id':uid(899),'version':1,'expiresAt':LATER,'active':True}
    e['PayerCandidates']={'billId':uid(801),'items':[{'guestSessionId':uid(301),'deviceCode':'00000301','expiresAt':LATER,'grant':e['PayerGrantState']}]}
    e['RedeemBillGrant']={'accessToken':'FICTIONAL_PAYER_'+'B'*26+'0'}
    e['PayerBinding']={'billId':uid(801),'expiresAt':LATER}
    e['PayerRevocation']={'revoked':True}
    e['PayerAccount']={'id':uid(811),'provider':'CBE','holderName':'Fictional Cafe','accountIdentifier':'FICTIONAL-ACCOUNT-DO-NOT-PAY','destinationFingerprint':'c'*64}
    e['PayerClaim']={'claim':claim,'providerReference':'FICTIONAL-TXN-ONE','accountLabel':'CBE · Fictional Cafe · …9601','submittedAt':WHEN,'reviewedAt':None,'verifiedReceivedAmount':None}
    e['PayerClaimList']={'items':[e['PayerClaim']],'nextCursor':None}
    e['PayerCharge']={'id':order['id'],'status':'ACCEPTED','totalAmount':'70.00','creditedAmount':'0.00','netChargeAmount':'70.00','items':[{k:v for k,v in l.items() if k!='specialInstructions'} for l in order['items']]}
    e['PayerDetail']={'bill':bill,'tableLabel':'Table 1','visitStatus':'OPEN','openedAt':WHEN,'expiresAt':LATER,'orders':[e['PayerCharge']],'accounts':[e['PayerAccount']],'claims':e['PayerClaimList']}
    e['RecoveryReceipt']={'domain':'GUEST','operation':'SUBMIT','requestKey':uid(990),'resourceId':uid(501),'state':'COMMITTED','resultId':uid(701),'recordedAt':WHEN}
    e['ServiceRecoveryDescriptor']={'operation':'CREATE_TABLE','resourceId':uid(101)}
    e['CashierRecoveryDescriptor']={'operation':'RECORD_RECEIPT','resourceId':uid(801)}
    return e

def operation_response(operation_id, schema, e):
    result=deepcopy(e[schema])
    if operation_id=='submitStaffOrder': result['source']='STAFF'
    if operation_id=='transitionOrder': result.update(status='ACCEPTED',version=2)
    if operation_id=='transitionOrder' and schema=='OperationalOrder': result['allowedTransitions']=['PREPARING','COMPLETED','CANCELLED']
    if operation_id=='updateDiningTable': result.update(active=False,version=2)
    if operation_id=='endVisit': result.update(status='ENDED',version=2)
    if operation_id=='closeBill': result.update(status='CLOSED',version=6,allocatedAmount='70.00',outstandingAmount='0.00',settlement='PAID')
    if operation_id=='creditBill': result.update(version=4,chargeAmount='60.00',outstandingAmount='60.00')
    if operation_id=='reviewBillClaim': result.update(status='APPROVED',version=2)
    if operation_id=='reviewRefund': result.update(status='APPROVED',version=2)
    if operation_id=='executeRefund': result.update(status='EXECUTED',version=3)
    if operation_id=='revokeBillGrant': result.update(active=False,version=2)
    if operation_id=='acceptMiniBranchQuote': result['status']='ACCEPTED'
    if operation_id=='activateMiniBranchQuote': result['branchLimit']=2
    if operation_id in ('getGuestOrderRequest','cancelGuestOrderRequest','getPayerPaymentRequest','cancelPayerPaymentRequest','getServiceRequest','cancelServiceRequest','getCashierRequest','cancelCashierRequest'):
        if 'Payer' in operation_id:result.update(domain='PAYER',operation='CLAIM',resourceId=uid(801),resultId=uid(851))
        if 'Service' in operation_id:result.update(domain='SERVICE',operation='CREATE_TABLE',resourceId=uid(101),resultId=uid(201))
        if 'Cashier' in operation_id:result.update(domain='CASHIER',operation='RECORD_RECEIPT',resourceId=uid(801),resultId=uid(861))
        if operation_id.startswith('cancel'):result.update(state='CANCELLED',resultId=None)
    return result
