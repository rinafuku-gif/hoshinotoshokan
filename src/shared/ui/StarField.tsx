"use client";

import { useEffect, useRef } from "react";

/**
 * DustMotes — Warm, floating particles like dust in library lamplight.
 * Replaces the cosmic StarField to create a "quiet old library" atmosphere.
 */

interface Mote {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedX: number;
  speedY: number;
  drift: number;
  driftSpeed: number;
  driftOffset: number;
}

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let motes: Mote[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initMotes();
    };

    const initMotes = () => {
      // Much fewer particles — just a hint of dust in lamplight, not a star field
      const count = Math.floor((canvas.width * canvas.height) / 60000);
      motes = Array.from({ length: count }, () => {
        // Concentrate particles in the upper-right quadrant (near the lamp)
        const nearLamp = Math.random() < 0.6;
        return {
          x: nearLamp ? canvas.width * 0.5 + Math.random() * canvas.width * 0.5 : Math.random() * canvas.width,
          y: nearLamp ? Math.random() * canvas.height * 0.5 : Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.15 + 0.02,
          speedX: (Math.random() - 0.5) * 0.06,
          speedY: -(Math.random() * 0.04 + 0.005),
          drift: Math.random() * 0.3,
          driftSpeed: Math.random() * 0.002 + 0.0005,
          driftOffset: Math.random() * Math.PI * 2,
        };
      });
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const mote of motes) {
        // Gentle horizontal drift (like air currents)
        const driftX = Math.sin(time * mote.driftSpeed + mote.driftOffset) * mote.drift;
        // Slow fade in/out
        const fade = Math.sin(time * 0.001 + mote.driftOffset) * 0.15 + 0.85;
        const alpha = mote.opacity * fade;

        ctx.beginPath();
        ctx.arc(mote.x + driftX, mote.y, mote.size, 0, Math.PI * 2);
        // Warm amber/gold color instead of bright gold
        ctx.fillStyle = `rgba(220, 195, 150, ${alpha})`;
        ctx.fill();

        // Soft warm glow for larger motes
        if (mote.size > 1.5) {
          ctx.beginPath();
          ctx.arc(mote.x + driftX, mote.y, mote.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(220, 195, 150, ${alpha * 0.06})`;
          ctx.fill();
        }

        mote.x += mote.speedX;
        mote.y += mote.speedY;

        // Wrap around edges
        if (mote.y < -10) {
          mote.y = canvas.height + 10;
          mote.x = Math.random() * canvas.width;
        }
        if (mote.x < -10) mote.x = canvas.width + 10;
        if (mote.x > canvas.width + 10) mote.x = -10;
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    animationId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.3 }}
    />
  );
}
