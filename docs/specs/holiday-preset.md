# 祝日のプリセット扱い（#78）

- 状態: 決定済み・実装済み（2026-09-02）。地図 [#66](https://github.com/sc30gsw/cairn/issues/66)。
- 守る規約: [CVX-01〜20](../../.claude/rules/convex-rules.md)、[convex-tanstack.md](../../.claude/rules/web/convex-tanstack.md)、[mantine-tailwind.md](../../.claude/rules/web/mantine-tailwind.md)。

## 1. 決定の要約

| 論点 | 決定 |
| --- | --- |
| 方式 | 所有者の設定「祝日は日曜のプリセットを使う」トグル。既定はオフ。プリセットごとのフラグは持たない |
| 置き場所 | プリセット画面の上部（`PageTitle` の直下、作成フォームの上）。所有者1行の `presetSettings` テーブル |
| 適用の経路 | `days.open`（今日を開いたとき）だけ。`switchPreset` は所有者が明示的にプリセットを選ぶので触らない |
| 祝日の判定 | `@holiday-jp/holiday_jp` を `convex/lib/holiday.ts` に置き、クライアントは `~domain/holiday` から同じ関数を読む（SSoT）。旧 `src/lib/holiday.ts` は削除 |
| 消化 | 履歴/分析の曜日別 28 日窓は変えない。祝日は曜日どおりに数える |
| 語彙 | `CONTEXT.md`「プリセット」に「所有者の設定で、祝日に今日を開いたときは曜日ではなく日曜のプリセットを使える（既定はオフ）」を追記。「祝日」は一般概念なので新語にしない |

## 2. スキーマと関数

```ts
presetSettings: defineTable({ holidayAsSunday: v.boolean(), ownerId: v.string() })
  .index("by_owner", ["ownerId"]);
```

- `convex/lib/domain.ts`: `PRESET_SETTINGS_DEFAULTS = { holidayAsSunday: false }`
- `convex/lib/validators.ts`: `presetSettingsDtoValidator` / `PresetSettingsDto`
- `convex/lib/holidayPreset.ts`（純関数）: `presetWeekdayFor(dateJst, settings)`。設定が有効かつ祝日なら日曜（0）、それ以外は `weekdayFromDateJst`
- `queries/presets/settings`（`ownerQuery`、行が無ければ既定値）、`mutations/presets/saveSettings`（upsert）
- `services/days/openDay.ts`: `weekdayFromDateJst` の代わりに `presetWeekdayFor(dateJst, await getSettings(ctx, ownerId))`

## 3. UI

`src/features/catalog/components/preset-settings-card.tsx`。Mantine `Card` + `Switch`（`label` と `description`）。変更は即保存し、`runMutation` のトーストで知らせる（Formisch は単一トグルで submit が無いため使わない）。`PresetList` は `settingsCard` スロットで受け取り、`PresetsPage` が `PresetSettingsCard` を差し込む（既存テストと Shimmer 用の `PresetList` 呼び出しに影響を出さない）。

## 4. テスト

- 純関数: `convex/lib/holidayPreset.test.ts`（祝日の月曜 2026-09-21 で設定 ON → 0、OFF → 1、平日と日曜）
- 統合: `convex/presetSettings.test.ts`（既定値、所有者分離、祝日の月曜に `days.open` で日曜/月曜のどちらのプリセットが並ぶか）
- UI: `preset-settings-card.test.tsx`（スイッチの初期値と保存呼び出し）

## 5. 端ケース

| ケース | 挙動 |
| --- | --- |
| 日曜のプリセットが無い、または行が0本 | `days.open` は何も並べない（休養日と同じ） |
| 祝日がすでに開かれ記録がある | `days.open` は既存の記録を尊重して何もしない（従来どおり） |
| 過去の祝日を開く | `days.open` は今日以外では適用しない（従来どおり） |
| 設定を切り替えた日 | 既に並んだ記録は入れ替えない。次に今日を開いたときから効く |
