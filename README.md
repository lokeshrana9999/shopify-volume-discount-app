# Volume Discount App

## 1️⃣ Project Overview

### Description

This app enables merchants to configure a **"Buy 2, get X% off"** automatic discount for selected products using Shopify Discount Functions.

### Problem It Solves

Merchants often want to incentivize bulk purchases by offering volume-based discounts. This app provides an easy way to:
- Select specific products eligible for the discount
- Set a custom discount percentage
- Automatically apply discounts at checkout without manual coupon codes
- Display promotional messaging on product pages

### Features Implemented

| Feature | Description |
|---------|-------------|
| **Admin UI** | Embedded app interface to select products and set discount percentage |
| **Discount Function** | Shopify Function targeting `cart.lines.discounts.generate.run` for automatic cart discounts |
| **Theme App Extension** | Online Store 2.0 block displaying "Buy 2, get X% off" message on product pages |
| **JSON Metafield Config** | Configuration stored in shop metafield for persistence and cross-extension access |

---

## 2️⃣ Tech Stack & Architecture

### Tech Stack

| Technology | Purpose |
|------------|---------|
| **React Router v7** | Full-stack web framework for the embedded admin app |
| **TypeScript** | Type-safe development |
| **Prisma + SQLite** | Session storage |
| **Shopify App Bridge** | Embedded app integration |
| **Shopify Functions** | Serverless discount logic at checkout |

### Shopify Extensions Used

1. **Discount Function** (`buy-2-get-percent-off`)
   - Target: `cart.lines.discounts.generate.run`
   - Applies percentage discount when cart contains 2+ eligible items

2. **Theme App Extension** (`volume-discount-pdp-block`)
   - Online Store 2.0 block
   - Displays promotional message on product detail pages

### Configuration Storage

```
Shop Metafield
├── namespace: volume_discount
├── key: rules
├── type: JSON
└── value: {
      "products": ["gid://shopify/Product/123", ...],
      "minQty": 2,
      "percentOff": 15
    }
```

### Architecture Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐             │
│   │   Admin UI   │ ───► │  Metafield   │ ───► │   Function   │             │
│   │  (React App) │      │    (JSON)    │      │ (Cart Price) │             │
│   └──────────────┘      └──────────────┘      └──────────────┘             │
│         │                      │                     │                      │
│         │                      │                     ▼                      │
│   Merchant selects       Stores config         Reads config &              │
│   products & sets %      persistently          applies discount            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            STOREFRONT FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐             │
│   │    Theme     │ ───► │  Metafield   │ ───► │  PDP Message │             │
│   │  Extension   │      │    (JSON)    │      │   Display    │             │
│   └──────────────┘      └──────────────┘      └──────────────┘             │
│         │                      │                     │                      │
│         │                      │                     ▼                      │
│   Liquid block             Reads config        Shows "Buy 2,               │
│   on product page          on page load        get X% off"                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ Installation & Running Instructions

### Requirements

