export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db, workspaces } from '@/lib/db'
import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body      = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const workspaceId = session.metadata?.workspaceId
        if (!workspaceId) break

        await db.update(workspaces)
          .set({
            stripeCustomerId:     session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            subscriptionStatus:   'active',
            updatedAt:            new Date(),
          })
          .where(eq(workspaces.id, workspaceId))
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        const [ws] = await db.select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.stripeCustomerId, customerId))
          .limit(1)
        if (!ws) break

        const priceId = sub.items.data[0]?.price?.id
        const planId  = mapPriceToPlan(priceId)

        await db.update(workspaces)
          .set({
            stripeSubscriptionId: sub.id,
            stripePriceId:        priceId ?? null,
            subscriptionStatus:   sub.status,
            planId:               planId ?? 'free',
            billingPeriodEnd:     new Date((sub as any).current_period_end * 1000),
            updatedAt:            new Date(),
          })
          .where(eq(workspaces.id, ws.id))
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        const [ws] = await db.select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.stripeCustomerId, customerId))
          .limit(1)
        if (!ws) break

        await db.update(workspaces)
          .set({
            subscriptionStatus:   'canceled',
            planId:               'free',
            stripeSubscriptionId: null,
            stripePriceId:        null,
            updatedAt:            new Date(),
          })
          .where(eq(workspaces.id, ws.id))
        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        const customerId = inv.customer as string
        // attempt_count ≥ 3 → final failure → downgrade to free
        const attemptCount = (inv as any).attempt_count ?? 1

        const [ws] = await db.select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.stripeCustomerId, customerId))
          .limit(1)
        if (!ws) break

        if (attemptCount >= 3) {
          // Final attempt failed — downgrade to free immediately
          await db.update(workspaces)
            .set({
              subscriptionStatus:   'canceled',
              planId:               'free',
              stripeSubscriptionId: null,
              stripePriceId:        null,
              updatedAt:            new Date(),
            })
            .where(eq(workspaces.id, ws.id))
        } else {
          await db.update(workspaces)
            .set({ subscriptionStatus: 'past_due', updatedAt: new Date() })
            .where(eq(workspaces.id, ws.id))
        }
        break
      }

      case 'invoice.payment_action_required': {
        // Mark as past_due when additional action needed (SCA etc)
        const inv = event.data.object as any
        const customerId = inv.customer as string
        const [ws] = await db.select({ id: workspaces.id })
          .from(workspaces).where(eq(workspaces.stripeCustomerId, customerId)).limit(1)
        if (!ws) break
        await db.update(workspaces)
          .set({ subscriptionStatus: 'past_due', updatedAt: new Date() })
          .where(eq(workspaces.id, ws.id))
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Stripe webhook processing error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

function mapPriceToPlan(priceId?: string): string | null {
  if (!priceId) return null
  const map: Record<string, string> = {
    [process.env.STRIPE_STARTER_PRICE_ID ?? '']:    'starter',
    [process.env.STRIPE_PRO_PRICE_ID ?? '']:        'pro',
    [process.env.STRIPE_ENTERPRISE_PRICE_ID ?? '']: 'enterprise',
  }
  return map[priceId] ?? null
}

