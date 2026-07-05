
CREATE POLICY "Public read nft-artwork" ON storage.objects
  FOR SELECT USING (bucket_id = 'nft-artwork');
CREATE POLICY "Admins upload nft-artwork" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'nft-artwork' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update nft-artwork" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'nft-artwork' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete nft-artwork" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'nft-artwork' AND public.has_role(auth.uid(), 'admin'));
