# 短期成果ゴール(proximal outcome goal)の是非 — 一次研究からの導出

対象: 「頻度型プロセスゴール(週 n 日 × 1日最低 m 分)を廃止し、OKR 的な短期成果ゴール(いつまでに何ができているか)へ置き換える」という所有者の提案。
関連: [weekly-goal-redesign.md](weekly-goal-redesign.md) / [goal-type-taxonomy.md](goal-type-taxonomy.md) / [ADR-0003](../adr/0003-process-goals-not-okr.md) / [ADR-0005](../adr/0005-goal-types-by-structure.md)
調査日: 2026-08-17。効果量はすべて出典元の報告値。推測は「推測」と明記する。

---

## 1. 要約

### 判定: **併用(頻度型を維持しつつ短期成果ゴールを追加)。置換は研究的に支持されない。**

| 選択肢 | 判定 | 一行根拠 |
|---|---|---|
| **置換**(頻度型を廃止して短期成果ゴールに一本化) | **✗ 強く反対** | outcome goal 単独の成果効果は d = 0.09(非有意)、process goal は d = 1.36。最も効く条件を捨てて最も効かない条件に置き換える操作になる(Williamson et al. 2022) |
| **併用**(頻度型を判定軸として維持 + 短期成果ゴールを別オブジェクトで追加) | **◎ 支持** | Zimmerman & Kitsantas (1997, 1999) の **shifting goals**:「process → outcome」条件が process 単独を上回り、process 単独が outcome 単独を上回る。3条件の順序が実験で確認されている。併用はこの最良条件の実装形 |
| **置換しない**(現状維持、短期成果ゴールを追加もしない) | **○ 次善** | 害はないが、shifting の上積み分(および `mastery` タイプの既存枠)を取り逃がす |

### この判定の要点は「順序」であって「有無」ではない

所有者の提案は方向としては研究に裏付けがある。ただし裏付けているのは **shifting**(未習熟のあいだは process、自動化してから outcome)であって、**置換**ではない。Zimmerman & Kitsantas の実験デザインそのものが「process 単独 > outcome 単独」を含んでおり、置換は実験内で**明示的に劣ると示された条件**を選ぶことになる。

### 4つの但し書き

1. **フィードバック軸を渡してはならない。** ストリーク・達成判定・「今週どうか」の主計器は `pace`(頻度型)のまま。短期成果ゴールは**判定に参加しない別オブジェクト**として置く(§2, §6)。
2. **自己設定期限は均等配置締切に劣る。** Ariely & Wertenbroch (2002) は「均等配置 > 自己設定 > 最終締切のみ」を実験で示した。週境界は既に均等配置締切であり、これを自己設定期限に置き換えるのは**下方向の交換**(§4)。
3. **細分化のチェーンにしてはならない。** Rai et al. (2023) の実測では最も細かい「毎週4時間」条件は非ゼロ commit 者の投入分数を有意に増やさず、より粗く柔軟な「隔週8時間」が有意かつ durable だった。加えて達成直後の motivation 低下(post-reward resetting)が実測されている(§5)。同時進行1〜2件に絞る。
4. **「できるようになった」の自己判定は初中級者で最も歪む。** Kruger & Dunning (1999) の下位四分位は実測12パーセンタイルを62パーセンタイルと自己評価した。語学自己評価と実測の相関は r = .466 だが、**基準参照(criterion-referenced)のルーブリックを添えると .49 に上がる**(Li & Zhang 2021)。→ 自由記述の「〜ができる」ではなく、**CEFR 型 can-do 記述(条件 + 行動 + 基準)+ 自動集計の併記**が必須(§6)。

### 呼称の推奨: **「チェックポイント」**。OKR / KR は採らない

既存の `mastery` タイプ(`criterion` + 任意 `deadline`)が既にこの構造を持っている。**新タイプを増やすのではなく `mastery` を短期チェックポイントとして仕上げる**のが最小コストの実装(§7)。

### 既存リサーチとの関係: **矛盾しない。追加である**

`weekly-goal-redesign.md` §3 は「アウトプット/成果量ゴール ✗ 不適」と判定したが、その検討対象は**模試スコア等をフィードバック軸に据える案**だった。本書が支持するのは「フィードバック軸に触れない、非数値の到達基準チェックポイントを併置する案」で、対象が異なる。また `goal-type-taxonomy.md` §4.4 が棄却した「近接サブゴール型」は**親目標への従属リレーション(=目標ツリー)を持つ型**であり、本書の提案は親子関係を持たない独立オブジェクトなので棄却理由に該当しない。ADR-0003 / ADR-0005 の判断はいずれも維持される(§8)。

