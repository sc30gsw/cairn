# 目標タイプ(goal type)分類体系の導出

- 作成日: 2026-08-17
- 対象: 本アプリ(TOEIC 学習ログ、所有者1人 + 実質2ユーザー)の目標機能の再設計
- 目的: `CONTEXT.md` の用語「目標タイプ」に入る**固定一覧(最大6個、汎用フォールバック1つを含む)**を、学術文献と市場調査の突き合わせから根拠ベースで導出する
- 前提となる既存の設計判断: [docs/adr/0003-process-goals-not-okr.md](../adr/0003-process-goals-not-okr.md)(成果目標は本番、アプリ内フィードバックはプロセス=学習量、OKR ツリーと WOOP 想像プロトコルは採らない)
- 現行スキーマ: `convex/schema.ts` の `examGoals`(`examDate` / `minScore` / `maxScore` / `ownerId`)と `weeklyGoals`(`minutes` / `weekStartJst` / `ownerId`)

> 本書の主張にはすべて出典 URL を付す。一次ソース(論文本文・公式ドキュメント)で裏付けが取れなかったものは **[未検証]** と明記した。設計上の判断で文献・市場のどちらからも直接は導けないものは「推測」と明記した。
> 調査対象: 学術文献 20件超、製品 26件。

---

## 1. 要約 — 提案タイプ一覧

**結論: 5タイプ(うち1つが汎用フォールバック「その他」)。上限6のうち1枠は意図的に空けて残す**(理由は §4.5)。

| # | タイプ名(日本語) | 識別子 | 説明 | 固有フィールド(名称 / 型 / 必須) |
|---|---|---|---|---|
| 1 | 試験 | `exam` | 期限のある本番の成果。当日に一度だけ結果が入る。カウントダウンの軸 | 本番日 / `date` / **必須**<br>スコア下限 / `number` / **必須**<br>スコア上限 / `number` / **必須** |
| 2 | ペース | `pace` | 期間あたりの学習ペースを保つプロセス目標(現行の「週間ゴール」) | 集計単位 / `enum('週','月')` / **必須**<br>指標 / `enum('分数','実施日数')` / **必須**<br>目標値 / `number` / **必須**<br>開始日 / `date` / 任意 |
| 3 | 達成量 | `volume` | 期限までに累計◯◯まで積み上げる(累計時間・ページ・問題数など) | 目標量 / `number` / **必須**<br>単位 / `enum('分','ページ','問題','回','冊')` / **必須**<br>期限 / `date` / **必須**<br>対象項目 / `Id<'items'>` / 任意<br>開始時点の量 / `number` / 任意 |
| 4 | 習得 | `mastery` | 数値化しない「できるようになる」。到達の判定基準を自分で書く | 到達したと判断する基準 / `string` / **必須**<br>期限 / `date` / 任意 |
| 5 | その他 | `other` | 上のどれにも当てはまらないもの(汎用フォールバック) | 期限 / `date` / 任意<br>メモ / `string` / 任意 |

**全タイプ共通フィールド**(discriminated union の共通部分に置く):

| フィールド | 型 | 必須 | 備考 |
|---|---|---|---|
| 目標の内容 | `string` | **必須** | `CONTEXT.md`「具体的手順」と同じ規則(空・空白のみ不可、1文字以上、実行可能な一歩)を適用する |
| 目標タイプ | `enum(上の5値)` | **必須** | discriminator。所有者が追加できない固定一覧(`CONTEXT.md`「目標タイプ」の _Avoid_ に従う) |

### 1.1 タイプは2階層で捉えられる

Strides は自社の4タイプをレポート画面で **Repeating(反復)** と **Goal Date(期限日)** の2グループに分けている(App Store 版19.7 リリースノート: Reports → Repeating に Habit と Average、Goal Date に Target と Project)。
出典: <https://apps.apple.com/us/app/strides-habit-tracker-goals/id672401817>

この2分は Austin & Vancouver (1996) の構造次元「temporal range(時間範囲)」に対応する(§2.1)。本提案も同じ形に割れる:

| 第1階層 | 該当タイプ | 性質 |
|---|---|---|
| **反復(期間が来るとリセット)** | `pace` | 期限を持たない。毎週/毎月やり直す |
| **期限日(1回で終わる)** | `exam` / `volume` / `mastery` | 到達したら終わる。カウントダウンが意味を持つ |
| (どちらにも属さない) | `other` | フォールバック |

UI のグルーピングをこの2階層にすると、タイプ選択が5択の平坦なリストではなく「反復か、期限つきか」→「どれか」の2段になり、選択の負荷が下がる(推測: 情報設計上の判断であり、文献・市場からの直接の導出ではない)。

### 1.2 現行スキーマとの対応

- `examGoals`(`examDate` / `minScore` / `maxScore`)→ `exam` にそのまま入る。追加は共通の「目標の内容」だけ
- `weeklyGoals`(`minutes` / `weekStartJst`)→ `pace`(集計単位=週、指標=分数)に相当
- `volume` / `mastery` / `other` は新規

---

## 2. 学術文献レビュー

### 2.1 目標の「構造」と「内容」は別レイヤー — これが本書の中心的な発見

Austin & Vancouver (1996) は目標を "internal representations of desired states, where states are broadly construed as **outcomes, events, or processes**"(p. 338)と定義し、レビュー全体を **structure / process / content** の3軸で構成した。
出典: Austin, J. T., & Vancouver, J. B. (1996). *Goal constructs in psychology: Structure, process, and content.* Psychological Bulletin, 120(3), 338–375. 全文 PDF: <http://david-dai-d5le.squarespace.com/s/AustinVancouver1996.pdf>

同論文 p. 343 は、実証・理論の両アプローチを横断して抽出された**6つの共通次元**を挙げる(原文):

> "We identified six common factors across empirical and theoretical approaches to goal dimensionality: (a) importance–commitment, (b) difficulty–level, (c) specificity–representation, (d) **temporal range**, (e) level of consciousness, and (f) connectedness–complexity."

一方で content セクション(pp. 355–359)は、Maslow、Alderfer、Wicker et al.、Winell、Jackson、Beach & Mitchell、Schank & Abelson、Ortony et al. といった**内容領域の分類体系**を別途レビューし、Table 2 として Ford & Nichols の "A Taxonomy of Human Goals"(Within person: Affective / Cognitive / Subjective organization、Person–environment: Self-assertive social / Integrative social / Task。**各カテゴリに approach 欄と avoid 欄がある**)を再録する。

**設計への含意**: discriminated union の discriminator にすべきは**構造次元**((b) difficulty、(c) specificity、(d) temporal range)であって、**内容領域ではない**。§4.1 で内容領域による分類を正式に棄却する。

### 2.2 内容領域の分類体系(discriminator に採用しなかった軸)

いずれも人生全体の目標領域を分類したもので、本アプリの目標はほぼ全件が「学業・知的成長」1領域に入る。

