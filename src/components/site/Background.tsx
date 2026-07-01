/** Editorial background: hairline grid + soft radial washes. Static, no JS loop. */
export function CyberBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 hairline-grid opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]" />
      <div className="absolute -top-40 -left-40 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.18),transparent_70%)] blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[520px] w-[720px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.14),transparent_70%)] blur-3xl" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-african-gold/25 to-transparent" />
    </div>
  );
}
