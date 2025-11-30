# Volume Discount App

A Shopify app that provides a "Buy 2, Get X% Off" volume discount functionality. When customers add 2 or more eligible products to their cart, they automatically receive a percentage discount at checkout.

## Features

- **Automatic Cart Discounts**: Discounts are applied automatically when customers add 2+ eligible products
- **Configurable Discount Percentage**: Set any discount between 1-80%
- **Product Selection**: Choose specific products that qualify for the volume discount
- **Storefront Widget**: Display "Buy 2, get X% off" messaging on product pages
- **Admin Interface**: Easy-to-use configuration panel in the Shopify admin

## Architecture

This app consists of three main components:

1. **React Router App** (`app/`) - The embedded admin interface for configuring discounts
2. **Shopify Function** (`extensions/buy-2-get-percent-off/`) - Cart line discount function that applies discounts at checkout
3. **Theme App Extension** (`extensions/volume-discount-pdp-block/`) - Liquid block to display discount messaging on product pages

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20.19+ (but < v22) or v22.12+
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) v3.x
- A [Shopify Partner account](https://partners.shopify.com/)
- A [Shopify development store](https://help.shopify.com/en/partners/dashboard/development-stores)

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd volume-discount-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Connect to Your Shopify App

If this is your first time setting up, link the app to your Shopify Partner account:

```bash
npm run config:link
```

Follow the prompts to:
- Select your organization
- Create a new app or connect to an existing one
- Select a development store

### 4. Start the Development Server

```bash
npm run dev
```

This will:
- Start the local development server
- Create a secure tunnel (via Cloudflare) to expose your local app
- Build and deploy the Shopify Function
- Build the theme app extension

Wait for the message: `✅ Ready, watching for changes in your app`

### 5. Install the App on Your Development Store

After the dev server is running, use the **Preview URL** shown in the terminal:

```
Preview URL: https://your-store.myshopify.com/admin/oauth/redirect_from_cli?client_id=<your-client-id>
```

Copy this URL and open it in your browser. Click **Install** when prompted.

> **Note**: Always use the Preview URL from the terminal after running `npm run dev`. The URL changes each time you restart the dev server.

---

## Configuring the Volume Discount

### Accessing the Configuration Panel

1. Open your Shopify admin: `https://your-store.myshopify.com/admin`
2. Navigate to **Apps** in the left sidebar
3. Click on **volume-discount-app**

### Setting Up a Discount

1. **Select Products**
   - Click the **"Select Products"** button
   - Use the product picker to choose which products are eligible for the discount
   - You can select multiple products

2. **Set Discount Percentage**
   - Enter a value between 1 and 80 in the discount percentage field
   - This is the percentage off customers will receive when they buy 2+ eligible items

3. **Save Settings**
   - Click the **"Save Settings"** button in the top right
   - A success toast will appear confirming your settings were saved

### Configuration Options

| Setting | Description | Range |
|---------|-------------|-------|
| **Eligible Products** | Products that qualify for the discount | 1+ products required |
| **Discount Percentage** | Percentage off when buying 2+ items | 1-80% |
| **Minimum Quantity** | Number of items required (fixed) | 2 items |

---

## Adding the Storefront Widget

To display the "Buy 2, get X% off" message on product pages:

### 1. Open the Theme Editor

Navigate to: `https://your-store.myshopify.com/admin/themes/current/editor`

Or go to **Online Store → Themes → Customize**

### 2. Add the Volume Discount Block

1. Navigate to a **product page** template
2. Click **Add block** or **Add section**
3. Under **Apps**, find **"Volume Discount Message"**
4. Add it to your desired location (typically near the "Add to Cart" button)
5. Click **Save**

The widget will automatically show "Buy 2, get X% off" only on products that are configured for the volume discount.

---

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build the app for production |
| `npm run deploy` | Deploy the app to Shopify |
| `npm run lint` | Run ESLint to check for code issues |
| `npm run typecheck` | Run TypeScript type checking |

### Project Structure

```
volume-discount-app/
├── app/                          # React Router application
│   ├── routes/
│   │   ├── app.tsx              # Main app layout with navigation
│   │   ├── app._index.tsx       # Volume discount configuration page
│   │   └── auth.*.tsx           # Authentication routes
│   └── shopify.server.ts        # Shopify authentication config
├── extensions/
│   ├── buy-2-get-percent-off/   # Shopify Function for cart discounts
│   │   └── src/
│   │       └── cart_lines_discounts_generate_run.ts
│   └── volume-discount-pdp-block/  # Theme app extension
│       └── blocks/
│           └── volume-discount.liquid
├── prisma/
│   └── schema.prisma            # Database schema for sessions
└── shopify.app.toml             # App configuration
```

### How the Discount Works

1. **Configuration Storage**: Discount settings are stored in a shop metafield (`volume_discount.rules`)
2. **Function Execution**: When a customer's cart is evaluated, the Shopify Function:
   - Reads the configuration from the shop metafield
   - Checks if cart items match eligible products
   - Applies the percentage discount to items where quantity ≥ 2
3. **Storefront Display**: The theme block reads the same metafield to show messaging

---

## Deploying to Production

### 1. Build and Deploy

```bash
npm run deploy
```

This will:
- Build all extensions
- Upload the app version to Shopify
- Create a new release

### 2. Update App URLs

After deploying, update your app's URLs in the [Shopify Partner Dashboard](https://partners.shopify.com/):

1. Go to your app's configuration
2. Update the **App URL** and **Redirect URLs** to your production domain

---

## Troubleshooting

### "Example Domain" Page After Installation

This happens when the OAuth flow doesn't complete properly. Solution:

1. Make sure `npm run dev` is running
2. Use the **Preview URL** from the terminal (not the Apps menu in Shopify admin)
3. If the issue persists, reset your local database:
   ```bash
   npx prisma migrate reset --force
   ```
   Then restart `npm run dev` and reinstall the app.

### Discount Not Applying at Checkout

1. Verify the discount is saved (check the "Current Configuration" sidebar in the app)
2. Ensure you have at least 2 eligible products in the cart
3. Check that the Shopify Function is deployed (`npm run deploy`)

### Theme Block Not Showing

1. Make sure the app is installed on the store
2. Verify the product is in the eligible products list
3. Check if the theme block is added to the product page template

---

## Tech Stack

- **Frontend**: React, React Router v7
- **Backend**: React Router (Node.js)
- **Database**: SQLite (via Prisma)
- **Shopify**: App Bridge, Shopify Functions, Theme App Extensions
- **Build Tools**: Vite, TypeScript

---

## License

[MIT](LICENSE)
