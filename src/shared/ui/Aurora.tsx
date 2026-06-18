"use client";

/**
 * LibraryLamp — Focused desk lamp light from the upper-right.
 * Creates the feeling of a single warm lamp illuminating a reading desk.
 * Not ambient glow — directional, focused light.
 */

export default function Aurora() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Primary lamp: focused warm cone from upper-right */}
      <div
        className="absolute"
        style={{
          width: "clamp(300px, 40vw, 500px)",
          height: "clamp(400px, 50vh, 600px)",
          background: "radial-gradient(ellipse at 70% 20%, rgba(201,169,110,0.12) 0%, rgba(180,140,80,0.06) 30%, transparent 70%)",
          top: "-5%",
          right: "-5%",
          animation: "lampFlicker 8s ease-in-out infinite",
          willChange: "opacity",
        }}
      />
      {/* Secondary: very subtle warm fill at desk level (center-bottom) */}
      <div
        className="absolute"
        style={{
          width: "clamp(200px, 30vw, 350px)",
          height: "clamp(150px, 20vh, 250px)",
          background: "radial-gradient(ellipse at 50% 80%, rgba(201,169,110,0.04) 0%, transparent 70%)",
          bottom: "10%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />
      <style jsx global>{`
        @keyframes lampFlicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.92; }
          94% { opacity: 1.02; }
          95% { opacity: 0.95; }
          96% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="lampFlicker"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