| 出典 | 分類 | URL |
|---|---|---|
| Ford & Nichols(Austin & Vancouver 1996 Table 2 に逐語再録) | Affective / Cognitive / Subjective organization / Self-assertive social / Integrative social / **Task(Mastery, Creativity, Management, Material gain, Safety)** | <http://david-dai-d5le.squarespace.com/s/AustinVancouver1996.pdf> |
| Little, Personal Projects Analysis | interpersonal / academic / work / intrapersonal / leisure / health / maintenance | 原典 <https://journals.sagepub.com/doi/10.1177/0013916583153002> / 区分の逐語引用は <https://ncbi.nlm.nih.gov/pmc/articles/PMC10204596> |
| Chulef, Read & Walsh (2001) | 135目標 → **30クラスタ**。最上位の分岐は interpersonal(social) vs intrapersonal(individual) | <https://link.springer.com/article/10.1023/A:1012225223418> |
| Talevich et al. (2017) | 161動機・5階層。最上位 Meaning / Communion / Agency → 9クラスタ(… Health, **Mastery & Competence**, Financial & Occupational Success) | <https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0172279> |
| Grouzet et al. (2005) | Aspiration Index 11 goal contents(Affiliation / Community feeling / Conformity / Financial success / Hedonism / Image / Physical health / Popularity / Safety / **Self-acceptance** / Spirituality)が circumplex を成す。2次元は intrinsic–extrinsic と self-transcendent–physical | 全文 PDF <https://web.uvic.ca/psyc/grouzet/pdf/Grouzet&al2005-JPSP.pdf> |
| Emmons, personal strivings | **12 thematic content categories**(Emmons 1999 Appendix B)。うち Intimacy / Spirituality / Generativity / Power の定義のみ一次確認 | Emmons (2003) 全文 PDF <https://www.psychology.hku.hk/ftbcstudies/refbase/docs/emmons/2003/53_Emmons2003.pdf> |

→ 本アプリの目標は、Little なら academic、Talevich なら Intellectual Growth / Achievement / Self-Regulated の交差点、Ford & Nichols なら Task–Mastery に全部落ちる。**内容領域では分類できない。**

### 2.3 構造の区別(採用した軸)

#### (a) process / performance / outcome — 効果量が実測で異なる区別

スポーツ心理学の系統的レビュー・メタ分析(Williamson et al., 2022)は、目標の種類ごとに効果量が有意に違うことを示した(原文):

> "**Process goals and performance goals produced significant improvements in performance (d's ≥ 0.44), but process goals elicited significantly greater improvements than performance goals (Q = 4.77[1], p = .029). Conversely, no significant performance improvements were found by setting mastery, outcome, or ego goals.** Both **short-term**, and a combination of short-term and long-term goals, generated significant performance improvements (d's ≥ 0.43) … Nevertheless, **long-term-goals did not have a significant effect on performance (d = −0.08).**"

出典: Williamson, O., Swann, C., Bennett, K. J. M., Bird, M. D., Goddard, S. G., Schweickle, M. J., & Jackman, P. C. (2022). *The performance and psychological effects of goal setting in sport: A systematic review and meta-analysis.* International Review of Sport and Exercise Psychology. <https://www.tandfonline.com/doi/full/10.1080/1750984X.2022.2116723>

**これは ADR 0003 の直接的な実証的裏付けである。** 「アプリ内のフィードバックは学習量(プロセス)にする」「本番目標はフィードバックに使わず、カウントダウンの軸になる」(`CONTEXT.md`)という既存の設計判断が、効果量のデータと一致している。同時に「`exam` を進捗フィードバックの主軸にしてはいけない」という制約を追加で与える。

#### (b) proximal / distal — distal 単独は効果ゼロ

Bandura & Schunk (1981) は、proximal subgoals 条件のみが自己主導学習・自己効力感・内発的興味を高め、"**Distal goals had no demonstrable effects.**" と報告した。
出典: <https://uploads-ssl.webflow.com/59faaf5b01b9500001e95457/5bc552d85141987915dab842_Bandura%20&%20Schunk,%201981.pdf>

Locke & Latham (2002, 2006) も同じ方向を示す。Latham & Seijts (1999) では distal outcome goal 単独は "do your best" より劣り、**distal + proximal を併置**したときに自己効力感と成果が有意に高い。Dorner (1991) の引用: "performance errors on a dynamic task are often due to **deficient decomposition of a distal goal into proximal goals**."
出典: Locke & Latham (2002). *Building a practically useful theory of goal setting and task motivation: A 35-year odyssey.* American Psychologist, 57(9), 705–717. 全文 PDF: <https://med.stanford.edu/content/dam/sm/s-spire/documents/PD.locke-and-latham-retrospective_Paper.pdf> / Locke & Latham (2006). *New directions in goal-setting theory.* 全文 PDF: <https://home.ubalt.edu/tmitch/642/articles%20syllabus/locke%20latham%20new%20dir%20gs%20curr%20dir%20psy%20sci%202006.pdf>

**設計への含意**: `exam`(distal)は単独では機能しない。**UI 上で `exam` と `pace` を必ず並べて見せる**べきで、`exam` だけが設定された状態は「未完成」として扱う根拠がある(§5.1-7)。

#### (c) learning goal vs performance/outcome goal — `mastery` の根拠

Locke & Latham (2006) 原文:

> "performance outcome on a new, complex task can lead to 'tunnel vision' … the best results are attained if a **learning goal** is assigned—that is, a goal to acquire the requisite task knowledge." / "a learning goal facilitates or enhances metacognition—namely, planning, monitoring, and evaluating progress."

さらに困難度効果は課題複雑性でモデレートされる(specific-difficult vs do-best: 複雑 d = .41 vs 単純 d = .77)。Seijts & Latham (2005) は「新奇・複雑な段階では学習目標、十分理解した段階では成果目標」という使い分けを提示した。
出典: <https://www-2.rotman.utoronto.ca/facbios/file/22%20-%20Seijts%20&%20Latham%20AME%202005.pdf> / <https://www.sciencedirect.com/science/article/abs/pii/S0090261611000751>

→ ADR 0003 の「TOEIC Reading は未習の複雑課題」という認識に対応し、**数値目標を持たないタイプ(`mastery`)が必要**という要件を生む。

#### (d) 達成目標理論 3×2 — 基準(参照点)は内容と直交する別次元

Elliot, Murayama, & Pekrun (2011) の 3×2 モデルは、達成目標を definition 軸(task-based / self-based / other-based)と valence 軸(approach / avoidance)で6構成概念に分ける。abstract 原文:

> "The model is rooted in the **definition** and **valence** components of competence, and encompasses 6 goal constructs … most notably the need to **separate task-based and self-based goals**."

出典: <https://centaur.reading.ac.uk/34828/> / 2×2 原典 Elliot & McGregor (2001): <https://pubmed.ncbi.nlm.nih.gov/11300582/> / メタ分析: <https://pmc.ncbi.nlm.nih.gov/articles/PMC10416154/>(absolute / intrapersonal / interpersonal を "three ways to define competence" と記述)

