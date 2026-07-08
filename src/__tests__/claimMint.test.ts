/**
 * claimMint.test.ts
 *
 * Unit tests for the X1 mint business logic (mint.logic.ts).
 * All Supabase clients and fetch() are mocked — no real network calls.
 *
 * Covered scenarios (processClaimMint):
 *   1. Successful mint
 *   2. Failed on-chain payment (tx.meta.err set)
 *   3. Missing SUPABASE_SERVICE_ROLE_KEY
 *   4. Sold-out collection
 *   5. Duplicate mint — transactions ledger idempotency
 *   6. Concurrent mints — claim lock (unique-violation on pending insert)
 *   7. Concurrent mints — atomic NFT guard (partial claim rolled back)
 *   8. Retry after ledger-write failure — nfts.mint_signature idempotency
 *   9. Payment not yet indexed — pending tx cleaned up so user can retry
 *
 * Covered scenarios (verifyPaymentOnChain):
 *   10. Valid payment resolves
 *   11. TX not yet indexed
 *   12. Underpayment
 *   13. RPC unreachable
 *
 * Covered scenarios (processPreflight):
 *   14. Happy path
 *   15. Missing admin key
 *   16. Sold out
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processClaimMint, processPreflight, verifyPaymentOnChain } from "@/lib/mint.logic";

// ─── Mock helpers ─────────────────────────────────────────────────────────────

type DBResult = {
  data: unknown;
  error: { message?: string; code?: string } | null;
  count?: number | null;
};

/**
 * Build a Supabase-like query chain that:
 *   - Returns `self` for every builder method so chains can be arbitrarily long
 *   - Resolves to `result` when awaited directly or via .single() / .maybeSingle()
 */
function makeChain(result: DBResult) {
  const self: Record<string, unknown> = {
    select: () => self,
    update: () => self,
    insert: () => self,
    upsert: () => self,
    delete: () => self,
    eq: () => self,
    neq: () => self,
    in: () => self,
    order: () => self,
    limit: () => self,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: DBResult) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return self;
}

/**
 * Create a mock SupabaseClient whose `from(table)` pops responses from a
 * per-table queue.  This lets each test control exactly what the DB returns
 * for each sequential call on the same table.
 */
function createMockDB(queues: Record<string, DBResult[]>) {
  const state: Record<string, DBResult[]> = Object.fromEntries(
    Object.entries(queues).map(([k, v]) => [k, [...v]]),
  );
  return {
    from: vi.fn().mockImplementation((table: string) => {
      const q = state[table] ?? [];
      const result = q.shift() ?? { data: null, error: null };
      return makeChain(result);
    }),
  };
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const VALID_CONFIG = {
  mint_price: 1,
  max_per_wallet: 5,
  mint_paused: false,
  whitelist_only: false,
  // Must match TREASURY_WALLET constant in mint.logic.ts
  treasury_wallet: "9rMJNa5QiNakB45qyymGBNVcALrcHYvwnm15mQcZJfNK",
  rpc_url: "https://rpc.x1.xyz",
  max_supply: 50,
};

const NFT_1 = { id: "nft-uuid-1", token_id: 1, name: "AFRICAN X1 #001" };
const NFT_2 = { id: "nft-uuid-2", token_id: 2, name: "AFRICAN X1 #002" };

const VALID_SIG = "5xSig" + "A".repeat(85);
const WALLET = "Sender1111111111111111111111111111111111111";
const TREASURY = VALID_CONFIG.treasury_wallet;
const USER_ID = "user-uuid-abc";

/** Build a minimal valid RPC getTransaction response. */
function rpcSuccess(sender = WALLET, treasury = TREASURY, lamports = 1_000_000_000): unknown {
  return {
    result: {
      meta: {
        err: null,
        preBalances: [2_000_000_000, 0],
        postBalances: [2_000_000_000 - lamports - 5_000, lamports],
      },
      transaction: { message: { accountKeys: [sender, treasury] } },
    },
  };
}

function mockFetch(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) }),
  );
}

// ─── processClaimMint ─────────────────────────────────────────────────────────

