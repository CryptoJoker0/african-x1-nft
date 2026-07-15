-- Allow authenticated users to read their own transactions by wallet address.
-- Mint inserts transactions with wallet_address only (no user_id), so the
-- existing tx_select_own policy (which checks user_id) returns nothing for
-- wallet-minted transactions. This policy fills that gap.
CREATE POLICY "tx_select_by_wallet"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    wallet_address = (
      SELECT wallet_address FROM public.profiles WHERE id = auth.uid()
    )
  );
