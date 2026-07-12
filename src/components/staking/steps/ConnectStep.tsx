import { ChevronLeft, ImageOff, Wallet } from "lucide-react";
import { WalletButton } from "@/components/site/WalletButton";
import { RARITY_LABEL } from "@/components/staking/rarity";
import type { NftRarity, RewardToken } from "@/lib/staking.logic";
import preReveal from "@/assets/pre-reveal.jpg";

export interface StakeableNft {
  id: string;
  token_id: number;
  name: string;
  image_url: string | null;
  rarity: NftRarity;
}

export function ConnectStep({
  walletConnected,
  ownsAnyNft,
  nftsLoading,
  stakeableNfts,
  hasNoStakeableLeft,
  selectedNftId,
  onSelectNft,
  rewardToken,
  onNext,
  onBack,
  onChangeReward,
}: {
  walletConnected: boolean;
  ownsAnyNft: boolean;
  nftsLoading: boolean;
  stakeableNfts: StakeableNft[];
  hasNoStakeableLeft: boolean;
  selectedNftId: string | null;
  onSelectNft: (id: string) => void;
  rewardToken: RewardToken | null;
  onNext: () => void;
  onBack: () => void;
  onChangeReward: () => void;
}) {
  const selectedNft = stakeableNfts.find((n) => n.id === selectedNftId) ?? null;
  const eligibilityConflict =
    !!selectedNft && rewardToken === "xnt" && selectedNft.rarity !== "legendary";

  return (
    <div className="rounded-2xl glass-card p-6 sm:p-10">
      <p className="text-[10px] uppercase tracking-[0.3em] text-african-gold">Step 5</p>
      <h2 className="mt-2 font-display text-2xl sm:text-3xl">Connect your wallet</h2>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        Connect with X1 Wallet or Backpack. We&apos;ll verify wallet ownership, your Genesis NFT
        holding, and reward eligibility.
      </p>

      {!walletConnected ? (
        <div className="mt-8 flex flex-col items-center gap-5 rounded-xl border border-white/10 bg-white/[0.03] py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground">
            <Wallet size={24} />
          </div>
          <WalletButton />
        </div>
      ) : nftsLoading ? (
        <div className="mt-8 h-24 animate-pulse rounded-xl bg-white/5" />
      ) : !ownsAnyNft ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 py-10 text-center">
          <ImageOff size={26} className="text-red-400" />
          <p className="font-semibold text-red-300">
            No AFRICAN X1 Genesis NFT detected in this wallet.
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Try connecting a different wallet, or mint a Genesis NFT from the Collection page first.
          </p>
        </div>
      ) : hasNoStakeableLeft ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] py-10 text-center text-sm text-muted-foreground">
          All of your Genesis NFTs are already staking.
        </div>
      ) : (
        <div className="mt-6">
          <p className="label-xs mb-3">Select the Genesis NFT you want to stake</p>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
            {stakeableNfts.map((n) => (
              <button
                key={n.id}
                onClick={() => onSelectNft(n.id)}
                className={`overflow-hidden rounded-xl border-2 transition ${
                  selectedNftId === n.id
                    ? "border-african-gold shadow-[0_0_16px_rgba(212,175,55,0.35)]"
                    : "border-transparent hover:border-white/20"
                }`}
              >
                <img
                  src={n.image_url ?? preReveal}
                  alt={n.name}
                  className="aspect-square w-full object-cover"
                />
                <div className="bg-black/40 px-1.5 py-1 text-left">
                  <p className="truncate text-[10px] font-semibold">#{n.token_id}</p>
                  <p className="truncate text-[9px] text-muted-foreground">
                    {RARITY_LABEL[n.rarity]}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {eligibilityConflict && (
            <div className="mt-4 flex flex-col items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300 sm:flex-row sm:items-center sm:justify-between">
              <span>
                XNT is exclusive to Legendary NFT holders. This NFT is{" "}
                <span className="font-semibold">{RARITY_LABEL[selectedNft!.rarity]}</span> — choose
                a different reward token to continue.
              </span>
              <button
                onClick={onChangeReward}
                className="shrink-0 rounded-full border border-red-400/40 px-3 py-1.5 font-semibold text-red-200 hover:bg-red-500/10"
              >
                Change reward token
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft size={15} /> Back
        </button>
        <button
          disabled={!selectedNft || eligibilityConflict}
          onClick={onNext}
          className="btn-staking group relative inline-flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-[position:0%_50%] px-7 py-2.5 text-sm font-bold text-ink transition-[background-position,filter] duration-500 hover:bg-[position:100%_50%] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ boxShadow: "var(--shadow-glow-staking)" }}
        >
          Continue to Review
        </button>
      </div>
    </div>
  );
}
