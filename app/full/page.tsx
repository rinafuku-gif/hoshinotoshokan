"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { calculateAll } from "@/features/fortune/fortune-calc";
import { generateFortune } from "@/app/actions";
import { CHARACTER_CONFIG, type Character } from "@/features/fortune/character";
import StarField from "@/shared/ui/StarField";
import FadeIn from "@/shared/ui/FadeIn";
import LibraryBg from "@/shared/ui/LibraryBg";
import GrainOverlay from "@/shared/ui/GrainOverlay";
import ShareCard from "@/shared/ui/ShareCard";
import FortuneCards from "@/features/fortune/FortuneCards";
import DOMPurify from "isomorphic-dompurify";

function LoadingText({ stages }: { stages: { text: string; delay: number }[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timers = stages.map((stage, i) => {
      if (i === 0) return null;
      return setTimeout(() => setIndex(i), stage.delay);
    });
    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [stages]);
  return <p className="text-sm text-white/80">{stages[index]?.text}</p>;
}

const TEST_MODE = false;

type Step = "name" | "birthday" | "birthtime" | "birthplace" | "concern" | "confirm";

// セリフはキャラ選択後に動的生成するため、ここではデフォルト（うらら）で定義
const STEP_LINES: Record<Step, { urara: string; reki: string }> = {
  name: {
    urara: "…こんにちは。あなたの名前を教えてもらえる？",
    reki: "…はいはい。まず名前を聞いておこうか",
  },
  birthday: {
    urara: "…ありがとう。次に、生年月日を教えて",
    reki: "…次、生年月日。これがないと始まらないからね",
  },
  birthtime: {
    urara: "…出生時間がわかると、もっと深く読めるよ。わからなければ飛ばしてOK",
    reki: "…出生時間、わかる？ わかると面白いんだけど。まあ、わからなくても大丈夫",
  },
  birthplace: {
    urara: "…生まれた場所も教えてくれる？ わからなければ飛ばして大丈夫",
    reki: "…生まれた場所は？ 土地の気も影響するんだよ。…知らなかった？",
  },
  concern: {
    urara: "…最後に、何か聞きたいことや気になっていることがあれば",
    reki: "…何か聞きたいことある？ なければないで、勝手に読むけど",
  },
  confirm: {
    urara: "…これでいい？ 準備ができたら、あなたの星の記録を探しに行くね",
    reki: "…これでいいね？ じゃあ、ちょっと探しに行ってくる",
  },
};

const STEPS: Step[] = ["name", "birthday", "birthtime", "birthplace", "concern", "confirm"];

const STEP_LABELS: Record<Step, string> = {
  name: "お名前",
  birthday: "生年月日",
  birthtime: "出生時間",
  birthplace: "出生地",
  concern: "相談内容",
  confirm: "確認",
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function FullPage() {
  const router = useRouter();
  const [ref, setRef] = useState<string | null>(null);
  const [verified, setVerified] = useState(TEST_MODE);
  const [character, setCharacter] = useState<Character | null>(null);
  const [step, setStep] = useState<Step>("name");
  const [screen, setScreen] = useState<"select" | "input" | "loading" | "result">("select");
  const [form, setForm] = useState({
    name: "", year: "", month: "1", day: "1",
    birthHour: "", birthPlace: "", concern: "",
  });
  const [resultHtml, setResultHtml] = useState("");
  const [resultMeta, setResultMeta] = useState<{ oneWord: string; bookTitle: string }>({ oneWord: "", bookTitle: "" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resultData, setResultData] = useState<any>(null);
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
    // タブ閉じ/リロード対策
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "ダウンロードはお済みですか？";
    };
    // ブラウザバック対策: history.pushStateで戻るボタンを捕捉
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

  const currentStepIndex = STEPS.indexOf(step);
  const charId = character || "urara";
  const charConfig = CHARACTER_CONFIG[charId];
  const currentCharLine = STEP_LINES[step]?.[charId] || "";

  const goToStep = (targetStep: Step) => setStep(targetStep);
  const nextStep = () => {
    if (currentStepIndex < STEPS.length - 1) setStep(STEPS[currentStepIndex + 1]);
  };
  const prevStep = () => {
    if (currentStepIndex > 0) setStep(STEPS[currentStepIndex - 1]);
  };

  const canProceed = () => {
    switch (step) {
      case "name": return form.name.trim() !== "";
      case "birthday": return form.year !== "" && parseInt(form.year) > 1900;
      default: return true;
    }
  };

  const handleStartDiagnosis = async () => {
    if (!form.name || !form.year) return;
    setScreen("loading");

    try {
      const data = calculateAll(parseInt(form.year), parseInt(form.month), parseInt(form.day));
      const birthTimeInfo = form.birthHour ? `出生時間: ${form.birthHour}時` : "出生時間: 不明";
      const birthPlaceInfo = form.birthPlace || "未入力";

      // 選択した司書のキャラクター文体をプロンプトに反映
      const selectedConfig = CHARACTER_CONFIG[charId];
      const prompt = `
${selectedConfig.promptStyle}

あなた（${selectedConfig.name}）は、星の図書館の司書として、この人の星の記録を読み解いたという設定で、フル鑑定レポートを小説形式で書いてください。
${selectedConfig.name}の口調で全文を統一すること。普通の文体は禁止。

【対象者】
名前: ${form.name} (${form.year}年${form.month}月${form.day}日生まれ / ${birthPlaceInfo}出身 / ${birthTimeInfo})

【分析データ】
・マヤ暦: KIN${data.maya.kin} / 太陽の紋章:${data.maya.glyph} / 銀河の音:${data.maya.tone} / ウェイブスペル:${data.maya.ws}
・算命学: 中心星[${data.bazi.weapon}]
・四柱推命: 年柱[${data.sanmeigaku.year}] / 月柱[${data.sanmeigaku.month}] / 日柱[${data.sanmeigaku.day}] / 日干[${data.bazi.stem}]${form.birthHour ? ` / 時柱[${form.birthHour}時生まれ]` : ""}
・数秘術: ライフパスナンバー[${data.numerology.lp}]
・西洋占星術: ${data.western.sign}
・宿曜: ${data.sukuyo}

【相談内容】
「${form.concern || "特になし"}」

【品質ルール — 最重要】
・200円を支払った読者が「ここまで詳しく出るのか」と驚く圧倒的な読み応えが必須
・占いを信じていない人でも「面白い」「具体的で的確」と感じる内容にすること
・「あなたは感受性が豊かです」のような誰にでも当てはまる抽象表現は絶対禁止
・この人の生年月日から算出された占術データに基づく、この人だけの具体的な特徴・傾向・アドバイスを書くこと
・各占術のデータ（KIN番号、紋章名、日干、ライフパスナンバー等）を引用して根拠を明示すること
・今月・今年の運勢の流れや時期的なアドバイスも含めること

【執筆ルール】
1. ${selectedConfig.name}の口調で全文を書くこと。普通の文体は禁止
2. 専門用語は必ず噛み砕いて説明（${selectedConfig.name}らしい言い方で）
3. 各章は800〜1200文字。全体で5000〜7000文字
4. 相談内容に合わせて4〜7章を柔軟に構成（序章・最終章含む）
5. 6つの占術（マヤ暦・算命学・四柱推命・数秘術・西洋占星術・宿曜）を全て活用すること
6. 各章で異なる占術を主軸にし、他の占術との関連も織り交ぜる${form.birthHour ? "\n7. 出生時間が判明しているため、四柱推命の時柱の影響も読み解くこと" : ""}${form.birthPlace ? `\n${form.birthHour ? "8" : "7"}. 出生地（${form.birthPlace}）の土地のエネルギーも考慮すること` : ""}
${form.birthHour ? (form.birthPlace ? "9" : "8") : (form.birthPlace ? "8" : "7")}. **必ず純粋なJSON形式** で出力

{"prologue":{"tag":"#はじめに","title":"序章：（タイトル）","text":"（800文字以上・${selectedConfig.name}の口調で）"},"chapters":[{"tag":"#占術名","title":"第1章：（テーマ）","text":"（800文字以上・${selectedConfig.name}の口調で）"}],"final":{"tag":"#まとめ","title":"最終章：これからのあなたへ","text":"（800文字以上・${selectedConfig.name}の口調で）","magic":"具体的なアクション"}}
`;
      const text = await generateFortune(prompt);
      let clean = text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
      const first = clean.indexOf("{");
      if (first !== -1) clean = clean.substring(first);
      const last = clean.lastIndexOf("}");
      if (last !== -1) clean = clean.substring(0, last + 1);

      let story;
      try {
        story = JSON.parse(clean);
      } catch {
        let repaired = clean;
        const quotes = (repaired.match(/"/g) || []).length;
        if (quotes % 2 !== 0) repaired += '"';
        let braces = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
        let brackets = (repaired.match(/\[/g) || []).length - (repaired.match(/]/g) || []).length;
        for (let i = 0; i < braces; i++) repaired += "}";
        for (let i = 0; i < brackets; i++) repaired += "]";
        repaired = repaired.replace(/,(\s*[\]}])/g, "$1");
        story = JSON.parse(repaired);
      }

      if (!story?.prologue) story.prologue = { tag: "#はじめに", title: "あなたの物語", text: charId === "reki" ? "…読んできたよ。面白い星の配置してるね。" : "…あなたの星の記録、読んできたよ。" };
      if (!Array.isArray(story.chapters)) story.chapters = [];
      if (!story?.final) story.final = { tag: "#まとめ", title: "これからのあなたへ", text: "…さて、ここからはあなた次第。", magic: "自分を信じて一歩踏み出す" };

      const safeName = escapeHtml(form.name);
      const renderSection = (part: { tag?: string; title?: string; text?: string }) => {
        if (!part) return "";
        return `<div class="mb-6 border-l-3 border-[rgba(201,169,110,0.3)] pl-4">
          <p class="text-xs text-[#c9a96e] mb-1">${escapeHtml(part.tag || "")}</p>
          <h3 class="text-base font-bold text-white/90 mb-2">${escapeHtml(part.title || "")}</h3>
          <p class="text-sm text-white/60 leading-relaxed whitespace-pre-line">${escapeHtml(part.text || "")}</p>
        </div>`;
      };

      // #6修正: 6占術をグループラベル付きで表示
      // HTML結果（占術データはJSXで表示するのでHTML内には含めない）
      const html = `
        <div>
          ${renderSection(story.prologue)}
          ${story.chapters.map((c: { tag?: string; title?: string; text?: string }) => renderSection(c)).join("")}
          <div class="mb-6 border-l-3 border-[rgba(201,169,110,0.5)] pl-4">
            <p class="text-xs text-[#c9a96e] mb-1">${escapeHtml(story.final.tag || "#まとめ")}</p>
            <h3 class="text-base font-bold text-white/90 mb-2">${escapeHtml(story.final.title || "これからのあなたへ")}</h3>
            <p class="text-sm text-white/60 leading-relaxed whitespace-pre-line">${escapeHtml(story.final.text || "")}</p>
            ${story.final.magic ? `<div class="mt-3 p-3 rounded-xl bg-[rgba(201,169,110,0.08)] border border-[rgba(201,169,110,0.2)] text-center"><p class="text-[10px] text-[#c9a96e] mb-1">今日からできるアクション</p><p class="text-xs font-medium text-white/70">${escapeHtml(story.final.magic)}</p></div>` : ""}
          </div>
        </div>
      `;

      setResultMeta({
        oneWord: story.prologue?.title || `${form.name}の物語`,
        bookTitle: story.final?.title || `${form.name}の星の記録`,
      });
      setResultData(data);
      setResultHtml(html);
      setScreen("result");
      window.scrollTo(0, 0);
    } catch (e) {
      alert(e instanceof Error ? e.message : "鑑定中にエラーが発生しました。");
      setScreen("input");
    }
  };

  if (!verified) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-8 h-8 border-3 border-[rgba(201,169,110,0.3)] border-t-[#c9a96e] rounded-full animate-spin" />
      </main>
    );
  }

  // キャラ選択画面（ショート鑑定と同じUI）
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
              <h1 className="text-2xl font-bold mb-1 text-white" style={{ fontFamily: "var(--font-serif), serif" }}>フル鑑定</h1>
              <p className="text-xs text-white/40">…どちらの司書に読んでもらう？</p>
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
            <p className="text-center text-[11px] text-white/20 mt-6">¥200 — 6000文字超の詳細レポート</p>
          </FadeIn>
        </div>
      </main>
    );
  }

  if (screen === "loading") {
    const fullImg = charId === "urara" ? "/urara-full.png" : "/reki-full.png";
    const stages = [
      { text: charId === "reki" ? "…見てくるから少し待って" : "…ちょっと待ってて。図書館で探してくる", delay: 0 },
      { text: "…星の記録を照合してる", delay: 5000 },
      { text: "…もう少しだけ待ってて。かなり長い記録になりそう", delay: 12000 },
      { text: "…あと少し。大事なところを丁寧に読んでるから", delay: 20000 },
    ];
    return (
      <main className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "#0a0e1a" }}>
        <LibraryBg scene="aisle" />
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
          <p className="text-xs text-white/20 mt-2">フル鑑定は30〜60秒ほどかかります</p>
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

  if (screen === "result") {
    return (
      <main className="min-h-screen relative overflow-hidden" style={{ background: "#0a0e1a" }}>
        <LibraryBg scene="desk" />
        <StarField />
        <GrainOverlay />
        <div className="relative z-10 max-w-lg mx-auto px-5 py-8">
          {/* 司書ヘッダー */}
          <header className="text-center mb-6">
            <div className="w-28 h-28 rounded-2xl overflow-hidden mx-auto mb-3" style={{ border: "1.5px solid rgba(201,169,110,0.3)", boxShadow: "0 0 30px rgba(201,169,110,0.15)" }}>
              <Image src={charId === "urara" ? "/urara-full.png" : "/reki-full.png"} alt={charConfig.name} width={224} height={224} className="object-cover w-full h-full" />
            </div>
            <p className="text-xs text-white/40 mb-1">{charConfig.name}が読み解いた</p>
            <h1 className="text-lg font-bold text-white">{form.name} のフル鑑定</h1>
          </header>

          {/* oneWord — リッチ表示 */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="text-center mb-6 p-5 rounded-2xl"
            style={{ background: "rgba(201,169,110,0.06)", border: "1px solid rgba(201,169,110,0.2)" }}
          >
            <p className="text-[11px] text-white/30 mb-1 tracking-widest uppercase">フル鑑定</p>
            <p className="text-xl font-bold" style={{
              fontFamily: "var(--font-serif), serif",
              background: "linear-gradient(135deg, #fff, var(--gold))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>{resultMeta.oneWord}</p>
          </motion.div>

          {/* ShareCard */}
          <ShareCard
            characterName={charConfig.name}
            characterAvatar={charId === "urara" ? "/urara-full.png" : "/reki-full.png"}
            characterId={charId}
            userName={form.name}
            topicLabel="フル鑑定"
            oneWord={resultMeta.oneWord}
            bookTitle={resultMeta.bookTitle}
            westernSign={resultData?.western?.sign}
            kin={resultData?.maya?.kin}
            glyph={resultData?.maya?.glyph}
            siteUrl={typeof window !== "undefined" ? window.location.origin : ""}
          />

          {/* 6占術データ — タップで詳細が見れるカード形式 */}
          {resultData && <FortuneCards data={resultData} />}

          {/* 司書のひとこと */}
          <div className="flex items-start gap-3 mb-6">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ border: "1px solid rgba(201,169,110,0.3)" }}>
              <Image src={charConfig.avatar} alt={charConfig.name} width={32} height={32} className="object-cover w-full h-full" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex-1">
              <p className="text-sm text-white/60 leading-relaxed">
                {charId === "reki"
                  ? `…${form.name}の記録、全部読んできた。長いけど、まあ面白いから読んでみて`
                  : `…${form.name}の星の記録、全部読んできたよ。大事なことが書いてあるから最後まで読んでみて`}
              </p>
            </div>
          </div>

          {/* 本文 */}
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resultHtml) }} />

          {/* 注意書き */}
          <p className="text-center text-[11px] text-white/30 mt-2 mb-4 no-print">
            {charId === "reki"
              ? "…ページ閉じたらもうダウンロードできないからね。保存は今のうちに"
              : "…ページを閉じるとダウンロードできなくなるよ。忘れずに保存しておいてね"}
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
  // #2修正: placeholderのコントラストを上げる (placeholder-white/40)
  // #3修正: ボタンの視認性を改善
  const inputClass = "w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-sm text-white/90 placeholder-white/40 focus:outline-none focus:border-[rgba(201,169,110,0.5)] focus:ring-1 focus:ring-[rgba(201,169,110,0.3)]";
  const selectClass = "px-3 py-3 rounded-xl bg-white/8 border border-white/15 text-sm text-white/90 text-center focus:outline-none focus:border-[rgba(201,169,110,0.5)]";

  return (
    <main className="min-h-screen relative overflow-hidden" style={{ background: "#0a0e1a" }}>
      <LibraryBg scene="main" />
      <StarField />
      <GrainOverlay />
      <div className="relative z-10 max-w-lg mx-auto px-5 py-8">
        <button
          onClick={() => currentStepIndex > 0 ? prevStep() : setScreen("select")}
          className="text-sm text-white/40 hover:text-white/60 mb-4 inline-block transition-colors"
        >
          ← {currentStepIndex > 0 ? "前へ" : "司書選択へ"}
        </button>

        <div className="text-center mb-6">
          <p className="text-xs text-[#c9a96e] tracking-widest mb-1">星の図書館</p>
          <h1 className="text-xl font-bold text-white/90">フル鑑定</h1>
          <p className="text-xs text-white/40 mt-1">¥200 — 6000文字超の詳細レポート</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="w-2 h-2 rounded-full transition-colors"
              style={{ background: i <= currentStepIndex ? "rgba(201,169,110,0.8)" : "rgba(255,255,255,0.15)" }}
            />
          ))}
        </div>

        {/* Character speech */}
        <div className="flex gap-3 mb-6">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[rgba(201,169,110,0.3)] mt-0.5">
            <Image src={charConfig.avatar} alt={charConfig.name} width={40} height={40} className="object-cover w-full h-full" />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex-1 min-w-0"
            >
              <p className="text-sm text-white/70 leading-relaxed">{currentCharLine}</p>
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
            {step === "name" && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">お名前 <span className="text-[#c9a96e] text-xs">必須</span></label>
                <input
                  type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && canProceed() && nextStep()}
                  placeholder="ニックネームでOK" autoFocus
                  className={inputClass}
                />
              </div>
            )}

            {step === "birthday" && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">生年月日 <span className="text-[#c9a96e] text-xs">必須</span></label>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="1995" autoFocus className={selectClass} />
                  <select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} className={selectClass}>
                    {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{i + 1}月</option>))}
                  </select>
                  <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} className={selectClass}>
                    {Array.from({ length: 31 }, (_, i) => (<option key={i + 1} value={i + 1}>{i + 1}日</option>))}
                  </select>
                </div>
              </div>
            )}

            {step === "birthtime" && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">出生時間 <span className="text-white/30 text-xs">任意・わからなければ空でOK</span></label>
                <select value={form.birthHour} onChange={(e) => setForm({ ...form, birthHour: e.target.value })} className={`w-full ${selectClass}`}>
                  <option value="">わからない</option>
                  {Array.from({ length: 24 }, (_, i) => (<option key={i} value={i}>{i}時台（{i}:00〜{i}:59）</option>))}
                </select>
                <p className="text-[11px] text-white/30 mt-2">四柱推命の時柱の計算に使います</p>
              </div>
            )}

            {step === "birthplace" && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">出生地 <span className="text-white/30 text-xs">任意</span></label>
                <input
                  type="text" value={form.birthPlace}
                  onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && nextStep()}
                  placeholder="例: 東京" autoFocus
                  className={inputClass}
                />
              </div>
            )}

            {step === "concern" && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">相談したいこと <span className="text-white/30 text-xs">任意</span></label>
                <textarea
                  value={form.concern}
                  onChange={(e) => setForm({ ...form, concern: e.target.value })}
                  rows={3} placeholder="例: 今の仕事を続けるべきか迷っています..." autoFocus
                  className={inputClass}
                />
              </div>
            )}

            {/* #4修正: 確認画面の各項目をタップでそのステップに戻れる */}
            {step === "confirm" && (
              <div className="space-y-2 text-sm">
                <button onClick={() => goToStep("name")} className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/8 transition-colors">
                  <p className="text-white/40 text-xs mb-0.5">{STEP_LABELS.name}</p>
                  <p className="text-white/80">{form.name}</p>
                </button>
                <button onClick={() => goToStep("birthday")} className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/8 transition-colors">
                  <p className="text-white/40 text-xs mb-0.5">{STEP_LABELS.birthday}</p>
                  <p className="text-white/80">{form.year}年{form.month}月{form.day}日{form.birthHour ? ` ${form.birthHour}時台` : ""}</p>
                </button>
                {form.birthPlace && (
                  <button onClick={() => goToStep("birthplace")} className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/8 transition-colors">
                    <p className="text-white/40 text-xs mb-0.5">{STEP_LABELS.birthplace}</p>
                    <p className="text-white/80">{form.birthPlace}</p>
                  </button>
                )}
                {form.concern && (
                  <button onClick={() => goToStep("concern")} className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/8 transition-colors">
                    <p className="text-white/40 text-xs mb-0.5">{STEP_LABELS.concern}</p>
                    <p className="text-white/80">{form.concern}</p>
                  </button>
                )}
                <p className="text-[10px] text-white/20 text-center mt-1">タップして修正できます</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* #3修正: ボタンの視認性を大幅改善 */}
        <div className="mt-6">
          {step === "confirm" ? (
            <button
              onClick={handleStartDiagnosis}
              className="w-full py-4 rounded-full text-white font-bold text-sm tracking-wide transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.7), rgba(201,169,110,0.4))", border: "1px solid rgba(201,169,110,0.5)", boxShadow: "0 2px 12px rgba(201,169,110,0.2)" }}
            >
              鑑定を開始する
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="w-full py-4 rounded-full font-bold text-sm tracking-wide transition-all active:scale-95 disabled:opacity-20"
              style={{
                background: canProceed() ? "linear-gradient(135deg, rgba(201,169,110,0.7), rgba(201,169,110,0.4))" : "rgba(255,255,255,0.05)",
                border: canProceed() ? "1px solid rgba(201,169,110,0.5)" : "1px solid rgba(255,255,255,0.1)",
                color: canProceed() ? "#fff" : "rgba(255,255,255,0.3)",
                boxShadow: canProceed() ? "0 2px 12px rgba(201,169,110,0.2)" : "none",
              }}
            >
              {step === "birthtime" || step === "birthplace" || step === "concern" ? "次へ（スキップ可）" : "次へ"}
            </button>
          )}
        </div>
        <div ref={bottomRef} />
      </div>
    </main>
  );
}
