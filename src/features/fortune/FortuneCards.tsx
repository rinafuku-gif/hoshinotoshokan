"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FortuneResult } from "@/features/fortune/fortune-calc";

interface FortuneCardsProps {
  data: FortuneResult;
}

interface CardData {
  id: string;
  label: string;
  icon: string;
  items: { key: string; value: string | number }[];
  description: string;
}

export default function FortuneCards({ data }: FortuneCardsProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const cards: CardData[] = [
    {
      id: "western",
      label: "西洋占星術",
      icon: "♈",
      items: [{ key: "太陽星座", value: data.western.sign }],
      description: "生まれた時の太陽の位置から、基本的な性格傾向を読み解く",
    },
    {
      id: "maya",
      label: "マヤ暦",
      icon: "◈",
      items: [
        { key: "KIN", value: data.maya.kin },
        { key: "太陽の紋章", value: data.maya.glyph },
        { key: "銀河の音", value: data.maya.tone },
        { key: "WS", value: data.maya.ws },
      ],
      description: "260日周期のマヤ暦から、魂の本質と使命を読む",
    },
    {
      id: "numerology",
      label: "数秘術",
      icon: "✦",
      items: [{ key: "ライフパスナンバー", value: data.numerology.lp }],
      description: "生年月日の数字から、人生の道筋と才能を導く",
    },
    {
      id: "sanmeigaku",
      label: "算命学",
      icon: "☯",
      items: [{ key: "中心星", value: data.bazi.weapon }],
      description: "東洋占術の核。あなたの本質的な気質を示す",
    },
    {
      id: "sukuyo",
      label: "宿曜",
      icon: "☾",
      items: [{ key: "宿", value: data.sukuyo }],
      description: "月の宿りから、対人関係の傾向と相性を読む",
    },
    {
      id: "shichusuimei",
      label: "四柱推命",
      icon: "⊞",
      items: [
        { key: "日柱", value: data.sanmeigaku.day },
        { key: "日干", value: data.bazi.stem },
        { key: "年柱", value: data.sanmeigaku.year },
        { key: "月柱", value: data.sanmeigaku.month },
      ],
      description: "年・月・日・時の4つの柱から、運命の詳細を読み解く",
    },
  ];

  return (
    <div className="space-y-2 mb-6">
      <p className="text-[10px] text-white/25 tracking-widest text-center mb-3 uppercase">— 6占術データ —</p>
      {cards.map((card, i) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.08 }}
        >
          <button
            onClick={() => setExpanded(expanded === card.id ? null : card.id)}
            className="w-full text-left p-3 rounded-xl transition-all"
            style={{
              background: expanded === card.id ? "rgba(201,169,110,0.08)" : "rgba(255,255,255,0.03)",
              border: expanded === card.id ? "1px solid rgba(201,169,110,0.25)" : "1px solid rgba(201,169,110,0.1)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm opacity-50">{card.icon}</span>
                <span className="text-xs font-medium text-white/70">{card.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">
                  {card.items[0].value}
                  {card.items.length > 1 && <span className="text-white/25 ml-1">+{card.items.length - 1}</span>}
                </span>
                <motion.span
                  animate={{ rotate: expanded === card.id ? 180 : 0 }}
                  className="text-[10px] text-white/30"
                >
                  ▾
                </motion.span>
              </div>
            </div>

            {/* 画面表示: タップで展開 */}
            <div className="fortune-card-screen-only">
              <AnimatePresence>
                {expanded === card.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(201,169,110,0.1)" }}>
                      <p className="text-[10px] text-white/30 mb-2">{card.description}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {card.items.map((item) => (
                          <div key={item.key} className="px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                            <p className="text-[9px] text-white/25">{item.key}</p>
                            <p className="text-xs font-medium text-white/80">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* PDF出力: 常に展開 */}
            <div className="fortune-card-print-only mt-3 pt-3" style={{ borderTop: "1px solid rgba(201,169,110,0.1)" }}>
              <p className="text-[10px] text-white/30 mb-2">{card.description}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {card.items.map((item) => (
                  <div key={item.key} className="px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-[9px] text-white/25">{item.key}</p>
                    <p className="text-xs font-medium text-white/80">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </button>
        </motion.div>
      ))}
    </div>
  );
}