describe("processClaimMint", () => {
  afterEach(() => vi.unstubAllGlobals());

  // ── Test 1: Successful mint ─────────────────────────────────────────────────
  it("1. returns tokens on a successful mint", async () => {
    mockFetch(rpcSuccess());

    const supabase = createMockDB({
      collection_config: [{ data: VALID_CONFIG, error: null }],
      nfts: [{ data: null, error: null, count: 0 }], // per-wallet count
    });

    // Admin DB: idempotency (confirmed) → nfts.mint_signature → lock insert → assign candidates → assign update → confirm update
    const admin = createMockDB({
      transactions: [
        { data: null, error: null }, // confirmed idempotency: none
        { data: [{ id: "lock-id-1" }], error: null }, // lock insert succeeds
        { data: null, error: null }, // confirm update
      ],
      nfts: [
        { data: [], error: null }, // mint_signature check: none
        { data: [NFT_1], error: null }, // SELECT candidates
        { data: [NFT_1], error: null }, // atomic UPDATE → claimed
      ],
    });

    const result = await processClaimMint({
      signature: VALID_SIG,
      walletAddress: WALLET,
      qty: 1,
      userId: USER_ID,
      supabase: supabase as never,
      getAdmin: async () => admin as never,
    });

    expect(result.alreadyClaimed).toBe(false);
    expect(result.signature).toBe(VALID_SIG);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens![0].name).toBe("AFRICAN X1 #001");
  });

  // ── Test 2: Failed on-chain payment ────────────────────────────────────────
  it("2. throws when the on-chain transaction failed", async () => {
    mockFetch({
      result: {
        meta: {
          err: { InstructionError: [0, "InsufficientFundsForFee"] },
          preBalances: [1000, 0],
          postBalances: [1000, 0],
        },
        transaction: { message: { accountKeys: [WALLET, TREASURY] } },
      },
    });

    const supabase = createMockDB({
      collection_config: [{ data: VALID_CONFIG, error: null }],
      nfts: [{ data: null, error: null, count: 0 }],
    });
    const admin = createMockDB({
      transactions: [
        { data: null, error: null }, // confirmed idempotency
        { data: [{ id: "lock-id" }], error: null }, // lock insert
        { data: null, error: null }, // delete lock (payment failed)
      ],
      nfts: [{ data: [], error: null }], // mint_signature check
    });

    await expect(
      processClaimMint({
        signature: VALID_SIG,
        walletAddress: WALLET,
        qty: 1,
        userId: USER_ID,
        supabase: supabase as never,
        getAdmin: async () => admin as never,
      }),
    ).rejects.toThrow(/payment transaction failed on-chain/i);
  });

  // ── Test 3: Missing service role key ────────────────────────────────────────
  it("3. throws admin configuration error when service role key is missing", async () => {
    const getAdmin = async () => {
      throw new Error(
        "Mint system not operational — administrator must configure: SUPABASE_SERVICE_ROLE_KEY.",
      );
    };

    await expect(
      processClaimMint({
        signature: VALID_SIG,
        walletAddress: WALLET,
        qty: 1,
        userId: USER_ID,
        supabase: createMockDB({}) as never,
        getAdmin,
      }),
    ).rejects.toThrow(/not operational/i);
  });

  // ── Test 4: Sold-out collection ─────────────────────────────────────────────
  it("4. throws sold-out error when no NFTs are available", async () => {
    mockFetch(rpcSuccess());

    const supabase = createMockDB({
      collection_config: [{ data: VALID_CONFIG, error: null }],
      nfts: [{ data: null, error: null, count: 0 }],
    });
    const admin = createMockDB({
      transactions: [
        { data: null, error: null }, // confirmed idempotency
        { data: [{ id: "lock-id" }], error: null }, // lock insert
        { data: null, error: null }, // update lock → failed (sold out is an NFT assignment error after payment confirmed)
      ],
      nfts: [
        { data: [], error: null }, // mint_signature check
        { data: [], error: null }, // SELECT candidates → 0 available
      ],
    });

    await expect(
      processClaimMint({
        signature: VALID_SIG,
        walletAddress: WALLET,
        qty: 1,
        userId: USER_ID,
        supabase: supabase as never,
        getAdmin: async () => admin as never,
      }),
    ).rejects.toThrow(/sold out/i);
  });

  // ── Test 5: Duplicate mint — transactions ledger idempotency ────────────────
  it("5. returns alreadyClaimed when transactions ledger shows confirmed prior", async () => {
    const admin = createMockDB({
      transactions: [
        { data: { id: "prior-tx" }, error: null }, // confirmed prior found
      ],
    });
    const supabase = createMockDB({
      collection_config: [{ data: VALID_CONFIG, error: null }],
      nfts: [{ data: null, error: null, count: 0 }],
    });

    const result = await processClaimMint({
      signature: VALID_SIG,
      walletAddress: WALLET,
      qty: 1,
      userId: USER_ID,
      supabase: supabase as never,
      getAdmin: async () => admin as never,
    });

    expect(result.alreadyClaimed).toBe(true);
    // NFT assignment must NOT have been attempted
    const nftCalls = (admin.from as ReturnType<typeof vi.fn>).mock.calls.filter(
      (args) => args[0] === "nfts",
    );
    expect(nftCalls).toHaveLength(0);
  });

  // ── Test 6: Concurrent mints — claim lock (unique-violation) ────────────────
  it("6. returns alreadyClaimed when claim lock insert fails with unique violation", async () => {
    const supabase = createMockDB({
      collection_config: [{ data: VALID_CONFIG, error: null }],
      nfts: [{ data: null, error: null, count: 0 }],
    });
    const admin = createMockDB({
      transactions: [
        { data: null, error: null }, // confirmed idempotency: none
        { data: null, error: { message: "duplicate key value", code: "23505" } }, // lock insert: unique violation
      ],
      nfts: [{ data: [], error: null }], // mint_signature check: none
    });

    const result = await processClaimMint({
      signature: VALID_SIG,
      walletAddress: WALLET,
      qty: 1,
      userId: USER_ID,
      supabase: supabase as never,
      getAdmin: async () => admin as never,
    });

    expect(result.alreadyClaimed).toBe(true);
  });

  // ── Test 7: Concurrent mints — atomic NFT guard ─────────────────────────────
  it("7. rolls back partial claim and throws when concurrent request takes NFTs", async () => {
    // Two NFTs requested. SELECT returns 2 candidates. Atomic UPDATE only returns 1
    // (a concurrent request grabbed the other). Must roll back and throw.
    mockFetch(rpcSuccess(WALLET, TREASURY, 2_000_000_000));

    const supabase = createMockDB({
      collection_config: [{ data: { ...VALID_CONFIG, mint_price: 1 }, error: null }],
      nfts: [{ data: null, error: null, count: 0 }],
    });

    const rollbackSpy = vi.fn().mockReturnValue(makeChain({ data: null, error: null }));
    let txCall = 0;
    let nftCall = 0;

    const admin = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "transactions") {
          txCall++;
          if (txCall === 1) return makeChain({ data: null, error: null }); // confirmed idempotency: none
          if (txCall === 2) return makeChain({ data: [{ id: "lock-id" }], error: null }); // lock insert: success
          return makeChain({ data: null, error: null }); // update lock → failed
        }
        if (table === "nfts") {
          nftCall++;
          if (nftCall === 1) return makeChain({ data: [], error: null }); // mint_signature: none
          if (nftCall === 2) return makeChain({ data: [NFT_1, NFT_2], error: null }); // SELECT candidates
          if (nftCall === 3) return makeChain({ data: [NFT_1], error: null }); // UPDATE: only 1 of 2 claimed
          if (nftCall === 4) {
            rollbackSpy();
            return makeChain({ data: null, error: null });
          } // ROLLBACK
        }
        return makeChain({ data: null, error: null });
      }),
    };

    await expect(
      processClaimMint({
        signature: VALID_SIG,
        walletAddress: WALLET,
        qty: 2,
        userId: USER_ID,
        supabase: supabase as never,
        getAdmin: async () => admin as never,
      }),
    ).rejects.toThrow(/sold out|concurrent/i);

    // Rollback must have been called to release the partially claimed NFT
    expect(rollbackSpy).toHaveBeenCalledOnce();
  });

  // ── Test 8: Retry after ledger-write failure — nfts.mint_signature ──────────
  it("8. returns alreadyClaimed (with tokens) when nfts.mint_signature shows prior assignment", async () => {
    // No confirmed transaction record (ledger write failed last time),
    // but the NFT has mint_signature set (assignment DID succeed last time).
    const supabase = createMockDB({
      collection_config: [{ data: VALID_CONFIG, error: null }],
      nfts: [{ data: null, error: null, count: 0 }],
    });
    const admin = createMockDB({
      transactions: [
        { data: null, error: null }, // confirmed idempotency: none
      ],
      nfts: [
        { data: [NFT_1], error: null }, // mint_signature check: NFT_1 already has this sig
      ],
    });

    const result = await processClaimMint({
      signature: VALID_SIG,
      walletAddress: WALLET,
      qty: 1,
      userId: USER_ID,
      supabase: supabase as never,
      getAdmin: async () => admin as never,
    });

    expect(result.alreadyClaimed).toBe(true);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens![0].id).toBe("nft-uuid-1");

    // No lock insert should have happened
    const txCalls = (admin.from as ReturnType<typeof vi.fn>).mock.calls.filter(
      (args) => args[0] === "transactions",
    );
    expect(txCalls).toHaveLength(1); // only the confirmed-idempotency check
  });

  // ── Test 9: Payment not indexed yet — pending lock cleaned up ────────────────
  it("9. deletes pending lock and throws when payment is not yet indexed on-chain", async () => {
    mockFetch({ result: null }); // tx not found → "not found on-chain yet"

    const supabase = createMockDB({
      collection_config: [{ data: VALID_CONFIG, error: null }],
      nfts: [{ data: null, error: null, count: 0 }],
    });

    const deleteSpy = vi.fn().mockReturnValue(makeChain({ data: null, error: null }));
    let txCall = 0;

    const admin = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "transactions") {
          txCall++;
          if (txCall === 1) return makeChain({ data: null, error: null }); // confirmed idempotency
          if (txCall === 2) return makeChain({ data: [{ id: "lock-id" }], error: null }); // lock insert
          if (txCall === 3) {
            deleteSpy();
            return makeChain({ data: null, error: null });
          } // DELETE lock
        }
        if (table === "nfts") return makeChain({ data: [], error: null }); // mint_signature check
        return makeChain({ data: null, error: null });
      }),
    };

    await expect(
      processClaimMint({
        signature: VALID_SIG,
        walletAddress: WALLET,
        qty: 1,
        userId: USER_ID,
        supabase: supabase as never,
        getAdmin: async () => admin as never,
      }),
    ).rejects.toThrow(/not found on-chain yet/i);

    // The pending lock must be deleted so the user can retry later
    expect(deleteSpy).toHaveBeenCalledOnce();
  });
});

