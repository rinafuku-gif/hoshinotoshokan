"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = (current / total) * 100;
  return (
    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(201,169,110,0.15)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: "var(--gold)" }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}
