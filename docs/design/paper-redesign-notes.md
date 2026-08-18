# cairn UI リデザイン方針(確定済み)
- 範囲: 全画面リデザイン(Today/Goals/History/Items/Presets/Trash)、骨格を一気に→細部
- ナビ: 右小口インデックスタブ(モバイルは上部)
- フォント: 851手書き雑フォント(カスタム@font-face, webfont: https://db.onlinewebfonts.com/t/2498d3c0930fb81901b9d99d548f066c.woff2, family "Tegaki851")を全面適用、フォールバック Yomogi。数値のみ Zen Kaku Gothic New
- カラー: Flexoki Light(紙#FFFCF0, インク#100F0F, base-50 #F2F0E5, base-100 #E6E4D9, base-150 #DAD8CE, tx-2 #6F6E69, tx-3 #B7B5AC)
- アクセント: Orange主役(#BC5215/#DA702C)、green=完了(#66800B)、red=削除/警告(#AF3029)、ライトのみ
- 質感: スケッチ風不揃いボーダー(要所)+紙の浮き影。Mantine+tailwind-preset-mantineで実装可能な範囲
- 現行UI再現(Current UI.dc.html)は原本準拠(IBM Plex Sans JP)のまま。Today完成、履歴以降は部分
- 現行テーマ(theme.ts)は既にFlexoki系: blue#4385BE primary, RULE#E6E4D9, 罫線bg 32px間隔
- サンプルデータ: 2026-08-18(火)/学習量95分/rows: 単語25完了・文法40完了・リスニング30未着手/プリセット平日の夜(火)/目標TOEIC900 11-15残89日/チェックポイント文法9割 9-30残43日/週間: インプット180/300 アウトプット130/120達成/障害: 残業で疲れた→単語アプリ5分
