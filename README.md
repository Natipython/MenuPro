# MenuApp Pro

A multi-tenant SaaS platform for Restaurants, Cafes, and Bars. It features 24 pre-built templates, dynamic QR code generation, a Kitchen Display System (KDS), and a robust Admin Dashboard.

## Architecture

This project is built using:
- **SvelteKit** (Frontend framework)
- **TypeScript** (Strict typing)
- **Prisma** (Database ORM schema, mapped to PostgreSQL)
- **IndexedDB / Dexie** (Offline caching for PWA)
- **Vercel** (Deployment pipeline)

## Key Features

1. **24 Business Templates**: Found in `templates/business-types/`. These JSON definitions drive the entire UI, required sections, and options.
2. **Customer PWA**: Mobile-first interface for scanning QR codes, browsing the menu, adding to cart, and checking out via Stripe/Cash.
3. **Live Order Tracking**: WebSocket stubs push updates from the KDS to the customer's phone instantly.
4. **Kitchen Display System (KDS)**: Kanban-style board for chefs to manage incoming orders.
5. **Business Dashboard**: Comprehensive admin tools including Menu Builder, Role-Based Access Control (RBAC), and Audit Logs.

## Setup & Running

```bash
cd app
npm install
npm run dev
```

> **Note**: Due to strict environment limits during the build phase, `npm install` for Prisma may require you to run it locally on your machine. The Prisma schema is located at `app/prisma/schema.prisma`.

## Deployment

The application is configured for Vercel. 
Simply push to GitHub and Vercel will automatically deploy based on the `vercel.json` and `.github/workflows/deploy.yml` configurations.
