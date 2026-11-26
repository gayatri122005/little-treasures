# Little Treasures

Little Treasures is a Next.js 16 App Router storefront. Its backend is implemented with Node.js Route Handlers, MySQL through `mysql2`, and the existing cookie/JWT customer and admin authentication. The bag is kept in browser storage; checkout submits product IDs and quantities only, and the server reloads product prices and stock from MySQL.

## Database setup

- For a new database, create the database and run [`scripts/init-db.sql`](./scripts/init-db.sql).
- For an existing database, apply the project’s outstanding migrations in order for its current schema. For Razorpay checkout specifically, back up the database and run [`scripts/razorpay-payment-migration.sql`](./scripts/razorpay-payment-migration.sql) **once** after the existing users, products, orders, order-items and payments tables exist.
- Do not run the Razorpay migration on a new database initialized with the updated `init-db.sql`; it already contains those tables and fields.
- Keep uploaded media in `storage/product-media` and back it up with the database.
- For an existing database, apply [`scripts/categories-crud-migration.sql`](./scripts/categories-crud-migration.sql) once. It adds category slugs, images, active/inactive status, and indexes. Category uploads are stored in `storage/category-media`.

## Environment configuration

Copy `.env.example` values into the ignored `.env.local` file. Keep all secrets server-side; only the Razorpay Key ID is sent to Standard Checkout.

```dotenv
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
STORE_SHIPPING_AMOUNT=0
STORE_TAX_RATE_PERCENT=0
ENABLE_COD=true
RESEND_API_KEY=
ORDER_EMAIL_FROM=
```

`STORE_SHIPPING_AMOUNT` is the flat shipping charge in rupees. The tax percentage is applied to subtotal plus shipping. Both default to zero, and discounts currently remain zero because no promotion rules exist in this project. Set these values to the merchant’s approved pricing and tax configuration before accepting orders. Set `ENABLE_COD=false` to hide and reject COD checkout.

Order emails use Resend’s email API when both `RESEND_API_KEY` and `ORDER_EMAIL_FROM` are configured. Verify the sender domain with the email provider before production. Without these values, orders and payments still work, but email delivery is skipped.

## Razorpay Test Mode

1. Create or activate the merchant account and enable the required payment methods in the Razorpay Dashboard.
2. Switch the Dashboard to **Test Mode**, generate a Test API Key ID and Key Secret, and place them in `.env.local` as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
3. Restart the Next.js server after changing environment variables. Sign in with a customer account, add an in-stock product to the bag, and continue to `/checkout`.
4. Use Razorpay’s current [test card](https://razorpay.com/docs/payments/payments/test-card-details) and [test UPI](https://razorpay.com/docs/payments/payments/test-upi-details) values. No real charge is made in Test Mode.
5. In the Dashboard, enable automatic capture (or otherwise ensure payments reach `captured`). Orders and stock are committed only after the server verifies a captured payment.

The checkout uses Razorpay Standard Checkout and server-side Orders, Payments and Refunds APIs. UPI apps such as Google Pay, PhonePe and Paytm appear through Razorpay’s supported UPI flow when enabled for the merchant account. Payment-method availability and wallet support depend on Razorpay account approval and configuration.

## Webhook setup

Deploy the app to a public HTTPS origin, then configure this endpoint in the Razorpay Dashboard in **Test Mode**:

```text
https://YOUR_PUBLIC_HOST/api/webhooks/razorpay
```

Use a separate webhook secret as `RAZORPAY_WEBHOOK_SECRET`. Subscribe to `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, and `refund.failed`. The route verifies the HMAC against the exact raw body, records the Razorpay event ID for duplicate protection, and processes captured payments idempotently. Localhost is not reachable by Razorpay; use a public HTTPS development/staging URL for webhook tests.

Use separate Test and Live API keys and webhook secrets. Configure and verify the production webhook separately when switching to Live Mode. Refund APIs and individual methods may require additional merchant activation.

## Orders and admin

- Customers must be signed in to checkout. Order history is in `/customer-dashboard`.
- Admins can review orders, payments, COD, transaction attempts, date/status filters, CSV reports, fulfillment updates and eligible Razorpay refunds at `/admin/orders`.
- Category CRUD is available at `/admin/categories`. It is protected by the server-side admin session check and the category route handlers independently enforce admin authorization.
- Online checkout reserves stock briefly; verified capture commits the stock reduction once. COD commits stock when the order is placed. Failed online attempts do not decrement on-hand stock, and an order may be retried while its reservation is active.
- Customer emails are sent for confirmed orders/payments, failed payment attempts, shipment, delivery and processed refunds when Resend is configured.

## Local verification

```bash
npm install
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

Before enabling Live Mode, test successful, failed, cancelled and pending payments; retry; duplicate and invalid-signature webhooks; COD; stock contention; customer order history; admin filters/export; and full/partial refunds in Test Mode. Test credentials and merchant webhook configuration are required for end-to-end Razorpay transactions.
