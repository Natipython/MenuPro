export interface MiniOrderNotification {
  orderId: string;
  tableNumber: string;
  businessName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    options?: string;
  }>;
  subtotal: number;
  total: number;
  currency: string;
  paymentMethod: string;
  customerNote?: string;
  timestamp: string;
}

export const miniNotificationService = {
  /**
   * Generates a clean, highly readable WhatsApp order message for the merchant
   */
  generateWhatsAppMessage(order: MiniOrderNotification): string {
    const lines = [
      `🔔 *NEW ORDER - ${order.businessName}*`,
      `━━━━━━━━━━━━━━━━━━`,
      `📍 *Table:* ${order.tableNumber}`,
      `🆔 *Order ID:* #${order.orderId.slice(-6)}`,
      `⏰ *Time:* ${new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      ``,
      `🍴 *ORDER ITEMS:*`
    ];

    order.items.forEach(item => {
      const line = `• ${item.quantity}x ${item.name} (${(item.price * item.quantity).toFixed(2)} ${order.currency})`;
      lines.push(line);
      if (item.options) {
        lines.push(`   └ _${item.options}_`);
      }
    });

    lines.push(``);
    lines.push(`💰 *TOTAL:* ${order.total.toFixed(2)} ${order.currency}`);
    lines.push(`💳 *Payment:* ${order.paymentMethod}`);

    if (order.customerNote) {
      lines.push(`📝 *Note:* "${order.customerNote}"`);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━`);
    lines.push(`⚡ _Powered by MenuMini_`);

    return lines.join('\n');
  },

  /**
   * Constructs the wa.me deep link for instant WhatsApp dispatch
   */
  createWhatsAppLink(phone: string, order: MiniOrderNotification): string {
    // Format Ethiopian phone number (e.g. 0911223344 -> 251911223344)
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '251' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('251')) {
      cleanPhone = '251' + cleanPhone;
    }

    const message = this.generateWhatsAppMessage(order);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  },

  /**
   * Generates a clean Excel/CSV string ready for client-side download or email attachment
   */
  generateOrdersCsv(orders: MiniOrderNotification[]): string {
    const headers = ['Order ID', 'Date & Time', 'Table', 'Items Summary', 'Subtotal', 'Total', 'Currency', 'Payment Method', 'Customer Note'];
    const rows = orders.map(ord => {
      const itemsSummary = ord.items.map(i => `${i.quantity}x ${i.name}`).join(' | ');
      return [
        ord.orderId,
        new Date(ord.timestamp).toLocaleString(),
        `Table ${ord.tableNumber}`,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        ord.subtotal.toFixed(2),
        ord.total.toFixed(2),
        ord.currency,
        ord.paymentMethod,
        `"${(ord.customerNote || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
};
