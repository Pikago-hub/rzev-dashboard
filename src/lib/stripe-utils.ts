/**
 * Utility functions for Stripe integration
 */
import Stripe from "stripe";

// Initialize Stripe with the latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-03-31.basil", // Latest stable version as of now
});

/**
 * Format a price amount from cents to a readable currency string
 * @param amount The amount in cents
 * @param currency The currency code (default: 'usd')
 * @returns Formatted price string
 */
export function formatPrice(amount: number | null, currency: string = 'usd'): string {
  if (amount === null) {
    return 'Contact Sales';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate the savings percentage between monthly and yearly pricing
 * @param monthlyPrice The monthly price
 * @param yearlyPrice The yearly price
 * @returns The savings percentage
 */
export function calculateYearlySavings(monthlyPrice: number, yearlyPrice: number): number {
  if (!monthlyPrice || !yearlyPrice) return 0;
  
  const annualCostMonthly = monthlyPrice * 12;
  const savings = annualCostMonthly - yearlyPrice;
  const savingsPercentage = Math.round((savings / annualCostMonthly) * 100);
  
  return savingsPercentage;
}

/**
 * Create a Stripe Checkout session for a subscription
 * @param customerId The Stripe customer ID
 * @param priceId The Stripe price ID
 * @param successUrl The URL to redirect to on success
 * @param cancelUrl The URL to redirect to on cancel
 * @param trialDays Optional trial period in days
 * @returns The Stripe Checkout session
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  trialDays?: number
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    subscription_data: trialDays ? {
      trial_period_days: trialDays,
    } : undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

/**
 * Create a Stripe Customer Portal session
 * @param customerId The Stripe customer ID
 * @param returnUrl The URL to redirect to after the portal session
 * @returns The Stripe Customer Portal session
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Retrieve a Stripe subscription
 * @param subscriptionId The Stripe subscription ID
 * @returns The Stripe subscription
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel a Stripe subscription
 * @param subscriptionId The Stripe subscription ID
 * @param cancelAtPeriodEnd Whether to cancel at the end of the billing period
 * @returns The updated Stripe subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });
}

/**
 * Update a Stripe subscription
 * @param subscriptionId The Stripe subscription ID
 * @param priceId The new Stripe price ID
 * @returns The updated Stripe subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  priceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: priceId,
      },
    ],
  });
}
