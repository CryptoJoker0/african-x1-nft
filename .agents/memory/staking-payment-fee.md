---
name: Staking payment fee
description: The staking flow requires a configurable XNT payment to the treasury before a position is created.
---

The staking gas fee is configured in XNT so the administrator can adjust it as the XNT/USD price changes. The browser sends the payment to the configured treasury, while the server verifies the sender, treasury, amount, and on-chain success before inserting the stake. A unique payment signature prevents reuse.

**Why:** Staking should charge a real on-chain fee and must not rely on a client-only confirmation or allow one payment to fund multiple stakes.

**How to apply:** Keep the fee amount, treasury, RPC endpoint, and payment signature validation server-controlled; apply the related Supabase migration before enabling the flow.