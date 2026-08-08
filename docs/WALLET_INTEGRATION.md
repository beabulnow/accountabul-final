# Wallet Integration Plan

Status: planned for Phase 6; testnet first.

## Scope and trust boundary

- XRPL connection and signing uses Xaman.
- EVM connection uses WalletConnect through Reown AppKit with Wagmi/Viem.
- Enabled EVM networks and assets are allowlisted individually. “EVM compatible” does
  not mean every chain is automatically accepted.
- Supabase Auth remains the account identity. Wallet signatures only prove control of an
  address; they never assign `user_roles` or `business_members` permissions.
- Accountabul never receives or stores a seed phrase, private key, or signing authority.
- Xaman API secrets, private RPC credentials, webhook verification, quotes, and payment
  reconciliation stay server-side.

## Planned schema

Migration `0012_wallet_accounts_and_destinations` adds verified wallet accounts,
single-use/expiring link challenges, and authorized business payout destinations.
Migration `0013_onchain_payment_attempts` adds exact asset/network/recipient/amount
attempts plus chain reconciliation cursors. Existing `tips` and `payment_events` remain
the canonical payment ledger.

All status-changing writes run through authenticated server functions or privileged
reconciliation handlers. Users may read their own wallets and attempts; authorized
business members may read attempts sent to their business; admins may read reconciliation
queues.

## Planned application surfaces

- `/dashboard/wallets` — connect, verify, review, and unlink personal wallets.
- `/dashboard/business` — choose a verified payout destination for an allowed asset.
- `/wallet/xaman-return` and `/api/public/webhooks/xaman` — Xaman completion paths.
- `/live/$slug` — choose Stripe, XRP, or an enabled EVM rail.
- `/dashboard/billing` — network, transaction, confirmation state, and receipt links.
- `/admin` — stuck attempts, reconciliation, and provider/chain health.

## Verification rules

EVM challenges bind nonce, domain, URI, chain, issued time, expiry, and address. They are
consumed atomically and reject replay. EOA signatures are recovered; supported contract
wallets are verified through ERC-1271.

Xaman sign-in payloads are created on the server. Webhook/return state is never trusted
by itself; the server fetches the authoritative payload and validates the address,
network, challenge, and completion status.

An XRPL payment is final only after a validated successful transaction matches the exact
destination and delivered amount. An EVM payment is final only after a successful receipt
on an allowed chain matches the payer, recipient, native value or token transfer, and the
configured confirmation policy. Missed callbacks and reorganizations are handled by
scheduled reconciliation.

## Configuration handoff

Public/client:

- `VITE_REOWN_PROJECT_ID`
- application URL/name/icon metadata
- approved EVM chain IDs (non-secret but centrally configured)

Server-only:

- `XAMAN_API_KEY`
- `XAMAN_API_SECRET`
- `XRPL_NETWORK` and `XRPL_RPC_URL`
- RPC URL/API key per enabled EVM chain
- confirmation requirements
- reconciliation job secret
- quote provider key when a USD-denominated tip is converted to a crypto amount

The Reown project must allowlist exact preview and production origins. Xaman must be
configured with the production return and webhook URLs. No mainnet rail is enabled until
the equivalent testnet flow passes the Phase 6 gate.
