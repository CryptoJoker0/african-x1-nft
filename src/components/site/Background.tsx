import { useMemo } from "react";

/** Animated cyberpunk background: grid + floating particles. Pure CSS, no JS loop. */
export function CyberBackground() {
  const particles = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 18,
      duration: 14 + Math.random() * 16,
      size: 1 + Math.random() * 3,
      gold: Math.random() > 0.65,
    })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="absolute -top-40 left-1/2 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(45,127,249,0.22),transparent_70%)] blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[500px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.18),transparent_70%)] blur-3xl" />
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: 0,
            width: p.size, height: p.size,
            background: p.gold ? "var(--african-gold)" : "var(--cyber-cyan)",
            boxShadow: `0 0 ${p.size * 4}px ${p.gold ? "var(--african-gold)" : "var(--cyber-cyan)"}`,
            animation: `float-up ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
