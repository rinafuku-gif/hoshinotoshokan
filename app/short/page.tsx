"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import StarField from "@/shared/ui/StarField";
import LibraryBg from "@/shared/ui/LibraryBg";
import GrainOverlay from "@/shared/ui/GrainOverlay";
import FadeIn from "@/shared/ui/FadeIn";
import ShareCard from "@/shared/ui/ShareCard";
import { calculateAll, type FortuneResult } from "@/features/fortune/fortune-calc";
import { generateFortune } from "@/app/actions";
import { CHARACTER_CONFIG, type Character } from "@/features/fortune/character";

/* ━━━ Topic config (shared with main page) ━━━ */
type TopicId = "general" | "work" | "love" | "social" | "money";

const TOPICS: { id: TopicId; label: string; icon: string }[] = [
  { id: "general", label: "総合運", icon: "✦" },
  { id: "work", label: "仕事運", icon: "◈" },
  { id: "love", label: "恋愛運", icon: "♡" },
  { id: "social", label: "対人関係", icon: "◎" },
  { id: "money", label: "金運", icon: "◇" },
];

const TOPIC_SECTIONS: Record<TopicId, { title: string }[]> = {
  general: [{ title: "性格の核心" }, { title: "人間関係" }, { title: "才能・仕事" }],
  work: [{ title: "仕事スタイル" }, { title: "強み・才能" }, { title: "キャリアの転機" }],
  love: [{ title: "恋愛パターン" }, { title: "理想の相手" }, { title: "恋のアドバイス" }],
  social: [{ title: "関わり方の特徴" }, { title: "相性の良いタイプ" }, { title: "対人力" }],
  money: [{ title: "お金の傾向" }, { title: "稼ぎ方・才能" }, { title: "金運アップのヒント" }],
};

const TOPIC_PROMPT_FOCUS: Record<TopicId, string> = {
  general: "総合的な性格分析。section1=性格の本質と内面、section2=人間関係の傾向と相性、section3=才能と適性",
  work: "仕事運・キャリア分析。section1=仕事の進め方と特徴、section2=仕事で活かせる強み、section3=転機の時期とチャンスの掴み方",
  love: "恋愛運分析。section1=恋愛の傾向と特徴、section2=相性の良いパートナー像、section3=恋愛を良くするための具体的助言",
  social: "対人関係分析。section1=人との関わり方のパターン、section2=居心地の良い人間関係の特徴、section3=コミュニケーションの強みと課題",
  money: "金運分析。section1=お金に対する考え方と使い方、section2=収入を得る才能とスタイル、section3=金運を上げるための具体策",
};

