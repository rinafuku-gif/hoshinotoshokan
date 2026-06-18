# AIフレンドリー設計 — 星の図書館 現状分析と縦割り再編提案

作成: 2026-06-18 / worktree `ai-friendly-setup` 内 / **このレポートは提案。Ryo承認後に別途実施（今回は構造変更しない）**

## ベースライン（今回着手時点）

- `npx tsc --noEmit` → 当初は `vitest` 未インストールで6エラー（テスト/設定ファイルのみ）。`npm install` 後は **0エラーでPASS**。本番コードは元から型クリーン。
- 本番（`app/` `lib/` `drizzle/`）のコードに型エラーなし。
- 現状の強み: Drizzleスキーマが型の真実の源／ロジック層に vitest テストあり（refs / schema / statement / auth / fortune-calc）。

## 現状構造の弱点（縦割りの観点）

今は「ページ中心 + `lib/` 横断」構造。1つの鑑定ドメイン（例: ショート鑑定）を変更するとき、AIは以下を別々の場所に探しに行く必要がある:

- UI: `app/short/page.tsx`
- 占いロジック: `lib/horoscope-calc.ts` `lib/fortune-calc.ts` `lib/tarot-data.ts` `lib/character.ts`
- AI生成: `app/actions.ts`
- 型: `drizzle/schema.ts`（mode='short' 等が文字列リテラルで散在）
- テスト: `__tests__/fortune-calc.test.ts`

問題点:
1. **mode/topic がマジック文字列** — `'short' | 'full' | 'compatibility'`、`'general' | 'work' | 'love' | 'social' | 'money'` がスキーマのコメントとコードに重複。型として一元化されていない。
2. **`lib/` がドメイン横断のフラット置き場** — 「このファイルはどの鑑定モード用か」をAIが推測する状態。
3. **占いロジックと決済/紹介ロジックが同じ `lib/` に同居** — 高リスク（決済）と低リスク（占い計算）の境界が見た目で分からない。
4. **UIテストが不在** — vitest 設定はあるがページUIのテストはなく、検証ループが片肺。

## 提案: 段階的な縦割り再編（リスク低→高）

### 提案1 — mode/topic を型の真実の源に昇格【低リスク・推奨度高】
`drizzle/schema.ts` のコメント文字列を、共有の型/定数に切り出す。

```ts
// lib/domain/diagnosis-types.ts （新規）
export const DIAGNOSIS_MODES = ["short", "full", "compatibility"] as const;
export type DiagnosisMode = typeof DIAGNOSIS_MODES[number];
export const DIAGNOSIS_TOPICS = ["general", "work", "love", "social", "money"] as const;
export type DiagnosisTopic = typeof DIAGNOSIS_TOPICS[number];
```
スキーマ・各ページ・API がこの1ソースを参照。マジック文字列の重複を消す。

### 提案2 — `lib/` をドメイン別サブディレクトリに整理【中リスク】
横断フラットを意味の境界で分ける（中身は移動のみ、ロジック変更なし）:

```
lib/
  domain/      … diagnosis-types, character（占いの語彙）
  fortune/     … horoscope-calc, fortune-calc, tarot-data, statement
  payments/    … stripe, （checkout/webhook が参照するヘルパー）★決済=高リスク境界を明示
  referral/    … refs, tokens（紹介ref・トークン）
  platform/    … db, admin-auth, rate-limit（基盤）
```
import パスの一括置換が必要なため、tsc/build で検証しながら1ディレクトリずつ。

### 提案3 — 鑑定モードの features 化【高リスク・新機能から漸進】
新しい鑑定モードを追加する時から、UI・ロジック・型・テストを1ディレクトリに同居:

```
features/
  short-diagnosis/
    page.tsx          （app/short からは薄く re-export）
    calc.ts           （このモード固有の計算）
    types.ts
    calc.test.ts
```
既存3モードの一括移動は影響が大きいので**やらない**。次に作る鑑定機能から適用し、効果を見て判断。

### 提案4 — UIテストの試験導入【中リスク・効果測定枠】
鑑定フロー1本（ショート鑑定の入力→結果表示）に最小のコンポーネントテストを入れ、検証ループの片肺を埋める。1本で効果測定してから横展開。

## Ryoが承認すべきこと

- 提案1（mode/topic 型の一元化）は低リスク・即効。**まずここからGOでよいか**。
- 提案2（`lib/` ドメイン分割）は import 全置換を伴う。**やるなら別セッションで一気に**。
- 提案3・4 は「新機能のタイミングで」適用が前提。今は着手しない。

## 残リスク・注意

- 決済（Stripe: `app/api/checkout` `app/api/webhook` `lib/stripe.ts`）は今回**一切触っていない**。再編時も決済境界は最後に、単独PRで。
- 本レポートの再編はすべて未実施（提案のみ）。worktree には CLAUDE.md / .gitignore / 本レポートの追加のみが入る。
