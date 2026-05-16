import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia', typescript: true })
  }
  return _stripe
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})

export const STRIPE_PLANS = [
  {
    id:      'free',
    name:    'Free',
    price:   0,
    priceId: null as string | null,
    limits:  { contacts: 500, messages: 1_000, campaigns: 5, users: 1 },
    features: ['1,000 messages/mo', '500 contacts', '5 campaigns', '1 user seat', 'Basic analytics'],
  },
  {
    id:      'starter',
    name:    'Starter',
    price:   29,
    priceId: process.env.STRIPE_STARTER_PRICE_ID as string | null,
    limits:  { contacts: 5_000, messages: 10_000, campaigns: 20, users: 3 },
    features: ['10,000 messages/mo', '5,000 contacts', '20 campaigns', '3 user seats', 'API access', 'Standard analytics'],
  },
  {
    id:      'pro',
    name:    'Pro',
    price:   79,
    priceId: process.env.STRIPE_PRO_PRICE_ID as string | null,
    limits:  { contacts: 25_000, messages: 50_000, campaigns: -1, users: 10 },
    features: ['50,000 messages/mo', '25,000 contacts', 'Unlimited campaigns', '10 user seats', 'AI smart import', 'Priority support', 'Advanced analytics'],
  },
  {
    id:      'enterprise',
    name:    'Enterprise',
    price:   199,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID as string | null,
    limits:  { contacts: -1, messages: -1, campaigns: -1, users: -1 },
    features: ['Unlimited messages', 'Unlimited contacts', 'Unlimited campaigns', 'Unlimited seats', 'Custom domain', 'Dedicated support', 'SLA guarantee', 'Custom integrations'],
  },
]

export async function createCheckoutSession(
  workspaceId: string,
  userId:      string,
  email:       string,
  priceId:     string,
  stripeCustomerId?: string | null
): Promise<Stripe.Checkout.Session> {
  const customer = stripeCustomerId ?? (await stripe.customers.create({ email, metadata: { workspaceId, userId } })).id

  return stripe.checkout.sessions.create({
    customer,
    mode:                'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=1`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=1`,
    subscription_data: {
      metadata: { workspaceId, userId },
    },
    metadata: { workspaceId, userId },
    allow_promotion_codes: true,
  })
}

export async function createPortalSession(
  stripeCustomerId: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer:   stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  })
}
