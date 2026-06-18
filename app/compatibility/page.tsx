"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { calculateAll, calculateCompatibility, type CompatibilityType } from "@/features/fortune/fortune-calc";
import { generateFortune } from "@/app/actions";
import { CHARACTER_CONFIG, type Character } from "@/features/fortune/character";
import StarField from "@/shared/ui/StarField";
import FadeIn from "@/shared/ui/FadeIn";
import LibraryBg from "@/shared/ui/LibraryBg";
import GrainOverlay from "@/shared/ui/GrainOverlay";
import ShareCard from "@/shared/ui/ShareCard";

const TEST_MODE = false;

const COMPAT_TYPES: { id: CompatibilityType; label: string; desc: string }[] = [
  { id: "love", label: "恋愛・パートナー", desc: "恋愛やパートナーシップの相性" },
  { id: "business", label: "ビジネス", desc: "仕事やプロジェクトでの相性" },
  { id: "general", label: "総合", desc: "恋愛・仕事・友情の3軸で総合診断" },
];

type Step = "type-select" | "person1" | "person2" | "confirm";

const STEP_LINES: Record<Step, Record<Character, string>> = {
  "type-select": {
    urara: "…ふたりのことを見てほしいんだね。まず、どんな相性を知りたい？",
    reki: "…ふたりの相性、見てあげようか。どの相性が気になる？",
  },
  person1: {
    urara: "…じゃあ、まず1人目の情報を教えて",
    reki: "…まず1人目。名前と生年月日を教えて",
  },
  person2: {
    urara: "…ありがとう。次に2人目の情報を教えてくれる？",
    reki: "…次、2人目。同じく名前と生年月日",
  },
  confirm: {
    urara: "…ふたりの情報、これでいい？ 準備ができたら星の記録を照合するね",
    reki: "…これでいいね？ じゃあ照合してくる",
  },
};