**設計への含意**: 「目標値の参照点」(絶対値か / 自己ベスト比か / 他者比か)は、内容とも構造とも別の次元。本アプリは所有者1アカウント(`CONTEXT.md`「所有者」)なので other-based は不要で、absolute と intrapersonal の2つに縮退する。これを**タイプにするのではなく `pace` / `volume` の任意フィールドにするか**は未決(§5.1-3)。

#### (e) goal intention と implementation intention は構造が違う別オブジェクト

Gollwitzer (1999, p. 494) 原文:

> "**Goal intentions** specify a certain end point that may be either a desired performance or an outcome. … Goal intentions have the structure of '**I intend to reach x!**'"
> "**Implementation intentions** are subordinate to goal intentions and specify the **when, where, and how** of responses leading to goal attainment. They have the structure of '**When situation x arises, I will perform response y!**'"

出典: <https://www.prospectivepsych.org/sites/default/files/pictures/Gollwitzer_Implementation-intentions-1999.pdf>
メタ分析: Gollwitzer & Sheeran (2006), 94 independent tests, **d = .65**。<https://kops.uni-konstanz.de/handle/123456789/10973>

→ 効果は大きいが、implementation intention は goal intention に**従属する別オブジェクト**であり、本アプリでは既に `obstaclePlans`(障害プラン)として独立実装済み。目標タイプにはしない(§4.4)。

#### (f) 習慣形成 — 1回の欠損はストリークを壊さない

Lally et al. (2010) abstract 原文:

> "96 volunteers chose an eating, drinking or activity behaviour to carry out **daily in the same context** (for example 'after breakfast') for 12 weeks. … The time it took participants to reach **95% of their asymptote of automaticity ranged from 18 to 254 days** … **Missing one opportunity to perform the behaviour did not materially affect the habit formation process.**"

出典: <https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674>
関連: Wood & Rünger (2016). *Psychology of habit.* Annual Review of Psychology, 67, 289–314. <https://www.annualreviews.org/content/journals/10.1146/annurev-psych-122414-033417>("habits form as people pursue goals by **repeating the same responses in a given context**")

→ **`pace` の未達を「連続記録ゼロ」で罰する設計は実証に反する。** 1週落としても継続を保つ扱いが要る(§5.1-6)。

#### (g) フィードバックは必須のモデレータ

Locke & Latham (2002) の例示: "If the goal is to cut down 30 trees in a day, people have no way to tell if they are on target unless they know how many trees have been cut."
出典: <https://med.stanford.edu/content/dam/sm/s-spire/documents/PD.locke-and-latham-retrospective_Paper.pdf>

→ **すべてのタイプに「現在値をどう取るか」が定義できていなければならない。** `volume` の単位が「ページ」「問題」のとき、現行 `rows` は `minutes` しか持たないため現在値が取れない(§5.1-4)。

### 2.4 実データにおける目標記述の傾向

- **eaTracker My Goals(カナダ、実運用データ)**: 自由記述目標 4,062件のうち **42.3%(1,720件)が遠位の成果目標のみ**(例: 体重を減らす)で行動ベースになっていなかった。また利用者は**頻度(frequency)の設定を誤りやすい**(例:「5kg減らす」に頻度「毎日」を設定)。ready-made 目標 12,449件の分布は「体重管理」33.1%、「体を動かす」13.1% ほか。
  出典: <https://pmc.ncbi.nlm.nih.gov/articles/PMC5024431/>

  → **設計上の含意: 「数値の成果目標」と「期間あたりの行動目標」を1つのフォームに混ぜると、ユーザーは必ず取り違える。** タイプで入力欄を分けること自体が、この既知の失敗を構造的に防ぐ。**本再設計の最も直接的な実証的正当化。**

- **Duolingo(公式ブログ)**: 2日連続で使ったのにストリークが無いユーザーの約40%が最高ティア「intense」の日次目標を設定していた。**目標型の設計以上に、デフォルト値の控えめさが継続に効く**という一次データ。
  出典: <https://blog.duolingo.com/improving-the-streak/>

- **stickK(大規模コミットメントデバイス)**: 行動変容目標のトピックとコミットメント設定を大規模データで特徴づけ、達成は金銭的・社会的コミットメントの構成に大きく依存すると報告。
  出典: Lee, H., Kim, A., Hong, H., & Lee, U. (2021). CHI '21. <https://dl.acm.org/doi/10.1145/3411764.3445295>。トピック別の内訳の数値は本文 PDF の抽出に失敗したため **[未検証]**

---

## 3. 市場調査 — 目標タイプと入力欄

製品26件を調査。ここでは設計判断に効いたものだけを挙げる。

### 3.1 構造タイプを明示している製品

#### Strides — 4タイプ + 2階層グルーピング(最重要の先行事例)

公式トップページの原文表記:

| タイプ | 公式説明(原文) | 構造 |
|---|---|---|
| **HABIT** | "Good or Bad Habits. Swipe to Log Yes/No. Flexible Reminders." | 期間反復・二値 |
| **TARGET** | "Goal Value by Date. Enter Any Number. Helpful Pace Line." | 期限つき数値到達 |
| **AVERAGE** | "By Any Time Period. Or Rolling Average. Current or Overall." | 期間平均の維持 |
| **PROJECT** | "Simple Milestones. Percent & Checklists. Dates with Pace Line." | マイルストーン/チェックリスト |

出典: <https://www.stridesapp.com/> / <https://www.stridesapp.com/help/>

共通入力欄(公式ヘルプで確認できた範囲): トラッカー名、テンプレート選択、**Due**(ログする曜日、または every X days/weeks/months)、Reminders、Tags、Start Date、Notes、Bad Habit フラグ。Target/Average は数値入力必須("Target & Average trackers require entering a number")。Pace は "the value you should be at by now, based on the dates and values you set" として日付と値から算出され、遅れると赤くなる。

**2階層グルーピング**(App Store 版19.7 リリースノート、原文):

> "Tap Reports then **Repeating** to see all your **Habit and Average** trackers, grouped by daily, weekly, monthly, quarterly and yearly goals. ... The **Goal Date** report shows all of your **Target and Project** goals, sorted by when they're due, with countdowns and projected line charts."

出典: <https://apps.apple.com/us/app/strides-habit-tracker-goals/id672401817>

→ §1.1 の2階層設計はここから採った。なお HABIT の「X times per day/week/month + goal streak」という表現は検索スニペット経由でしか取れず **[未検証]**(公式ヘルプの Due フィールドは確認済み)。

#### Beeminder — 6タイプ + Custom フォールバック

選択できる目標タイプは Do More / Lose Weight / Use an Odometer / Do Less / Gain Weight / Whittle Down。Odometer は累計値を入力していく型(例: 読んだページ数の現在値)、Whittle Down はバックログを減らす型。
出典: <https://help.beeminder.com/article/51-whats-the-difference-between-the-goal-types> / <https://help.beeminder.com/article/68-odometer-goals> / <https://help.beeminder.com/article/69-whittle-down-goals>

**Custom goals** が明示的に用意され、公式は "All default goal types are combinations of these settings" と述べる(既定タイプは設定の組み合わせで、Custom がフォールバック)。
出典: <https://help.beeminder.com/article/97-custom-goals>

