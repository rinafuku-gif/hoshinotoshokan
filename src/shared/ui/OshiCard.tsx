"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface OshiCardProps {
  characterName: string;
  characterAvatar: string;
  characterId: string;
}

export default function OshiCard({ characterName, characterAvatar, characterId }: OshiCardProps) {
  const [copied, setCopied] = useState(false);
  const tag = characterId === "urara" ? "#うらら担" : "#れき担";
  const text = `私の担当司書は${characterName} #星の図書館 ${tag}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const isUrara = characterId === "urara";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 rounded-2xl flex items-center gap-3"
      style={{
        background: isUrara ? "rgba(201,169,110,0.06)" : "rgba(201,169,110,0.06)",
        border: `1px solid ${isUrara ? "rgba(201,169,110,0.2)" : "rgba(201,169,110,0.2)"}`,
      }}
    >
      <div
        className="w-8 h-8 rounded-full overflow-hidden shrink-0"
        style={{ border: `1.5px solid ${isUrara ? "rgba(201,169,110,0.5)" : "rgba(201,169,110,0.5)"}` }}
      >
        <Image src={characterAvatar} alt={characterName} width={64} height={64} className="object-cover w-full h-full" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/60">私の担当司書は <strong className="text-white/80">{characterName}</strong></p>
        <p className="text-[10px] text-white/25 mt-0.5">#星の図書館 {tag}</p>
      </div>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleCopy}
        className="shrink-0 px-3 py-1.5 rounded-full text-[10px] text-white/50 transition-all"
        style={{
          border: `1px solid ${isUrara ? "rgba(201,169,110,0.3)" : "rgba(201,169,110,0.3)"}`,
          background: isUrara ? "rgba(201,169,110,0.08)" : "rgba(201,169,110,0.08)",
        }}
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              copied!
            </motion.span>
          ) : (
            <motion.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              コピー
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}