// ─── verifyPaymentOnChain ─────────────────────────────────────────────────────

describe("verifyPaymentOnChain", () => {
  afterEach(() => vi.unstubAllGlobals());

  const base = {
    signature: VALID_SIG,
    walletAddress: WALLET,
    treasury: TREASURY,
    rpcUrl: "https://rpc.x1.xyz",
  };

  it("10. resolves when payment matches expected lamports", async () => {
    mockFetch(rpcSuccess());
    await expect(
      verifyPaymentOnChain({ ...base, expectedLamports: 1_000_000_000 }),
    ).resolves.toBeUndefined();
  });

  it("11. throws when tx is not yet indexed", async () => {
    mockFetch({ result: null });
    await expect(
      verifyPaymentOnChain({ ...base, expectedLamports: 1_000_000_000 }),
    ).rejects.toThrow(/not found on-chain yet/i);
  });

  it("12. throws when treasury received less than expected", async () => {
    mockFetch(rpcSuccess(WALLET, TREASURY, 500_000_000)); // only 0.5 XNT
    await expect(
      verifyPaymentOnChain({ ...base, expectedLamports: 1_000_000_000 }),
    ).rejects.toThrow(/underpaid/i);
  });

  it("13. throws when RPC is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    await expect(
      verifyPaymentOnChain({ ...base, expectedLamports: 1_000_000_000 }),
    ).rejects.toThrow(/rpc unreachable/i);
  });
});