ただし Do Less / Odometer / Whittle Down は有料プラン限定で、無料の既定は Do More と Weight のみ。**実運用の中心は2〜3タイプ**。
出典: <https://help.beeminder.com/article/52-why-cant-i-create-a-do-less-odometer-whittle-down>

→ 「固定タイプ数個 + 汎用フォールバック1つ」という本課題の制約そのものが、実運用製品で採られている構成である。

#### Lifetick — 5つのトラッカー型

公式トップページ原文: "**Descriptive, financial, numerical, binary and count types** are all available to give you the reporting you need."
構造は Core Values(4〜8個、ユーザーが追加・編集できる領域) → Goals(SMART) → Tasks(single / repeating / sub task)の3階層。財務ゴールは「タスクの金額合計がゴール金額にちょうど一致する」累積型。Dreams(いつでも Goal に変換できる保留中の願望)という**目標未満のプレースホルダ型**を持つ。
出典: <https://lifetick.com/> / <https://lifetick.com/features.html> / <https://knowledge.lifetick.com/?p=742>
フォームの正確なフィールド名は公式ソースで確認できず **[未検証]**。

→ **Descriptive(記述型)** の存在は、本提案の `mastery`(数値を持たない型)に市場的な先例があることを示す。

#### Habitica — Habits / Dailies / To Do's

公式 Play ストア説明文が構造の違いを明示: Dailies = "Automatically **repeating tasks scheduled** for your daily, weekly, or monthly routines"、Habits = "**Flexible habit tracker** for tasks you want to do multiple times a day or only once in awhile"、To Do's = "Traditional to do list for tasks that only need to be done **once**"。
出典: <https://play.google.com/store/apps/details?id=com.habitrpg.android.habitica> / 公式 Wiki(コミュニティ編集、準公式): <https://habitica.fandom.com/wiki/Task_Type_Choice:_Habit,_Daily,_or_To_Do>

#### Way of Life / Streaks / Loop — 頻度表現の実装形

- Way of Life: 型セレクタなし、完全に二値。ログは **Yes / No / Skip / Erase** の4状態。数値目標欄は存在しない。<https://wayoflifeapp.com/>
- Streaks: 頻度表現の公式例示が有用 — "Walk to work (**Monday to Friday**) / Go to the gym (**3 days per week**) / Call your parents (**every Wednesday**)"。<https://streaksapp.com/>
- Loop Habit Tracker(公式リポジトリ README): "**Flexible schedules.** … such as **3 times per week or every other day**." <https://github.com/iSoron/uhabits>

→ 頻度表現には最低3形態(曜日指定 / 週N回 / 特定曜日)が要る。本提案の `pace` は「週あたりの実施日数」に絞ることでこれを単純化している(§4.3)。

#### GoalsOnTrack — 型ではなく「進捗の取り方」のセレクタ

公式 features 原文: "Track goal progress in four ways: **by sub-goals, by tasks, by the outcome and manually**."
ゴール作成フォーム: Goal name(必須)/ Start date・End date(必須)/ Progress tracking option(必須)/ Current・start value と Target value(手動更新時に必須)/ Description(任意)/ 画像(任意)/ Category(任意)。Habits は独立モジュール。
出典: <https://www.goalsontrack.com/features> / <https://www.goalsontrack.com/support/article/first_steps>

→ **「タイプ」ではなく「進捗ソース」で分岐させる**という代替設計。Locke & Latham のフィードバック必須論(§2.3-g)と対応する。

### 3.2 汎用生産性ツール

- **ClickUp Goals**: Target の型は**4種**。公式原文: "There are **four Target types**: **Number**(Create a range of numbers and track increases or decreases between them)/ **True/False**(Done/Not Done checkbox)/ **Currency** / **Task**(Track the completion of a single task, subtask, or an entire List)"。Number / Currency が**開始値と目標値のペア(range)**で定義されている点が重要。
  出典: <https://help.clickup.com/hc/en-us/articles/6325733579671-Create-a-Goal>
- **Asana Goals**(法人向け・対比用): 手動は percentage / number / currency の3種、自動は Sub-goals / Projects / Tasks を進捗ソースに選ぶ。
  出典: <https://help.asana.com/s/article/how-to-set-a-progress-source-for-your-goals>
- **Todoist**: 型セレクタなし。**Daily Task Goal** と **Weekly Task Goal**(完了タスク件数の整数)の2フィールドのみ。0にすると無効化。Vacation Mode でストリークを保留。
  出典: <https://www.todoist.com/help/articles/use-the-productivity-view-in-todoist-6S63uAa9> / <https://www.todoist.com/help/articles/turn-on-or-off-vacation-mode-in-todoist-pAQmRp>
- **Notion**: ゴールという第一級プリミティブが存在しない。ユーザー定義 DB のプロパティ組み合わせ。「型を決め打ちしない」設計の対極例。
  出典: <https://www.notion.com/templates/goal-tracker>
- **Google Calendar Goals(2016提供・2022終了)**: 目標作成時に内容カテゴリを選ぶが、**そのあとの入力欄はどのカテゴリでも同じ**(How often / For how long / Best time)。公式ブログの例示は "run 3 times a week"。
  出典(公式): <https://blog.google/products-and-platforms/products/workspace/find-time-goals-google-calendar/> / 5カテゴリ名の列挙は二次情報のみ **[未検証]** <https://www.howtogeek.com/252269/how-to-set-a-goal-in-google-calendar-for-ios-and-android/> / 終了: <https://9to5google.com/2022/11/03/google-calendar-goals-official/>

→ Google Calendar Goals は **「内容カテゴリでタイプを切っても入力欄は分岐しない」ことの実例**であり、§4.1 の棄却根拠を市場側から補強する。

### 3.3 学習・運動系(本アプリに最も近い)

#### Studyplus — 本アプリと最も近い構成

- **今週の目標**: 「目標は**学習時間と学習量から選ぶ**ことが出来ます」。週の途中で達成度がパーセンテージ表示。月曜始まり週次固定、設定後は変更不可。
  出典(公式): <https://www.studyplus.jp/2796>
- **記録単位**: 公式ガイド原文「**学習時間、学習ページ、コメント**を記録することができます」。手動入力 / ストップウォッチ / タイマーの3方式。**公式に確認できた単位は「学習時間」と「学習ページ」の2つのみ**で、「問題数」「周回数」は非公式レビューにしか出てこない **[未検証]**
- **カウントダウン**: 出願締切日や入試日を登録すると当日までの日数がレポートページに表示され、定期通知される。
  出典(公式プレスリリース): <https://info.studyplus.co.jp/1320>
- **達成目標**: カテゴリ選択(資格 / 外国語など。英検・TOEIC・TOEFL が選択肢に含まれる)。数値の「目標スコア」入力欄の有無は公式ソースで確認できず **[未検証]**

→ 本アプリの「週間ゴール」+「本番目標」と1対1で対応する。**週間目標が「時間 or 量」の指標セレクタを持つ**点が §4.3 の統合判断の直接の先例。

#### スタディサプリ