function LoadingText({ stages }: { stages: { text: string; delay: number }[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    const timers = stages.map((stage, i) => {
      if (i === 0) return null;
      return setTimeout(() => setIndex(i), stage.delay);
    });
    return () => timers.forEach((t) => t && clearTimeout(t));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <p className="text-sm text-white/80">{stages[index]?.text}</p>;
}

export default function ShortPage() {
  const router = useRouter();
  const [ref, setRef] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [topic, setTopic] = useState<TopicId>("general");
  const [screen, setScreen] = useState<"select" | "input" | "loading" | "result">("select");
  const [form, setForm] = useState({ name: "", year: "", month: "1", day: "1" });
  const [toast, setToast] = useState<string | null>(null);
  const [result, setResult] = useState<{
    name: string; data: FortuneResult; topic: TopicId;
    oneWord: string; section1: string; section2: string; section3: string;
    action: string; luckyItem: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("ref") || sessionStorage.getItem("fd_ref");
    if (r) setRef(r);
  }, []);

  const charConfig = character ? CHARACTER_CONFIG[character] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.year || !character) return;
    setScreen("loading");

    try {
      const data = calculateAll(parseInt(form.year), parseInt(form.month), parseInt(form.day));
      const config = CHARACTER_CONFIG[character];
      const topicFocus = TOPIC_PROMPT_FOCUS[topic];
      const topicLabel = TOPICS.find(t => t.id === topic)?.label || "総合運";

      const prompt = `
${config.promptStyle}

以下の人物の6占術データから、あなた（${config.name}）の口調・性格で【${topicLabel}】の診断結果を書いてください。

【テーマ】${topicFocus}

【対象者】
${form.name} (${form.year}年${form.month}月${form.day}日生まれ)

【占術データ】
・マヤ暦: KIN${data.maya.kin} / 太陽の紋章:${data.maya.glyph} / 銀河の音:${data.maya.tone} / ウェイブスペル:${data.maya.ws}
・算命学: 中心星[${data.bazi.weapon}]
・四柱推命: 年柱[${data.sanmeigaku.year}] / 月柱[${data.sanmeigaku.month}] / 日柱[${data.sanmeigaku.day}] / 日干[${data.bazi.stem}]
・数秘術: ライフパスナンバー[${data.numerology.lp}]
・西洋占星術: ${data.western.sign}
・宿曜: ${data.sukuyo}

【執筆ルール】
1. section1: 200〜300文字。占術データを2つ以上引用。${config.name}の口調で
2. section2: 200〜300文字。${config.name}の口調で
3. section3: 200〜300文字。${config.name}の口調で
4. oneWord: この人を一言で表す言葉。8〜15文字。${config.name}らしい表現で
5. action: 今日からできる具体的なアクション。${config.name}が軽く勧める感じで
6. luckyItem: ラッキーアイテム
7. **必ず純粋なJSON形式で出力**

{"oneWord":"","section1":"","section2":"","section3":"","action":"","luckyItem":""}
`;

      let parsed: any = {};
      try {
        const text = await generateFortune(prompt);
        let clean = text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
        const first = clean.indexOf("{");
        if (first !== -1) clean = clean.substring(first);
        const last = clean.lastIndexOf("}");
        if (last !== -1) clean = clean.substring(0, last + 1);
        parsed = JSON.parse(clean);
      } catch (err) {
        console.error("[handleSubmit] JSONパース失敗:", err);
        parsed = {
          oneWord: "…なかなか面白い星の配置",
          section1: `…あなたの紋章、${data.maya.glyph}だった。ライフパスナンバーは${data.numerology.lp}。穏やかに見えて、中身はかなり芯が強いタイプだと思う。`,
          section2: `${data.western.sign}のあなたは、深い絆を求めるタイプ。…広く浅くより、本音で話せる少人数のほうが居心地いいんじゃない？`,
          section3: `算命学の「${data.bazi.weapon}」を持ってるから、本質を見抜く力がある。…まあ、活かせる場所を見つけられるかどうかだけど。`,
          action: "…とりあえず、朝5分だけ窓を開けて深呼吸してみて",
          luckyItem: "温かい飲み物",
        };
      }

      fetch("/api/log-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: ref || "direct", mode: "short", topic, name: form.name,
          birthDate: `${form.year}-${String(parseInt(form.month)).padStart(2, "0")}-${String(parseInt(form.day)).padStart(2, "0")}`,
        }),
      }).catch(() => {});

      setResult({
        name: form.name, data, topic,
        oneWord: parsed.oneWord || "…なかなか面白い星の配置",
        section1: parsed.section1 || "",
        section2: parsed.section2 || "",
        section3: parsed.section3 || "",
        action: parsed.action || "…朝5分だけ窓を開けて深呼吸してみて",
        luckyItem: parsed.luckyItem || "温かい飲み物",
      });
      setScreen("result");
      window.scrollTo(0, 0);
    } catch {
      alert("診断中にエラーが発生しました。もう一度お試しください。");
      setScreen("input");
    }
  };

  const handleShare = async () => {
    const topicLabel = TOPICS.find(t => t.id === result?.topic)?.label || "総合運";
    const text = `${result?.name}の${topicLabel}「${result?.oneWord}」\n\n星の図書館 で無料診断 →`;
    const url = window.location.origin + (ref ? `?ref=${ref}` : "");
    if (navigator.share) {
      try { await navigator.share({ title: "星の図書館", text, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(`${text}\n${url}`); setToast("コピーしました"); setTimeout(() => setToast(null), 2000); } catch {}
    }
  };

  const handleRetryTopic = (newTopic: TopicId) => {
    setTopic(newTopic);
    setResult(null);
    setScreen("loading");
    runDiagnosisWithTopic(newTopic);
  };

  const runDiagnosisWithTopic = async (topicOverride: TopicId) => {
    if (!form.name || !form.year || !character) return;
    try {
      const data = calculateAll(parseInt(form.year), parseInt(form.month), parseInt(form.day));
      const config = CHARACTER_CONFIG[character];
      const topicFocus = TOPIC_PROMPT_FOCUS[topicOverride];
      const topicLabel = TOPICS.find(t => t.id === topicOverride)?.label || "総合運";

      const prompt = `
${config.promptStyle}

以下の人物の6占術データから、あなた（${config.name}）の口調・性格で【${topicLabel}】の診断結果を書いてください。

【テーマ】${topicFocus}

【対象者】
${form.name} (${form.year}年${form.month}月${form.day}日生まれ)

【占術データ】
・マヤ暦: KIN${data.maya.kin} / 太陽の紋章:${data.maya.glyph} / 銀河の音:${data.maya.tone} / ウェイブスペル:${data.maya.ws}
・算命学: 中心星[${data.bazi.weapon}]
・四柱推命: 年柱[${data.sanmeigaku.year}] / 月柱[${data.sanmeigaku.month}] / 日柱[${data.sanmeigaku.day}] / 日干[${data.bazi.stem}]
・数秘術: ライフパスナンバー[${data.numerology.lp}]
・西洋占星術: ${data.western.sign}
・宿曜: ${data.sukuyo}

【執筆ルール】
1. section1: 200〜300文字。占術データを2つ以上引用。${config.name}の口調で
2. section2: 200〜300文字。${config.name}の口調で
3. section3: 200〜300文字。${config.name}の口調で
4. oneWord: この人を一言で表す言葉。8〜15文字。${config.name}らしい表現で
5. action: 今日からできる具体的なアクション。${config.name}が軽く勧める感じで
6. luckyItem: ラッキーアイテム
7. **必ず純粋なJSON形式で出力**

{"oneWord":"","section1":"","section2":"","section3":"","action":"","luckyItem":""}
`;

      let parsed: any = {};
      try {
        const text = await generateFortune(prompt);
        let clean = text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
        const first = clean.indexOf("{");
        if (first !== -1) clean = clean.substring(first);
        const last = clean.lastIndexOf("}");
        if (last !== -1) clean = clean.substring(0, last + 1);
        parsed = JSON.parse(clean);
      } catch (err) {
        console.error("[runDiagnosisWithTopic] JSONパース失敗:", err);
        parsed = {
          oneWord: "…なかなか面白い星の配置",
          section1: `…あなたの紋章、${data.maya.glyph}だった。ライフパスナンバーは${data.numerology.lp}。穏やかに見えて、中身はかなり芯が強いタイプだと思う。`,
          section2: `${data.western.sign}のあなたは、深い絆を求めるタイプ。…広く浅くより、本音で話せる少人数のほうが居心地いいんじゃない？`,
          section3: `算命学の「${data.bazi.weapon}」を持ってるから、本質を見抜く力がある。…まあ、活かせる場所を見つけられるかどうかだけど。`,
          action: "…とりあえず、朝5分だけ窓を開けて深呼吸してみて",
          luckyItem: "温かい飲み物",
        };
      }

      // Log retry diagnosis
      fetch("/api/log-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: ref || "direct", mode: "short", topic: topicOverride, name: form.name,
          birthDate: `${form.year}-${String(parseInt(form.month)).padStart(2, "0")}-${String(parseInt(form.day)).padStart(2, "0")}`,
        }),
      }).catch(() => {});

      setResult({
        name: form.name, data, topic: topicOverride,
        oneWord: parsed.oneWord || "…なかなか面白い星の配置",
        section1: parsed.section1 || "", section2: parsed.section2 || "", section3: parsed.section3 || "",
        action: parsed.action || "…朝5分だけ深呼吸してみて",
        luckyItem: parsed.luckyItem || "温かい飲み物",
      });
      setScreen("result");
      window.scrollTo(0, 0);
    } catch {
      alert("診断中にエラーが発生しました。");
      setScreen("input");
    }
  };

  const sections = result?.topic ? TOPIC_SECTIONS[result.topic] : TOPIC_SECTIONS.general;

  // ━━━ Character select — dark immersive ━━━
  if (screen === "select") {
    return (
      <main className="min-h-screen relative overflow-hidden" style={{ background: "#0a0e1a" }}>
        <LibraryBg scene="main" />
        <StarField />
        <GrainOverlay />
        <div className="relative z-10 max-w-lg mx-auto px-5 py-8">
          <button onClick={() => router.push(ref ? `/?ref=${ref}` : "/")} className="text-sm text-white/30 hover:text-white/60 mb-4 inline-block transition-colors">← 戻る</button>
          <FadeIn delay={0.2}>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-1 text-white" style={{ fontFamily: "var(--font-serif), serif" }}>ショート診断</h1>
              <p className="text-xs text-white/40">…どっちに読んでもらう？</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-2 gap-4">
            {(["urara", "reki"] as Character[]).map((c, i) => {
              const cfg = CHARACTER_CONFIG[c];
              const fullImg = c === "urara" ? "/urara-full.png" : "/reki-full.png";
              return (
                <motion.button
                  key={c}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.2 }}
                  whileHover={{ scale: 1.03, boxShadow: "0 10px 40px rgba(201,169,110,0.15)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setCharacter(c); setScreen("input"); }}
                  className="rounded-2xl overflow-hidden text-center"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,169,110,0.2)" }}
                >
                  <motion.div
                    className="w-full aspect-square overflow-hidden"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                  >
                    <Image src={fullImg} alt={cfg.name} width={382} height={382} className="object-cover w-full h-full" />
                  </motion.div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-white">{cfg.name}</p>
                    <p className="text-[11px] text-white/40 mt-0.5">{cfg.description}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
          <FadeIn delay={0.8}>
            <p className="text-center text-[11px] text-white/20 mt-6">無料 — 3分であなたの本質を読み解く</p>
          </FadeIn>
        </div>
      </main>
    );
  }

  // ━━━ Loading — dark immersive ━━━
  if (screen === "loading" && charConfig) {
    const fullImg = character === "urara" ? "/urara-full.png" : "/reki-full.png";
    const stages = [
      { text: charConfig.loadingText, delay: 0 },
      { text: "…星の記録を照合してる", delay: 4000 },
      { text: "…もう少しだけ待ってて", delay: 8000 },
    ];
    return (
      <main className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "#0a0e1a" }}>
        <LibraryBg scene="main" />
        <StarField />
        <GrainOverlay />
        <div className="relative z-10 text-center px-6">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
            <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-6 border-2" style={{ borderColor: "var(--gold)", boxShadow: "0 0 30px rgba(201,169,110,0.3)" }}>
              <Image src={fullImg} alt={charConfig.name} width={192} height={192} className="object-cover w-full h-full" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <LoadingText stages={stages} />
          </motion.div>
          <div className="flex justify-center gap-1 mt-6">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--gold)" }}
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ━━━ Result — dark immersive ━━━
  if (screen === "result" && result && charConfig) {
    const topicLabel = TOPICS.find(t => t.id === result.topic)?.label || "総合運";
    return (
      <main className="min-h-screen relative overflow-hidden" style={{ background: "#0a0e1a" }}>
        <LibraryBg scene="main" />
        <StarField />
        <GrainOverlay />
        <div className="relative z-10 max-w-lg mx-auto px-5 py-8">
          {/* Header */}
          <header className="text-center mb-6">
            <div className="w-14 h-14 rounded-full overflow-hidden mx-auto mb-2" style={{ border: "1.5px solid rgba(201,169,110,0.5)", boxShadow: "0 0 20px rgba(201,169,110,0.15)" }}>
              <Image src={charConfig.image} alt={charConfig.name} width={112} height={112} className="object-cover w-full h-full" />
            </div>
            <p className="text-xs text-white/40 mb-1">{charConfig.name}が読み解いた</p>
            <h1 className="text-lg font-bold text-white">{result.name} の{topicLabel}</h1>
          </header>

          {/* oneWord */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="text-center mb-6 p-5 rounded-2xl"
            style={{ background: "rgba(201,169,110,0.06)", border: "1px solid rgba(201,169,110,0.2)" }}
          >
            <p className="text-[11px] text-white/30 mb-1 tracking-widest uppercase">{topicLabel}</p>
            <p className="text-xl font-bold" style={{
              fontFamily: "var(--font-serif), serif",
              background: "linear-gradient(135deg, #fff, var(--gold))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>{result.oneWord}</p>
          </motion.div>

          {/* Share Card */}
          <ShareCard
            characterName={charConfig.name}
            characterAvatar={charConfig.avatar}
            characterId={character || "urara"}
            userName={result.name}
            topicLabel={topicLabel}
            oneWord={result.oneWord}
            westernSign={result.data.western.sign}
            kin={result.data.maya.kin}
            glyph={result.data.maya.glyph}
            siteUrl={typeof window !== "undefined" ? window.location.origin : ""}
          />

          {/* Data grid */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { label: "星座", value: result.data.western.sign },
              { label: "KIN", value: result.data.maya.kin },
              { label: "LP", value: result.data.numerology.lp },
              { label: "紋章", value: result.data.maya.glyph },
              { label: "中心星", value: result.data.bazi.weapon },
              { label: "宿曜", value: result.data.sukuyo },
            ].map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="text-center p-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,169,110,0.1)" }}
              >
                <p className="text-[10px] text-white/25">{d.label}</p>
                <p className="text-xs font-medium text-white/80">{d.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Readings — topic-specific */}
          <div className="space-y-4 mb-6">
            {sections.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.12 }}
                className="border-l-2 pl-4 py-2"
                style={{ borderLeftColor: "rgba(201,169,110,0.4)" }}
              >
                <h3 className="text-xs font-bold text-white/50 mb-1 tracking-wide">{s.title}</h3>
                <p className="text-sm text-white/75 leading-relaxed">{String(result[`section${i + 1}` as keyof typeof result] || "")}</p>
              </motion.div>
            ))}
          </div>

          {/* Action & Lucky */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-3 rounded-xl text-center" style={{ background: "rgba(201,169,110,0.04)", border: "1px solid rgba(201,169,110,0.1)" }}>
              <p className="text-[10px] text-white/25 mb-1">今日のアクション</p>
              <p className="text-xs text-white/70">{result.action}</p>
            </div>
            <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,169,110,0.1)" }}>
              <p className="text-[10px] text-white/25 mb-1">ラッキーアイテム</p>
              <p className="text-xs text-white/70">{result.luckyItem}</p>
            </div>
          </div>

          {/* ━━━ ADDICTIVE: Try another topic ━━━ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mb-6 p-4 rounded-2xl text-center"
            style={{ background: "rgba(201,169,110,0.04)", border: "1px solid rgba(201,169,110,0.15)" }}
          >
            <p className="text-xs text-white/50 mb-3">…別のテーマも読んでみる？</p>
            <div className="flex flex-wrap justify-center gap-2">
              {TOPICS.filter(t => t.id !== result.topic).map((t) => (
                <motion.button
                  key={t.id}
                  whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(201,169,110,0.2)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleRetryTopic(t.id)}
                  className="px-3 py-1.5 rounded-full text-xs text-white/70 transition-all"
                  style={{ background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.2)" }}
                >
                  <span className="mr-1 opacity-60">{t.icon}</span>{t.label}
                </motion.button>
              ))}
            </div>
            <p className="text-[10px] text-white/15 mt-2">2人の司書 × 5テーマ = 10通りの診断</p>
          </motion.div>

          {/* Upsell */}
          <div className="p-5 rounded-2xl text-center mb-6" style={{ background: "rgba(201,169,110,0.06)", border: "1px solid rgba(201,169,110,0.2)" }}>
            <p className="text-sm text-white/60 mb-1">…もっと詳しく知りたいなら</p>
            <p className="text-xs text-white/30 mb-3">フル鑑定（6000文字超）や相性占いもあるよ</p>
            <button
              onClick={() => {
                fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "full", ref: ref || "direct" }) })
                  .then(r => r.json()).then(d => { if (d.url) window.location.href = d.url; })
                  .catch(() => alert("決済ページへの接続に失敗しました。もう一度お試しください。"));
              }}
              className="px-6 py-2.5 rounded-full text-sm font-medium text-white transition-all hover:shadow-lg"
              style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.5), rgba(201,169,110,0.25))", border: "1px solid rgba(201,169,110,0.3)" }}
            >
              ¥200で詳しく鑑定する
            </button>
          </div>

          {/* Bottom actions */}
          <div className="flex gap-3 no-print">
            <button onClick={() => { setResult(null); setScreen("select"); }} className="flex-1 py-2.5 rounded-full text-sm text-white/40 transition-colors hover:text-white/60" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              最初から
            </button>
            <button onClick={handleShare} className="flex-1 py-2.5 rounded-full text-sm text-white/60 transition-colors hover:text-white/80" style={{ border: "1px solid rgba(201,169,110,0.25)" }}>
              結果を共有
            </button>
          </div>

          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm text-white shadow-lg z-50"
              style={{ background: "rgba(201,169,110,0.8)", backdropFilter: "blur(8px)" }}
            >
              {toast}
            </motion.div>
          )}

          <footer className="text-center text-[11px] text-white/15 mt-8">
            星の図書館 — ショート診断
          </footer>
        </div>
      </main>
    );
  }

  // ━━━ Input form — dark immersive ━━━
  return (
    <main className="min-h-screen relative overflow-hidden" style={{ background: "#0a0e1a" }}>
      <LibraryBg scene="main" />
      <StarField />
      <GrainOverlay />
      <div className="relative z-10 max-w-lg mx-auto px-5 py-8">
        <button onClick={() => setScreen("select")} className="text-sm text-white/30 hover:text-white/60 mb-4 inline-block transition-colors">← キャラ選択へ</button>

        <div className="text-center mb-6">
          {charConfig && (
            <div className="w-14 h-14 rounded-full overflow-hidden mx-auto mb-2" style={{ border: "1.5px solid rgba(201,169,110,0.5)", boxShadow: "0 0 20px rgba(201,169,110,0.15)" }}>
              <Image src={charConfig.image} alt={charConfig.name} width={56} height={56} className="object-cover object-top w-full h-full" />
            </div>
          )}
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-serif), serif" }}>ショート診断</h1>
          <p className="text-xs text-white/40 mt-1">…情報を教えてくれたら読んでくるよ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">お名前 <span className="text-amber-400/60 text-xs">必須</span></label>
            <input
              type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ニックネームでOK" required
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all focus:ring-1"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,169,110,0.2)" }}
            />
          </div>

          {/* Birthday */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">生年月日 <span className="text-amber-400/60 text-xs">必須</span></label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
                placeholder="1995" required
                className="px-3 py-3 rounded-xl text-sm text-white text-center outline-none placeholder-white/20"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,169,110,0.2)" }}
              />
              <select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}
                className="px-3 py-3 rounded-xl text-sm text-white text-center outline-none appearance-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,169,110,0.2)" }}>
                {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1} className="bg-[#0a0e1a] text-white">{i + 1}月</option>))}
              </select>
              <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}
                className="px-3 py-3 rounded-xl text-sm text-white text-center outline-none appearance-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,169,110,0.2)" }}>
                {Array.from({ length: 31 }, (_, i) => (<option key={i + 1} value={i + 1} className="bg-[#0a0e1a] text-white">{i + 1}日</option>))}
              </select>
            </div>
          </div>

          {/* ━━━ Topic dropdown ━━━ */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">聞きたいテーマ</label>
            <div className="relative">
            <select
              value={topic} onChange={(e) => setTopic(e.target.value as TopicId)}
              className="w-full px-4 py-3 pr-10 rounded-xl text-sm text-white outline-none appearance-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,169,110,0.2)" }}
            >
              {TOPICS.map(t => (
                <option key={t.id} value={t.id} className="bg-[#0a0e1a] text-white">{t.icon} {t.label}</option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none text-xs">▾</span>
            </div>
          </div>

          <button type="submit"
            className="w-full py-3.5 rounded-full text-sm font-medium text-white transition-all hover:shadow-lg"
            style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.6), rgba(201,169,110,0.3))", border: "1px solid rgba(201,169,110,0.3)" }}
          >
            無料で診断する
          </button>
        </form>

        <p className="text-center text-[10px] text-white/15 mt-4">2人の司書 × 5テーマ = 10通りの無料診断</p>
      </div>
    </main>
  );
}