// ─── processPreflight ─────────────────────────────────────────────────────────

describe("processPreflight", () => {
  const base = { walletAddress: WALLET, qty: 1, userId: USER_ID };

  it("14. resolves with mint params when all conditions are met", async () => {
    const supabase = createMockDB({
      collection_config: [{ data: VALID_CONFIG, error: null }],
      nfts: [{ data: null, error: null, count: 0 }], // per-wallet = 0
    });
    const admin = createMockDB({
      nfts: [{ data: null, error: null, count: 10 }], // 10 available
    });

    const result = await processPreflight({
      ...base,
      supabase: supabase as never,
      getAdmin: async () => admin as never,
    });

    expect(result.ok).toBe(true);
    expect(result.mintPrice).toBe(1);
    expect(result.availableCount).toBe(10);
    expect(result.treasury).toBe(TREASURY);
  });

  it("15. throws immediately when service role key is absent", async () => {
    await expect(
      processPreflight({
        ...base,
        supabase: createMockDB({}) as never,
        getAdmin: async () => {
          throw new Error(
            "Mint system not operational — administrator must configure: SUPABASE_SERVICE_ROLE_KEY.",
          );
        },
      }),
    ).rejects.toThrow(/not operational/i);
  });

  it("16. throws when collection is sold out", async () => {
    const supabase = createMockDB({
      collection_config: [{ data: VALID_CONFIG, error: null }],
      nfts: [{ data: null, error: null, count: 0 }],
    });
    const admin = createMockDB({
      nfts: [{ data: null, error: null, count: 0 }], // 0 available
    });

    await expect(
      processPreflight({
        ...base,
        supabase: supabase as never,
        getAdmin: async () => admin as never,
      }),
    ).rejects.toThrow(/sold out/i);
  });
});