---

## 2. Proximal vs distal — 近接性は「効く」が、それは成果目標の擁護ではない

### 2.1 一次エビデンス

| # | 主張 | 一次ソース | 数値・原文 |
|---|---|---|---|
| P1 | 近接サブゴールのみが自己主導学習・習熟・自己効力感・内発的興味を高めた。遠位目標は効果が実証されなかった | Bandura, A., & Schunk, D. H. (1981). *Cultivating competence, self-efficacy, and intrinsic interest through proximal self-motivation.* Journal of Personality and Social Psychology, 41(3), 586–598. — [全文PDF](https://uploads-ssl.webflow.com/59faaf5b01b9500001e95457/5bc552d85141987915dab842_Bandura%20&%20Schunk,%201981.pdf) | 算数に強い苦手意識を持つ児童。原文: "Under proximal subgoals, children progressed rapidly in self-directed learning, achieved substantial mastery of mathematical operations, and developed a sense of personal efficacy and intrinsic interest in arithmetic activities that initially held little attraction for them." / "Distal goals had no demonstrable effects." |
| P2 | 遠位目標は「進捗の目印」を提供できないため自己効力感を育てられない、というのが機序 | 同上 | 原文: "Proximal subgoals provide immediate incentives and guides for performance, whereas **distal goals are too far removed in time to effectively mobilize effort or to direct what one does in the here and now.**" / "**By contrast, distal goals are too far removed in time to provide sufficiently clear markers of progress along the way to ensure a growing sense of self-efficacy.**" |
| P3 | 近接性は**自己評価の較正(calibration)そのものを改善する** | 同上 | 原文: "goal proximity fostered **veridical self-knowledge of capabilities** as reflected in high congruence between judgments of mathematical self-efficacy and subsequent mathematical performance." |
| P4 | 長期目標のみは成果を改善しない。短期、および短期+長期の組み合わせは改善する | Williamson, O., Swann, C., Bennett, K. J. M., Bird, M. D., Goddard, S. G., Schweickle, M. J., & Jackman, P. C. (2022/2024). *The performance and psychological effects of goal setting in sport: A systematic review and meta-analysis.* International Review of Sport and Exercise Psychology, 17(2), 1050–1078. DOI: [10.1080/1750984X.2022.2116723](https://doi.org/10.1080/1750984X.2022.2116723) | 17,841件をスクリーニング、27件が適格。short-term および short+long は d ≥ 0.43 で有意。**long-term のみは d = −0.08 で非有意** |

### 2.2 読み違えてはいけない点

Bandura & Schunk の実験で操作されたのは**目標の時間的近接性**であって、**目標が process 型か outcome 型か**ではない。近接条件の内容は「1セッションあたり6ページ分の教材を終える」という**分量ベースの proximal subgoal** であり、「〜ができるようになる」という成果判定ではない。

したがって P1〜P4 は「短期の目標を置け」を支持するが、「短期の**成果**目標に置き換えろ」は支持しない。本アプリでは**週境界が既にこの近接単位を担っている**(`weekly-goal-redesign.md` §4.1 と同結論)。

P3 は逆に短期成果ゴール導入時の設計制約になる: 自己効力感の較正が良くなるのは**近接サブゴールを実際にこなしている最中**であって、遠い到達基準を眺めているときではない。つまり **`pace` を回し続けていること自体が、`mastery` の自己判定の信頼性を支える前提条件**になる(§5.3 と接続)。

---

## 3. Process vs outcome — 未習得の複雑スキルでの効果差と、shifting による例外

### 3.1 効果量の実測差

Williamson et al. (2022) のメタ分析 abstract 原文(DOI: [10.1080/1750984X.2022.2116723](https://doi.org/10.1080/1750984X.2022.2116723)):

> "**Process goals had the largest effect on performance (d = 1.36) compared to performance goals (d = 0.44) and outcome goals (d = 0.09).** No significant difference in performance was found between specific (d = 0.37) and non-specific goals (d = 0.72). **Process goals also had large effects on self-efficacy (d = 1.11)**, whereas **studies guided by self-regulation theory (k = 5) produced the greatest performance enhancements (d = 1.53).**"

最終版(2024, 17(2))の abstract は同じ結果を有意性の言葉で述べている(`goal-type-taxonomy.md` §2.3(a) に逐語引用済み):

> "Process goals and performance goals produced significant improvements in performance (d's ≥ 0.44), but process goals elicited significantly greater improvements than performance goals (Q = 4.77, p = .029). Conversely, **no significant performance improvements were found by setting mastery, outcome, or ego goals.**"

**置換案への直接の反証**: d = 1.36 の条件を捨てて d = 0.09 の条件に替える操作になる。

> **用語の注意**: ここで非有意とされた "mastery goals" は**達成目標理論の mastery orientation**(課題基準の有能さ志向)であって、本アプリの `mastery` **タイプ**(= Seijts & Latham の learning goal に近い「到達基準を書く非数値ゴール」)とは別構成概念。同じ英単語だが別物なので、`mastery` タイプの根拠に Williamson の mastery 行を使ってはならない。`mastery` タイプの根拠は Seijts & Latham (2001) / Locke & Latham (2006) 側にある(`goal-type-taxonomy.md` §2.3(c))。

### 3.2 shifting goals — 「process → outcome」が最良条件

この論点の中心。Zimmerman & Kitsantas は **process 単独 / outcome 単独 / shifting(process から始めて自動化後に outcome へ移行)** を直接比較した。

| # | 主張 | 一次ソース | 数値・原文 |
|---|---|---|---|
| S1 | 運動スキル(ダーツ投げ)で、shifting 条件が process 単独を上回り、process 単独が outcome 単独を上回った | Zimmerman, B. J., & Kitsantas, A. (1997). *Developmental phases in self-regulation: Shifting from process goals to outcome goals.* Journal of Educational Psychology, 89(1), 29–36. DOI: [10.1037/0022-0663.89.1.29](https://doi.org/10.1037/0022-0663.89.1.29) — [ERIC EJ543828](https://eric.ed.gov/?id=EJ543828) | 高校生女子 N = 90。ERIC 抄録原文: "Studied the effects of goal setting and self-monitoring during self-regulated practice on the acquisition of a complex motor skill with 90 high school girls. Results indicate that **girls who shifted goals developmentally from process to outcome goals surpassed those who had only process goals.**" 仮説はポストテストのスキル・self-reactions・自己効力感・内発的興味の4指標すべてで「shifting > process 単独 > outcome 単独」で、**全仮説が支持された** |
| S2 | 同じ順序が**認知的・学業的スキル(作文推敲)でも再現**された | Zimmerman, B. J., & Kitsantas, A. (1999). *Acquiring writing revision skill: Shifting from process to outcome self-regulatory goals.* Journal of Educational Psychology, 91(2), 241–250. DOI: [10.1037/0022-0663.91.2.241](https://doi.org/10.1037/0022-0663.91.2.241) | 推敲スキル・self-reactions・自己効力感・内発的興味のいずれでも、process → outcome へ移行した参加者が outcome に焦点を当てた参加者を上回った。**運動スキル限定の知見ではない**ことを示す点が本アプリにとって重要 |
| S3 | 自己調整理論(= shifting パラダイム)に基づく研究群が、メタ分析中で最大の成果改善を出した | Williamson et al. (2022), 上掲 | "studies guided by **self-regulation theory (k = 5) produced the greatest performance enhancements (d = 1.53)**" |
| S4 | 自己効力感でも同じ序列。shifting > transformed > process > outcome > 統制 | Williamson et al. (2022) による Zimmerman & Kitsantas (1997) の記述 | shifting vs transformed d = 1.00、transformed vs process d = 1.14、process vs outcome(performance)d = 1.38、統制 vs shifting d = −4.02、統制 vs transformed d = −4.59、統制 vs process d = −3.08 |

**移行のトリガーは「スキルの自動化」。** shifting goal は定義上「動作が自動化された時点で outcome goal に切り替わる process goal」であり、transformed goal は「outcome 情報に対して方略を調整し直す自己反応」。つまり**時期尚早な outcome への切り替えは、shifting の条件を満たさない**。

### 3.3 TOEIC Reading 初中級者への適用

- ADR-0003 の「TOEIC Reading は未習の複雑課題」という認識は維持される。Locke & Latham (2006) は新奇・複雑課題での outcome 目標が "tunnel vision" を招くとし、Wood et al. (1987) は目標困難度効果が最複雑課題で d = .48 まで減衰することを示した(`weekly-goal-redesign.md` §2.1 W3)。
- したがって**現時点の所有者は shifting の「前半」にいる**。process(頻度)を主軸に据えたまま、outcome チェックポイントを**併置**するのが S1〜S4 の示す最良条件。
- **置換は shifting の「前半を飛ばす」操作**であり、実験内で最下位だった outcome 単独条件に相当する。

---

## 4. 自己設定期限は均等配置の外部締切に劣る

Ariely & Wertenbroch (2002) の結論は「自己設定締切は有効だが、均等配置の外部締切には及ばない」。本文から逐語確認した記述:

| # | 記述(原文) | 出典 |
|---|---|---|
| A1 | "The effectiveness of the constraints themselves depended on the type of constraint—**self-imposed deadlines improved performance, but not to the same degree as evenly spaced deadlines.**" | Ariely, D., & Wertenbroch, K. (2002). *Procrastination, deadlines, and performance: Self-control by precommitment.* Psychological Science, 13(3), 219–224. — [MIT PDF](https://web.mit.edu/ariely/www/MIT/Papers/deadlines.pdf) |
| A2 | "The results from Study 2 show that **performance under self-imposed deadlines is lower than performance under evenly spaced deadlines, but higher than performance under maximally delayed deadlines.**" | 同上(校正課題、検出エラー数・遅延・報酬の3指標) |
| A3 | 差の原因は「外部から課された強制力」ではなく**締切の配置そのもの**。無選択群と、自由選択群のうち均等配置に近い日程を選んだ学生だけを比較すると差は非有意になった(**効果量が59%縮小**) | 同上, 脚注3 |
| A4 | "**flexibility, compared with evenly spaced deadlines, should lead to lower grades only if people have self-control problems yet do not set their own deadlines optimally.**" | 同上 |

**設計への含意**:

- 週境界は **A3 の言う「均等配置」そのもの**。既に最良条件が実装されている。これを外して自己設定期限のマイルストーン列に置き換えるのは A1/A2 の順序を逆走する。
- 逆に、**自己設定期限は「最終締切のみ」よりは良い**(A2)。本アプリの `exam`(本番日)は最終締切のみに相当するので、その間に自己設定のチェックポイントを1つ挟むこと自体は A2 に支持される。
- 結論: **週境界(均等配置)を主、自己設定チェックポイント期限を従**。逆順にしない。

---

## 5. 細分化の功罪 — granularity/flexibility トレードオフと達成後の落ち込み

### 5.1 Rai et al. (2023) の実測: 最も細かい条件が勝つとは限らない

事前登録フィールド実験 N = 9,108(危機カウンセリング組織のボランティア)。「年間200時間」を「毎週4時間」「隔週8時間」に分割。本文から逐語確認:

| # | 記述(原文) | 含意 |
|---|---|---|
| R1 | "reframing an overarching goal of 200 hours of volunteering into more granular subgoals (either 4 hours of volunteering every week or 8 hours every two weeks) **increased hours volunteered by 8% over a 12-week period.**" | 細分化そのものは効く |
| R2 | "**increasing subgoal flexibility** by breaking an annual 200-hour volunteering goal into a subgoal of volunteering **8 hours every two weeks, rather than 4 hours every week, led to more durable benefits.**" | より粗い/柔軟な方が持続する |
| R3 | "the **8 hours every two weeks** condition increased the number of minutes volunteered by 4.6% … (b = 0.045, **p = .038**), while the **4 hours every week condition did not significantly increase minutes volunteered** among those who made non-zero commitments of time (b = 0.013, **p = .549**)" | **最も細かい条件は主要指標で有意にならなかった** |
| R4 | "the 8 hours every two weeks condition also increased the number of times participants volunteered in a given week by 10.2% … (b = 0.036, **p = .006**)" / 2つの subgoal 条件間の差は非有意(p = .496 / p = .914 / p = .862) | 粗い条件の方が**実施頻度**すら上げた |
| R5 | "**Reduced flexibility means greater chances for goal failure or other setbacks, which have been shown to increase the risk of goal abandonment.**" | 機序: 細分化 → 失敗機会増 → 離脱 |

出典: Rai, A., Sharif, M. A., Chang, E. H., Milkman, K. L., & Duckworth, A. L. (2023). *A field experiment on subgoal framing to boost volunteering: The tradeoff between goal granularity and flexibility.* Journal of Applied Psychology, 108(4), 621–634. DOI: [10.1037/apl0001040](https://doi.org/10.1037/apl0001040) — [著者PDF](https://aneesh-rai.com/publication/subgoals/subgoals.pdf) / [PubMed 36107684](https://pubmed.ncbi.nlm.nih.gov/36107684/)

**注**: `goal-type-taxonomy.md` §4.4 と `weekly-goal-redesign.md` §4.1 は R2 のみを引いていたが、**R3 がより強い**。「毎週」粒度が主要指標で有意にならなかったという事実は、これ以上の細分化(週内マイルストーン、成果マイルストーン列)への反証として直接使える。

### 5.2 達成直後のモチベーション低下

| # | 主張 | 一次ソース |
|---|---|---|
| R6 | 報酬(=サブゴール)到達直後に努力量が落ち、次の報酬に近づくと再加速する(**postreward resetting**)。コーヒーカード実験とオンライン楽曲評価プログラムの実データ両方で観測 | Kivetz, R., Urminsky, O., & Zheng, Y. (2006). *The goal-gradient hypothesis resurrected: Purchase acceleration, illusionary goal progress, and customer retention.* Journal of Marketing Research, 43(1), 39–58. DOI: [10.1509/jmkr.43.1.39](https://doi.org/10.1509/jmkr.43.1.39) — [著者PDF](https://home.uchicago.edu/ourminsky/Goal-Gradient_Illusionary_Goal_Progress.pdf) |
| R7 | 目標への進捗を知覚すると、その目標に不整合な選択が「許可」される(licensing) | Fishbach, A., & Dhar, R. (2005). *Goals as excuses or guides: The liberating effect of perceived goal progress on choice.* Journal of Consumer Research, 32(3), 370–377. DOI: [10.1086/497548](https://doi.org/10.1086/497548) |
| R8 | サブゴール成功後の反応は persistence と licensing に分岐し、個人差がモデレータになる | Zemack-Rugar, Y., Corus, C., & Brinberg, D. (2019). *If at first you do succeed, do you try, try again? Developing the persistence–licensing response measure…* Journal of Marketing Research, 56(1), 55–71. DOI: [10.1177/0022243718811296](https://doi.org/10.1177/0022243718811296) |

**設計への含意**: 短期成果ゴールを1つ達成した直後は、統計的に最も学習が止まりやすいタイミング。ここで `pace` が走り続けていることが緩衝材になる(**併用が置換より優れる4つ目の理由**)。逆に成果チェックポイントだけを軸にすると、達成のたびに計器が空になる。

---

## 6. 「〜ができるようになった」の自己判定は信用できるか

### 6.1 一般的な較正の失敗

| # | 主張 | 一次ソース | 数値・原文 |
|---|---|---|---|
| C1 | 下位四分位の被験者は実測12パーセンタイルを62パーセンタイルと自己評価した | Kruger, J., & Dunning, D. (1999). *Unskilled and unaware of it: How difficulties in recognizing one's own incompetence lead to inflated self-assessments.* Journal of Personality and Social Psychology, 77(6), 1121–1134. — [全文PDF](https://sites.lsa.umich.edu/sasi/wp-content/uploads/sites/275/2015/11/krugerdunning99.pdf) | 原文: "**Although their test scores put them in the 12th percentile, they estimated themselves to be in the 62nd.**" ユーモア・文法・論理の4研究 |
| C2 | 機序は「能力そのものが自己評価能力でもある」という二重負荷 | 同上 | 原文: "**the skills that engender competence in a particular domain are often the very same skills necessary to evaluate competence in that domain**—one's own or anyone else's." |
| C3 | **較正は訓練で改善する**。スキルを上げるとメタ認知能力が上がり、自分の限界を認識できるようになる | 同上 | 原文: "Paradoxically, **improving the skills of participants, and thus increasing their metacognitive competence, helped them recognize the limitations of their abilities.**" |

C1/C2 は「TOEIC Reading 初中級者が『できるようになった』を自己判定する」ケースを直撃する。**判定が最も歪む位置に所有者がいる。**

一方 C3 と §2.1 の P3(近接サブゴールが veridical self-knowledge を育てた)は、**較正は固定的な欠陥ではなく、練習の継続で改善する**ことを示す。これも「`pace` を走らせ続けること」が短期成果ゴールの前提になる理由。

### 6.2 語学固有: 自己評価はどこまで使えるか

| # | 主張 | 一次ソース | 数値 |
|---|---|---|---|
| C4 | 語学の自己評価と実測パフォーマンスの相関は中程度 | Li, M., & Zhang, X. (2021). *A meta-analysis of self-assessment and language performance in language testing and assessment.* Language Testing, 38(2), 189–218. DOI: [10.1177/0265532220932481](https://doi.org/10.1177/0265532220932481) | 67研究 / 97独立標本 / N > 68,500。**全体 r = .466 (p < .01)** |
| C5 | 相関を上げるモデレータが特定されている | 同上 | 有意なモデレータ6つ: **SA 基準の種類 / 基準の提示と形式 / 測定具 / 訓練 / 項目数 / 測定具の信頼性**。実生活の具体タスク記述 **.49**、ルーブリック付き・基準参照 **.49**、訓練あり **.48**、コンピュータ適応型 **.52**。逆に外部指標の種類・言語スキル・評価順序には有意なモデレータ効果なし |
| C6 | 自己評価の精度はスキル領域で異なる | 同上 | リスニングが最も高く、リーディング・スピーキングが続き、**ライティングは有意に低い** |

**設計への含意(重要)**: C5 が「自由記述の『〜ができる』」と「基準参照の can-do 記述」を分ける。r = .466 は「そのまま計器にはできないが、捨てるほど低くもない」水準で、**基準を添えれば .49 まで上がる**。したがって:

- ✗ `criterion` に「Part 5 が得意になる」のような自由文を書かせる
- ○ `criterion` に **条件 + 行動 + 到達基準** の形を要求する(例:「時間制限なしで Part 5 の文法問題20問中17問以上を正解でき、誤答の理由を説明できる」)
- ◎ さらに **自動集計(`rows` の実施日数・分数、`volume` の累計)を同じカードに併記**して、自己判定を単独の証拠にしない

Harkin et al. (2016) のモニタリング・メタ分析(138研究 / N = 19,951、目標達成 d+ = 0.40。記録が物理的に残るほど効果大 — `weekly-goal-redesign.md` §2.2 D2)も、自己判定の隣に客観記録を置く設計を支持する。

---

## 7. 呼称とフレーミング

### 7.1 候補の比較

| 候補 | 出自 | 採否 | 理由 |
|---|---|---|---|
| **OKR / Key Result** | 企業の目標管理 | **✗** | ADR-0003 で棄却済み。Ordóñez et al. (2009) が narrow focus / gaming / 内発的動機低下 / 学習阻害という系統的副作用を報告(`weekly-goal-redesign.md` §2.1 W4)。加えて KR は定義上「測定可能な数値成果」であり、`mastery` の非数値性と衝突する |
| **マイルストーン** | プロジェクト管理 | **△** | 「列に並ぶ通過点」を含意する。§5 の R3/R5 とチェーン化の危険が語感に乗るため避ける。`goal-type-taxonomy.md` §4.5 が空き枠の第1候補として保留した「マイルストーン型」とも混同される |
| **短期ゴール** | goal-setting theory の short-term goal | **○** | Williamson et al. (2022) の "short-term goals" と直結し無難。ただし `pace` も短期なので識別子にならない |
| **チェックポイント** | — | **◎ 推奨** | 「途中で確認する地点」であって「達成すべき成果」ではない、という関係性を語感が正しく伝える。フィードバック軸を渡さない設計(§1 但し書き1)と整合する |
| **can-do** | CEFR | **◎ 併用推奨(記述形式として)** | §7.2 |

### 7.2 CEFR can-do descriptor を「記述形式」として借りる

CEFR Companion Volume 本文から逐語確認:

> "In this way descriptors can provide a detailed, flexible resource for: … providing transparent **"signposting"** to learners, parents or sponsors; … introducing **criterion-referenced assessment with criteria relating to an external framework** (here the CEFR)."

> "Descriptors can be used to help design such tasks and also to observe and, if desired, **to (self-)assess the language use of learners** during the task."

出典: Council of Europe (2020). *Common European Framework of Reference for Languages: Learning, teaching, assessment — Companion volume.* — [公式PDF](https://rm.coe.int/common-european-framework-of-reference-for-languages-learning-teaching/16809ea0d4)

**採るもの / 採らないもの**:

- **採る**: 「Can do + 条件 + 基準」という**記述の型**。これが §6.2 C5 の「基準参照だと r が .49 に上がる」を実装する最短経路であり、CEFR 自身が self-assessment と signposting を descriptor の用途として明記している。
- **採らない**: CEFR のレベル体系(A1〜C2)そのもの。TOEIC との対応づけは本アプリの範囲外で、`CONTEXT.md` の「模試スコア・分析はこのアプリの対象外」とも衝突する。

---

## 8. 既存 ADR / リサーチとの整合

| 既存の判断 | 本書の判定 | 説明 |
|---|---|---|
| ADR-0003「アプリ内のフィードバックは学習量(プロセス)にする」 | **維持** | §3.1 の d = 1.36 vs 0.09 が直接支持。改訂版の「週 n 日 × 1日最低 m 分」も維持 |
| ADR-0003「OKR 風の目標ツリーを作らない」 | **維持** | §7.1。チェックポイントは親子リレーションを持たない独立オブジェクトなのでツリーにならない |
| ADR-0003「成果目標(本番スコア)をフィードバックに使わない」 | **維持** | §3.1。ただし `mastery` は「本番スコア」ではなく非数値の到達基準なので、この禁止の対象外 |
| ADR-0005「マイルストーン型は採らない」 | **維持** | §4(週境界が既に均等配置締切)+ §5(R3/R5 で細分化の限界)。既存の根拠が今回さらに強化された |
| ADR-0005「固定5値(exam / pace / volume / mastery / other)」 | **維持** | §7 の推奨は**新タイプの追加ではなく `mastery` の仕上げ**。6枠目は空いたまま |
| `weekly-goal-redesign.md` §3「アウトプット/成果量ゴール ✗ 不適」 | **維持。ただし適用範囲を明示** | 同表が否定したのは「模試スコア等をフィードバック軸に据える案」。非数値・非判定の到達基準チェックポイントは検討対象に入っていなかった。**矛盾ではなく空白の補充** |
| `goal-type-taxonomy.md` §4.4「近接サブゴール型を棄却」 | **維持** | 棄却理由は「親目標への従属リレーションを持たせると目標ツリーになる」。本書の提案はリレーションを持たない |
| `weekly-goal-redesign.md` が shifting goals を扱っていない | **本書で補充** | Zimmerman & Kitsantas (1997, 1999) は前回調査の射程外だった。process/outcome の二者択一という前提自体が不完全だったのが今回の中核的な発見 |

**唯一の実質的な更新**: 前回調査は「process か outcome か」を排他的な選択として扱っていた。Zimmerman & Kitsantas の shifting パラダイムは**第3の条件が両者より優れる**ことを実験で示しており、しかも Williamson のメタ分析で最大の効果(d = 1.53, k = 5)を出したのがこの理論系列の研究群だった。ADR の supersede は不要で、**「outcome は判定軸に使わないが、非判定の併置オブジェクトとしては置いてよい」という一文の追加**が妥当。

---

## 9. アプリ設計への含意

### 9.1 結論の実装形

**`mastery` タイプを「短期チェックポイント」として仕上げ、`pace` は判定軸のまま一切触らない。**

`mastery` は既に実装済み(`convex/lib/validators.ts` の `masteryGoalFields`: `content` / `criterion` / `deadline?`)。所有者の望む「いつまでに何ができているか」は**この型そのもの**であり、新タイプも新テーブルも要らない。

### 9.2 具体的な推奨

| # | 推奨 | 根拠 |
|---|---|---|
| **D1** | **`pace` を廃止しない。ストリーク・週次達成判定・ダッシュボードの主計器は `pace` のまま**。`mastery` は判定・ストリークに一切参加させない | §3.1(process d = 1.36 / outcome d = 0.09)、§5.2(達成直後の落ち込みを `pace` が緩衝) |
| **D2** | `mastery` の `deadline` を**短期チェックポイント用途では実質必須**にする(UI 上でデフォルト提示。例: 4〜8週先)。`exam` の本番日だけが締切という状態を避ける | §4 A2(自己設定締切 > 最終締切のみ)、§2.1 P4(long-term のみ d = −0.08) |
| **D3** | `deadline` の**既定候補を週境界(月曜)にスナップ**させる。自由入力は許すが初期値は週境界 | §4 A3(均等配置が効いており、59%の効果差はその配置由来) |
| **D4** | **同時アクティブな `mastery` を1〜2件に制限**する(UI の警告で足りる。ハード制限にする必要はない — 推測: 1人用アプリでの運用判断)。チェックポイントの列・チェーンは作らない | §5.1 R3(最細粒度条件は主要指標で非有意)、R5(柔軟性低下→離脱)、ADR-0005 |
| **D5** | `criterion` の入力に **can-do 形式のプレースホルダ/ヘルプ**を置く。「条件 + 行動 + 到達基準」の3要素を促す。空文字禁止は既存規則どおり | §6.2 C5(基準参照・ルーブリック付きで r が .466 → .49)、§7.2(CEFR の criterion-referenced) |
| **D6** | `mastery` カードに **自動集計を併記**する。最低限「作成日から現在までの `rows` 実施日数と合計分数」、`itemId` を持たせられるなら対象項目の実績。自己判定を単独の証拠にしない | §6.1 C1/C2(初中級者の自己評価は最も歪む)、Harkin et al. 2016 の d+ = 0.40(記録が残るほど効果大) |
| **D7** | 達成マークは **`pace` の連続達成に影響を与えない**。`mastery` の期限切れ・未達も同様にストリークを壊さない | §5.2 R6/R7(post-reward resetting / licensing)、Lally et al. 2010(1回の欠損は習慣形成を実質的に損なわない) |
| **D8** | **shifting のトリガーを UI に置く**。`pace` を N 週連続達成したときに「そろそろ到達チェックポイントを1つ置きますか」と提案する(N は運用で決める。推測: 4週程度)。逆に `pace` が未達続きのときは提案しない | §3.2 S1〜S4(移行トリガーは「自動化」。時期尚早な切り替えは shifting の条件を満たさない) |
| **D9** | 呼称は **「チェックポイント」**。UI 文言に OKR / KR / Key Result / マイルストーンを使わない | §7.1 |
| **D10** | ADR-0003 に一文追加する(§9.3) | §8 |

### 9.3 ADR-0003 に加える改訂文(案)

> 成果目標をアプリ内フィードバックに使わない判断は維持する(Williamson et al. 2022: process d = 1.36 に対し outcome d = 0.09)。ただし Zimmerman & Kitsantas (1997, 1999) の shifting goals — process から始め、スキルが自動化してから outcome へ移す条件 — が process 単独・outcome 単独の両方を上回り、この理論系列の研究群がメタ分析中で最大の効果(d = 1.53, k = 5)を出している。よって**非数値・非判定の到達チェックポイント(`mastery` タイプ)を `pace` に併置することは認める**。頻度型プロセスゴールの置換は認めない(実験内で最下位だった outcome 単独条件に相当する)。チェックポイントは判定・ストリークに参加せず、期限は週境界にスナップし(Ariely & Wertenbroch 2002: 均等配置 > 自己設定 > 最終締切のみ)、同時アクティブ数を絞る(Rai et al. 2023: 最細粒度条件は主要指標で非有意)。到達基準は基準参照の can-do 形式で書き、自動集計を併記する(Li & Zhang 2021: 基準参照で r が .466 → .49、Kruger & Dunning 1999)。根拠: docs/research/short-term-outcome-goals.md

### 9.4 やらないこと(明示)

- **`pace` の廃止・判定軸の移譲** — §3.1
- **成果マイルストーンの列/チェーン、着手日・完了日つきの中間目標群** — §5.1 R3/R5、ADR-0005
- **`mastery` を親、`pace` を子とする目標ツリー** — ADR-0003、`goal-type-taxonomy.md` §4.4
- **模試スコアや推定スコアをチェックポイントの判定値にすること** — `CONTEXT.md`「模試のスコア・分析はこのアプリの対象外」
- **6番目の目標タイプの新設** — `mastery` で足りる。ADR-0005 の空き枠は空いたまま
- **CEFR レベル(A1〜C2)の導入** — §7.2

---

## 10. 未解決点・本書の限界

- **Zimmerman & Kitsantas (1997) / (1999) の本文 PDF は未取得**(APA ペイウォール)。仮説構造・条件の順序・「全仮説が支持された」は [ERIC EJ543828](https://eric.ed.gov/?id=EJ543828) の抄録と Semantic Scholar の書誌で一次確認。自己効力感の d 値(§3.2 S4)は Williamson et al. (2022) 本文を引いた二次要約経由で、**Williamson 本文からの逐語確認は未取得**(tandfonline / figshare / SCU リポジトリいずれも 403 または空レスポンス)**[未検証]**。順序(shifting > transformed > process > outcome > 統制)自体は ERIC 抄録と複数の二次文献で一致
- **shifting の移行判定基準の操作的定義** — 「自動化した」を実験でどう判定したかの逐語定義は未取得。D8 の「N 週連続達成」は本アプリ向けの代理指標であり、**原論文からの直接の導出ではない(推測)**
- **Li & Zhang (2021) のモデレータ別 r** — 全体 r = .466 と6モデレータの有意性は abstract から一次確認。個別の .49 / .48 / .52 という値は**出版社ページの要約経由で、本文からの逐語確認は未取得** **[未検証]**
- **Fishbach & Dhar (2005) / Zemack-Rugar et al. (2019)** — 書誌は Semantic Scholar / Crossref で照合済み、知見の方向も複数の二次文献で一致。**本文からの逐語引用は未取得**。本書ではいずれも補強証拠としてのみ使い、主要主張の支柱にしていない
- **語学学習における shifting goals の直接検証は見つからなかった**。S2(作文推敲)が最も近い認知的スキルの再現例。TOEIC Reading への外挿は Seijts & Latham の課題複雑性の議論を介した推論
- **`mastery` チェックポイントと `pace` の併用を直接比較した RCT は見つからなかった**。併用の支持は Zimmerman & Kitsantas の shifting 条件と Höchli et al. (2018) の「上位/下位目標は併用が最良」からの合成
