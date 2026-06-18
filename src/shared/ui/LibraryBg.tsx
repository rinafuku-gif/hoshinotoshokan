"use client";

/**
 * LibraryBg — AI生成の背景画像 + ダークオーバーレイ + ビネット
 *
 * 5層構造:
 *   Layer 1: 背景画像 (fixed, cover)
 *   Layer 2: ダークオーバーレイ + ビネット
 *   (Layer 3-5 are separate components: DustMotes, GrainOverlay, UI)
 *
 * 画面ごとの背景:
 *   "main"    — メイン書庫（トップ/キャラ選択/入力）   overlay 55%
 *   "aisle"   — 書架の奥（ローディング/鑑定中）       overlay 65%
 *   "desk"    — 読書デスク（結果画面）               overlay 50%
 *   "payment" — 決済（メイン + blur）                overlay 70%
 */

import { useEffect, useState } from "react";

type BgScene = "main" | "aisle" | "desk" | "payment";

interface LibraryBgProps {
  scene?: BgScene;
}

const SCENES: Record<BgScene, {
  desktop: string;
  mobile: string;
  overlayOpacity: number;
  blur?: number;
}> = {
  main: {
    desktop: "/bg-library-main.webp",
    mobile: "/bg-library-main-m.webp",
    overlayOpacity: 0.55,
  },
  aisle: {
    desktop: "/bg-library-aisle.webp",
    mobile: "/bg-library-aisle-m.webp",
    overlayOpacity: 0.65,
  },
  desk: {
    desktop: "/bg-library-desk.webp",
    mobile: "/bg-library-desk-m.webp",
    overlayOpacity: 0.50,
  },
  payment: {
    desktop: "/bg-library-main.webp",
    mobile: "/bg-library-main-m.webp",
    overlayOpacity: 0.70,
    blur: 8,
  },
};

export default function LibraryBg({ scene = "main" }: LibraryBgProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const config = SCENES[scene];
  // SSR/初回: 両方のソースをpreloadし、CSS media queryで切替
  const desktopSrc = config.desktop;
  const mobileSrc = config.mobile;
  const src = isMobile === null ? desktopSrc : isMobile ? mobileSrc : desktopSrc;

  return (
    <div className="fixed inset-0 z-[1] pointer-events-none" aria-hidden="true">
      {/* Layer 1: Background image */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          backgroundImage: `url('${src}')`,
          backgroundSize: "cover",
          backgroundPosition: "center 20%",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#110e09",
          filter: config.blur ? `blur(${config.blur}px)` : undefined,
        }}
      />

      {/* Layer 2: Dark overlay + vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse at center,
              transparent 20%,
              rgba(13, 11, 7, ${config.overlayOpacity * 0.8}) 60%,
              rgba(13, 11, 7, ${Math.min(config.overlayOpacity + 0.25, 0.95)}) 100%
            ),
            linear-gradient(
              to bottom,
              rgba(13, 11, 7, ${config.overlayOpacity * 0.7}) 0%,
              rgba(13, 11, 7, ${config.overlayOpacity}) 50%,
              rgba(13, 11, 7, ${config.overlayOpacity + 0.1}) 100%
            )
          `,
        }}
      />
    </div>
  );
}