週の目標学習時間はプリセット選択肢 + 手動数値入力。学習プラン(大学受験講座)は志望校 + 学力レベルから年間計画を立て、**「1週間に受けるべきコマ数」を逆算**する。
出典: <https://studysapuri.jp/info/guide/useful/record/> / <https://studysapuri.jp/course/entrance-exam/learning-plan/>

#### みんチャレ

チャレンジ期間は **7日 / 21日 / 90日 / 180日 / 365日 の5択**(必須)。期間終了後は「卒業」か「継続」。自由な日付入力ではなく有限の選択肢にしている点が特徴。数値目標値の入力欄の有無は公式ソースで確認できず **[未検証]**
出典: <https://minchalle.com/blog/minchalle-beginner>

#### コソ勉

**目標機能そのものが存在しない**。方眼紙を勉強時間分だけ塗る可視化のみ、記録単位は「時間 × 科目」。「目標を持たない学習ログ」という選択肢が実在することの証拠。
出典: <https://apps.apple.com/jp/app/id960983802>

#### Garmin Connect — `exam` と構造が同型の型がある

| 型 | フィールド | 構造 |
|---|---|---|
| Step Goal / Floors | 数値(+ Auto Goal) | 日次反復 |
| Intensity Minutes | 数値(分/週) | 週次反復 |
| **Race/Event goal** | **イベント日(必須、365日以内)+ goal time(任意)** | **単発の日付目標** |

出典: <https://support.garmin.com/en-US/?faq=4vH4ZpBjoq0kefON1bJOE6> / <https://support.garmin.com/en-US/?faq=N4Nl94Re0o0uCegvkrFZUA> — support.garmin.com はクライアントサイドレンダリングのため本文が取得できず、検索インデックスのスニペット由来 **[部分的に未検証]**(ページタイトルの一致は確認済み)

→ **Race/Event goal は「試験日 + 目標スコア」と完全に同型**であり、日々の積み上げ目標とは**別の型**として実装されている。進捗が日々のログから計算できず、当日に一度だけ結果が入るという性質が根本的に異なるため。**TOEIC スコア目標を累積型に押し込むと破綻する**という設計上の警告になる。

#### Strava — 軸の直積で表現する代替設計

公式原文: "You can set a goal of **distance, time, number of activities, or elevation**, and the timeframe in which you'd like to achieve it (**weekly, monthly, or annually/yearly**)." / "Choose a **sport type or a combined effort of multiple sport types**, the **time frame**, and the **metric**. Enter a **value** and save."
出典: <https://support.strava.com/hc/articles/6822535085709> / <https://support.strava.com/hc/en-us/articles/216918687>

**フィールド構成は sport type × metric(4択) × timeframe(3択) × value という直交4次元の組み合わせ**。「型を列挙する」のではなく「型を軸の直積で表現する」という別アプローチ。

また **ユーザーが作れる Goals は反復型のみ**で、単発・固定期間の累積目標は **Challenges** という別機能(Strava 主催、ユーザー作成不可)。
出典: <https://support.strava.com/en-us/articles/15401916-strava-challenges>

#### Apple Fitness — 一時オーバーライドと恒久変更の分離

Move(active calories)/ Exercise(minutes)/ Stand(hours per day、車椅子ユーザーは Roll)の3リング。UI 上で **"Adjust Goal for Today"(今日限りの一時変更)** と **"Change Daily Goal"(恒久変更)** が明確に分かれており、さらに曜日ごとに別の値を設定できる。毎週月曜に前週の実績が通知され翌週の目標を調整できる。
出典: <https://support.apple.com/guide/iphone/adjust-your-activity-ring-goals-iph9a08e004e/ios> / <https://support.apple.com/guide/watch/adjust-your-activity-ring-goals-apd29b30023c/watchos>

#### Fitbit / MyFitnessPal — 目標値を「逆算する」モデル

- Fitbit: Active Zone Minutes は**週次**目標、デフォルト 150 AZM/week。<https://help.fitbit.com/articles/en_US/Help_article/1955.htm>
- MyFitnessPal: 目標体重を入力すると **target date はシステム側が自動計算**("In order to promote weight change, we calculate a target date…")。プロフィール + 週あたりペース希望 → 目標値を自動算出するモデル。
  出典: <https://support.myfitnesspal.com/hc/en-us/articles/360032271632-Where-can-I-find-my-target-date> / <https://support.myfitnesspal.com/hc/en-us/articles/360032625391-How-does-MyFitnessPal-calculate-my-initial-goals>

#### Anki — 目標ではなく「日次上限」

Deck Options の Daily Limits: **New Cards/Day** と **Maximum Reviews/Day**。学習アプリでは目標が**下限(ノルマ)ではなく上限(キャップ)**として実装される例。
出典: <https://docs.ankiweb.net/deck-options.html>

#### TOEIC の得点仕様(`exam` のバリデーション根拠)

TOEIC Listening & Reading Test の結果は合否ではなく、リスニング 5〜495点、リーディング 5〜495点、トータル 10〜990点を**5点刻み**のスコアで表示する。
出典(公式・IIBC): <https://www.iibc-global.org/toeic/test/lr/guide04.html>

### 3.4 構造アーキタイプの出現頻度(26製品からの集計)

| # | アーキタイプ | 構造 | 実装数 | 代表例 |
|---|---|---|---|---|
| **A** | 期間反復・二値(習慣/ストリーク) | 期間ごとに「やった/やらない」 | **10** | Strides HABIT, Way of Life, Habitica Habits/Dailies, Streaks, Loop, Duolingo Streak, みんチャレ |
| **B** | **期間反復・数値ノルマ** | 「日/週/月あたり N 単位」。期間が来るとリセット | **15**(最多) | Todoist, Duolingo Daily Goal, Apple 3リング, Garmin, Fitbit AZM, Strava, **Studyplus 今週の目標**, スタディサプリ |
| **C** | 期限つき累積(締切までに合計 N) | 開始値→目標値、期日あり | **11** | Strides TARGET, Beeminder Odometer, ClickUp Number/Currency, GoalsOnTrack, Lifetick numerical/financial |
| **D** | マイルストーン/チェックリスト | サブ項目の完了率 | **8** | Strides PROJECT, Goalscape, ClickUp Task, Habitica To Do's, Lifetick Tasks |
| **E** | 平均値の維持(移動平均) | 累積でなく「水準を保つ」 | **1**(極めて稀) | Strides AVERAGE のみ |
| **F** | **単発の日付イベント + 目標値** | 特定日のイベントに対する目標。当日に一度だけ結果が入る | **3** | **Garmin Race/Event**, Strava Segment goal, Studyplus カウントダウン |
| **G** | 単発の二値(done/not-done) | 数値なしの1回限り | **2** | ClickUp True/False, Lifetick binary |
| **H** | 記述型(数値を持たない) | 到達を文章で定義 | **1** | Lifetick descriptive |
| — | 汎用フォールバック | — | **3** | Beeminder **Custom**, Strides 自作トラッカー, Google Cal Custom |

---

## 4. 統合の論理 — なぜこの5つに落ちたか

