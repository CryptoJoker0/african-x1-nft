import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { EditorialHome, type EditorialHomeConfig } from "@/components/site/EditorialHome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AFRICAN X1 NFT — More Than an NFT. A Living Legacy." },
      {
        name: "description",
        content:
          "A digital archive of Africa's identity — cultures, kingdoms, traditions and stories preserved forever on the X1 Blockchain.",
      },
      { property: "og:title", content: "AFRICAN X1 NFT — A Living Legacy" },
      {
        property: "og:description",
        content:
          "Own a piece of Africa's story. Heritage, pride and legacy — written forever on the X1 Blockchain.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const { data } = await supabase.from("collection_config").select("*").eq("id", 1).single();
      return data as EditorialHomeConfig | null;
    },
  });

  const { data: minted = 0 } = useQuery({
    queryKey: ["minted-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("nfts")
        .select("*", { count: "exact", head: true })
        .eq("status", "minted");
      return count ?? 0;
    },
  });

  return <EditorialHome config={config} minted={minted} />;
}