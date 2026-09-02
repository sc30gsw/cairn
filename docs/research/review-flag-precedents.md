# 復習フラグ（軽量な間隔反復）の先行研究と実装事例

対象: [Issue #73](https://github.com/sc30gsw/cairn/issues/73)「復習フラグの先行事例調査」（親地図 [#66](https://github.com/sc30gsw/cairn/issues/66)）。学習ログアプリ（cairn）に「復習したい記録に印を付けて、後日もう一度並べる」軽量な間隔反復（spaced repetition）を足すための設計根拠を一次情報から確認する。
調査日: 2026-09-02。効果量はすべて出典元の報告値。推測は「推測」と明記する。一次情報で裏付けが取れない主張は「未検証」と明記する。

**参照した既存文脈**: `CONTEXT.md`「日」「記録」「プリセット」「習得」「週間ターゲット」、`docs/adr/0003-process-goals-not-okr.md`、`docs/adr/0006-checkpoints-replace-weekly-goals.md`、`docs/research/weekly-goal-redesign.md`、`convex/schema.ts`、`convex/services/days/openDay.ts`。

**ネットワーク制約についての注記**: 本セッションの outbound HTTPS は GitHub 系ドメイン（github.com / raw.githubusercontent.com）以外の大半が組織ポリシーでブロックされていた（`docs.ankiweb.net`、`super-memory.com`、学術出版社サイト、`web.archive.org` を含む）。そのため一次資料の直接取得は (a) GitHub でホストされている一次資料（Anki 公式マニュアルのソースリポジトリ、Obsidian Spaced Repetition プラグインの README、FSRS の公式 wiki）は raw ファイルを直接 fetch して原文を確認、(b) それ以外（学術論文、Readwise/RemNote/Mochi の公式ドキュメント、Wozniak の SM-2 原文ページ）は WebSearch 経由で当該ページの実文面を要約・引用する形で確認した。§7 に個別の限界を記す。

---

## 1. 要約

### 推奨する最小設計

| 項目 | 推奨する最小実装 | 根拠 |
|---|---|---|
| 印を付ける操作 | 記録（`rows`）の確定時、または任意のタイミングで「復習したい」を1操作でON/OFFする二値フラグ。SM-2 の0–5評価や FSRS のグレードのような多値入力は持たない | Kornell (2009) が示すように、間隔を空けること自体の効果が支配的で、詰め込みとの差は参加者の90%に現れる（§2）。等間隔と拡張間隔の差は有意ではない（Karpicke & Bauernschmidt 2011, §2）ため、精密なチューニングより「まず間隔を空ける」ことに実装コストを使うべき |
| 期日の決め方 | 固定間隔の段階リスト（例: 1日→3日→7日→14日）を1個の `stage` 整数で進める。Leitner 型の「成功で1段進む・失敗で0に戻る」状態機械だけを採用し、SM-2 の E-Factor や FSRS の Stability/Difficulty は持たない | §3。日数の絶対値そのものに一次研究の最適値はない（[推測]、§7）が、「拡張間隔でなくても等間隔で十分」は一次研究に支持される |
| 今日の復習として並べる UI | 「今日」を開いたときに、期日が来た復習を **未着手の記録として** 追加で並べる。既存の `openDay()` のプリセット適用（曜日プリセット → 未着手行を自動生成）と同型の経路にする | 既存実装 `convex/services/days/openDay.ts` が同じ形の「日を開く→未着手行を挿入する」トランザクションを既に持つ（§5、§6） |
| 期日超過の見せ方 | 失敗として扱わない。優先度を上げる（先に並べる）だけにし、バッジ・カウントダウン・連続記録は作らない | Anki 公式マニュアルの "Falling Behind"（§4）と FSRS の delay 処理（§3.3）がどちらも「遅延は罰ではなく、次回間隔の入力値」という設計を取る |
| 保持場所 | 記録（`rows`）に `dueJst` を直接持たせず、別テーブル（例 `reviewFlags`: `ownerId` / `sourceRowId` / `dueJst` / `stage`）を新設する | 「未来の暦日に日を作らない」という `days` の規則（`CONTEXT.md`「日」）と、`dueJst` が未来日になり得る復習期日を同じ行に同居させると衝突しやすいため（[推測]、§6） |

### この地図の既存方針との整合

`CONTEXT.md` は「習得」と「週間ターゲット」の両方で明示的にストリークを避けている（Avoid: ストリーク）。ADR-0006 も頻度判定機構とストリークを全廃した経緯を持つ。復習フラグを「連続達成」や「未消化バッジ」として実装すると、この地図全体の判断と矛盾する。本調査が支持する設計（§4）は、この既存方針と自然に一致する。

---

## 2. 間隔反復・分散効果の一次研究

| # | 主張 | 一次ソース | 報告値 |
|---|---|---|---|
| R1 | 分散学習の効果に関する大規模メタ分析。項目間隔（ISI）と保持期間（retention interval）が合同で最終テストの成績を決め、最終テストまでの期間が長いほど最適な ISI も長くなる | Cepeda, Pashler, Vul, Wixted & Rohrer (2006), *Psychological Bulletin* 132(3), 354–380 — [DigitalCommons (著者アーカイブ)](https://digitalcommons.usf.edu/psy_facpub/1771/) / [ResearchGate](https://www.researchgate.net/publication/7062225_Distributed_Practice_in_Verbal_Recall_Tasks_A_Review_and_Quantitative_Synthesis) | 184論文・317実験・839件の効果量評価を統合したメタ分析 |
| R2 | 「最適な間隔」は保持期間に対する比率として変化する（temporal ridgeline）。1,350人超に事実を学習させ、最大3.5か月の間隔後に復習させ、さらに最大1年後に最終テストした | Cepeda, Vul, Rohrer, Wixted & Pashler (2008), *Psychological Science* 19(11), 1095–1102 — [eScholarship (UC 公開アーカイブ)](https://escholarship.org/uc/item/0kp5q19x) / [著者サイト](https://www.yorku.ca/ncepeda/publications/CVRWP2008.html) | 最適な間隔は、保持期間1週間なら保持期間の約20〜40%、保持期間1年なら約5〜10%まで縮小する |
| R3 | 検索練習（テスト）そのものが学習を強化する。すでに正答できた項目でも、テストを繰り返すと1週間後の保持が大きく向上する | Karpicke & Roediger (2007), *Journal of Memory and Language* 57(2), 151–162 — [Purdue Learning Lab (著者アーカイブ)](https://learninglab.psych.purdue.edu/downloads/2007/2007_Karpicke_Roediger_JML.pdf) | 実験2: 想起できた項目をテストし続けた条件は、テストから外した条件に対して**100%を超える**保持の向上 |
| R4 | 学習完了後の「復習のための再学習」には効果がなく、「復習のための再テスト」には大きな効果がある | Karpicke & Roediger (2008), *Science* 319(5865), 966–968 — [公式(Science)](https://www.science.org/doi/abs/10.1126/science.1152408) / [MIT ミラー PDF](https://web.mit.edu/jbelcher/www/learner/retrieval.pdf) | 正答後に反復学習した条件は遅延再生に効果なし。正答後に反復テストした条件は大きな正の効果 |
| R5 | フラッシュカード学習という現実的な文脈でも、分散は集中(cramming)より優れる。ただし学習者自身の実感は逆になりやすい | Kornell (2009), *Applied Cognitive Psychology* 23, 1297–1317 — [著者サイト PDF](https://sites.williams.edu/nk2/files/2011/08/Kornell.2009b.pdf) | 参加者の**90%**で分散が集中より高成績。しかし1回目の学習セッション後、参加者の**72%**は「集中の方が効果的だった」と誤って判断 |
| R6 | 検索の絶対的な間隔（総スパン）を伸ばすと長期保持が大きく向上する。一方、相対的な間隔パターン（拡張・等間隔・縮小）の違いはほぼ効果を生まない | Karpicke & Bauernschmidt (2011), *Journal of Experimental Psychology: Learning, Memory, and Cognition* 37(5), 1250–1257 — [Purdue Learning Lab (著者アーカイブ)](https://learninglab.psych.purdue.edu/downloads/2011/2011_Karpicke_Bauernschmidt_JEPLMC.pdf) | 間隔を空けない反復テストに対し、間隔を空けた反復テストは長期保持が**約200%向上**。ただし拡張間隔・等間隔・縮小間隔のどれが優れているかについては有意差なし |

**R6 が「固定間隔 vs 拡張間隔」への直接の答え**: 効くのは「間隔を空けること」自体（絶対スパン）であり、間隔をどう配分するか（拡張させるかどうか）は本質ではない。したがって、cairn の復習フラグで SM-2/FSRS のような精密な拡張間隔アルゴリズムを実装するコストは、一次研究上は正当化されない。固定間隔リスト（Leitner型）で十分という設計判断（§1）はここに支持される。

R5 はさらに、設計上重要な副次的知見を持つ: **学習者の主観的な「効いている感」は間隔反復の実際の効果と逆相関しうる**。これは §4 の「期日超過を不安・失敗のシグナルとして見せない」という設計判断を補強する — ユーザーの直感的な焦りは、そもそも当てにならない。

---

## 3. 軽量アルゴリズムの原著

### 3.1 Leitner システム

一次資料: Leitner, S. (1972). *So lernt man lernen* [どう学ぶかを学ぶ]. Freiburg: Herder（ドイツ語書籍）。**[未検証]** 原著本文は本セッションのネットワーク制約で確認できなかった。以下は英語圏で広く参照されている構造の整理であり、二次資料に基づく（[e-student.org](https://e-student.org/leitner-system/)）。

- 原著の実装は「5段階の日数（1日・2日・4日・7日・14日など）」ではなく、**5つの区画の物理サイズ（1・2・5・8・14cm）** で復習頻度を制御する仕組みだった。区画が満杯になったときだけ、その区画のカードを見直し、正解なら次の区画へ、不正解なら最初の区画へ戻す。
- 「固定日数(1,2,4,7,14日)」という説明は、後年のデジタル実装（Anki 以前の PC 版 Leitner ソフトなど）による再解釈であり、原著が指定した値ではない。**この点は一次資料未確認のまま流布している通説である可能性が高く、cairn の設計判断の根拠として日数の具体値を Leitner に帰属させるべきではない**。

**最小実装に持ち込むべき核**: 「成功したら1段階進み、失敗したら最初の段階に戻す」という状態機械そのもの。これは日数にもカード枚数にも依存しない、Leitner の本質的な発明。
**捨ててよい要素**: 物理的な区画サイズによる自己スケジューリング（ソフトウェアでは無意味）、および特定の日数系列（原著が規定した値ではなく、後付けの通説であるため）。

### 3.2 SM-2（Wozniak, 1990/1998）

一次資料: P.A. Wozniak, *Application of a computer to improve the results obtained in working with the SuperMemo method*（*Optimization of learning* 修士論文, Poznan工科大学, 1990年。1998年にWeb記事として公開）— [https://www.super-memory.com/english/ol/sm2.htm](https://www.super-memory.com/english/ol/sm2.htm)（原文ドメインは本セッションから直接到達不能。同一ページの GitHub 上の保存済みコピー [clockzhong/OpenSuperMemo](https://raw.githubusercontent.com/clockzhong/OpenSuperMemo/master/SM2/Docs/SuperMemo%202_%20Algorithm.html) で原文全文を確認した）。

原文のアルゴリズム全文（要約引用）:

> 1. Split the knowledge into smallest possible items.
> 2. With all items associate an E-Factor equal to 2.5.
> 3. Repeat items using the following intervals: I(1):=1, I(2):=6, for n>2: I(n):=I(n-1)\*EF
> 4. After each repetition assess the quality of repetition response in **0–5 grade scale**（5=完璧 〜 0=完全に忘れた）
> 5. After each repetition, update EF: `EF' := EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))`（EF は 1.3 を下回らない）
> 6. **If the quality response was lower than 3 then start repetitions for the item from the beginning**（品質評価が3未満なら、E-Factor は変えずに最初からやり直す）
> 7. 同日中に4点未満だった項目は、全て4点以上になるまでその日のうちに繰り返す

**最小実装に持ち込むべき核**: 「間隔は前回間隔に係数を掛けて伸ばす」「一定の閾値を下回ったら最初からやり直す（EFは保持）」という2点。
**捨ててよい要素**: 項目ごとに変動する E-Factor（1.1〜2.5の連続値）と、それを支える0–5の6段階品質評価。R5（Kornell 2009）が示す通り、間隔を空けること自体が効果の大半を説明するため、項目難易度に応じた連続的なチューニングは効果の主要因ではない。1人・低頻度（学習ログの「確定」操作）の運用では、二値（「もう一度」/「次の段階へ」）で §3.1 の Leitner 型状態機械に単純化してよい **[推測]**。

### 3.3 FSRS（Free Spaced Repetition Scheduler）

一次資料: FSRS 公式 wiki の "The Algorithm" ページ — [https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm)（直接 fetch で原文確認）。

FSRS は Difficulty (D) / Stability (S) / Retrievability (R) の3変数からなるモデルで、レビュー履歴から機械学習でユーザー固有のパラメータを最適化する。原文は期日超過（overdue reviews）の扱いを明示的に述べている:

> "In FSRS, a delay in reviewing (i.e., overdue reviews) affects the next interval as follows: As the delay increases, retrievability (R) decreases. If the review was successful, the subsequent stability (S) would be higher... However, **instead of increasing linearly with the delay like the SM-2/Anki algorithm, the subsequent stability converges to an upper limit**, which depends on your FSRS parameters."

これは §4 の直接の根拠になる: 期日超過は「罰」ではなく、次回間隔の計算に入る一変数として扱われ、しかも SM-2 系のような線形増加ではなく上限付きで収束するよう設計されている。

**最小実装に持ち込むべき核**: なし（v1では不要、と判断する根拠として引用する）。
**捨ててよい要素**: FSRS のDSRモデル全体。Anki 公式マニュアルの deck-options.md 自身が、FSRS のパラメータ最適化には「数百件以上のレビュー履歴」が要ると明記している:

> "Low number of reviews (**less than a few hundred**). As a machine learning algorithm, FSRS needs data to learn from." — [Anki 公式マニュアル deck-options.md](https://github.com/ankitects/anki-manual/blob/main/src/deck-options.md)（公開版: [docs.ankiweb.net/deck-options.html](https://docs.ankiweb.net/deck-options.html)）

cairn の復習フラグは「1日の記録のうち一部に印を付ける」程度の低頻度な操作になる見込みで、フラッシュカードアプリの数百〜数千件のレビュー規模には遠く届かない。FSRS 相当のML最適化を持ち込む正当化はない **[推測]**。

---

## 4. 「ストリークにしない」ための設計根拠

### 4.1 Anki: 期日超過は優先度、失敗ではない

一次資料: Anki 公式マニュアル `studying.md` の "Falling Behind" 節（[GitHub ソース](https://github.com/ankitects/anki-manual/blob/main/src/studying.md)、公開版 [docs.ankiweb.net/studying.html#falling-behind](https://docs.ankiweb.net/studying.html#falling-behind)。直接 fetch で原文確認）:

> "When you fall behind in your reviews, Anki by default prioritizes cards that have been waiting the longest. **This ordering ensures that no cards will be left waiting indefinitely**... When you answer cards that have been waiting for a while, Anki factors in that delay when determining the next time a card should be shown. **This means if you are returning to Anki after a long break, you don't have to start anew** and can just start back from where you left."

同マニュアルの `deck-options.md` は復習の並び順オプションとして「Relative overdueness」を挙げ、「忘れていそうなカードを先に見せる」という **優先度** の言葉で説明しており、「遅延=失敗」という言葉は一切使われていない（[GitHub ソース](https://github.com/ankitects/anki-manual/blob/main/src/deck-options.md)）。

### 4.2 FSRS: 遅延は上限付きで次回間隔に反映されるだけ

§3.3 に引用した通り、FSRS は遅延（overdue）を「線形の罰」ではなく「上限に収束する変数」として明示的にモデル化している。SM-2/Ankiの旧アルゴリズムがむしろ「遅延に比例して間隔が増える」線形な扱いだったのに対し、FSRS はそれを意図的に修正した、という記述そのものが「遅延を罰にしない」設計思想の一次的な裏付けになる。

### 4.3 RemNote: 遅れて思い出せたことをボーナスとして扱う

RemNote 公式ヘルプセンター「Understanding Spaced Repetition」は、期日を過ぎてから正しく再生できた場合、通常より安定度（stability）の伸びが大きくなる旨と、この効果の強さを調整する "Overdueness Bonus" 設定があることを説明している — [help.remnote.com/en/articles/9337171-understanding-spaced-repetition](https://help.remnote.com/en/articles/9337171-understanding-spaced-repetition)（WebSearch 経由で原文要約を確認。§7参照）。「遅れたら失敗」ではなく「遅れて思い出せたなら、むしろ強化する」という設計は、Anki/FSRS と方向性が一致する。

### 4.4 一次研究側からの補強

R5（Kornell 2009, §2）が示した「学習者は分散学習の効果を過小評価しがち」という知見は、期日超過に不安を煽るUI（赤いバッジ、カウントダウン、連続記録の途切れ表示）を追加する設計の妥当性を疑わせる。ユーザーの直感的な焦りは、実際の学習効果の指標として当てにならない。

### 4.5 cairn の既存方針との一致

`CONTEXT.md`「習得」Avoid: ストリーク、「週間ターゲット」Avoid: ストリーク、および ADR-0006 の「頻度判定機構（ストリーク含む）を全廃」という決定は、上記4件の一次資料が支持する設計（期日超過は優先度の入力に留め、連続記録や失敗表示を作らない）と自然に整合する。復習フラグは、この地図で唯一新たに「期日」という概念を持ち込む機能であり、既存の反ストリーク方針を破らない実装にする必要がある。

---

## 5. 実装事例

| サービス | 印を付ける操作 | 期日の決め方 | 今日の復習として並べる UI | 期日超過の見せ方 | 出典・取得方法 |
|---|---|---|---|---|---|
| **Anki** | （設計上）追加した全カードが対象。印を付ける操作は無く、復習のたびに Again/Hard/Good/Easy の4段階で回答する | SM-2 または FSRS が回答の質から次回間隔を計算 | デッキ一覧に New/Learning/To Review の件数を表示。並び順は設定可能（"Relative overdueness" 等） | 優先度を上げるだけ（§4.1）。バッジや失敗カウントはない | [studying.md](https://github.com/ankitects/anki-manual/blob/main/src/studying.md), [deck-options.md](https://github.com/ankitects/anki-manual/blob/main/src/deck-options.md)（GitHub から直接 fetch） |
| **Obsidian Spaced Repetition** | ノートに `#flashcards` または `#review` タグを付けて「復習対象」だと明示的にマークする（cairn の「フラグ」概念に最も近い） | SM-2 または FSRS。ユーザーは復習後の自己評価だけ入力し、間隔計算はアルゴリズムに委ねる | コマンド "Review flashcards from all notes" / "Open Notes Review Queue" が、アルゴリズムが計算した期日でソートしたキューを提示。アルゴリズムを無視する "Cram" モードも別途ある | プラグイン側は Anki 同様、期日超過分をキューの先頭に回す方式（詳細ドキュメントは stephenmwangi.com、本セッションでは直接確認できず） | [README.md](https://github.com/st3v3nmw/obsidian-spaced-repetition/blob/master/README.md)（GitHub から直接 fetch） |
| **Readwise (Daily Review)** | ハイライトを「Mastery」カードに変換する操作が、明示的な「復習したい」フラグに相当する。変換しないハイライトも半分は確率的に再浮上する | 日付ベースの固定間隔ではなく、想起確率の半減期（half-life）モデルに基づく減衰アルゴリズム | Daily Review は前半＝未処理ハイライトのランダム再浮上、後半＝期日が来た Mastery カードの2部構成。頻度は「Frequency Tuning」で調整可能 | 明確な「期日超過」表示という概念自体が薄い。カードごとに pass/fail ではなく「soon / later / someday」という3択のフィードバックで次回間隔を決める | [Reviewing Your Highlights](https://docs.readwise.io/readwise/docs/faqs/reviewing-highlights), [How to Increase Retention with Mastery](https://docs.readwise.io/readwise/guides/mastery)（WebSearch 経由。§7参照） |
| **RemNote** | Flashcard専用の記法（`>>` や `::` 等）でコンテンツを作成すると、自動的に復習対象になる | 「想起確率が90%を下回った」時点を期日とする閾値モデル（デフォルトは Anki 系 SM-2、FSRS も選択可） | Practice / Queue 機能が期日が来たフラッシュカードを提示 | 「Overdueness Bonus」（§4.3）で遅延を正の方向に評価。ペナルティ表示はない | [Understanding Spaced Repetition](https://help.remnote.com/en/articles/9337171-understanding-spaced-repetition), [The Anki SM-2 Spaced Repetition Algorithm](https://help.remnote.com/en/articles/6026144-the-anki-sm-2-spaced-repetition-algorithm)（WebSearch 経由。§7参照） |
| **Mochi** | カードを作成すると自動的にレビュー対象になる（Anki型。専用の「フラグ」操作は無い） | 忘却曲線モデルに基づき、想起の成否で次回間隔を計算 | Review 機能が期日順にカードを提示 | 忘れた場合は間隔をリセットし「relearning」を開始。思い出せた場合は短い間隔を保って通常運用を継続する、という2分岐のみで、失敗カウントの概念はない | [Intro to spaced repetition](https://mochi.cards/docs/reviewing)（WebSearch 経由。§7参照） |

**cairn の復習フラグに最も近い前例は Obsidian Spaced Repetition の `#review` タグ**である: 記録の全件が自動的に対象になる Anki/Mochi 型ではなく、「明示的に印を付けたものだけが対象になる」オプトイン型が、cairn の「記録にすべて構造化された復習が要るわけではない（プリセットにない自由記述の記録もある）」という前提と一致する。

---

## 6. 本アプリの制約への写像（推測）

このセクション全体は **[推測]** である。一次研究・一次資料はここでの実装判断そのものを検証していない。

### 6.1 期日の持ち場所

`days` テーブルは「JST の暦日1日分」を表し、`CONTEXT.md`「日」が「未来の暦日に日を作らない」と明記している。`rows`（記録）は `dayId` で `days` に紐づき、`dateJst` も併せ持つ（`convex/schema.ts`）。復習フラグの期日 (`dueJst`) は将来の暦日を指すため、これを `rows` や `days` に直接持たせると「未来の `days` ドキュメントを先回りして作ってしまう」設計上の罠を誘発しやすい。

**推奨（推測）**: 新テーブル `reviewFlags`（例: `ownerId` / `sourceRowId` または `itemId` / `dueJst` / `stage` / `createdAt`）を独立して持つ。`dueJst` は「`days` を作るためのキー」ではなく、「クエリ時に `dueJst <= todayJst` でフィルタするための条件」としてのみ使う。こうすれば `days` の「未来に日を作らない」という不変条件に一切触れない。

### 6.2 「今日の復習」として並べる経路

`convex/services/days/openDay.ts` の `openDay()` は、今日を開いたとき（`args.dateJst === args.todayJst`）に、その曜日のプリセットを検索し、まだ何も行が無ければプリセット行を `未着手` として一括挿入する、という形になっている（該当箇所抜粋）:

```ts
// convex/services/days/openDay.ts
const preset = await ctx.db
  .query("presets")
  .withIndex("by_owner_and_weekday", (q) => q.eq("ownerId", ownerId).eq("weekday", weekday))
  .unique();
// ...
await Promise.all(
  preset.lines.map((line, index) =>
    ctx.db.insert("rows", { /* ... status: "未着手" ... */ }),
  ),
);
```

**推奨（推測）**: 同じ形の経路を復習フラグにも適用する。今日を開いたとき、プリセット適用に加えて「`reviewFlags` のうち `dueJst <= todayJst` な行」を検索し、まだその日に対応する複製行が無ければ `未着手` の `rows` として挿入する。これは新しい UI 概念（別画面、別ナビタブ）を増やさず、既存の「日ページを開くと、その日にやることが自動的に並ぶ」という体験（プリセット）の延長として実装できる。

### 6.3 期日超過の扱い

`dueJst` を過ぎても、「今日」を開くたびに `dueJst <= todayJst` の全件を対象にするだけでよい（優先度の並び替えすら v1 では不要かもしれない）。Anki（§4.1）・FSRS（§4.2）・RemNote（§4.3）のいずれも「遅延は次回入力値であって失敗ではない」という扱いを取っており、cairn 側でも「何日遅れているか」を強調する UI（バッジ、赤字、連続記録の破断表示）を作らないことが、地図全体の反ストリーク方針（§4.5）と整合する。

### 6.4 印を付ける操作

`rows`（記録）に「復習したい」を示す二値フラグを1つ追加するのが最小実装（推測）。確定 (`確定`) した記録に対して付けるユースケースが主だが、`CONTEXT.md`「記録」に「プリセットにない記録も、その日に追加できる」とある通り、記録は自由記述もあるため、フラグはカテゴリや項目単位ではなく記録単位が自然（推測）。

段階 (`stage`) は Leitner 型の固定リスト（例: 1日→3日→7日→14日）とし、「もう一度」で `stage = 0` に戻し、「次で十分」で `stage + 1` に進める、という二値フィードバックのみを持つ。SM-2 の 0–5 評価や FSRS の連続パラメータは持たない（§3.2, §3.3 の「捨ててよい要素」）。

### 6.5 既存の「プリセット適用」経路との類似性まとめ

| 観点 | プリセット適用（既存） | 復習フラグ（提案） |
|---|---|---|
| トリガー | 今日を開く（`dateJst === todayJst`） | 同じ |
| 対象の決め方 | 曜日に一致する `presets` を検索 | `dueJst <= todayJst` の `reviewFlags` を検索 |
| 挿入する行の状態 | `未着手` | `未着手`（推測） |
| 二重挿入の防止 | `liveRows.length > 0` なら適用しない | 同種のガードが必要（推測。例えば `reviewFlags` 側に「対応する `rows` を既に生成したか」を記録する） |
| 日の画面での見え方 | 通常の記録と区別しない | 通常の記録と区別しない（推測。「復習由来」であることをひとことや小さな印で示す程度に留め、専用UIは作らない） |

---

## 7. 未解決点・限界

1. **Leitner の原著（1972年、ドイツ語書籍）本文は本セッションでは直接確認できていない [未検証]**。§3.1 の構造説明は英語圏の二次資料（e-student.org）に基づく。特に「原著は物理サイズで頻度を制御していた」という主張自体が孫引きであり、Leitner 本人の記述を確認できていない。
2. **Readwise / RemNote / Mochi の公式ドキュメントは、本セッションのネットワーク制約により直接 fetch できなかった**。§4.3・§5 の該当行は WebSearch が返した要約・引用に基づく。再調査の機会があれば、`docs.readwise.io`・`help.remnote.com`・`mochi.cards/docs` を直接開いて原文全文を確認すべき。
3. **段階（`stage`）の日数や個数の最適値に、一次研究の直接的な指定はない**。§2 の一次研究はいずれも「間隔を空けること」「絶対スパンを伸ばすこと」の効果を示すが、「1/3/7/14日」という具体値そのものは一次研究の報告値ではなく [推測] である。
4. **本調査で引用した一次研究（§2）は、いずれも単語対・事実・語彙の記憶課題を対象にしている**。cairn の「記録」は学習セッションの完了ログであり、フラッシュカード的な即時再生課題ではない。効果量をそのまま学習ログの「復習フラグ」に外挿できるかは検証されていない [推測]。
5. **「日数」「完了件数」「分数」のどれを間隔反復の単位にすべきかを直接比較した一次研究は見つかっていない**（`docs/research/weekly-goal-redesign.md` §7 の既存の未解決点と同種の限界）。
6. `reviewFlags` を独立テーブルにする案（§6.1）と、`rows` に `dueJst` を持たせる案のどちらが実装コスト・クエリ効率の面で優れるかは、Convex のインデックス設計（CVX-10〜13）を踏まえた個別検討が必要で、本調査のスコープ外。

---

## 参考文献

### 一次研究（間隔反復・分散効果）
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin*, 132(3), 354–380. https://digitalcommons.usf.edu/psy_facpub/1771/
- Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science*, 19(11), 1095–1102. https://escholarship.org/uc/item/0kp5q19x
- Karpicke, J. D., & Roediger, H. L. (2007). Repeated retrieval during learning is the key to long-term retention. *Journal of Memory and Language*, 57(2), 151–162. https://learninglab.psych.purdue.edu/downloads/2007/2007_Karpicke_Roediger_JML.pdf
- Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning. *Science*, 319(5865), 966–968. https://www.science.org/doi/abs/10.1126/science.1152408
- Kornell, N. (2009). Optimising learning using flashcards: Spacing is more effective than cramming. *Applied Cognitive Psychology*, 23, 1297–1317. https://sites.williams.edu/nk2/files/2011/08/Kornell.2009b.pdf
- Karpicke, J. D., & Bauernschmidt, A. (2011). Spaced retrieval: Absolute spacing enhances learning regardless of relative spacing. *Journal of Experimental Psychology: Learning, Memory, and Cognition*, 37(5), 1250–1257. https://learninglab.psych.purdue.edu/downloads/2011/2011_Karpicke_Bauernschmidt_JEPLMC.pdf

### 軽量アルゴリズムの原著
- Leitner, S. (1972). *So lernt man lernen*. Freiburg: Herder.（原著未確認。構造整理は https://e-student.org/leitner-system/ による二次資料）
- Wozniak, P. A. (1990/1998). Application of a computer to improve the results obtained in working with the SuperMemo method (Algorithm SM-2). https://www.super-memory.com/english/ol/sm2.htm （本セッションでは https://raw.githubusercontent.com/clockzhong/OpenSuperMemo/master/SM2/Docs/SuperMemo%202_%20Algorithm.html 経由の保存済みコピーで原文確認）
- FSRS公式wiki. The Algorithm. https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm

### 公式マニュアル・実装ドキュメント
- Anki 公式マニュアル. Studying — Falling Behind / Fuzz Factor. https://github.com/ankitects/anki-manual/blob/main/src/studying.md （公開版: https://docs.ankiweb.net/studying.html ）
- Anki 公式マニュアル. Deck Options — FSRS / Relative overdueness / Health Check. https://github.com/ankitects/anki-manual/blob/main/src/deck-options.md （公開版: https://docs.ankiweb.net/deck-options.html ）
- Obsidian Spaced Repetition Plugin README. https://github.com/st3v3nmw/obsidian-spaced-repetition/blob/master/README.md （公開ドキュメント: https://stephenmwangi.com/obsidian-spaced-repetition/ ）
- Readwise Docs. Reviewing Your Highlights. https://docs.readwise.io/readwise/docs/faqs/reviewing-highlights
- Readwise Docs. How to Increase Retention with Mastery. https://docs.readwise.io/readwise/guides/mastery
- RemNote Help Center. Understanding Spaced Repetition. https://help.remnote.com/en/articles/9337171-understanding-spaced-repetition
- RemNote Help Center. The Anki SM-2 Spaced Repetition Algorithm. https://help.remnote.com/en/articles/6026144-the-anki-sm-2-spaced-repetition-algorithm
- RemNote Help Center. The FSRS Spaced Repetition Algorithm. https://help.remnote.com/en/articles/9124137-the-fsrs-spaced-repetition-algorithm
- Mochi Docs. Intro to spaced repetition. https://mochi.cards/docs/reviewing

### リポジトリ内の参照
- `CONTEXT.md`「日」「記録」「プリセット」「習得」「週間ターゲット」
- `docs/adr/0003-process-goals-not-okr.md`
- `docs/adr/0006-checkpoints-replace-weekly-goals.md`
- `docs/research/weekly-goal-redesign.md`
- `convex/schema.ts`
- `convex/services/days/openDay.ts`
- Issue [#73](https://github.com/sc30gsw/cairn/issues/73) / 親地図 [#66](https://github.com/sc30gsw/cairn/issues/66) / 先行地図 [#47](https://github.com/sc30gsw/cairn/issues/47)