### 4.1 棄却: 内容領域による分類(カテゴリ型タイプ)

**候補**: Ford & Nichols の6領域、Little の academic/health/leisure…、Emmons の12カテゴリ、Chulef の30クラスタ、Talevich の Meaning/Communion/Agency、Grouzet の11 goal contents、Lifetick の Core Value、Google Calendar Goals の5カテゴリ。

**棄却理由**:
1. **文献側**: Austin & Vancouver (1996) は構造次元と内容分類を明確に別レイヤーとして扱っている(§2.1)。内容分類は無数にあるが、文献間で収束しているのは「interpersonal vs intrapersonal」程度で、本アプリの目標は全件 academic / Task–Mastery / Intellectual Growth に落ちるので**分類しても1値に潰れる**
2. **市場側**: 内容カテゴリを選んでも入力欄が分岐しない実例がある(Google Calendar Goals は5カテゴリすべてで How often / For how long / Best time)。<https://blog.google/products-and-platforms/products/workspace/find-time-goals-google-calendar/>
3. **ドメイン側**: `CONTEXT.md`「目標タイプ」の _Avoid_ が「ジャンル」「カテゴリとの混用」を明示的に禁じている。記録側の「カテゴリ」(TOEIC対策 / 多聴 / 多読 / 英会話 / その他)が既にこの軸を担っている

なお Grouzet の intrinsic–extrinsic(「なぜやるか」)は、フォームのバリアントではなく**任意のメモ欄**に留めるのが妥当(推測)。

### 4.2 採用: `exam` を独立タイプにする(アーキタイプ F)

実装数は3と少ないが、以下の3点から必須と判断した。

1. **性質が構造的に違う**: 進捗が日々のログから計算できず、当日に一度だけ結果が入る。累積型(C)に押し込むと進捗表示が破綻する
2. **同型の先行実装がある**: Garmin の Race/Event goal(イベント日 + goal time)は「試験日 + 目標スコア」と完全に同型で、日々の積み上げ目標とは別型として実装されている <https://support.garmin.com/en-US/?faq=N4Nl94Re0o0uCegvkrFZUA> **[部分的に未検証]**
3. **ドメインが要求している**: `CONTEXT.md`「本番目標」がこのアプリの中心概念であり、現行 `examGoals` が既に存在する

ただし Williamson et al. (2022) の「long-term goals 単独は d = −0.08(非有意)」および Bandura & Schunk (1981) の「distal goals had no demonstrable effects」から、**`exam` は動機づけの主軸にしてはいけない**。`CONTEXT.md`「本番目標」の「アプリ内のフィードバックには使わず、カウントダウンの軸になる」という既存定義は、この実証結果と一致している。

### 4.3 統合: A(習慣・二値)と B(期間反復・数値)を1タイプ `pace` に畳んだ

市場では**別タイプにしている製品(Strides: Habit vs Average、Habitica: Habits vs Dailies、ClickUp: True/False vs Number)**と、**指標セレクタで1タイプに畳んでいる製品(Strava、Studyplus、Todoist、スタディサプリ)**が拮抗する。

**畳む側を採った理由**:
1. **ドメイン**: `CONTEXT.md`「週間ゴール」の _Avoid_ が「**習慣ゴールを別概念にすること**」を明示的に禁じている。この用語集は本アプリのドメイン定義であり、外部製品の一般解より優先する
2. **同じ文脈の先例**: Studyplus が「学習時間 / 学習量」のセレクタ1つで両方を吸収している <https://www.studyplus.jp/2796>
3. **上位グルーピングでは同じ側**: Strides 自身が Habit と Average を同じ **Repeating** レポートにまとめている <https://apps.apple.com/us/app/strides-habit-tracker-goals/id672401817>
4. 実質2ユーザーのアプリでタイプ数を増やすコストが高い(推測)

結果、`pace` は **集計単位(週/月) × 指標(分数/実施日数) × 目標値**の3欄構成になる。指標「実施日数」が二値習慣(A)を、「分数」が現行 `weeklyGoals.minutes`(B)を吸収する。

### 4.4 棄却した候補と理由

| 棄却候補 | 対応する根拠 | 棄却理由 |
|---|---|---|
| **マイルストーン/チェックリスト型**(D、8製品) | Strides PROJECT <https://www.stridesapp.com/>、ClickUp Task、Little の "stage of implementation" <https://ncbi.nlm.nih.gov/pmc/articles/PMC10204596> | 「目標量 + 単位 + 期限」を持つ `volume` にほぼ吸収できる(Beeminder Odometer が実際にこの形 <https://help.beeminder.com/article/68-odometer-goals>)。ADR 0003 が目標の階層ツリーを禁じており、`CONTEXT.md`「記録」「具体的手順」が既にステップを担う。**ただし実装数8は無視できないため、残り1枠の第1候補として保留**(§4.5) |
| **平均維持型**(E、1製品) | Strides AVERAGE のみ | 26製品中1つしか実装していない。学習ログでの用途(「1日平均◯時間を維持」)は `pace`(週次ノルマ)で代替できる |
| **削減型**(Do Less / Whittle Down、3製品) | Beeminder <https://help.beeminder.com/article/67-do-less-goals>、Elliot の avoidance 軸 <https://pubmed.ncbi.nlm.nih.gov/11300582/> | 学習ログに「減らす対象」がほぼ無い。本アプリの記録モデル(確定した分数の合計)と噛み合わない。残り1枠の第2候補 |
| **単発二値型**(G、2製品) | ClickUp True/False、Lifetick binary | 「目標の内容」+ 完了フラグだけなら `other` で足りる |
| **if-then / 実装意図型** | Gollwitzer (1999) の goal intention vs implementation intention <https://www.prospectivepsych.org/sites/default/files/pictures/Gollwitzer_Implementation-intentions-1999.pdf>、d = .65 <https://kops.uni-konstanz.de/handle/123456789/10973> | 効果は大きいが、Gollwitzer 自身が implementation intention を goal intention に**従属する別オブジェクト**と定義している。本アプリでは `obstaclePlans`(障害プラン)として**既に独立概念で実装済み**で、目標タイプにすると二重定義になる |
| **他者比較型**(other-based goal) | Elliot 3×2 <https://centaur.reading.ac.uk/34828/>、Williamson 2022 の "normative comparisons do not improve performance" <https://www.tandfonline.com/doi/full/10.1080/1750984X.2022.2116723> | 所有者1アカウント(`CONTEXT.md`「所有者」)で比較相手が存在しない。かつメタ分析上も効果がない |
| **近接サブゴール型**(親目標への従属) | Bandura & Schunk 1981、Latham & Seijts 1999 | 「distal を proximal に分解する」必要性は実証されているが、本アプリではその役割を `pace` と `記録`/`プリセット` が担う。親子リレーションを目標に持たせると ADR 0003 が禁じる目標ツリーになる |
| **模試スコア推移型** | — | `CONTEXT.md` 冒頭が「模試のスコア・分析はこのアプリの対象外」、「本番目標」の _Avoid_ も「模試スコアの系列をアプリに入れること」を禁止 |
| **通貨・金額型** | ClickUp Currency、Lifetick financial | 学習ログに無関係 |
| **OKR / Key Result ツリー** | Asana Goals <https://help.asana.com/s/article/how-to-set-a-progress-source-for-your-goals> ほか | ADR 0003 で明示的に棄却済み |
| **軸の直積による表現**(型を列挙しない) | Strava の sport × metric × timeframe × value <https://support.strava.com/hc/articles/6822535085709> | 組み合わせ爆発は避けられるが、型ごとに違う UI と進捗計算を出し分けにくい。本課題が「タイプごとに固定フィールドセット」を要求しているため不採用。ただし `pace` の内部は実質この形になっている |

