# Quicktronics

Premium dark electronics storefront with separate customer and owner systems. The application consists of a React/Vite storefront and an Express/Mongoose API. Catalog, users, orders, reviews, wishlists, coupons and banners are stored in MongoDB; product data is loaded from the API.

## Run locally

1. Install Node.js 20+ and MongoDB Community or create a MongoDB Atlas database.
2. Copy `.env.example` to `server/.env` and set `MONGODB_URI`, a long random `JWT_SECRET`, and the owner credentials. Keep this file private. This workspace already has a local `server/.env`; do not commit it.
3. Install dependencies from the project root with `npm install`, then install the two applications with `npm install --prefix server` and `npm install --prefix client`.
4. Run `npm run seed --prefix server` once to add the starter categories, inventory, and `WELCOME300` coupon to MongoDB.
5. Run `npm run dev` from the root. Vite serves `http://localhost:5173`; the API listens on `http://localhost:5000`.
6. For a production frontend bundle, run `npm run build`. Run the API with `npm start --prefix server` after setting `CLIENT_URL` to the deployed storefront origin.

## Data and owner access

The first admin is created on the first successful `/admin/login` using the configured `ADMIN_EMAIL` and `ADMIN_PASSWORD`; rotate the password and remove/rotate bootstrap credentials after initial setup. Admin role is never accepted from public registration. Customers use `/register` and `/login`; owners use `/admin/login`.

## Integrations

- MongoDB: set `MONGODB_URI` to a local or Atlas connection URI.
- Images: image URL fields work directly. To enable admin uploads, configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- Razorpay: set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to test credentials. The checkout script is included; online orders remain pending until the backend verifies Razorpay's HMAC signature. Cash on Delivery works without gateway credentials.
- Password resets: one-time, hashed reset tokens expire after 30 minutes. Configure `RESEND_API_KEY` and `EMAIL_FROM` with a verified sender to deliver links. Signed-in customers can change their password, which invalidates their older sessions.

## Included

- Responsive premium dark customer storefront, category/product listings, search, sorting, price range, product detail, review submission and display, wishlist, persistent guest cart, checkout, COD, Razorpay order creation and signature verification.
- Customer registration/login with bcrypt, HTTP-only JWT cookies, profile editing, expiring password-reset email links, password changes that revoke old sessions, order history, and protected account routes.
- Separate admin sign-in and role-protected dashboard with overview, create/edit/delete product and category forms, order/customer/inventory/coupon/banner management. Catalog mutations broadcast Socket.IO updates.
- Admin review moderation, sales overview, seven-day revenue chart, and live catalog/banner refreshes.
- Mongoose schemas with timestamps, unique indexes, backend validation, Helmet, CORS, auth rate limiting, environment-based secrets and error handling.

The current payment verification path validates the gateway signature before marking an online order paid and decrementing inventory. For a public production deployment, also add Razorpay webhooks with replay/idempotency handling, transactional stock reservation, and CSRF protection appropriate to the deployment's cookie/origin setup.
