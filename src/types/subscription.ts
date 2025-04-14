/**
 * Type definitions for subscription plans and related data
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  included_seats: number;
  max_messages: number;
  max_emails: number;
  max_call_minutes: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  trial_period_days: number | null;
}

export interface SubscriptionPlanWithPricing extends SubscriptionPlan {
  monthly_price: number | null;
  yearly_price: number | null;
  currency: string;
}

export interface Subscription {
  id: string;
  workspace_id: string;
  subscription_plan_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
  additional_seats: number | null;
  billing_interval: string | null;
  usage_billing_start: string | null;
  usage_billing_end: string | null;
  cancel_at_period_end?: boolean; // Flag to indicate subscription will be canceled at the end of the period
  trial_period_days?: number | null; // Number of days in the trial period
}

export interface UsageRecord {
  id: string;
  workspace_id: string;
  resource_type: string;
  quantity_used: number;
  recorded_at: string;
  created_by: string | null;
  created_at: string;
}

export type BillingInterval = "monthly" | "yearly";
