"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import StarField from "@/shared/ui/StarField";
import GrainOverlay from "@/shared/ui/GrainOverlay";
import LibraryBg from "@/shared/ui/LibraryBg";
import TouchParticles from "@/shared/ui/TouchParticles";
import ChatBubble from "@/shared/ui/ChatBubble";
import FadeIn from "@/shared/ui/FadeIn";
import TiltCard from "@/shared/ui/TiltCard";
import ShareCard from "@/shared/ui/ShareCard";
import OshiCard from "@/shared/ui/OshiCard";
import SoundToggle, { playTap, playTransition, playReveal } from "@/shared/ui/Sound";
import { CHARACTER_CONFIG, type Character } from "@/features/fortune/character";
import { calculateAll } from "@/features/fortune/fortune-calc";
import { generateFortune } from "@/app/actions";

/* ━━━ Topic config ━━━ */
type TopicId = "general" | "work" | "love" | "social" | "money";

const TOPICS: { id: TopicId; label: string; desc: string; icon: string }[] = [
  { id: "general", label: "総合運", desc: "本質を総合的に", icon: "✦" },
  { id: "work", label: "仕事運", desc: "才能とキャリア", icon: "◈" },
  { id: "love", label: "恋愛運", desc: "恋の傾向と相性", icon: "♡" },
  { id: "social", label: "対人関係", desc: "人との関わり方", icon: "◎" },
  { id: "money", label: "金運", desc: "お金との相性", icon: "◇" },
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

type Step = "intro" | "menu" | "char_select" | "ask_name" | "ask_birthday" | "ask_topic" | "loading" | "result";

const TEST_MODE = false;

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [character, setCharacter] = useState<Character | null>(null);
  const [name, setName] = useState("");
  const [year, setYear] = useState("1995");
  const [month, setMonth] = useState("1");
  const [day, setDay] = useState("1");
  const [topic, setTopic] = useState<TopicId>("general");
  const [inputReady, setInputReady] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState(0);
  const [introReady, setIntroReady] = useState(false);
  const [hoveredTopic, setHoveredTopic] = useState<TopicId | null>(null);
  const [doorOpen, setDoorOpen] = useState(false);
  const [doorMode, setDoorMode] = useState<"keyhole" | "book">("keyhole");
  const [keyholeOpening, setKeyholeOpening] = useState(false);
  const [bookOpened, setBookOpened] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("ref") || params.get("utm_source");
    if (r) { setRef(r); sessionStorage.setItem("fd_ref", r); }
    else { const s = sessionStorage.getItem("fd_ref"); if (s) setRef(s); }
    // UTMパラメータをsessionStorageに保存
    const utmS = params.get("utm_source");
    const utmM = params.get("utm_medium");
    const utmC = params.get("utm_campaign");
    if (utmS) sessionStorage.setItem("fd_utm_source", utmS);
    if (utmM) sessionStorage.setItem("fd_utm_medium", utmM);
    if (utmC) sessionStorage.setItem("fd_utm_campaign", utmC);
    setTimeout(() => setIntroReady(true), 500);
  }, []);

  const charConfig = character ? CHARACTER_CONFIG[character] : null;
  const onBubbleDone = useCallback(() => setInputReady(true), []);
  const go = useCallback((s: Step) => { setInputReady(false); setStep(s); playTransition(); }, []);

  const topicRef = useRef(topic);
  topicRef.current = topic;

  /* ━━━ Diagnosis ━━━ */
  const runDiagnosis = useCallback(async () => {
    if (!character) return;
    const currentTopic = topicRef.current;
    try {
      const data = calculateAll(parseInt(year), parseInt(month), parseInt(day));
      const config = CHARACTER_CONFIG[character];
      const topicFocus = TOPIC_PROMPT_FOCUS[currentTopic];
      const topicLabel = TOPICS.find(t => t.id === currentTopic)?.label || "";
      const prompt = `${config.promptStyle}

以下の人物の6占術データから、あなた（${config.name}）の口調で【${topicLabel}】の診断結果を書いてください。

【テーマ】${topicFocus}

【対象者】${name} (${year}年${month}月${day}日生まれ)
【占術データ】マヤ暦:KIN${data.maya.kin}/紋章:${data.maya.glyph}/音:${data.maya.tone}/WS:${data.maya.ws} 算命学:[${data.bazi.weapon}] 四柱推命:年柱[${data.sanmeigaku.year}]/月柱[${data.sanmeigaku.month}]/日柱[${data.sanmeigaku.day}]/日干[${data.bazi.stem}] 数秘:LP${data.numerology.lp} 西洋:${data.western.sign} 宿曜:${data.sukuyo}

【重要：品質ルール】
・占いを信じていない人でも「面白い」「当たってる」と思えるような、具体性のある文章にすること
・「あなたは優しい人です」のような誰にでも当てはまる抽象的な表現は禁止
・この人の生年月日から導き出された占術データに基づく、この人だけに当てはまる具体的な特徴やアドバイスを書くこと
・占術データ（KIN番号、紋章名、日干、ライフパスナンバー等）を引用して根拠を示すこと

【出力ルール】
1. section1: 250〜350文字。占術データを2つ以上引用し、この人の本質的な性質を具体的に描写
2. section2: 250〜350文字。テーマに沿った具体的な状況分析と洞察
3. section3: 250〜350文字。今後の展望と具体的な行動アドバイス
4. oneWord: この人を一言で表す言葉。8-15文字。ありきたりな言葉は避ける
5. bookTitle: ${name}の${topicLabel}についての本のタイトル。「〜の記録」「〜の地図」「〜の季節」形式で14-20文字以内。例「追いかけてしまう人の、恋の地図」
6. action: 今日からできる具体的なアクション。20-40文字
7. luckyItem: その人の占術データに関連する具体的なアイテム

※各セクションは必ず250文字以上書くこと。短い文章は不可。

**必ず純粋なJSON**
{"oneWord":"","bookTitle":"","section1":"","section2":"","section3":"","action":"","luckyItem":""}`;
      let parsed: any = {};
      try {
        const text = await generateFortune(prompt);
        let c = text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
        const f = c.indexOf("{"); if (f !== -1) c = c.substring(f);
        const l = c.lastIndexOf("}"); if (l !== -1) c = c.substring(0, l + 1);
        parsed = JSON.parse(c);
      } catch {
        parsed = { oneWord: "…面白い星の配置", bookTitle: "星が語る、あなたの記録", section1: `…${data.maya.glyph}の紋章。芯が強い。`, section2: `${data.western.sign}のあなたは深い絆を求める。`, section3: `「${data.bazi.weapon}」を持ってる。`, action: "…朝5分、深呼吸してみて", luckyItem: "温かい飲み物" };
      }
      fetch("/api/log-diagnosis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: ref || "direct", mode: "short", topic: currentTopic, name, birthDate: `${year}-${String(parseInt(month)).padStart(2, "0")}-${String(parseInt(day)).padStart(2, "0")}`, utmSource: sessionStorage.getItem("fd_utm_source"), utmMedium: sessionStorage.getItem("fd_utm_medium"), utmCampaign: sessionStorage.getItem("fd_utm_campaign"), deviceType: /Mobi/i.test(navigator.userAgent) ? "mobile" : "desktop" }) }).catch(() => {});
      setResult({ ...parsed, data, name, topic: currentTopic });
      setStep("result");
      playReveal();
    } catch { go("ask_name"); }
  }, [character, name, year, month, day, ref, go]);

  useEffect(() => {
    if (step === "loading") {
      runDiagnosis();
      const t1 = setTimeout(() => setLoadingStage(1), 3000);
      const t2 = setTimeout(() => setLoadingStage(2), 7000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else { setLoadingStage(0); }
  }, [step, runDiagnosis]);

  const handleShare = async () => {
    const topicLabel = TOPICS.find(t => t.id === result?.topic)?.label || "総合運";
    const charTag = character === "urara" ? "#うらら担" : "#れき担";
    const t = `「${result?.bookTitle || result?.oneWord}」\n\n${result?.name}の星の記録、読んでもらった\n▶ 星の図書館\n\n#星の図書館 ${charTag}`;
    const url = window.location.origin + (ref ? `?ref=${ref}` : "");
    if (navigator.share) { try { await navigator.share({ title: "星の図書館", text: t, url }); } catch {} }
    else { try { await navigator.clipboard.writeText(`${t}\n${url}`); setToast("コピーしました"); setTimeout(() => setToast(null), 2000); } catch {} }
  };

  const handleRetryTopic = (newTopic: TopicId) => {
    setTopic(newTopic);
    setResult(null);
    playTap();
    go("loading");
  };

  const sections = result?.topic ? TOPIC_SECTIONS[result.topic as TopicId] : TOPIC_SECTIONS.general;

  return (
    <main className="min-h-screen relative overflow-hidden" style={{ background: "var(--background)" }}>
      {/* ── Keyhole transition overlay (Pattern A) ── */}
      {doorOpen && doorMode === "keyhole" && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Dark screen with keyhole-shaped window */}
          {!keyholeOpening && (
            <>
              {/* Keyhole border glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="keyhole-border w-48 h-72 sm:w-56 sm:h-80" style={{ background: "rgba(201,169,110,0.15)" }} />
              </div>
              {/* Keyhole window — shows background through it */}
              <div
                className="absolute inset-0"
                style={{
                  background: "var(--background)",
                  maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Ccircle cx='100' cy='90' r='50' fill='black'/%3E%3Crect x='80' y='130' width='40' height='130' rx='4' fill='black'/%3E%3C/svg%3E")`,
                  maskSize: "120px 180px",
                  maskPosition: "center",
                  maskRepeat: "no-repeat",
                  maskComposite: "exclude",
                  WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='white'/%3E%3Ccircle cx='100' cy='90' r='50' fill='black'/%3E%3Crect x='80' y='130' width='40' height='130' rx='4' fill='black'/%3E%3C/svg%3E")`,
                  WebkitMaskSize: "120px 180px",
                  WebkitMaskPosition: "center",
                  WebkitMaskRepeat: "no-repeat",
                }}
              />
              {/* Warm light through keyhole */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="keyhole-shape w-48 h-72 sm:w-56 sm:h-80"
                  style={{
                    background: "radial-gradient(ellipse at 50% 35%, rgba(201,169,110,0.2) 0%, rgba(201,169,110,0.05) 60%, transparent 100%)",
                  }}
                />
              </div>
            </>
          )}
          {/* Expanding circle reveal */}
          {keyholeOpening && (
            <>
              <div
                className="absolute inset-0 bg-[var(--background)]"
                style={{
                  animation: "keyhole-reveal 1.4s cubic-bezier(0.4, 0, 0.2, 1) forwards",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: "radial-gradient(circle at 50% 50%, rgba(201,169,110,0.35) 0%, transparent 50%)",
                  animation: "keyhole-glow 1.4s ease-out forwards",
                }}
              />
            </>
          )}
        </div>
      )}

      {/* ── Book transition overlay (Pattern B) ── */}
      {doorOpen && doorMode === "book" && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="book-cover absolute inset-0">
            {/* Page underneath (visible as cover opens) */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(180deg, #f5f0e8 0%, #e8dcc8 50%, #ddd0b8 100%)",
                boxShadow: "inset 0 0 60px rgba(0,0,0,0.15)",
              }}
            />
            {/* Front cover */}
            <div
              className={`book-front absolute inset-0 book-leather book-gold-border ${bookOpened ? "book-opened" : ""}`}
              style={{ animation: bookOpened ? undefined : "leather-shimmer 8s ease-in-out infinite" }}
            >
              {/* Gold decorative lines */}
              <div className="absolute inset-x-8 top-[15%] h-px book-gold-line" />
              <div className="absolute inset-x-8 bottom-[15%] h-px book-gold-line" />
              <div className="absolute inset-y-[15%] left-8 w-px book-gold-line" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(201,169,110,0.15) 10%, rgba(201,169,110,0.3) 50%, rgba(201,169,110,0.15) 90%, transparent 100%)" }} />
              <div className="absolute inset-y-[15%] right-8 w-px book-gold-line" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(201,169,110,0.15) 10%, rgba(201,169,110,0.3) 50%, rgba(201,169,110,0.15) 90%, transparent 100%)" }} />

              {/* Book title on cover */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="book-title-emboss text-[var(--gold)] text-3xl sm:text-4xl font-bold tracking-wider" style={{ fontFamily: "var(--font-serif), serif" }}>
                  星の図書館
                </p>
                <div className="mt-4 w-16 h-px" style={{ background: "rgba(201,169,110,0.3)" }} />
              </div>

              {/* Spine shadow */}
              <div
                className="absolute top-0 left-0 w-4 h-full book-spine-texture"
                style={{ background: "linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)" }}
              />
            </div>
          </div>
        </div>
      )}

      <LibraryBg scene={step === "loading" ? "aisle" : step === "result" ? "desk" : "main"} />
      <StarField />
      <GrainOverlay />
      <TouchParticles />
      <SoundToggle />

      <div className="relative z-20 max-w-lg mx-auto px-5 min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col justify-center py-8">
          <AnimatePresence mode="wait">

            {/* ━━━ INTRO — 没入型オープニング ━━━ */}
            {step === "intro" && (
              <motion.div key="intro" exit={{ opacity: 0, scale: 0.95 }} className="text-center">
                {/* Gold horizontal line */}
                <motion.div
                  className="mx-auto mb-8 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, var(--gold), transparent)" }}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 120, opacity: 0.4 }}
                  transition={{ duration: 1.2, delay: 0.3 }}
                />

                {/* Title — large serif */}
                <motion.div className="mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.5 }}>
                  <motion.h1
                    className="text-5xl sm:text-7xl font-bold tracking-tight mb-4"
                    style={{
                      fontFamily: "var(--font-serif), serif",
                      background: "linear-gradient(135deg, #fff 0%, var(--gold) 50%, #fff 100%)",
                      backgroundSize: "200% 200%",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      animation: "shimmer 3s ease-in-out infinite",
                    }}
                    initial={{ y: 30, opacity: 0, filter: "blur(4px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 1.2, delay: 0.8 }}
                  >
                    星の図書館
                  </motion.h1>

                  {/* Subtitle */}
                  <motion.p
                    className="text-white/40 text-sm tracking-widest"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.5 }}
                  >
                    2人の司書が、あなたの星を6つの占術で読む。
                  </motion.p>
                </motion.div>

                {/* Character silhouettes peek */}
                <motion.div
                  className="flex justify-center gap-4 mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.0, duration: 0.8 }}
                >
                  {(["urara", "reki"] as const).map((c) => {
                    const cfg = CHARACTER_CONFIG[c];
                    return (
                      <div
                        key={c}
                        className={`w-14 h-14 rounded-full overflow-hidden ${cfg.breatheClass}`}
                        style={{
                          border: `1.5px solid ${c === "urara" ? "rgba(180,150,100,0.3)" : "rgba(201,169,110,0.3)"}`,
                          boxShadow: `0 0 20px ${cfg.accentColor}`,
                        }}
                      >
                        <Image src={cfg.avatar} alt={cfg.name} width={112} height={112} className="object-cover w-full h-full" />
                      </div>
                    );
                  })}
                </motion.div>

                {/* Door mode toggle */}
                {/* CTA */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: introReady ? 1 : 0, y: introReady ? 0 : 20 }}
                  transition={{ delay: 2.5, duration: 0.5 }}
                  whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(201,169,110,0.25)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { go("char_select"); }}
                  className="mx-auto px-10 py-3.5 rounded text-sm font-medium border transition-all"
                  style={{
                    borderColor: "rgba(201,169,110,0.4)",
                    background: "transparent",
                    color: "var(--brass-light)",
                    boxShadow: "0 0 20px rgba(201,169,110,0.08), inset 0 1px 0 rgba(201,169,110,0.05)",
                    fontFamily: "var(--font-ui), sans-serif",
                  }}
                >
                  図書館に入る
                </motion.button>

                {/* Hashtag hint */}
                <motion.div
                  className="mt-6 flex justify-center gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.15 }}
                  transition={{ delay: 3.5 }}
                >
                  <span className="text-[10px] text-white tracking-wide">#うらら担</span>
                  <span className="text-[10px] text-white tracking-wide">#れき担</span>
                </motion.div>
              </motion.div>
            )}

            {/* ━━━ MENU — 鑑定メニュー選択 ━━━ */}
            {step === "menu" && (
              <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }}>
                <motion.p
                  className="text-center text-sm mb-8 tracking-wide"
                  style={{ color: "var(--text-secondary)" }}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  …どの鑑定を受ける？
                </motion.p>
                <div className="space-y-4">
                  {/* ショート鑑定（無料・最も目立つ） */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(201,169,110,0.15)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { playTap(); go("char_select"); }}
                    className="w-full p-5 rounded-lg text-left transition-all"
                    style={{
                      background: "rgba(44,32,24,0.7)",
                      border: "1px solid rgba(201,169,110,0.3)",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-bold" style={{ color: "var(--brass-light)", fontFamily: "var(--font-serif), serif" }}>ショート鑑定</span>
                      <span className="text-sm font-bold px-3 py-0.5 rounded" style={{ background: "rgba(201,169,110,0.15)", color: "var(--brass-light)" }}>無料</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>3分であなたの本質を読み解く</p>
                  </motion.button>

                  {/* フル鑑定 */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      playTap();
                      if (TEST_MODE) { router.push("/full"); return; }
                      try {
                        const res = await fetch("/api/checkout", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ mode: "full", ref: ref || "direct", utmSource: sessionStorage.getItem("fd_utm_source"), utmMedium: sessionStorage.getItem("fd_utm_medium"), utmCampaign: sessionStorage.getItem("fd_utm_campaign") }),
                        });
                        const data = await res.json();
                        if (data.url) window.location.href = data.url;
                        else alert(data.error || "決済画面の表示に失敗しました");
                      } catch { alert("通信エラーが発生しました"); }
                    }}
                    className="w-full p-5 rounded-lg text-left transition-all"
                    style={{
                      background: "rgba(28,23,16,0.7)",
                      border: "1px solid rgba(201,169,110,0.15)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif), serif" }}>フル鑑定</span>
                      <span className="text-xs" style={{ color: "var(--brass)" }}>¥200</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-dim)" }}>6占術の完全レポート（6000文字超）</p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-dim)" }}>
                      {TEST_MODE ? "※現在テスト公開中：無料でお試しいただけます" : "※決済画面に遷移します"}
                    </p>
                  </motion.button>

                  {/* 相性鑑定 */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      playTap();
                      if (TEST_MODE) { router.push("/compatibility"); return; }
                      try {
                        const res = await fetch("/api/checkout", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ mode: "compatibility", ref: ref || "direct", utmSource: sessionStorage.getItem("fd_utm_source"), utmMedium: sessionStorage.getItem("fd_utm_medium"), utmCampaign: sessionStorage.getItem("fd_utm_campaign") }),
                        });
                        const data = await res.json();
                        if (data.url) window.location.href = data.url;
                        else alert(data.error || "決済画面の表示に失敗しました");
                      } catch { alert("通信エラーが発生しました"); }
                    }}
                    className="w-full p-5 rounded-lg text-left transition-all"
                    style={{
                      background: "rgba(28,23,16,0.7)",
                      border: "1px solid rgba(201,169,110,0.15)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif), serif" }}>相性鑑定</span>
                      <span className="text-xs" style={{ color: "var(--brass)" }}>¥200</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-dim)" }}>2人の星を重ねて読む</p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-dim)" }}>
                      {TEST_MODE ? "※現在テスト公開中：無料でお試しいただけます" : "※決済画面に遷移します"}
                    </p>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ━━━ CHAR SELECT — キャラ主役化 ━━━ */}
            {step === "char_select" && (
              <motion.div key="cs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }}>
                <motion.p
                  className="text-center text-white/40 text-sm mb-8 tracking-wide"
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  …どっちに読んでもらう？
                </motion.p>
                <div className="grid grid-cols-2 gap-5">
                  {(["urara", "reki"] as Character[]).map((c, i) => {
                    const cfg = CHARACTER_CONFIG[c];
                    const isUrara = c === "urara";
                    return (
                      <TiltCard
                        key={c}
                        className="rounded-lg overflow-hidden relative wood-grain"
                        style={{
                          background: "rgba(28,23,16,0.85)",
                          border: `1px solid rgba(201,169,110,0.15)`,
                          boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(201,169,110,0.03)",
                        }}
                        onClick={() => { playTap(); setCharacter(c); go("ask_name"); }}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + i * 0.2, type: "spring", stiffness: 100 }}
                        >
                          <div className="aspect-[3/4] overflow-hidden relative">
                            <Image
                              src={cfg.image}
                              alt={cfg.name}
                              width={382}
                              height={510}
                              className="object-cover w-full h-full"
                              priority
                            />
                            {/* Bottom gradient */}
                            <div
                              className="absolute inset-x-0 bottom-0 h-1/3"
                              style={{ background: `linear-gradient(to top, ${isUrara ? "rgba(12,10,8,0.9)" : "rgba(12,10,8,0.9)"}, transparent)` }}
                            />
                            {/* Name overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <p className="text-base font-bold text-white">{cfg.name}</p>
                              <p className="text-[11px] text-white/50 mt-0.5">{cfg.description}</p>
                            </div>
                          </div>
                        </motion.div>
                      </TiltCard>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ━━━ ASK NAME ━━━ */}
            {step === "ask_name" && charConfig && character && (
              <motion.div key="name" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <ChatBubble characterImage={charConfig.avatar} characterName={charConfig.name} breatheClass={charConfig.breatheClass} text="…名前、教えてくれる？" onComplete={onBubbleDone} speed={character === "urara" ? 45 : 35} />
                <AnimatePresence>
                  {inputReady && (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mt-4 ml-13">
                      <input
                        type="text" value={name} onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { playTap(); go("ask_birthday"); } }}
                        placeholder="ニックネームでOK" autoFocus
                        className="w-full px-3 py-3.5 rounded text-sm text-white placeholder-white/30 outline-none transition-all focus:border-[var(--brass)]"
                        style={{
                          background: "rgba(44,32,24,0.7)",
                          border: "1px solid rgba(201,169,110,0.25)",
                          fontFamily: "var(--font-serif-body), serif",
                        }}
                      />
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(201,169,110,0.2)" }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { if (name.trim()) { playTap(); go("ask_birthday"); } }}
                        disabled={!name.trim()}
                        className="mt-3 w-full py-3 rounded text-sm font-medium disabled:opacity-20 transition-all"
                        style={{ background: "rgba(201,169,110,0.12)", border: "1px solid var(--brass)", color: "var(--brass-light)", fontFamily: "var(--font-ui), sans-serif" }}
                      >
                        次へ
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ━━━ ASK BIRTHDAY ━━━ */}
            {step === "ask_birthday" && charConfig && character && (
              <motion.div key="bday" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <ChatBubble characterImage={charConfig.avatar} characterName={charConfig.name} breatheClass={charConfig.breatheClass} text={`…ありがとう、${name}。生年月日を教えてくれる？`} onComplete={onBubbleDone} speed={character === "urara" ? 45 : 35} />
                <AnimatePresence>
                  {inputReady && (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mt-4 ml-13">
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { val: year, set: (v: string) => setYear(v), opts: Array.from({ length: 80 }, (_, i) => ({ v: String(2010 - i), l: `${2010 - i}年` })) },
                          { val: month, set: (v: string) => setMonth(v), opts: Array.from({ length: 12 }, (_, i) => ({ v: String(i + 1), l: `${i + 1}月` })) },
                          { val: day, set: (v: string) => setDay(v), opts: Array.from({ length: 31 }, (_, i) => ({ v: String(i + 1), l: `${i + 1}日` })) },
                        ].map((sel, idx) => (
                          <select
                            key={idx} value={sel.val} onChange={(e) => sel.set(e.target.value)}
                            className="px-2 py-3.5 text-sm text-white text-center outline-none appearance-none"
                            style={{ background: "rgba(44,32,24,0.7)", border: "1px solid rgba(201,169,110,0.25)", borderRadius: "4px" }}
                          >
                            {sel.opts.map((o) => (
                              <option key={o.v} value={o.v} className="bg-[#110e09] text-white">{o.l}</option>
                            ))}
                          </select>
                        ))}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(201,169,110,0.2)" }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { playTap(); go("ask_topic"); }}
                        className="w-full py-3 rounded-full text-sm font-medium text-white transition-all"
                        style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.6), rgba(201,169,110,0.3))", border: "1px solid rgba(201,169,110,0.3)" }}
                      >
                        次へ
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ━━━ ASK TOPIC — ホバーでキャラコメント ━━━ */}
            {step === "ask_topic" && charConfig && character && (
              <motion.div key="topic" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <ChatBubble
                  characterImage={charConfig.avatar}
                  characterName={charConfig.name}
                  breatheClass={charConfig.breatheClass}
                  text={hoveredTopic ? charConfig.topicHover[hoveredTopic] : `…${name}、何について知りたい？`}
                  onComplete={hoveredTopic ? undefined : onBubbleDone}
                  speed={character === "urara" ? 45 : 35}
                />
                <AnimatePresence>
                  {inputReady && (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mt-4 ml-13 space-y-2">
                      {TOPICS.map((t, i) => (
                        <motion.button
                          key={t.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(201,169,110,0.15)" }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { playTap(); setTopic(t.id); setStep("loading"); }}
                          onMouseEnter={() => setHoveredTopic(t.id)}
                          onMouseLeave={() => setHoveredTopic(null)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all group glass-card"
                        >
                          <span className="text-lg opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: "var(--gold)" }}>{t.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white/90">{t.label}</p>
                            <p className="text-[11px] text-white/35">{t.desc}</p>
                          </div>
                          <span className="text-white/15 group-hover:text-white/40 transition-colors text-xs">→</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ━━━ LOADING — 本を探しに行く ━━━ */}
            {step === "loading" && charConfig && (
              <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="text-center">
                {/* Character searching animation */}
                <div className="relative mb-8">
                  {/* Bookshelf silhouette */}
                  <div className="absolute inset-x-0 bottom-0 h-1 rounded-full mx-8" style={{ background: "linear-gradient(90deg, transparent, rgba(201,169,110,0.1), transparent)" }} />

                  {/* Character with search animation */}
                  <div className="char-search mx-auto">
                    <div
                      className="w-28 h-28 rounded-full overflow-hidden mx-auto glow-pulse"
                      style={{
                        border: `2px solid ${character === "urara" ? "rgba(180,150,100,0.5)" : "rgba(201,169,110,0.5)"}`,
                      }}
                    >
                      <Image src={charConfig.image} alt={charConfig.name} width={224} height={224} className="object-cover w-full h-full" />
                    </div>
                  </div>
                </div>

                {/* Loading text stages */}
                <AnimatePresence mode="wait">
                  <motion.p key={loadingStage} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-sm text-white/60 text-serif">
                    {[charConfig.loadingText, "…星の記録を照合してる", "…もう少しだけ待ってて"][loadingStage]}
                  </motion.p>
                </AnimatePresence>

                {/* Ripple rings */}
                <div className="relative w-16 h-16 mx-auto mt-8">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border"
                      style={{ borderColor: character === "urara" ? "rgba(180,150,100,0.2)" : "rgba(201,169,110,0.2)" }}
                      animate={{ scale: [1, 1.5 + i * 0.3], opacity: [0.4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ━━━ RESULT — 星の本を読む ━━━ */}
            {step === "result" && result && charConfig && character && (
              <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-8">
                <ChatBubble
                  characterImage={charConfig.avatar}
                  characterName={charConfig.name}
                  breatheClass={charConfig.breatheClass}
                  text={`…${result.name}の${TOPICS.find(t => t.id === result.topic)?.label || ""}の本、見つけてきたよ。`}
                  speed={35}
                />

                {/* ━━━ SHARE CARD (hero) ━━━ */}
                <FadeIn delay={1.5}>
                  <ShareCard
                    characterName={charConfig.name}
                    characterAvatar={charConfig.avatar}
                    characterId={character}
                    userName={result.name}
                    topicLabel={TOPICS.find(t => t.id === result.topic)?.label || "総合運"}
                    oneWord={result.oneWord}
                    bookTitle={result.bookTitle}
                    westernSign={result.data.western.sign}
                    kin={result.data.maya.kin}
                    glyph={result.data.maya.glyph}
                    siteUrl={typeof window !== "undefined" ? window.location.origin : ""}
                  />
                </FadeIn>

                {/* Bento grid — data */}
                <FadeIn delay={2.0}>
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {[
                      { label: "星座", value: result.data.western.sign, span: "" },
                      { label: "KIN", value: result.data.maya.kin, span: "" },
                      { label: "LP", value: result.data.numerology.lp, span: "" },
                      { label: "太陽の紋章", value: result.data.maya.glyph, span: "col-span-2" },
                      { label: "中心星", value: result.data.bazi.weapon, span: "" },
                    ].map((d, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 2.2 + i * 0.08 }}
                        className={`text-center p-3 rounded-2xl glass-card ${d.span}`}
                      >
                        <p className="text-[10px] text-white/25 mb-0.5">{d.label}</p>
                        <p className="text-sm font-medium text-white/80">{d.value}</p>
                      </motion.div>
                    ))}
                  </div>
                </FadeIn>

                {/* Readings — serif body text */}
                <FadeIn delay={2.5}>
                  <div className="space-y-4 mb-6">
                    {sections.map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 2.7 + i * 0.15 }}
                        className="border-l-2 pl-4 py-2"
                        style={{ borderLeftColor: character === "urara" ? "rgba(180,150,100,0.4)" : "rgba(201,169,110,0.4)" }}
                      >
                        <h3 className="text-xs font-bold text-white/50 mb-1 tracking-wide">{s.title}</h3>
                        <p className="text-sm text-white/75 leading-relaxed text-serif">{result[`section${i + 1}`]}</p>
                      </motion.div>
                    ))}
                  </div>
                </FadeIn>

                {/* Action & Lucky */}
                <FadeIn delay={3.0}>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { label: "今日のアクション", value: result.action },
                      { label: "ラッキーアイテム", value: result.luckyItem },
                    ].map((item, i) => (
                      <div key={i} className="p-3 rounded-2xl text-center glass-card">
                        <p className="text-[10px] text-white/25 mb-1">{item.label}</p>
                        <p className="text-xs text-white/70">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </FadeIn>

                {/* Oshi card — 推しバッジ */}
                <FadeIn delay={3.2}>
                  <OshiCard characterName={charConfig.name} characterAvatar={charConfig.avatar} characterId={character} />
                </FadeIn>

                {/* Try another topic */}
                <FadeIn delay={3.3}>
                  <div className="mb-6">
                    <ChatBubble
                      characterImage={charConfig.avatar}
                      characterName={charConfig.name}
                      breatheClass={charConfig.breatheClass}
                      text={`…${TOPICS.find(t => t.id === result.topic)?.label}はこんな感じ。他のテーマも読んでみる？`}
                      speed={28}
                    />
                    <div className="ml-13 mt-2 flex flex-wrap gap-2">
                      {TOPICS.filter(t => t.id !== result.topic).map((t, i) => (
                        <motion.button
                          key={t.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 3.5 + i * 0.08 }}
                          whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(201,169,110,0.2)" }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRetryTopic(t.id)}
                          className="px-3.5 py-2 rounded-full text-xs font-medium text-white/80 transition-all glass-card"
                        >
                          <span className="mr-1 opacity-70">{t.icon}</span> {t.label}
                        </motion.button>
                      ))}
                    </div>
                    <p className="ml-13 mt-2 text-[10px] text-white/20">2人の司書 × 5テーマ = 10通りの診断</p>
                  </div>
                </FadeIn>

                {/* Next actions — 3-way CTA */}
                <FadeIn delay={3.8}>
                  <ChatBubble
                    characterImage={charConfig.avatar}
                    characterName={charConfig.name}
                    breatheClass={charConfig.breatheClass}
                    text="…次はどうする？"
                    speed={28}
                  />
                  <div className="ml-13 mt-3 space-y-3">
                    {/* Primary CTA: フル鑑定 */}
                    <motion.button
                      whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(201,169,110,0.25)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "full", ref: ref || "direct", utmSource: sessionStorage.getItem("fd_utm_source"), utmMedium: sessionStorage.getItem("fd_utm_medium"), utmCampaign: sessionStorage.getItem("fd_utm_campaign") }) })
                          .then(r => r.json()).then(d => { if (d.url) window.location.href = d.url; })
                          .catch(() => alert("決済ページへの接続に失敗しました。もう一度お試しください。"));
                      }}
                      className="w-full py-4 rounded-2xl text-sm font-medium text-white transition-all"
                      style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.55), rgba(201,169,110,0.28))", border: "1px solid rgba(201,169,110,0.4)" }}
                    >
                      <span className="block text-base font-bold mb-0.5" style={{ fontFamily: "var(--font-serif), serif", color: "var(--brass-light)" }}>もっと深く知る</span>
                      <span className="text-xs text-white/50">6000文字のフル鑑定 · ¥200</span>
                    </motion.button>

                    {/* Secondary CTA: 相性鑑定 */}
                    <motion.button
                      whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(201,169,110,0.15)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={async () => {
                        playTap();
                        if (TEST_MODE) { router.push("/compatibility"); return; }
                        try {
                          const res = await fetch("/api/checkout", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ mode: "compatibility", ref: ref || "direct", utmSource: sessionStorage.getItem("fd_utm_source"), utmMedium: sessionStorage.getItem("fd_utm_medium"), utmCampaign: sessionStorage.getItem("fd_utm_campaign") }),
                          });
                          const data = await res.json();
                          if (data.url) window.location.href = data.url;
                          else alert(data.error || "決済画面の表示に失敗しました");
                        } catch { alert("通信エラーが発生しました"); }
                      }}
                      className="w-full py-4 rounded-2xl text-sm text-left px-5 transition-all"
                      style={{ background: "rgba(28,23,16,0.7)", border: "1px solid rgba(201,169,110,0.2)" }}
                    >
                      <span className="block text-sm font-bold mb-0.5 text-white/80" style={{ fontFamily: "var(--font-serif), serif" }}>誰かとの相性を見る</span>
                      <span className="text-xs text-white/35">相性鑑定 · ¥200</span>
                    </motion.button>

                    {/* Tertiary CTA: 別の運勢（無料） */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { playTap(); setResult(null); go("ask_topic"); }}
                      className="w-full py-3 rounded-2xl text-sm text-white/50 transition-all"
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      別の運勢を見る（無料）
                    </motion.button>
                  </div>

                  {/* Share + restart */}
                  <div className="ml-13 mt-4 flex items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleShare}
                      className="flex-1 py-2.5 rounded-full text-xs text-white/40 border transition-all"
                      style={{ borderColor: "rgba(255,255,255,0.1)" }}
                    >
                      結果をシェアする
                    </motion.button>
                    <button
                      onClick={() => { setStep("intro"); setName(""); setResult(null); setCharacter(null); setTopic("general"); }}
                      className="flex-1 py-2.5 text-[11px] text-white/20 hover:text-white/40 transition-colors"
                    >
                      最初からやり直す
                    </button>
                  </div>
                </FadeIn>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {["intro", "result"].includes(step) && (
          <FadeIn delay={step === "intro" ? 3.0 : 4.5}>
            <footer className="text-center text-[11px] text-white/15 pb-6 space-y-1">
              <p>&copy; 2026 星の図書館 · Produced by SATOYAMA AI BASE</p>
              <p>
                <a href="/legal" className="hover:text-white/30 transition-colors">特定商取引法に基づく表記</a>
                {" · "}
                <a href="/privacy" className="hover:text-white/30 transition-colors">プライバシーポリシー</a>
              </p>
            </footer>
          </FadeIn>
        )}

        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm text-white shadow-lg z-50"
              style={{ background: "rgba(201,169,110,0.8)", backdropFilter: "blur(8px)" }}>
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
