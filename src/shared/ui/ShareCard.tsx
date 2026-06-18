"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface ShareCardProps {
  characterName: string;
  characterAvatar: string;
  characterAvatar2?: string; // 相性鑑定用: 2人目の司書画像
  characterId: string;
  userName: string;
  topicLabel: string;
  oneWord: string;
  bookTitle?: string;
  westernSign?: string;
  kin?: number;
  glyph?: string;
  siteUrl: string;
}

export default function ShareCard({
  characterName,
  characterAvatar,
  characterAvatar2,
  characterId,
  userName,
  topicLabel,
  oneWord,
  bookTitle,
  westernSign,
  kin,
  glyph,
  siteUrl,
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!cardRef.current || saving) return;
    setSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const node = cardRef.current;
      // キャプチャ前にborderを強制除去（念のため）
      const origStyle = node.getAttribute("style") || "";
      node.style.border = "none";
      node.style.outline = "none";
      node.style.boxShadow = "none";
      node.style.borderRadius = "0";

      const canvas = await html2canvas(node, {
        backgroundColor: "#1a1410",
        scale: 3,
        useCORS: true,
        logging: false,
        removeContainer: true,
        windowWidth: node.offsetWidth,
        windowHeight: node.offsetHeight,
      });

      // スタイルを復元
      node.setAttribute("style", origStyle);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png", 1)
      );

      if (!blob) throw new Error("Failed to generate image");

      // ダウンロードのみ（1枚だけ）。navigator.shareは2枚保存の原因になるため使わない
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "star-library-result.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // ignore
    }
    setSaving(false);
  };

  return (
    <div className="mb-8">
      {/* キャプチャ対象: border/outline/shadow/radius 一切なし */}
      <div
        ref={cardRef}
        style={{
          background: "#1a1410",
          padding: "32px 28px",
          border: "none",
          outline: "none",
          boxShadow: "none",
          borderRadius: "0",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "24px" }}>
          <span style={{ fontSize: "10px", letterSpacing: "0.3em", color: "rgba(201,169,110,0.3)" }}>✦</span>
          <span style={{ fontSize: "10px", letterSpacing: "0.2em", color: "rgba(201,169,110,0.45)", fontFamily: "serif" }}>星の図書館</span>
          <span style={{ fontSize: "10px", letterSpacing: "0.3em", color: "rgba(201,169,110,0.3)" }}>✦</span>
        </div>

        {/* Character */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: characterAvatar2 ? "8px" : "0", flexShrink: 0 }}>
            <div style={{ width: characterAvatar2 ? "72px" : "96px", height: characterAvatar2 ? "72px" : "96px", borderRadius: "16px", overflow: "hidden", border: "1.5px solid rgba(201,169,110,0.25)" }}>
              <Image src={characterAvatar} alt={characterName} width={192} height={192} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
            </div>
            {characterAvatar2 && (
              <div style={{ width: "72px", height: "72px", borderRadius: "16px", overflow: "hidden", border: "1.5px solid rgba(201,169,110,0.25)" }}>
                <Image src={characterAvatar2} alt="れき" width={192} height={192} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
              </div>
            )}
          </div>
          <div>
            <p style={{ fontSize: "15px", color: "rgba(232,224,208,0.7)", margin: 0, fontFamily: "serif", fontWeight: "bold" }}>{characterName}が読んだ</p>
            <p style={{ fontSize: "12px", color: "rgba(232,224,208,0.35)", margin: "4px 0 0 0" }}>{userName}の{topicLabel}</p>
          </div>
        </div>

        {/* Book title */}
        {bookTitle && (
          <p style={{ fontSize: "12px", color: "rgba(201,169,110,0.5)", marginBottom: "12px", letterSpacing: "0.03em", fontFamily: "serif" }}>
            「{bookTitle}」
          </p>
        )}

        {/* Main oneWord */}
        <div style={{ padding: "20px 0", marginBottom: "20px" }}>
          <p style={{
            fontSize: "28px",
            fontWeight: "bold",
            lineHeight: 1.4,
            fontFamily: "serif",
            color: "#e8d5a8",
            margin: 0,
          }}>
            {oneWord}
          </p>
        </div>

        {/* Data badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "12px", color: "rgba(232,224,208,0.35)", marginBottom: "20px" }}>
          {westernSign && <span>♈ {westernSign}</span>}
          {kin && <span>KIN {kin}</span>}
          {glyph && <span>{glyph}</span>}
        </div>

        {/* Divider */}
        <div style={{ height: "1px", width: "100%", marginBottom: "16px", background: "linear-gradient(90deg, transparent, rgba(201,169,110,0.2), transparent)" }} />

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: "10px", color: "rgba(232,224,208,0.2)", margin: 0 }}>{siteUrl.replace("https://", "")}</p>
          <p style={{ fontSize: "10px", color: "rgba(201,169,110,0.4)", margin: 0 }}>あなたの星も読んでみる →</p>
        </div>
      </div>

      {/* 保存ボタン — 1つだけ */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={saving}
        className="mt-3 w-full py-3 rounded text-sm font-medium transition-all disabled:opacity-40"
        style={{
          background: "rgba(201,169,110,0.15)",
          border: "1px solid rgba(201,169,110,0.3)",
          color: "#c9a96e",
        }}
      >
        {saving ? "…準備中" : "カードを保存"}
      </motion.button>
    </div>
  );
}
