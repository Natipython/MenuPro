import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, configFile: false, envDir: false,
  resolve: { alias: { $lib: resolve(root, 'src/lib') } }, server: { middlewareMode: true }, appType: 'custom' });
const cases = [];
const check = (value, label) => { assert.ok(value, label); cases.push(label); };
const rejects = (action, label) => { assert.throws(action); cases.push(label); };
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
try {
  const model = await server.ssrLoadModule('/src/lib/menu/cart-draft.ts');
  const recovery = await server.ssrLoadModule('/src/lib/recovery/model.ts');
  const offer = { menu: { publicationId: id(1), revision: 1, availabilityRevision: 1, venueId: id(2),
    venueName: 'Fictional cafe', currency: 'ETB', branch: { name: 'Bole', publicName: 'fictional-bole', city: 'Addis Ababa', hours: [] },
    content: { themeId: 'mini-warm-habesha', primaryColor: '#F59E0B', sections: [{ id: id(3), nameEn: 'Drinks', items: [
      { id: id(4), nameEn: 'Tea', nameAm: 'ሻይ', basePrice: '0.10', availableNow: true, modifiers: [] },
      { id: id(5), nameEn: 'Coffee', basePrice: '60.50', availableNow: true, modifiers: [
        { id: id(6), label: 'Size', mode: 'SINGLE_SELECT', minSelections: 1, maxSelections: 1, choices: [
          { id: id(7), label: 'Regular', priceDelta: '0.00', isAvailable: true },
          { id: id(8), label: 'Large', priceDelta: '10.25', isAvailable: true }] },
        { id: id(9), label: 'Extras', mode: 'MULTI_SELECT', minSelections: 0, maxSelections: 2, choices: [
          { id: id(10), label: 'Honey', priceDelta: '5.00', isAvailable: true },
          { id: id(11), label: 'Milk', priceDelta: '2.00', isAvailable: false }] }] }
    ] }] } }, pricingFingerprint: 'a'.repeat(64), pricing: { taxMode: 'NONE', taxRateBps: 0, serviceRateBps: 0, taxOnService: false } };
  const context = { session: { id: id(20), venueId: id(2), tableId: id(21), tableLabel: 'Table 1', expiresAt: '2099-01-01T00:00:00Z' },
    association: { visitId: id(22), tableId: id(21), visitStatus: 'OPEN', canSubmitOrders: true }, csrfToken: 'FICTIONAL_NOT_AUTHORITY' };
  const tea = { itemId: id(4), quantity: 3, choiceIds: [] };
  const large = { itemId: id(5), quantity: 1, choiceIds: [id(10), id(8)], specialInstructions: 'No sugar / ስኳር አይጨመር' };
  const original = model.newMenuCart(offer);
  let cart = model.addMenuCartItem(original, offer, tea);
  check(original.items.length === 0 && original.binding === null, 'editing a cart does not mutate the original draft or grant seating authority');
  check(model.reviewMenuCart(cart, offer).estimate.totalAmount === '0.30', 'fractional ETB totals use exact arithmetic');
  cart = model.addMenuCartItem(cart, offer, large);
  cart = model.addMenuCartItem(cart, offer, { ...large, choiceIds: [...large.choiceIds].reverse() });
  check(cart.items.length === 2 && cart.items[1].quantity === 2, 'identical options in a different selection order merge into the same line');
  cart = model.addMenuCartItem(cart, offer, { ...large, specialInstructions: 'Extra hot' });
  cart = model.addMenuCartItem(cart, offer, { ...large, choiceIds: [id(7)] });
  check(cart.items.length === 4, 'different instructions and option combinations remain separate lines');
  const variantKey = model.menuCartLineKey(cart.items[2]);
  const changedQuantity = model.setMenuCartQuantity(cart, offer, variantKey, 4);
  check(changedQuantity.items[2].quantity === 4 && changedQuantity.items[1].quantity === 2 && cart.items[2].quantity === 1,
    'quantity controls target the exact option-and-note line without changing another variant or the old draft');
  const removed = model.removeMenuCartItem(cart, variantKey);
  check(removed.items.length === 3 && removed.items[1].specialInstructions === large.specialInstructions,
    'removing one dish variant keeps the other option-and-note variants');
  rejects(() => model.setMenuCartQuantity(cart, offer, variantKey, 1.5), 'fractional quantities cannot enter the review');
  const review = model.reviewMenuCart(cart, offer);
  check(review.lines[1].unitPrice === '75.75' && review.lines[1].lineTotal === '151.50'
    && review.lines[1].selectedOptions.join(',') === 'Large,Honey', 'cart review shows selected option names and exact unit/line prices');
  check(review.lines[0].nameAm === 'ሻይ' && review.lines[1].specialInstructions === large.specialInstructions,
    'Amharic dish names and full special instructions survive review mapping');
  rejects(() => model.addMenuCartItem(cart, offer, { ...large, choiceIds: [] }), 'missing required option is rejected before add');
  rejects(() => model.addMenuCartItem(cart, offer, { ...large, choiceIds: [id(7), id(8)] }), 'single-select option cannot contain two choices');
  rejects(() => model.addMenuCartItem(cart, offer, { ...large, choiceIds: [id(7), id(11)] }), 'sold-out option cannot be added');
  rejects(() => model.addMenuCartItem(cart, offer, { ...large, choiceIds: [id(8), id(8)] }), 'duplicate choice IDs cannot increase or conceal option charges');
  rejects(() => model.addMenuCartItem(cart, offer, { ...large, specialInstructions: 'ሀ'.repeat(501) }), 'over-limit instructions are rejected using character count');
  rejects(() => model.addMenuCartItem(cart, offer, { ...tea, quantity: 99 }), 'merged quantity above 99 is rejected without silently splitting lines');
  check(cart.items[0].quantity === 3, 'a rejected add leaves the previous cart intact');
  const fees = structuredClone(offer); fees.pricing = { taxMode: 'ADDED', taxRateBps: 1500, serviceRateBps: 1000, taxOnService: true };
  fees.pricingFingerprint = 'b'.repeat(64);
  const feeCart = model.addMenuCartItem(model.newMenuCart(fees), fees, { ...large, quantity: 2 });
  const estimate = model.reviewMenuCart(feeCart, fees).estimate;
  check(estimate.subtotalAmount === '151.50' && estimate.serviceAmount === '15.15' && estimate.taxAmount === '25.00'
    && estimate.totalAmount === '191.65', 'review reuses existing exact service/tax rounding rather than inventing another calculator');
  const changed = structuredClone(offer); changed.menu.publicationId = id(30); changed.menu.content.sections[0].items[0].basePrice = '0.20';
  check(model.reviewMenuCart(cart, changed).status === 'REVIEW_REQUIRED', 'a new publication requires explicit review even if selections remain valid');
  rejects(() => model.addMenuCartItem(cart, changed, tea), 'stale draft cannot mix items from a changed publication');
  const bound = model.bindMenuCart(cart, context);
  rejects(() => model.prepareGuestCartCommand(bound, changed, context, id(40)), 'changed prices cannot be submitted using the previous reviewed publication');
  const repriced = model.acceptReviewedMenuCart(bound, changed);
  check(repriced.items.length === cart.items.length && repriced.items[1].specialInstructions === large.specialInstructions
    && cart.menuPublicationId === offer.menu.publicationId, 'explicit repricing preserves selections/notes and does not rewrite the previous draft');
  const soldOut = structuredClone(offer); soldOut.menu.content.sections[0].items[0].availableNow = false;
  check(model.reviewMenuCart(cart, soldOut).status === 'BLOCKED', 'live unavailability blocks review even without a new publication ID');
  const repaired = model.setMenuCartQuantity(cart, soldOut, model.menuCartLineKey(cart.items[0]), 0);
  check(model.reviewMenuCart(repaired, soldOut).status === 'CURRENT' && repaired.items.length === 3,
    'an unavailable line can be removed while preserving and reviewing the rest of the order');
  rejects(() => model.acceptReviewedMenuCart(cart, soldOut), 'repricing never silently deletes or accepts an unavailable item');
  const foreignOffer = structuredClone(offer); foreignOffer.menu.venueId = id(99);
  check(model.reviewMenuCart(cart, foreignOffer).status === 'BLOCKED', 'another branch cannot reuse this cart');
  rejects(() => model.prepareGuestCartCommand(cart, offer, context, id(40)), 'an unbound browsing draft is not automatically sent to a seating');
  rejects(() => model.bindMenuCart(cart, { ...context, association: null }), 'table session alone is not treated as an associated seating');
  rejects(() => model.bindMenuCart(cart, { ...context, session: { ...context.session, venueId: id(99) } }), 'a different branch session cannot bind this draft');
  rejects(() => model.prepareGuestCartCommand(bound, offer, { ...context, session: { ...context.session, id: id(98) } }, id(40)), 'a new guest session cannot silently reuse a previously bound draft');
  rejects(() => model.prepareGuestCartCommand(bound, offer, { ...context, association: { ...context.association, visitId: id(97) } }, id(40)), 'a new seating cannot silently inherit the previous seating draft');
  rejects(() => model.prepareGuestCartCommand(bound, offer, { ...context, association: { ...context.association, visitStatus: 'ENDED', canSubmitOrders: false } }, id(40)), 'ended seating cannot prepare a replacement order');
  bound.customerNote = 'Bring water first / ውሃ';
  const command = model.prepareGuestCartCommand(bound, offer, context, id(40));
  check(recovery.validateRecoveryBody('GUEST', command), 'prepared command matches the existing guest validator and interrupted-command recovery contract');
  check(command.body.visitId === context.association.visitId && command.body.customerNote === bound.customerNote
    && command.requestKey === id(40), 'current seating, order note and original retry key are carried explicitly');
  const serialized = JSON.stringify(command);
  check(!serialized.includes(context.csrfToken) && !serialized.includes('unitPrice') && !serialized.includes('totalAmount')
    && !serialized.includes('sessionId') && !serialized.includes('payment'), 'command body excludes credentials, client totals, session identity assertions and payment state');
  bound.items[0].quantity = 9; bound.items[1].choiceIds.push(id(11)); bound.customerNote = 'Changed after review';
  check(command.body.items[0].quantity === 3 && command.body.items[1].choiceIds.length === 2
    && command.body.customerNote === 'Bring water first / ውሃ', 'later draft edits cannot rewrite the detached original command snapshot');
  rejects(() => model.prepareGuestCartCommand(model.bindMenuCart(model.newMenuCart(offer), context), offer, context, id(40)), 'an empty cart cannot become an order request');
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(command.body, null, 2) + '\n');
  const report = { verified_at: new Date().toISOString(), passed: cases.length, failed: 0, cases,
    scope: 'pure frontend cart/review/command preparation using fictional offers and contexts; existing validators reused; no HTTP, storage, identity verification, live order or rendered UI acceptance' };
  await writeFile(resolve(root, '../docs/menu-cart-draft-validation.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} finally { await server.close(); }
