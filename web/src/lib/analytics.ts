// TECHMED Lightweight Conversion Analytics
// Privacy-first event tracking: Never logs secrets, passwords, or sensitive PII.

export type ConversionEvent =
  | 'plan_selected'
  | 'billing_option_selected'
  | 'checkout_initiated'
  | 'paystack_redirect'
  | 'paystack_init_failed'
  | 'payment_verified'
  | 'account_setup_completed'
  | 'checkout_abandoned';

export interface EventPayload {
  planId?: string;
  planName?: string;
  billingOption?: string;
  amount?: number;
  reference?: string;
  error?: string;
  [key: string]: unknown;
}

export function trackEvent(eventName: ConversionEvent, payload: EventPayload = {}): void {
  try {
    const timestamp = new Date().toISOString();
    const eventData = {
      event: eventName,
      timestamp,
      ...payload,
    };

    // 1. Dispatch custom DOM event for any in-page listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('techmed_event', { detail: eventData }));

      // 2. Google Analytics gtag support if configured
      const w = window as any;
      if (typeof w.gtag === 'function') {
        w.gtag('event', eventName, {
          event_category: 'ecommerce',
          event_label: payload.planName || payload.planId || 'techmed_purchase',
          value: payload.amount || 0,
        });
      }
    }

    // 3. Safe development log
    if (import.meta.env?.DEV) {
      console.log(`[Analytics: ${eventName}]`, payload);
    }
  } catch (err) {
    // Non-blocking: analytics failures must NEVER break checkout or UI
    console.warn('Analytics event dispatch error:', err);
  }
}