### 4.5 なぜ6ではなく5にしたか

上限は6だが、**5に留めて1枠を空けたまま残す**ことを推奨する。

- Beeminder は6タイプ + Custom だが、無料の既定は2タイプのみ <https://help.beeminder.com/article/52-why-cant-i-create-a-do-less-odometer-whittle-down>
- Strides は100万人規模の利用者で4タイプ <https://www.stridesapp.com/>
- Todoist は2フィールドだけ、コソ勉は目標機能ゼロ <https://apps.apple.com/jp/app/id960983802>
- 本アプリは実質2ユーザーで、現時点で実在する目標は `examGoals` 1件と `weeklyGoals` のみ。5タイプは既に十分な先取り
- 空き枠の第1候補は**マイルストーン型**(実装数8)、第2候補は**削減型**(実装数3)

### 4.6 各タイプの採用根拠の要約

| タイプ | 学術的根拠 | 市場的根拠(アーキタイプ / 実装数) |
|---|---|---|
| `exam` | 遠位の成果目標。ただし単独では効かない(Bandura & Schunk 1981 / Williamson 2022 long-term d = −0.08)ため、フィードバック源にしない<br><https://uploads-ssl.webflow.com/59faaf5b01b9500001e95457/5bc552d85141987915dab842_Bandura%20&%20Schunk,%201981.pdf> / <https://www.tandfonline.com/doi/full/10.1080/1750984X.2022.2116723> | **F / 3**。Garmin Race/Event が同型 <https://support.garmin.com/en-US/?faq=N4Nl94Re0o0uCegvkrFZUA>、Studyplus カウントダウン <https://info.studyplus.co.jp/1320> |
| `pace` | process goal が最大効果(d ≥ 0.44、performance より有意に大 Q = 4.77, p = .029)。short-term が効く。習慣形成の反復(Lally 2010)<br><https://www.tandfonline.com/doi/full/10.1080/1750984X.2022.2116723> / <https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674> | **A + B / 25**(最多)。Studyplus 今週の目標 <https://www.studyplus.jp/2796>、Strava、Todoist、Apple 3リング |
| `volume` | specificity + temporal range(Austin & Vancouver の6次元 (c)(d))<br><http://david-dai-d5le.squarespace.com/s/AustinVancouver1996.pdf> | **C / 11**。Beeminder Odometer <https://help.beeminder.com/article/68-odometer-goals>、Strides TARGET、ClickUp Number |
| `mastery` | 学習目標 > 成果目標(新奇・複雑課題での tunnel vision 回避、metacognition 促進)+ 3×2 の task-based 分離<br><https://home.ubalt.edu/tmitch/642/articles%20syllabus/locke%20latham%20new%20dir%20gs%20curr%20dir%20psy%20sci%202006.pdf> / <https://centaur.reading.ac.uk/34828/> | **H / 1**。Lifetick の descriptive type のみ <https://lifetick.com/>。**5タイプ中もっとも市場的根拠が弱い** |
| `other` | — | フォールバック / 3。Beeminder Custom <https://help.beeminder.com/article/97-custom-goals> |

---

## 5. 未解決点・実装への注意

### 5.1 設計上の未解決点

1. **`mastery` は `other` に統合すべきか**
   学術的根拠(Locke & Latham の learning goal、Elliot の task-based)は強いが、市場的根拠は Lifetick の descriptive type 1件のみ。差別化しているのは「到達したと判断する基準」という必須フィールド1つだけで、これが無ければ `other` と同型になる。**この必須フィールドを外すなら `mastery` は廃止して `other` に畳むべき**。

2. **目標は何件持てるのか**
   `CONTEXT.md`「本番目標」は「1件だけ持つ」と定めているが、これが `exam` タイプの制約なのか目標全体の制約なのかが未定義。`pace` は現行 `weeklyGoals` が週ごとに1行、`volume` / `mastery` / `other` は複数持てるのが自然。**タイプごとに件数制約が違う**設計になる可能性が高く、用語集の更新が要る。