- [Node.js](https://nodejs.org/) v20.19+ (recommended: v20.x LTS)
- npm (comes with Node.js)
- [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) v3.x
- [Shopify Partner account](https://partners.shopify.com/)
- [Shopify development store](https://help.shopify.com/en/partners/dashboard/development-stores)

### Installation Steps

**1. Clone the repository**

```bash
git clone <repository-url>
cd volume-discount-app
```

**2. Install dependencies**

```bash
npm install
```

**3. Start development server**

```bash
shopify app dev
```

**4. Install the app**

After the dev server starts, look for the **Preview URL** in the terminal output:

```
Preview URL: https://your-store.myshopify.com/admin/oauth/redirect_from_cli?client_id=<your-client-id>
```

Open this URL in your browser and click **Install** when prompted.

> ⚠️ **Important**: Always use the Preview URL from the terminal. The URL changes each time you restart the dev server.

### Deployment (Optional)

To deploy the app to production:

```bash
shopify app deploy
```

---

## 4️⃣ Configuration Instructions

### How to Configure the Volume Discount

**Step 1: Open the App**

1. Go to your Shopify admin: `https://your-store.myshopify.com/admin`
2. Click **Apps** in the left sidebar
3. Click **volume-discount-app**

**Step 2: Configure Discount Settings**

1. **Select Products**: Click **"Select Products"** button and choose products eligible for the discount
2. **Set Discount Percentage**: Enter a value between 1-80%
3. **Save**: Click **"Save Settings"** button

This writes the following JSON to the shop metafield:

```json
{
  "products": ["gid://shopify/Product/123", "gid://shopify/Product/456"],
  "minQty": 2,
  "percentOff": 15
}
```

### How to Add the Theme Block

**Step 1: Open Theme Customizer**

1. Go to **Online Store** → **Themes**
2. Click **Customize** on your active theme

**Step 2: Add the Volume Discount Block**

1. Navigate to a **Product page** template
2. Click **Add block** (or **Add section**)
3. Under **Apps**, select **"Volume Discount Message"**
4. **Position** the block under the product price
5. Click **Save**

The block will display "Buy 2, get X% off" only on eligible products.

---

## 5️⃣ Testing Instructions

### How to Verify the Discount Works

**Test Case 1: Widget Display**

1. Navigate to a **selected product** on your storefront
2. ✅ **Expected**: Widget shows "Buy 2, get X% off"

**Test Case 2: Discount Applied**

1. Add **2 units** of an eligible product to cart
2. ✅ **Expected**: Automatic discount line appears in cart

**Test Case 3: Discount Removed**

1. Reduce quantity to **1 unit**
2. ✅ **Expected**: Discount is removed from cart

**Test Case 4: Non-Eligible Product**

1. Add a **different product** (not in selected list) to cart
2. ✅ **Expected**: No discount applied

### Success Criteria

| Test | Expected Result | Status |
|------|-----------------|--------|
| Widget visible on eligible product | "Buy 2, get X% off" displayed | ✅ PASS |
| 2+ eligible items in cart | Discount line appears | ✅ PASS |
| 1 eligible item in cart | No discount | ✅ PASS |
| Non-eligible product in cart | No discount | ✅ PASS |

---

## 📸 Screenshots

### Partner Dashboard

[Place screenshot 1 here.]

### Dev Store Admin

[Place screenshot 2 here.]

### Admin UI - Volume Discount Settings

[Place screenshot 3 here.]

### PDP Block - Product Page

[Place screenshot 4 here.]

### Cart with Discount Applied

[Place screenshot 5 here.]

---

## ⚠️ Known Limitations

- **Fixed Minimum Quantity**: The minimum quantity is fixed at 2 items. No UI to change this value.
- **No Duplicate Validation**: UI does not prevent selecting the same product twice.
- **Single Discount Rule**: Only one discount configuration can be active at a time.
- **No Variant Selection**: Products are selected at the product level, not variant level.

---

## 🚀 Future Improvements

- **Tiered Discounts**: Support multiple discount tiers (e.g., Buy 2 get 10%, Buy 5 get 20%)
- **Variant Selection**: Allow merchants to select specific variants instead of entire products
- **Date Scheduling**: Add start/end dates for discount campaigns
- **Analytics Dashboard**: Track discount usage and revenue impact
- **Multiple Rules**: Support multiple concurrent discount rules

---

## Project Structure

```
volume-discount-app/
├── app/                              # React Router application
│   ├── routes/
│   │   ├── app.tsx                  # Main app layout
│   │   ├── app._index.tsx           # Volume discount config page
│   │   └── auth.*.tsx               # Authentication routes
│   └── shopify.server.ts            # Shopify auth config
├── extensions/
│   ├── buy-2-get-percent-off/       # Discount Function
│   │   └── src/
│   │       └── cart_lines_discounts_generate_run.ts
│   └── volume-discount-pdp-block/   # Theme Extension
│       └── blocks/
│           └── volume-discount.liquid
├── prisma/                          # Database
│   └── schema.prisma
└── shopify.app.toml                 # App configuration
```

---

## License

MIT
