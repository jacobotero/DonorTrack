import Stripe from "stripe";

// Lazy initialization - creates Stripe client when first accessed
// This ensures environment variables are loaded before client creation
let _stripe: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey || secretKey === "sk_test_placeholder") {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set or invalid");
    }

    _stripe = new Stripe(secretKey, {
      apiVersion: "2026-01-28.clover",
    });
  }
  return _stripe;
};

// Export for backwards compatibility - but this will throw if not configured
export const stripe = new Proxy({} as Stripe, {
  get: (_, prop) => {
    return (getStripe() as any)[prop];
  }
});

// Plan price IDs - You need to create these products/prices in Stripe Dashboard
// For development, these will be test mode price IDs
export const STRIPE_PLANS = {
  STARTER: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID || "price_starter",
    amount: 29,
  },
  GROWTH: {
    priceId: process.env.STRIPE_GROWTH_PRICE_ID || "price_growth",
    amount: 59,
  },
  PLUS: {
    priceId: process.env.STRIPE_PLUS_PRICE_ID || "price_plus",
    amount: 99,
  },
} as const;