export default function CompatibilityPage() {
  const router = useRouter();
  const [ref, setRef] = useState<string | null>(null);
  const [verified, setVerified] = useState(TEST_MODE);
  const [character, setCharacter] = useState<Character | null>(null);
  const [step, setStep] = useState<Step>("type-select");
  const [screen, setScreen] = useState<"select" | "input" | "loading" | "result">("select");
  const [compatType, setCompatType] = useState<CompatibilityType>("love");
  const [person1, setPerson1] = useState({ name: "", year: "", month: "1", day: "1" });
  const [person2, setPerson2] = useState({ name: "", year: "", month: "1", day: "1" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("payment_token");
    const r = params.get("ref") || sessionStorage.getItem("fd_ref");
    if (r) setRef(r);
    if (TEST_MODE) return;
    if (t) {
      fetch("/api/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) setVerified(true);
          else router.push("/?error=invalid_token");
        })
        .catch(() => router.push("/?error=verification_failed"));
    } else {
      router.push("/?error=no_token");
    }
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [step]);

  // 結果画面でページ離脱時に確認
  useEffect(() => {
    if (screen !== "result") return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "ダウンロードはお済みですか？";
    };
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      const ok = window.confirm("もうダウンロードはし終わった？\n\n「OK」→ ページを離れる\n「キャンセル」→ 戻って保存する");
      if (ok) {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.history.back();
      } else {
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [screen]);

  const STEPS: Step[] = ["type-select", "person1", "person2", "confirm"];
  const currentStepIndex = STEPS.indexOf(step);

  const nextStep = () => {
    if (currentStepIndex < STEPS.length - 1) setStep(STEPS[currentStepIndex + 1]);
  };

  const prevStep = () => {
    if (currentStepIndex > 0) setStep(STEPS[currentStepIndex - 1]);
  };

  const canProceed = () => {
    switch (step) {
      case "type-select": return true;
      case "person1": return person1.name.trim() !== "" && person1.year !== "" && parseInt(person1.year) > 1900;
      case "person2": return person2.name.trim() !== "" && person2.year !== "" && parseInt(person2.year) > 1900;
      default: return true;
    }
  };

  const handleStartDiagnosis = async () => {
    if (!person1.name || !person1.year || !person2.name || !person2.year) return;
    setScreen("loading");

    try {
      const data1 = calculateAll(parseInt(person1.year), parseInt(person1.month), parseInt(person1.day));
      const data2 = calculateAll(parseInt(person2.year), parseInt(person2.month), parseInt(person2.day));
      const score = calculateCompatibility(data1, data2);
      const isGeneral = compatType === "general";
      const typeLabel = COMPAT_TYPES.find(t => t.id === compatType)?.label || "総合";

      const uraraStyle = CHARACTER_CONFIG.urara.promptStyle;
      const rekiStyle = CHARACTER_CONFIG.reki.promptStyle;
      const prompt = `
星の図書館の2人の司書が掛け合いで相性を読み解きます。

【うらら（司書1）の人格】
${uraraStyle}

【れき（司書2）の人格】
${rekiStyle}

2人の6占術データと相性スコアをもとに、${typeLabel}の観点で相性を読み解いてください。

■ ${person1.name}さん (${person1.year}年${person1.month}月${person1.day}日生まれ)
・マヤ暦: KIN${data1.maya.kin} / 紋章:${data1.maya.glyph} / 音:${data1.maya.tone}
・算命学: [${data1.bazi.weapon}] ・数秘: LP${data1.numerology.lp} ・${data1.western.sign} ・${data1.sukuyo}
・四柱推命: 年柱[${data1.sanmeigaku.year}] / 月柱[${data1.sanmeigaku.month}] / 日柱[${data1.sanmeigaku.day}]

■ ${person2.name}さん (${person2.year}年${person2.month}月${person2.day}日生まれ)
・マヤ暦: KIN${data2.maya.kin} / 紋章:${data2.maya.glyph} / 音:${data2.maya.tone}
・算命学: [${data2.bazi.weapon}] ・数秘: LP${data2.numerology.lp} ・${data2.western.sign} ・${data2.sukuyo}
・四柱推命: 年柱[${data2.sanmeigaku.year}] / 月柱[${data2.sanmeigaku.month}] / 日柱[${data2.sanmeigaku.day}]

【相性スコア】 総合: ${score.total}点

【品質ルール — 最重要】
・200円を支払った読者が十分な価値を感じる読み応えのある内容にすること
・2人の占術データの組み合わせから読み取れる具体的な相性の特徴を書くこと
・「相性が良いです」のような抽象表現は禁止。なぜ良いのか・注意が必要なのかを占術データの根拠付きで説明
・占術データ（KIN番号、紋章、日干、ライフパスナンバー等）を引用して根拠を示すこと
・2人の関係性を深めるための具体的なアドバイスを含めること

【重要: 掛け合い形式のルール】
各セクションは担当する司書の口調で書くこと。人格を絶対に混同しないこと。

1. attraction（うらら担当）: 500〜800文字。うららの口調（「…」で間をとる、「〜だと思う」「〜かもね」と柔らかく寄り添う）。2人が惹かれ合う理由を占術データの根拠付きで詳しく解説
2. strengths（れき担当）: 400〜600文字。れきの口調（「〜じゃない？」「〜でしょ」と軽く問いかける、少し刺す）。この2人ならではの強みを具体的に
3. challenges（うらら担当）: 400〜600文字。うららの口調で。注意すべき点とその乗り越え方
4. advice（れき担当）: 400〜600文字。れきの口調で。関係性を深めるための具体的なアドバイス
${isGeneral ? `5. loveStory（うらら担当）: 400〜600文字。うららの口調で。恋愛面の相性を深掘り\n6. businessStory（れき担当）: 400〜600文字。れきの口調で。仕事やビジネスでの相性\n7. friendStory（うらら担当）: 400〜600文字。うららの口調で。友人としての関係性` : ""}

※各セクションは指定文字数の下限を必ず守ること。短い文章は不可。

**必ず純粋なJSON** {"attraction":"","strengths":"","challenges":"","advice":"","oneWord":"8〜15文字"${isGeneral ? ',"loveStory":"","businessStory":"","friendStory":""' : ""}}
`;
      const text = await generateFortune(prompt);
      let clean = text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
      const first = clean.indexOf("{");
      if (first !== -1) clean = clean.substring(first);
      const last = clean.lastIndexOf("}");
      if (last !== -1) clean = clean.substring(0, last + 1);
      const story = JSON.parse(clean);

      setResult({ name1: person1.name, name2: person2.name, data1, data2, score, type: compatType, story });
      setScreen("result");
      window.scrollTo(0, 0);
    } catch (e) {
      alert(e instanceof Error ? e.message : "鑑定中にエラーが発生しました。");
      setScreen("input");
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-[rgba(201,169,110,0.4)] focus:ring-1 focus:ring-[rgba(201,169,110,0.2)]";
  const selectClass = "px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 text-center focus:outline-none focus:border-[rgba(201,169,110,0.4)]";

  if (!verified) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-8 h-8 border-3 border-[rgba(201,169,110,0.3)] border-t-[#c9a96e] rounded-full animate-spin" />
      </main>
    );
  }

  // 相性鑑定はキャラ選択なし — うらら＆れきの2人が掛け合い
  if (screen === "select") {
    // 相性鑑定は自動的に2人の司書が担当する演出
    return (
      <main className="min-h-screen relative overflow-hidden" style={{ background: "#0a0e1a" }}>
        <LibraryBg scene="main" />
        <StarField />
        <GrainOverlay />
        <div className="relative z-10 max-w-lg mx-auto px-5 py-8">
          <button onClick={() => router.push(ref ? `/?ref=${ref}` : "/")} className="text-sm text-white/30 hover:text-white/60 mb-4 inline-block transition-colors">← 戻る</button>
          <FadeIn delay={0.2}>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-1 text-white" style={{ fontFamily: "var(--font-serif), serif" }}>相性鑑定</h1>
              <p className="text-xs text-white/40">…2人の司書が掛け合いで読み解きます</p>
            </div>
          </FadeIn>
          {/* うらら＆れきの2人表示 */}
          <div className="flex justify-center gap-6 mb-6">
            {(["urara", "reki"] as Character[]).map((c, i) => {
              const cfg = CHARACTER_CONFIG[c];
              return (
                <motion.div
                  key={c}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.2 }}
                  className="text-center"
                >
                  <motion.div
                    className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-2"
                    style={{ border: "2px solid rgba(201,169,110,0.4)", boxShadow: "0 0 20px rgba(201,169,110,0.15)" }}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
                  >
                    <Image src={cfg.avatar} alt={cfg.name} width={96} height={96} className="object-cover w-full h-full" />
                  </motion.div>
                  <p className="text-sm font-bold text-white">{cfg.name}</p>
                  <p className="text-[10px] text-white/30">{cfg.description}</p>
                </motion.div>
              );
            })}
          </div>
          <FadeIn delay={0.7}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setCharacter("urara"); setScreen("input"); }}
              className="w-full py-3.5 rounded-full text-sm font-medium text-white transition-all"
              style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.6), rgba(201,169,110,0.3))", border: "1px solid rgba(201,169,110,0.3)" }}
            >
              2人に読んでもらう
            </motion.button>
            <p className="text-center text-[11px] text-white/20 mt-4">¥200 — 2人の星を重ねて読む</p>
          </FadeIn>
        </div>
      </main>
    );
  }

  if (screen === "loading") {
    const uraraConfig = CHARACTER_CONFIG.urara;
    const rekiConfig = CHARACTER_CONFIG.reki;
    return (
      <main className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "#0a0e1a" }}>
        <LibraryBg scene="aisle" />
        <StarField />
        <GrainOverlay />
        <div className="relative z-10 text-center px-6">
          {/* 2人のアバターが並ぶ */}
          <div className="flex justify-center gap-4 mb-6">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
              <div className="w-16 h-16 rounded-full overflow-hidden border-2" style={{ borderColor: "var(--gold)", boxShadow: "0 0 20px rgba(201,169,110,0.2)" }}>
                <Image src={uraraConfig.avatar} alt="うらら" width={64} height={64} className="object-cover w-full h-full" />
              </div>
            </motion.div>
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
              <div className="w-16 h-16 rounded-full overflow-hidden border-2" style={{ borderColor: "var(--gold)", boxShadow: "0 0 20px rgba(201,169,110,0.2)" }}>
                <Image src={rekiConfig.avatar} alt="れき" width={64} height={64} className="object-cover w-full h-full" />
              </div>
            </motion.div>
          </div>
          <p className="text-sm text-white/60">…ふたりの本、見比べてくるね</p>
          <p className="text-xs text-white/25 mt-1">30〜60秒ほどお待ちください</p>
          <div className="flex justify-center gap-1 mt-6">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: "var(--gold)" }} animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (screen === "result" && result) {
    const uraraConfig = CHARACTER_CONFIG.urara;
    const rekiConfig = CHARACTER_CONFIG.reki;
    return (
      <main className="min-h-screen relative overflow-hidden" style={{ background: "#0a0e1a" }}>
        <LibraryBg scene="desk" />
        <StarField />
        <GrainOverlay />
        <div className="relative z-10 max-w-lg mx-auto px-5 py-8">
          {/* 2人の司書ヘッダー */}
          <header className="text-center mb-8">
            <div className="flex justify-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-full overflow-hidden" style={{ border: "1.5px solid rgba(201,169,110,0.5)", boxShadow: "0 0 15px rgba(201,169,110,0.15)" }}>
                <Image src={uraraConfig.avatar} alt="うらら" width={56} height={56} className="object-cover w-full h-full" />
              </div>
              <div className="w-14 h-14 rounded-full overflow-hidden" style={{ border: "1.5px solid rgba(201,169,110,0.5)", boxShadow: "0 0 15px rgba(201,169,110,0.15)" }}>
                <Image src={rekiConfig.avatar} alt="れき" width={56} height={56} className="object-cover w-full h-full" />
              </div>
            </div>
            <p className="text-xs text-white/40 mb-1">うらら＆れきが読み解いた</p>
            <p className="text-xs text-[#c9a96e] tracking-widest mb-1">相性鑑定</p>
            <h1 className="text-xl font-bold text-white/90">{result.name1} × {result.name2}</h1>
            <div className="mt-3 inline-block px-6 py-2 rounded-full" style={{ background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.3)" }}>
              <span className="text-2xl font-bold text-[#c9a96e]">{result.score.total}</span>
              <span className="text-xs text-white/40 ml-1">/ 100</span>
            </div>
          </header>

          {/* 占術データ比較 */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: result.name1, data: result.data1 },
              { label: result.name2, data: result.data2 },
            ].map((p) => (
              <div key={p.label} className="p-3 rounded-xl bg-white/5 border border-[rgba(201,169,110,0.15)]">
                <p className="text-xs text-[#c9a96e] mb-2 text-center">{p.label}</p>
                <div className="space-y-1 text-[10px] text-white/50">
                  <p>星座: {p.data.western.sign}</p>
                  <p>KIN: {p.data.maya.kin} / {p.data.maya.glyph}</p>
                  <p>LP: {p.data.numerology.lp}</p>
                  <p>中心星: {p.data.bazi.weapon}</p>
                  <p>宿曜: {p.data.sukuyo}</p>
                  <p>日柱: {p.data.sanmeigaku.day}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 掛け合い形式: うらら→れき→うらら… */}
          {[
            { title: "引き合うもの", text: result.story.attraction, speaker: "urara" as Character },
            { title: "ふたりの強み", text: result.story.strengths, speaker: "reki" as Character },
            { title: "気をつけたいこと", text: result.story.challenges, speaker: "urara" as Character },
            { title: "アドバイス", text: result.story.advice, speaker: "reki" as Character },
            ...(result.type === "general" ? [
              { title: "恋愛の相性", text: result.story.loveStory, speaker: "urara" as Character },
              { title: "仕事の相性", text: result.story.businessStory, speaker: "reki" as Character },
              { title: "友情の相性", text: result.story.friendStory, speaker: "urara" as Character },
            ] : []),
          ].filter(s => s.text).map((section, i) => {
            const spkConfig = CHARACTER_CONFIG[section.speaker];
            const isRight = section.speaker === "reki";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: isRight ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="mb-5"
              >
                <div className={`flex gap-2.5 ${isRight ? "flex-row-reverse" : ""}`}>
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-1" style={{ border: "1px solid rgba(201,169,110,0.3)" }}>
                    <Image src={spkConfig.avatar} alt={spkConfig.name} width={32} height={32} className="object-cover w-full h-full" />
                  </div>
                  <div className={`flex-1 ${isRight ? "text-right" : ""}`}>
                    <p className="text-[10px] text-white/30 mb-1">{spkConfig.name} — {section.title}</p>
                    <div className={`inline-block ${isRight ? "text-left" : ""} bg-white/5 border border-white/10 rounded-2xl ${isRight ? "rounded-tr-sm" : "rounded-tl-sm"} px-4 py-3`}>
                      <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{section.text}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          <ShareCard
            characterName="うらら＆れき"
            characterAvatar="/urara-full.png"
            characterAvatar2="/reki-full.png"
            characterId="urara"
            userName={`${result.name1} × ${result.name2}`}
            topicLabel="相性鑑定"
            oneWord={result.story.oneWord || `相性${result.score.total}点`}
            siteUrl={typeof window !== "undefined" ? window.location.origin : ""}
          />

          {/* 注意書き */}
          <p className="text-center text-[11px] text-white/30 mt-2 mb-4">
            …ページを閉じるとダウンロードできなくなるよ。忘れずに保存しておいてね
          </p>

          {/* ボタン */}
          <div className="space-y-3 mt-4 no-print">
            <button
              onClick={() => window.print()}
              className="w-full py-3 rounded-full text-sm font-medium transition-all"
              style={{ background: "rgba(201,169,110,0.15)", border: "1px solid rgba(201,169,110,0.3)", color: "#c9a96e" }}
            >
              全文をPDF保存
            </button>
            <button
              onClick={() => {
                if (window.confirm("もうダウンロードはし終わった？\n\n「OK」→ トップへ移動\n「キャンセル」→ 戻って保存する")) {
                  router.push(ref ? `/?ref=${ref}` : "/");
                }
              }}
              className="w-full py-2.5 rounded-full border border-white/10 text-sm text-white/40 hover:bg-white/5 transition-colors"
            >
              トップへ戻る
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Conversational input
  const renderPersonForm = (label: string, person: typeof person1, setPerson: typeof setPerson1) => (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1">{label}のお名前 <span className="text-[#c9a96e] text-xs">必須</span></label>
        <input type="text" value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} placeholder="ニックネームでOK" autoFocus className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1">{label}の生年月日 <span className="text-[#c9a96e] text-xs">必須</span></label>
        <div className="grid grid-cols-3 gap-2">
          <input type="number" value={person.year} onChange={(e) => setPerson({ ...person, year: e.target.value })} placeholder="1995" className={selectClass} />
          <select value={person.month} onChange={(e) => setPerson({ ...person, month: e.target.value })} className={selectClass}>
            {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{i + 1}月</option>))}
          </select>
          <select value={person.day} onChange={(e) => setPerson({ ...person, day: e.target.value })} className={selectClass}>
            {Array.from({ length: 31 }, (_, i) => (<option key={i + 1} value={i + 1}>{i + 1}日</option>))}
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen relative" style={{ background: "var(--background)" }}>
      <LibraryBg scene="main" />
      <GrainOverlay />
      <div className="relative z-20 max-w-lg mx-auto px-5 py-8">
        <button
          onClick={() => currentStepIndex > 0 ? prevStep() : setScreen("select")}
          className="text-sm text-white/30 hover:text-white/50 mb-4 inline-block transition-colors"
        >
          ← {currentStepIndex > 0 ? "前へ" : "戻る"}
        </button>

        <div className="text-center mb-6">
          <p className="text-xs text-[#c9a96e] tracking-widest mb-1">星の図書館</p>
          <h1 className="text-xl font-bold text-white/90">相性鑑定</h1>
          <p className="text-xs text-white/40 mt-1">¥200 — 2人の星を重ねて読む</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="w-2 h-2 rounded-full transition-colors"
              style={{ background: i <= currentStepIndex ? "rgba(201,169,110,0.7)" : "rgba(255,255,255,0.1)" }}
            />
          ))}
        </div>

        {/* Character speech */}
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[rgba(201,169,110,0.2)]">
            <Image src={CHARACTER_CONFIG[character || "urara"].avatar} alt={CHARACTER_CONFIG[character || "urara"].name} width={40} height={40} className="object-cover" />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex-1"
            >
              <p className="text-sm text-white/70 leading-relaxed">{STEP_LINES[step]?.[character || "urara"]}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === "type-select" && (
              <div className="space-y-3">
                {COMPAT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setCompatType(t.id); nextStep(); }}
                    className="w-full p-4 rounded-xl text-left transition-all hover:bg-white/5"
                    style={{ background: "rgba(255,255,255,0.03)", border: compatType === t.id ? "1px solid rgba(201,169,110,0.4)" : "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <p className="text-sm font-medium text-white/80">{t.label}</p>
                    <p className="text-xs text-white/40 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            )}

            {step === "person1" && renderPersonForm("1人目", person1, setPerson1)}
            {step === "person2" && renderPersonForm("2人目", person2, setPerson2)}

            {step === "confirm" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "1人目", p: person1 },
                    { label: "2人目", p: person2 },
                  ].map((x) => (
                    <div key={x.label} className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-[10px] text-white/40 mb-1">{x.label}</p>
                      <p className="text-sm text-white/80">{x.p.name}</p>
                      <p className="text-xs text-white/50">{x.p.year}年{x.p.month}月{x.p.day}日</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-[10px] text-white/40 mb-1">鑑定タイプ</p>
                  <p className="text-sm text-white/80">{COMPAT_TYPES.find(t => t.id === compatType)?.label}</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation (type-selectは自動遷移なので表示しない) */}
        {step !== "type-select" && (
          <div className="mt-6">
            {step === "confirm" ? (
              <button
                onClick={handleStartDiagnosis}
                className="w-full py-3.5 rounded-full text-white font-medium text-sm transition-colors"
                style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.5), rgba(201,169,110,0.25))", border: "1px solid rgba(201,169,110,0.3)" }}
              >
                鑑定を開始する
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full py-3.5 rounded-full text-white font-medium text-sm transition-colors disabled:opacity-30"
                style={{ background: canProceed() ? "linear-gradient(135deg, rgba(201,169,110,0.5), rgba(201,169,110,0.25))" : "rgba(255,255,255,0.05)", border: "1px solid rgba(201,169,110,0.3)" }}
              >
                次へ
              </button>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </main>
  );
}
