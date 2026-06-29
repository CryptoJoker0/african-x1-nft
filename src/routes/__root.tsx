import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import "../lib/fonts";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { WalletProvider } from "@/lib/wallet";
import { CyberBackground } from "@/components/site/Background";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="font-display text-7xl font-bold text-gradient-cyber">404</div>
        <h2 className="mt-4 font-display text-xl text-foreground">Signal lost</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for has drifted off the X1 mesh.
        </p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-cyber-cyan px-5 py-2.5 text-sm font-semibold text-background hover:glow-blue">
          Return home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl text-foreground">Connection interrupted</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something glitched on our end.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-cyber-cyan px-5 py-2.5 text-sm font-semibold text-background"
          >Try again</button>
          <a href="/" className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AFRICAN X1 NFT — Premium NFTs on the X1 Blockchain" },
      { name: "description", content: "AFRICAN X1 NFT — a 50-piece collection celebrating African culture, minted natively on the X1 Blockchain. Connect your wallet, mint, and own a piece of the future." },
      { name: "author", content: "AFRICAN X1 NFT" },
      { name: "theme-color", content: "#050816" },
      { property: "og:title", content: "AFRICAN X1 NFT" },
      { property: "og:description", content: "Premium NFT collection on the X1 Blockchain." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }, { rel: "icon", href: "/favicon.ico" }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <CyberBackground />
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1"><Outlet /></main>
          <Footer />
        </div>
        <Toaster theme="dark" position="top-right" />
      </WalletProvider>
    </QueryClientProvider>
  );
}
