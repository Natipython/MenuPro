import { estimateSelection, moneyCents, centsText } from '$lib/service/model';
import type { Selection, ServiceOffer } from '$lib/service/model';
import { validateGuestCommand } from '$lib/guest/model';
import type { GuestContext } from '$lib/guest/model';
import type { RecoveryCommand } from '$lib/recovery/model';
import { UUID } from '$lib/workspace/model';

export interface CartBinding { sessionId: string; visitId: string }
export interface MenuCartDraft {
  venueId: string;
  menuPublicationId: string;
  pricingFingerprint: string;
  binding: CartBinding | null;
  items: Selection[];
  customerNote: string;
}
export interface CartReviewLine {
  itemId: string;
  name: string;
  nameAm?: string;
  quantity: number;
  selectedOptions: string[];
  specialInstructions: string;
  unitPrice: string;
  lineTotal: string;
}
export interface MenuCartReview {
  status: 'CURRENT' | 'REVIEW_REQUIRED' | 'BLOCKED';
  reasons: string[];
  lines: CartReviewLine[];
  estimate: ReturnType<typeof estimateSelection> | null;
}

// This module only prepares frontend drafts/review rows. It performs no HTTP,
// storage, identity verification, order acceptance or payment transition.
export function newMenuCart(offer: ServiceOffer): MenuCartDraft {
  return { venueId: offer.menu.venueId, menuPublicationId: offer.menu.publicationId,
    pricingFingerprint: offer.pricingFingerprint, binding: null, items: [], customerNote: '' };
}

function checkNote(value: string, max: number) {
  if (typeof value !== 'string' || [...value].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new Error('Keep item instructions within 500 characters and order notes within 1,000 characters.');
  }
}

function selectionCopy(value: Selection): Selection {
  checkNote(value.specialInstructions || '', 500);
  if (!UUID.test(value.itemId) || !Array.isArray(value.choiceIds) || value.choiceIds.length > 30
    || value.choiceIds.some(id => typeof id !== 'string' || !UUID.test(id))) throw new Error('Check the selected menu item and options.');
  // Explicit whitelist: local display prices/totals never enter a command.
  return { itemId: value.itemId.toLowerCase(), quantity: value.quantity,
    choiceIds: value.choiceIds.map(id => id.toLowerCase()).sort(),
    ...(value.specialInstructions ? { specialInstructions: value.specialInstructions } : {}) };
}

export function menuCartLineKey(value: Selection): string {
  return JSON.stringify([value.itemId, [...value.choiceIds].sort(), value.specialInstructions || '']);
}

export function addMenuCartItem(cart: MenuCartDraft, offer: ServiceOffer, value: Selection): MenuCartDraft {
  if (cart.venueId !== offer.menu.venueId || cart.menuPublicationId !== offer.menu.publicationId
    || cart.pricingFingerprint !== offer.pricingFingerprint) throw new Error('Review the current menu and prices before changing this order.');
  const incoming = selectionCopy(value);
  estimateSelection(offer, [incoming]);
  const items = cart.items.map(selectionCopy);
  const index = items.findIndex(item => menuCartLineKey(item) === menuCartLineKey(incoming));
  if (index < 0) items.push(incoming);
  else items[index] = { ...items[index], quantity: items[index].quantity + incoming.quantity };
  if (items.length > 100) throw new Error('An order can contain at most 100 item lines.');
  estimateSelection(offer, items); // Includes the 99-per-line and total limits.
  return { ...cart, binding: cart.binding ? { ...cart.binding } : null, items };
}

export function removeMenuCartItem(cart: MenuCartDraft, lineKey: string): MenuCartDraft {
  const index = cart.items.findIndex(item => menuCartLineKey(item) === lineKey);
  if (index < 0) throw new Error('This item line is no longer in the draft.');
  return { ...cart, binding: cart.binding ? { ...cart.binding } : null,
    items: cart.items.filter((_, itemIndex) => itemIndex !== index).map(selectionCopy) };
}

export function setMenuCartQuantity(cart: MenuCartDraft, offer: ServiceOffer, lineKey: string, quantity: number): MenuCartDraft {
  // Removing a sold-out or stale line remains possible before re-reviewing.
  if (quantity === 0) return removeMenuCartItem(cart, lineKey);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('Choose a quantity between 1 and 99.');
  if (cart.venueId !== offer.menu.venueId || cart.menuPublicationId !== offer.menu.publicationId
    || cart.pricingFingerprint !== offer.pricingFingerprint) throw new Error('Review the current menu and prices before changing this order.');
  const index = cart.items.findIndex(item => menuCartLineKey(item) === lineKey);
  if (index < 0) throw new Error('This item line is no longer in the draft.');
  const items = cart.items.map(selectionCopy);
  items[index] = { ...items[index], quantity };
  estimateSelection(offer, items);
  return { ...cart, binding: cart.binding ? { ...cart.binding } : null, items };
}

