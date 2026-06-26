# Villeto - Spend Management & Procurement Platform

Villeto is a modern, enterprise-grade spend management and procurement platform built with Next.js. It streamlines company expenses, purchase requests, purchase orders, vendor management, and complex approval workflows into a single, intuitive interface.

## 🚀 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (Client-side & Persisted state)
- **Data Fetching**: [React Query v5](https://tanstack.com/query/latest) & Axios
- **Form Handling & Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: Radix UI primitives, custom animated UI layers, and modular components
- **Icons**: Lucide React, Iconsax, and Hugeicons

## ✨ Key Features

### 1. Robust Procurement Workflow
- **Purchase Requests (PR)**: Multi-stage workflows for creating, reviewing, and approving purchase requests.
- **Purchase Orders (PO)**: Seamless conversion of approved PRs into formal Purchase Orders.
- **Categorization**: Manage procurement categories and accounting line items natively.

### 2. Comprehensive Expense Management
- **Personal & Company Expenses**: Employees can track their personal corporate spend, while administrators can oversee department or company-wide expenses.
- **Reimbursements & Travel**: Dedicated workflows for travel requests and out-of-pocket reimbursements.
- **Card Transactions**: Integration-ready interface for reconciling corporate card transactions.

### 3. Advanced Role-Based Access Control (RBAC)
- Highly granular, resource-and-action-based permission system (e.g., `procurement.purchase_request.read_company`, `expense.report.approve`).
- UI automatically adapts and gates views/actions based on the user's explicit capabilities and department scope.

### 4. Vendor Management
- Maintain a central directory of vendors.
- Bulk invite capabilities and transaction history tracking.

### 5. Onboarding & Tour Guides
- Integrated contextual Walkthroughs (`VilletoTourGuide`) and Setup Guides (`VilletoSetupGuide`) to seamlessly onboard new employees and admins.

## 📂 Project Structure

```text
src/
├── app/                  # Next.js App Router (Pages & Layouts)
│   ├── (dashboard)/      # Protected dashboard routes (Procurement, Expenses, People, etc.)
│   ├── login/            # Authentication entry points
│   └── onboarding/       # Multi-step company/user onboarding flows
├── components/           # Reusable UI elements
│   ├── dashboard/        # Complex dashboard components (Sidebar, Layouts, Data Tables)
│   ├── expenses/         # Domain-specific expense components
│   ├── form fields/      # Custom React Hook Form inputs
│   └── ui/               # Base UI primitives (Buttons, Cards, Modals, Tabs)
├── hooks/                # Custom React hooks (e.g., useAxios, usePermissions)
├── lib/                  # Utilities, formatters, and constants
│   ├── constants/        # API keys, Query keys, Status configurations
│   └── schemas/          # Zod validation schemas
├── queries/              # React Query hooks organized by domain
│   ├── auth/             
│   ├── procurement/      
│   └── departments/      
└── stores/               # Zustand global state stores (Auth, Tour, UI state)
```

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm, yarn, or pnpm

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure Environment Variables:
   Create a `.env.local` file in the root directory.
   ```env
   NEXT_PUBLIC_API_URL=your_api_url_here
   ```

3. Run the Development Server:
   ```bash
   npm run dev
   ```
   *Note: This project supports Turbopack for faster local development.*

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Building for Production

To create an optimized production build, run:

```bash
npm run build
```

This will compile the TypeScript, optimize the assets, and generate static/dynamic routes. Once built, you can preview the production server with:

```bash
npm start
```

## 🧠 Design Philosophy & Best Practices

- **Optimistic UI & Caching**: We leverage React Query's extensive caching and `select` capabilities to keep the dashboard feeling instantaneous, even when performing background refetches.
- **Strictly Typed**: Everything from API responses to generic hook payloads is strictly typed with TypeScript.
- **Component Modularity**: UI is driven by small, strictly bounded components. Forms are managed centrally using Zod schemas to ensure absolute data integrity before it reaches the API.
- **Graceful Degradation**: The UI anticipates loading states (using beautifully animated Skeletons) and permission barriers, guaranteeing users never experience jarring layout shifts.