3. **参照点(absolute / intrapersonal)をフィールドにするか**
   Elliot 3×2 は「絶対基準」と「自己過去との比較」を別構成概念として分離しており(<https://centaur.reading.ac.uk/34828/>)、ClickUp と GoalsOnTrack は開始値と目標値のペア(range)を持つ(<https://help.clickup.com/hc/en-us/articles/6325733579671-Create-a-Goal>)。本提案では `volume` の「開始時点の量」だけが任意フィールドとしてこれに対応する。`pace` にも「先週比 +N分」のような相対指定を許すかは未決。

4. **`volume` の進捗をどう計算するか — フィードバック必須の要件**
   Locke & Latham (2002) は「現在値が取れないゴールは機能しない」と明示する(30本の木の例、<https://med.stanford.edu/content/dam/sm/s-spire/documents/PD.locke-and-latham-retrospective_Paper.pdf>)。単位が「分」なら `rows` の確定分数から自動集計できるが、**「ページ」「問題」「冊」は現行スキーマに記録項目が無い**(`rows` は `minutes` のみ)。自動集計できるのは「分」だけで、他は手入力の現在値が要る(Beeminder Odometer 方式)。
   選択肢は (a) `volume` の単位を「分」だけに絞る、(b) `rows` にページ数・問題数を足す(Studyplus は「学習時間」と「学習ページ」の2単位を持つ <https://www.studyplus.jp/2796>)、(c) 手入力の現在値フィールドを足す。**未決**。

5. **`pace` と現行 `weeklyGoals` の関係**
   現行 `weeklyGoals` は「週ごとに1行(`weekStartJst` + `minutes`)」という**実績記録寄り**のモデルで、「目標定義1件が毎週繰り返される」モデルではない。`pace` を「定義」として持つなら、週ごとの行は定義から導出される値になり、マイグレーションが必要。**どちらのモデルにするかは未決**。

6. **未達の扱い — ストリークをゼロにしない**
   Lally et al. (2010) は "**Missing one opportunity to perform the behaviour did not materially affect the habit formation process**" と報告している(<https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674>)。したがって `pace` を1週落としたときに連続記録をゼロリセットする設計は実証に反する。Todoist の Vacation Mode(<https://www.todoist.com/help/articles/turn-on-or-off-vacation-mode-in-todoist-pAQmRp>)や Way of Life の Skip 状態(<https://wayoflifeapp.com/>)が先例。**現行の `weeklyTrend` / ストリーク上限12週(`WEEKLY_TREND_WEEKS`)の扱いを見直す必要がある**。

7. **`exam` 単独の状態を許すか**
   Bandura & Schunk (1981) の "Distal goals had no demonstrable effects" と Williamson et al. (2022) の long-term d = −0.08 から、`exam` だけが設定されて `pace` が無い状態は「未完成」として扱う根拠がある。UI で `pace` の設定を促すか、`exam` から必要ペースを逆算して提示するか(MyFitnessPal <https://support.myfitnesspal.com/hc/en-us/articles/360032625391-How-does-MyFitnessPal-calculate-my-initial-goals> やスタディサプリ <https://studysapuri.jp/course/entrance-exam/learning-plan/> の方式)。**未決**。

8. **デフォルト値は控えめにする**
   Duolingo の公式データ: 2日連続で使ったのにストリークが無いユーザーの約40%が最高ティア「intense」設定 <https://blog.duolingo.com/improving-the-streak/>。`pace` の初期値を高く置かないこと。

9. **「今日だけ / 今週だけ」の一時オーバーライド**
   Apple Fitness は "Adjust Goal for Today"(一時)と "Change Daily Goal"(恒久)を UI 上で分離している <https://support.apple.com/guide/iphone/adjust-your-activity-ring-goals-iph9a08e004e/ios>。現行 `weeklyGoals` は週ごとの行なので実質すべてが一時値になっている。`pace` を定義モデルに変えるなら、この2モードの分離が要る。

10. **`pace` の期間を自由入力にするか選択肢にするか**
    みんチャレは 7 / 21 / 90 / 180 / 365日 の5択に絞っている <https://minchalle.com/blog/minchalle-beginner>。本提案は集計単位を「週 / 月」の2択にしており、これは選択肢方式に近い。

11. **`pace` の指標「実施日数」の判定**
    「その日に確定した記録が1件以上ある日」を1日と数えるのが自然だが、`CONTEXT.md`「学習量」は分数合計しか定義していない。用語追加が要る。

12. **Google Calendar Goals は2022年に廃止されている**(<https://9to5google.com/2022/11/03/google-calendar-goals-official/>)。本書では反例としてのみ引用しており、機能設計の参照先にはしていない。

### 5.2 実装上の注意(本リポジトリ固有)

- **discriminated union のバリデータ**: Convex 側は `v.union(v.object({ type: v.literal("exam"), ... }), ...)` の形で `convex/lib/validators.ts` に置く。タイプ値のタプルは `convex/lib/domain.ts` に `as const satisfies readonly string[]` で定義し、Convex validator・Valibot スキーマ・UI の選択肢がすべてそこを参照する(CVX-16)。**文字列 union を各所で再定義しない**
- **CVX-14**: `exam` の「本番日までの残り日数」は現行 `getExam` が `daysRemaining` を返している。クエリ内で `Date.now()` を使わず `dateJst` を引数で受ける方式を維持すること
- **CVX-13 / CVX-10 / CVX-11**: 新テーブル(`goals` に統合するか、タイプ別テーブルにするか)を決めたら `by_owner` 系のインデックスを引いた上で `.collect()` する。`.filter` は使わない
- **タイプ変更の扱い**: 目標のタイプを後から変えると固有フィールドが捨てられる。UI で警告するか、そもそも変更不可にするかを決める必要がある。Beeminder は「設定変更で即座に derail することがある」と警告している(<https://help.beeminder.com/article/97-custom-goals>)。Studyplus の今週の目標も設定後は変更不可(<https://www.studyplus.jp/2796>)
- **`exam` のバリデーション**: スコアは 10〜990、5の倍数、下限 ≤ 上限(<https://www.iibc-global.org/toeic/test/lr/guide04.html>)。現行 `examGoals` は `v.number()` のみで制約が無い
- **共通フィールド「目標の内容」**: `CONTEXT.md`「具体的手順」の規則(空・空白のみ不可、1文字以上)を流用し、既存の `obstaclePlans.thenText` / `rows.content` と同じバリデータを共有すべき
- **既存データの移行**: `examGoals` → `exam`、`weeklyGoals` → `pace`。所有者は1人、行数は数十なので一括移行で足りる(推測: 現行データ量からの見積もり)

### 5.3 本書の限界(未検証項目一覧)

学術:
- **Emmons の12コーディングカテゴリの全リスト** — Emmons (2003) の全文 PDF で「12 thematic content categories (Emmons, 1999, app. B)」という記述と4カテゴリ(Intimacy / Spirituality / Generativity / Power)の定義のみ一次確認。残り8つの名称と各カテゴリの出現百分率は二次的なウェブ要約由来 **[未検証]**。原典 Emmons (1999) *The Psychology of Ultimate Concerns* Appendix B が必要
- **Chulef et al. (2001) の30クラスタの個別名称** — ペイウォールにより未取得。最上位の interpersonal/intrapersonal 二分のみ一次確認
- **Elliot & McGregor (2001) の4構成概念の逐語定義** — 書誌は Crossref 照合済み、構成概念名も複数の査読済み二次文献で一致確認。原論文本文からの逐語引用は未取得
- **Ford & Nichols (1987/1992) の原典本文** — Austin & Vancouver (1996) Table 2 として逐語再録されたものを使用。原典そのものは未参照
- **Kingston & Hardy (1997) の効果量** — 検索要約に出た数値を原典・メタ分析本文のいずれからも確認できず、本書では**引用していない**。「process > performance > (outcome 非有意)」という順序自体は Williamson et al. (2022) 本文から一次確認済み
- **stickK 論文(CHI '21)のトピック別内訳** — PDF 本文の抽出に失敗、抄録のみ確認

市場:
- Strides HABIT の「X times per day/week/month + goal streak」の正確な文言(ヘルプセンターがアプリ内に移行済み)
- GoalsOnTrack の Habit モジュール入力項目(公式サポート記事が HTTP 500)
- Lifetick のゴール作成フォームの正確なフィールド名
- Habitica 各タスク型の完全なフィールド一覧(公式ドキュメントが SPA で取得不可)
- **Garmin の UI 上の正確なフィールドラベル、体重目標の期日フィールド有無**(support.garmin.com が JS レンダリング。検索インデックスのスニペットのみ。ページタイトルの一致は確認済み)
- **Duolingo の各ティアの正確な XP 値**(support.duolingo.com が JS レンダリング。二次情報が相互に矛盾。ティア名 Casual / Regular / Serious / Intense の存在のみ確認)。**本書では XP 値を一切引用していない**
- **Studyplus の記録単位「問題数」「周回数」の存在**(公式確認できたのは学習時間・学習ページのみ)
- Studyplus 達成目標カテゴリ内の数値「目標スコア」入力欄の有無
- みんチャレの数値目標値の入力欄の有無
- Google Calendar Goals の5カテゴリ名(公式ブログに列挙が無く二次情報のみ)
- Monday.com(公式ヘルプ記事 URL が 404)
- Goodreads Reading Challenge(公式ヘルプが JS レンダリングで取得不可。本書では引用していない)