export function reviewMenuCart(cart: MenuCartDraft, offer: ServiceOffer): MenuCartReview {
  const reasons: string[] = [];
  if (cart.venueId !== offer.menu.venueId) return { status: 'BLOCKED', reasons: ['This draft belongs to another branch.'], lines: [], estimate: null };
  if (!cart.items.length || cart.items.length > 100) reasons.push('Choose between 1 and 100 item lines.');
  try { checkNote(cart.customerNote, 1000); } catch (error) { reasons.push((error as Error).message); }
  const catalog = offer.menu.content.sections.flatMap(section => section.items);
  const lines: CartReviewLine[] = [];
  for (const value of cart.items) {
    try {
      const selection = selectionCopy(value);
      const amount = estimateSelection(offer, [selection]);
      const item = catalog.find(item => item.id === selection.itemId)!;
      const options = item.modifiers.flatMap(group => group.choices).filter(choice => selection.choiceIds.includes(choice.id));
      const unit = moneyCents(item.basePrice) + options.reduce((sum, choice) => sum + moneyCents(choice.priceDelta), 0n);
      lines.push({ itemId: item.id, name: item.nameEn, nameAm: item.nameAm, quantity: selection.quantity,
        selectedOptions: options.map(choice => choice.label), specialInstructions: selection.specialInstructions || '',
        unitPrice: centsText(unit), lineTotal: amount.subtotalAmount });
    } catch (error) {
      const item = catalog.find(item => item.id === value.itemId);
      reasons.push(`${item?.nameEn || 'An item in this draft'}: ${(error as Error).message}`);
    }
  }
  let estimate: MenuCartReview['estimate'] = null;
  if (!reasons.length) {
    try { estimate = estimateSelection(offer, cart.items.map(selectionCopy)); }
    catch (error) { reasons.push((error as Error).message); }
  }
  if (reasons.length) return { status: 'BLOCKED', reasons, lines, estimate: null };
  const changed = cart.menuPublicationId !== offer.menu.publicationId || cart.pricingFingerprint !== offer.pricingFingerprint;
  return { status: changed ? 'REVIEW_REQUIRED' : 'CURRENT', reasons: changed ? ['The menu or pricing policy changed. Review the updated order before sending.'] : [], lines, estimate };
}

// The future review screen must call this only after explicit confirmation of
// the new review. It preserves all selections/notes and refuses invalid items.
export function acceptReviewedMenuCart(cart: MenuCartDraft, offer: ServiceOffer): MenuCartDraft {
  const review = reviewMenuCart(cart, offer);
  if (review.status === 'BLOCKED') throw new Error(review.reasons.join(' '));
  return { ...cart, menuPublicationId: offer.menu.publicationId, pricingFingerprint: offer.pricingFingerprint,
    binding: cart.binding ? { ...cart.binding } : null, items: cart.items.map(selectionCopy) };
}

function currentBinding(cart: MenuCartDraft, context: GuestContext): CartBinding {
  if (context.session.venueId !== cart.venueId || !context.association
    || context.association.tableId !== context.session.tableId || context.association.visitStatus !== 'OPEN'
    || !context.association.canSubmitOrders) throw new Error('Ask staff to confirm the current seating before sending.');
  const binding = { sessionId: context.session.id, visitId: context.association.visitId };
  if (cart.binding && (cart.binding.sessionId !== binding.sessionId || cart.binding.visitId !== binding.visitId)) {
    throw new Error('This draft belongs to an earlier session or seating. Review it separately before starting a new order.');
  }
  return binding;
}

export function bindMenuCart(cart: MenuCartDraft, context: GuestContext): MenuCartDraft {
  return { ...cart, binding: currentBinding(cart, context), items: cart.items.map(selectionCopy) };
}

export function prepareGuestCartCommand(cart: MenuCartDraft, offer: ServiceOffer, context: GuestContext, requestKey: string): RecoveryCommand {
  if (!cart.binding) throw new Error('Confirm which seating this draft belongs to before sending.');
  const binding = currentBinding(cart, context);
  const review = reviewMenuCart(cart, offer);
  if (review.status !== 'CURRENT') throw new Error(review.reasons.join(' '));
  if (!UUID.test(requestKey)) throw new Error('Keep a valid request key for this exact order attempt.');
  const body = { visitId: binding.visitId, menuPublicationId: cart.menuPublicationId, pricingFingerprint: cart.pricingFingerprint,
    items: cart.items.map(selectionCopy), ...(cart.customerNote ? { customerNote: cart.customerNote } : {}) };
  if (validateGuestCommand('SUBMIT', body).length) throw new Error('Check the order fields before sending.');
  // Detached snapshot for the existing CommandRecovery runner. Changing the
  // visible draft afterwards cannot rewrite the original request's body/key.
  return { operation: 'SUBMIT', resourceId: binding.visitId, requestKey, body };
}
