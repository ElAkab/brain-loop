# Test Stripe Payments in Local Development

## The Problem

Your Stripe webhook is configured for your production Vercel URL, but you want to test payments locally on `localhost:3000`.

## Solution: Use Stripe CLI for Local Testing

### Step 1: Install Stripe CLI

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
```bash
scoop install stripe
```

**Linux:**
```bash
# Download from https://github.com/stripe/stripe-cli/releases
```

### Step 2: Login to Stripe

```bash
stripe login
```

This will open a browser window to authenticate.

### Step 3: Start Webhook Forwarding

In a **separate terminal**, run:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

You should see output like:
```
⡆ Getting ready... > Ready! You are using Stripe API Version [2024-...].
⡆ Getting ready... Your webhook signing secret is whsec_xxxxxxxxxxxxxxxx (^C to quit)
```

### Step 4: Update Your .env.local

Copy the webhook secret (`whsec_...`) from the terminal output:

```bash
# .env.local
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # <-- Copy from terminal
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Important:** The `STRIPE_WEBHOOK_SECRET` changes every time you run `stripe listen`, so you need to update it each time.

### Step 5: Start Your Development Server

```bash
pnpm dev
```

### Step 6: Test a Purchase

1. Go to http://localhost:3000/payment
2. Click on a credit pack (e.g., "Starter Pack - 5€")
3. Use Stripe test card: `4242 4242 4242 4242`
4. Any future date (e.g., 12/34)
5. Any CVC (e.g., 123)
6. Any ZIP code

### Step 7: Verify in Terminal

You should see in the `stripe listen` terminal:
```
2024-...  --> POST http://localhost:3000/api/webhooks/stripe [200]
```

And in your app terminal:
```
Added 50 credits to user xxx. New balance: 50
```

## Alternative: Test Without Webhook (Quick & Dirty)

If you just want to test the UI flow without webhooks:

1. Buy credits on localhost
2. Go to Stripe Dashboard → Payments
3. Find the payment and click "..." → "Send test webhook"
4. This will trigger the webhook to your Vercel production URL
5. Your production database will be updated
6. Your local app won't see the credits (different DB)

**Not recommended** for full testing, but works for UI verification.

## Production Deployment Checklist

Before going live:

1. **Switch to Stripe Live Mode:**
   - Dashboard → Activate account
   - Replace test keys with live keys in Vercel env vars

2. **Configure Production Webhook:**
   - Stripe Dashboard → Webhooks → Add endpoint
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`

3. **Update Vercel Environment Variables:**
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_... (from production webhook)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   NEXT_PUBLIC_SITE_URL=https://your-domain.com
   ```

4. **Test Live Mode:**
   - Use real card (small amount)
   - Verify credits are added

## Troubleshooting

### "No signatures found matching the expected signature"

The `STRIPE_WEBHOOK_SECRET` is wrong or expired. Run `stripe listen` again and copy the new secret.

### "Cannot connect to localhost:3000"

Your dev server isn't running. Start it with `pnpm dev`.

### Payment succeeds but no credits added

Check the `stripe listen` terminal for errors. The webhook might be failing silently.

### "You cannot use a live-mode API key in test mode"

You're using production keys (`sk_live_`) with test mode. Use `sk_test_` keys for local development.
