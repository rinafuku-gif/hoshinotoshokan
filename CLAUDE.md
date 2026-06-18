@AGENTS.md

# 星の図書館（hoshinotoshokan）

AI占い／鑑定サービス。生年月日と名前から占星術・タロットを計算し、AIが鑑定テキストを生成する。
無料のショート鑑定と、Stripe決済による有料鑑定（フル鑑定・相性鑑定）を提供。
提携先（カフェ・宿などの設置場所）にQRコードを置き、そこ経由の有料鑑定に紹介フィー／キックバックを還元する仕組みを持つ。

## 技術スタック

- **Next.js (App Router)** — `app/` 配下。多くのページは `"use client"` のクライアントコンポーネント
- **TypeScript** — `strict`。`any` は最小限、避けられない時は `unknown` + 型ガード
- **Drizzle ORM + Turso（libSQL）** — DBは `drizzle/schema.ts` が真実の源。アクセスは `lib/db.ts` の `getDb()` 経由
- **Stripe** — Checkout + Webhook（決済確定）。`lib/stripe.ts` / `app/api/checkout` / `app/api/webhook`
- **Google Generative Language API（Gemini）** — 鑑定テキスト生成。`app/actions.ts` の `generateFortune()`
- **Framer Motion** — アニメーション。**Vitest** — `__tests__/` にロジック層のテスト
- デプロイは Vercel + `main` ブランチ（main = 本番、自動公開）

## アーキテクチャ規約（AIフレンドリー設計）

良い設計＝AIが少ないトークンで正しく掴める設計。以下を守ること。

- **縦割り（Vertical Slice）を既定にする** — 新機能はUI・ロジック・型・テストを近くに同居させる。
  既存は「ページ中心 + `lib/` 横断」構造（→ `AI-FRIENDLY-REPORT.md` に再編提案あり、Ryo承認後に実施）。
  既存コードを今すぐ層別に散らさないこと。
- **命名はプロンプト** — `calculateUserTaxLiability` ＞＞＞ `process` / `data`。
  曖昧名はトークンを食い精度を落とす。ドメイン語彙（鑑定/mode/topic/refId/kickback）を統一して使う。
- **ファイルは小さく1責務** — 巨大ファイルは幻覚が増える。50行関数は高精度。大きなコンポーネントは分割する。
- **型は真実の源** — Drizzleスキーマ（`drizzle/schema.ts`）から型を導く。型の二重定義をしない。
  クライアントが送る値（特に価格）を信用せず、サーバー側で検証する。
- **検証ループを閉じる** — 実装後に `npx tsc --noEmit` と `npm run build` を**通るまで自分で直してから**報告する。
  テストがあるロジックは `npm test`（vitest）も通す。pass/fail で自己修正するのが第一原則。

## コンテキスト管理（CLAUDE.md肥大化を避ける）

- **`.claudeignore` は使わない**（現行のClaude Codeに存在しない）。コンテキスト除外は次の手段で行う:
  - `.gitignore` — Grep/探索が自動で尊重する（`node_modules`・`.next`・`.env*` 等は除外済み）
  - `settings.json` の deny ルール — 必要なら `node_modules`・`dist` 等の読み取りを抑止
  - 広い探索は subagent（Explore等）に分離し、要約だけ受け取る／`/clear` を多用
- CLAUDE.md に「ここを見るな」と書くより、**構造で読まずに済むようにする**のが正攻法。

## ディレクトリ地図

| パス | 役割 |
|------|------|
| `app/page.tsx` | トップ（鑑定の入口） |
| `app/short` / `app/full` / `app/compatibility` | 鑑定モード3種（無料ショート／有料フル／有料相性） |
| `app/admin` | 管理ダッシュボード（売上・紹介フィー・QR統計・明細） |
| `app/partner` | 提携先の申込・情報入力 |
| `app/actions.ts` | Server Action: `generateFortune()`（Gemini呼び出し） |
| `app/api/checkout` `app/api/webhook` | **Stripe決済（高リスク・触る時は要注意）** |
| `app/api/admin/*` | 管理API（要 `lib/admin-auth.ts` 認証） |
| `app/api/cron/aggregate` | キックバック集計バッチ |
| `lib/horoscope-calc.ts` `lib/fortune-calc.ts` `lib/tarot-data.ts` `lib/character.ts` | 占いロジック（urara/reki キャラ） |
| `lib/refs.ts` `lib/tokens.ts` `lib/statement.ts` `lib/rate-limit.ts` | 紹介ref・トークン・明細HTML・レート制限 |
| `drizzle/schema.ts` | DBスキーマ（locations / diagnoses / paymentTokens / referralFees / kickbackPayments） |
| `components/` | 演出系UI（StarField, Aurora, ShareCard 等） |
| `__tests__/` | ロジック層テスト（vitest） |

## セキュリティ前提（このリポは決済あり＝高リスク）

- 価格・金額はサーバー側で確定する。クライアントの値を信用しない
- Stripe Webhook は必ず署名検証する。Webhook処理はトランザクション化済み（履歴参照）
- 管理APIは `lib/admin-auth.ts` を通す。トークン比較は timing-safe
- エラーの内部情報（stack / DBエラー）をクライアントに出さない
- `.env*` は読まない・出力しない・コミットしない
