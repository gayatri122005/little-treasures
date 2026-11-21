This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Admin product catalog

Product management is available at `/admin/products` for authenticated admin
accounts. It manages Apparel, Bags, Jewellery, and Home & Gifts, including
product details, inventory, publishing, optimized images, and product videos.

For a new database, create the database and run `scripts/init-db.sql`. For an
existing database, run `scripts/product-media-migration.sql` once to add image
and video metadata and seed the four product categories. Do not run that
migration on a fresh database that already used the updated `init-db.sql`.
After the media migration, run `scripts/storefront-flags-migration.sql` once to
add homepage placement flags and the newsletter subscriber table. The
newsletter form stores confirmed email sign-ups in MySQL; an email campaign
provider is not configured.
With XAMPP, these scripts can be imported from phpMyAdmin after selecting the
`little_treasures_db` database.
Configure the MySQL connection and `JWT_SECRET` in `.env.local`, then start the
app and sign in with an admin account.

Uploaded files are stored outside the public directory in
`storage/product-media`; back up this directory alongside MySQL. Images are
validated and converted to WebP (up to 8 MB each); MP4/WebM videos are validated
and limited to 40 MB each. The app serves video byte ranges for playback seeking.
Products with order history cannot be hard-deleted; unpublish them instead.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
