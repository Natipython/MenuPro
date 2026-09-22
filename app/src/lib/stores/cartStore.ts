import { writable, derived } from 'svelte/store';
// import { db } from '$lib/db'; // Will be used to persist

export type CartItem = {
    id: string; // unique instance id
    productId: string;
    name: string;
    basePrice: number;
    quantity: number;
    selections: Record<string, any>; // The selected options
    optionsTotal: number; // calculated cost of options
};

function createCartStore() {
    const { subscribe, set, update } = writable<CartItem[]>([]);

    return {
        subscribe,
        addItem: (item: Omit<CartItem, 'id'>) => update(items => {
            const newItem = { ...item, id: crypto.randomUUID() };
            const newItems = [...items, newItem];
            // db.cart.add(newItem); // Persist to IndexedDB
            return newItems;
        }),
        removeItem: (id: string) => update(items => {
            // db.cart.delete(id);
            return items.filter(i => i.id !== id);
        }),
        updateQuantity: (id: string, delta: number) => update(items => {
            return items.map(item => {
                if (item.id === id) {
                    const newQ = Math.max(1, item.quantity + delta);
                    // db.cart.put({...item, quantity: newQ})
                    return { ...item, quantity: newQ };
                }
                return item;
            });
        }),
        clear: () => {
            set([]);
            // db.cart.clear();
        },
        // Hydrate from DB on load
        loadFromDb: async () => {
            // const stored = await db.cart.toArray();
            // set(stored);
        }
    };
}

export const cart = createCartStore();

// Derived store for totals
export const cartTotals = derived(cart, $cart => {
    let subtotal = 0;
    let totalItems = 0;
    
    $cart.forEach(item => {
        const itemTotal = (item.basePrice + item.optionsTotal) * item.quantity;
        subtotal += itemTotal;
        totalItems += item.quantity;
    });

    const tax = subtotal * 0.15; // Example 15% tax
    const total = subtotal + tax;

    return {
        subtotal,
        tax,
        total,
        totalItems
    };
});
