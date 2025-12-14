# ZetaSave V2 - Cross-Chain Savings Platform

A unified React application built with Vite, TypeScript, Tailwind CSS, and React Router for managing cross-chain savings.

## Project Structure

```
ZetaSaveV2/
├── src/wall
│   ├── pages/
│   │   ├── StartingPage.tsx    # Entry page with savings plan form
│   │   ├── WalletPage.tsx      # Wallet connection page
│   │   └── DashboardPage.tsx   # Main dashboard after starting savings
│   ├── components/
│   │   ├── ui/                 # Shared UI components (shadcn/ui)
│   │   ├── wallet-connect-card.tsx
│   │   ├── dashboard-layout.tsx
│   │   └── ...                 # Other dashboard components
│   ├── lib/
│   │   └── utils.ts            # Utility functions
│   ├── App.tsx                 # Main app with routing
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── public/                      # Static assets
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Routes

- `/` - Starting page (default route)
- `/wallet` - Wallet connection page
- `/dashboard` - Main savings dashboard

## Navigation Flow

1. **Starting Page (`/`)**

   - Click "Connect MetaMask Wallet" or "Connect Wallet" → navigates to `/wallet`
   - Click "Start Saving Plan" → navigates to `/dashboard`

2. **Wallet Page (`/wallet`)**

   - Connect wallet using RainbowKit (to be integrated)

3. **Dashboard Page (`/dashboard`)**
   - View savings progress, AI chat panel, and multi-chain balances

## Tech Stack

- **Vite** - Build tool and dev server
- **React 19** - UI library
- **TypeScript** - Type safety
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **next-themes** - Theme management
- **Wagmi + RainbowKit** - Web3 wallet integration (to be configured)

## Getting Started

### Installation

```bash
# Install dependencies
npm install
# or
pnpm install
```

### Development

```bash
npm run dev
# or
pnpm dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
# or
pnpm build
```

### Preview Production Build

```bash
npm run preview
# or
pnpm preview
```

## Next Steps

1. **Configure Wagmi + RainbowKit**

   - Set up wallet connectors
   - Configure supported chains
   - Add wallet connection logic

2. **Add Environment Variables**

   - Create `.env` file for API keys and chain configurations

3. **Implement Backend Integration**
   - Connect to ZetaChain
   - Implement savings plan creation
   - Add balance fetching logic

## Notes

- All UI components and styles from the original three Next.js projects have been preserved
- The app uses the same Christmas-themed visual style
- Button names and functionality remain unchanged as per requirements
