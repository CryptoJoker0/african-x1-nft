import { useState } from "react";
import { StepProgress } from "@/components/staking/StepProgress";
import { WelcomeStep } from "@/components/staking/steps/WelcomeStep";
import { VerificationStep } from "@/components/staking/steps/VerificationStep";
import { RewardStep } from "@/components/staking/steps/RewardStep";
import { PeriodStep } from "@/components/staking/steps/PeriodStep";
import { ConnectStep, type StakeableNft } from "@/components/staking/steps/ConnectStep";
import { ReviewStep } from "@/components/staking/steps/ReviewStep";
import type { RewardToken, StakingPeriodDays } from "@/lib/staking.logic";

interface StakingConfigRow {
  reward_token: RewardToken;
  display_name: string;
  daily_rate: number;
  is_active: boolean;
}

export function StakingWizard({
  walletAddress,
  walletConnected,
  nftsLoading,
  ownedNfts,
  stakeableNfts,
  config,
  stakingGasFeeXnt,
  onStake,
  isStaking,
  stakeStage,
  stakeError,
  onStaked,
}: {
  walletAddress: string | null;
  walletConnected: boolean;
  nftsLoading: boolean;
  ownedNfts: StakeableNft[];
  stakeableNfts: StakeableNft[];
  config: StakingConfigRow[];
  stakingGasFeeXnt: number;
  onStake: (params: {
    nftId: string;
    rewardToken: RewardToken;
    periodDays: StakingPeriodDays;
  }) => void;
  isStaking: boolean;
  stakeStage: "idle" | "preparing" | "signing" | "confirming" | "staking";
  stakeError: string | null;
  onStaked: () => void;
}) {
  const [step, setStep] = useState(1);
  const [rewardToken, setRewardToken] = useState<RewardToken | null>(null);
  const [periodDays, setPeriodDays] = useState<StakingPeriodDays | null>(null);
  const [selectedNftId, setSelectedNftId] = useState<string | null>(null);

  const selectedNft = stakeableNfts.find((n) => n.id === selectedNftId) ?? null;

  function goTo(n: number) {
    setStep(n);
  }

  return (
    <div>
      <StepProgress current={step} />

      {step === 1 && <WelcomeStep onNext={() => goTo(2)} />}

      {step === 2 && <VerificationStep onNext={() => goTo(3)} onBack={() => goTo(1)} />}

      {step === 3 && (
        <RewardStep
          value={rewardToken}
          onSelect={setRewardToken}
          onNext={() => goTo(4)}
          onBack={() => goTo(2)}
        />
      )}

      {step === 4 && (
        <PeriodStep
          value={periodDays}
          onSelect={setPeriodDays}
          onNext={() => goTo(5)}
          onBack={() => goTo(3)}
        />
      )}

      {step === 5 && (
        <ConnectStep
          walletConnected={walletConnected}
          ownsAnyNft={ownedNfts.length > 0}
          nftsLoading={nftsLoading}
          stakeableNfts={stakeableNfts}
          hasNoStakeableLeft={ownedNfts.length > 0 && stakeableNfts.length === 0}
          selectedNftId={selectedNftId}
          onSelectNft={setSelectedNftId}
          rewardToken={rewardToken}
          onNext={() => goTo(6)}
          onBack={() => goTo(4)}
          onChangeReward={() => {
            setRewardToken(null);
            goTo(3);
          }}
        />
      )}

      {step === 6 && selectedNft && rewardToken && periodDays && walletAddress && (
        <ReviewStep
          nft={selectedNft}
          rewardToken={rewardToken}
          periodDays={periodDays}
          config={config}
           stakingGasFeeXnt={stakingGasFeeXnt}
          walletAddress={walletAddress}
          isStaking={isStaking}
           stakeStage={stakeStage}
          error={stakeError}
          onBack={() => goTo(5)}
          onStake={() => {
            onStake({ nftId: selectedNft.id, rewardToken, periodDays });
          }}
        />
      )}
    </div>
  );
}
