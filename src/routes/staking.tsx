import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { supabase } from "@/integrations/supabase/client";
import { stakeNft, claimStake } from "@/lib/staking.functions";
import { submitMintTransfer } from "@/lib/mint-tx";
import { StakingWizard } from "@/components/staking/StakingWizard";
import { StakingDashboard } from "@/components/staking/StakingDashboard";
import type { NftRarity, RewardToken, StakingPeriodDays } from "@/lib/staking.logic";

export const Route = createFileRoute("/staking")({
  head: () => ({
    meta: [
      { title: "Staking — AFRICAN X1" },
      {
        name: "description",
        content: "Stake your AFRICAN X1 NFTs to earn X1Brains, AFRICA (AF), or XNT rewards.",
      },
    ],
  }),
  component: StakingPage,
});

interface WalletNft {
  id: string;
  token_id: number;
  name: string;
  image_url: string | null;
  rarity: NftRarity;
}

interface StakingConfigRow {
  reward_token: RewardToken;
  display_name: string;
  daily_rate: number;
  is_active: boolean;
}

interface StakePositionRow {
  id: string;
  nft_id: string;
  reward_token: RewardToken;
  period_days: StakingPeriodDays;
  multiplier: number;
  status: "active" | "claimed";
  staked_at: string;
  unlock_at: string;
  claimed_at: string | null;
  reward_amount: number | null;
}

function StakingPage() {
  const { address, status: walletStatus, walletId, isSimulated } = useWallet();
  const queryClient = useQueryClient();
  const [forceWizard, setForceWizard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stakeStage, setStakeStage] = useState<
    "idle" | "preparing" | "signing" | "confirming" | "staking"
  >("idle");

  const { data: nfts = [], isLoading: nftsLoading } = useQuery({
    enabled: !!address,
    queryKey: ["staking-nfts", address],
    queryFn: async () => {
      const { data } = await supabase
        .from("nfts")
        .select("id, token_id, name, image_url, rarity")
        .eq("owner_wallet", address!)
        .eq("status", "minted")
        .order("token_id", { ascending: true });
      return (data ?? []) as WalletNft[];
    },
  });

  const { data: positions = [], isLoading: positionsLoading } = useQuery({
    enabled: !!address,
    queryKey: ["staking-positions", address],
    queryFn: async () => {
      const { data } = await supabase
        .from("staking_positions")
        .select("*")
        .eq("owner_wallet", address!)
        .order("staked_at", { ascending: false });
      return (data ?? []) as StakePositionRow[];
    },
    refetchInterval: 30_000,
  });

  const { data: config = [] } = useQuery({
    queryKey: ["staking-config"],
    queryFn: async () => {
      const { data } = await supabase.from("staking_config").select("*");
      return (data ?? []) as StakingConfigRow[];
    },
    staleTime: 5 * 60_000,
  });

  const { data: feeConfig } = useQuery({
    queryKey: ["staking-fee-config"],
    queryFn: async () => {
      const { data, error: feeError } = await supabase
        .from("collection_config")
        .select("staking_gas_fee_xnt, treasury_wallet, rpc_url")
        .eq("id", 1)
        .single();
      if (feeError) throw feeError;
      return data as {
        staking_gas_fee_xnt: number;
        treasury_wallet: string;
        rpc_url: string;
      };
    },
    staleTime: 5 * 60_000,
  });

  const stakingGasFeeXnt = Number(feeConfig?.staking_gas_fee_xnt ?? 5.69);

  const activePositions = positions.filter((p) => p.status === "active");
  const stakedNftIds = new Set(activePositions.map((p) => p.nft_id));
  const stakeableNfts = nfts.filter((n) => !stakedNftIds.has(n.id));

  const stakeMutation = useMutation({
    mutationFn: async (params: {
      nftId: string;
      rewardToken: RewardToken;
      periodDays: StakingPeriodDays;
    }) => {
      if (!address) throw new Error("Wallet not connected.");
      if (isSimulated) {
        throw new Error(
          "Simulated wallet cannot pay the staking fee. Install Phantom, Backpack, or X1 Wallet.",
        );
      }
      if (!feeConfig?.treasury_wallet || !feeConfig.rpc_url) {
        throw new Error("Staking payment is not configured yet. Please contact the administrator.");
      }

      setStakeStage("preparing");
      const gasFeeSignature = await submitMintTransfer({
        rpcUrl: feeConfig.rpc_url,
        treasury: feeConfig.treasury_wallet,
        address,
        totalXnt: stakingGasFeeXnt,
        walletId,
        onStage: (stage) => setStakeStage(stage),
      });

      setStakeStage("staking");
      return stakeNft({
        data: {
          nftId: params.nftId,
          walletAddress: address,
          rewardToken: params.rewardToken,
          periodDays: params.periodDays,
          gasFeeSignature,
        },
      });
    },
    onSuccess: () => {
      setError(null);
      setStakeStage("idle");
      setForceWizard(false);
      queryClient.invalidateQueries({ queryKey: ["staking-positions", address] });
    },
    onError: (e: unknown) => {
      setStakeStage("idle");
      setError(e instanceof Error ? e.message : "Failed to stake.");
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (stakeId: string) => {
      if (!address) throw new Error("Wallet not connected.");
      return claimStake({ data: { stakeId, walletAddress: address } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staking-positions", address] });
    },
  });

  const showDashboard = walletStatus === "connected" && positions.length > 0 && !forceWizard;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-10 flex flex-col items-center gap-3 text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-african-gold">
          Earn while you hold
        </div>
        <h1 className="font-display text-3xl sm:text-4xl">
          Africa <span className="text-gradient-cyber">Staking</span>
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Lock an AFRICAN X1 Genesis NFT and earn X1Brains, AFRICA (AF), or — for Legendary holders
          — exclusive XNT rewards.
        </p>
      </header>

      {walletStatus === "connecting" || (walletStatus === "connected" && positionsLoading) ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl glass-card p-16 text-center">
          <Wallet size={24} className="animate-pulse text-muted-foreground" />
        </div>
      ) : showDashboard ? (
        <StakingDashboard
          positions={positions}
          positionsLoading={positionsLoading}
          nfts={nfts}
          config={config}
          onClaim={(id) => claimMutation.mutate(id)}
          isClaiming={claimMutation.isPending}
          onStakeAnother={() => setForceWizard(true)}
        />
      ) : (
        <StakingWizard
          walletAddress={address}
          walletConnected={walletStatus === "connected"}
          nftsLoading={nftsLoading}
          ownedNfts={nfts}
          stakeableNfts={stakeableNfts}
          config={config}
           stakingGasFeeXnt={stakingGasFeeXnt}
          onStake={(params) => stakeMutation.mutate(params)}
          isStaking={stakeMutation.isPending}
           stakeStage={stakeStage}
          stakeError={error}
          onStaked={() => setForceWizard(false)}
        />
      )}
    </div>
  );
}
