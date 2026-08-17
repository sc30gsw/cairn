# 週間ゴールの心理学的再設計 — 一次研究からの導出

対象: `convex/services/goals/weeklyTrend.ts` の判定 `achieved = volumeMinutes >= goalMinutes`、および `docs/adr/0003-process-goals-not-okr.md`。
調査日: 2026-08-17。効果量はすべて出典元の報告値。推測は「推測」と明記する。

---

## 1. 要約

### 推奨する週間ゴール設計

**「週 n 日 × 1日あたり最低 m 分」の頻度ゴール（分散の担保）へ判定軸を差し替える。** 総分数は表示指標として残すが、達成判定の主軸から外す。

```
現行: achieved = volumeMinutes >= goalMinutes
提案: achieved = qualifyingDays >= goal.days
      qualifyingDays = その週で「確定した記録の合計分数 >= goal.dailyFloorMinutes」を満たした暦日数
```

これで「1日だらだら 300 分」は未達、「5日 × 60 分」は達成になる。日次の追加入力はゼロ（既存の `rows.status = 確定` と `dateJst` だけで算出できる）。加えて **4週に1回の予備枠（emergency reserve）** をストリーク判定に入れる。

理由の骨子:

- 分数は成果との相関が弱い（学習時間と成績の関係は small〜moderate at best、意図的練習が説明する分散は教育領域で 4%）。一方、**分散（複数日に割る）は認知心理学で最高評価の学習方略**であり、日数ゴールはそれを直接誘導する。
- スポーツ心理のメタ分析では process goal (d ≥ 0.44) > performance goal、outcome goal は有意でない。ただしここでいう process goal は「実行手順の質」であって「投入時間」ではない。**現行設計は "process goal" を名乗りつつ、研究上の process goal とは別物の "input volume goal" になっている。** これが今回の中核的な発見。
- 時間量ゴールを完全に捨てるべきではない。時間ベースのサブゴール枠組みは実際に投入量を +8% 増やす実証がある。よって「下限（フロア）」として残す。

### ADR-0003 への判定: **部分修正（partial revision）**

- **維持**: 成果目標（TOEIC スコア）をアプリ内フィードバックに使わない / OKR ツリーを作らない / 実行の根拠を if-then に置く — いずれも一次研究に支持される。
- **修正**: 「プロセスゴール = 学習量（分）」という等式。研究上の process goal は投入時間ではない。判定軸を頻度＋分フロアへ差し替える。
- **維持（ただし根拠を精密化）**: WOOP の想像ステップ不採用。MCII のメタ分析効果量は g = 0.336（小〜中）で、文書ベース介入では g = 0.277 とさらに小さい。ADR の「効果が薄い」は「文書型では小さい」が正確。

詳細は §5。

---

## 2. 時間量（input/process volume）ゴールの弱点と擁護

### 2.1 弱点のエビデンス

| # | 主張 | 一次ソース | 数値 |
|---|---|---|---|
| W1 | 学習「時間」と学業成績の関係は弱い。効くのは study motivation と study skills | Credé & Kuncel (2008), *Perspectives on Psychological Science* 3, 425–453 — [SAGE](https://journals.sagepub.com/doi/abs/10.1111/j.1745-6924.2008.00089.x) | 344 独立標本 / N = 72,431。study time と成績の関係は "small to moderate at best"。study motivation・study skills が GPA と最も強く相関 |
| W2 | 練習「量」が成果分散に占める割合は領域依存で、教育では小さい | Macnamara, Hambrick & Oswald (2014), *Psychological Science* — [PDF](https://hhs.purdue.edu/skill-learning-and-performance-lab/wp-content/uploads/sites/43/2024/08/macnamara-et-al-2014-deliberate-practice-and-performance-in-music-games-sports-education-and-professions-a-meta-analysis.pdf) | deliberate practice が説明する分散: ゲーム 26%、音楽 21%、スポーツ 18%、**教育 4%**、職業 <1% |
| W3 | 目標効果は課題が複雑になるほど減衰する | Wood, Mento & Locke (1987), *Journal of Applied Psychology* 72, 416–425 — [記録](https://www.scirp.org/reference/referencespapers?referenceid=741735) | k = 125。目標困難度の d は単純課題 .67 に対し最複雑課題 .48。「specific difficult goal vs do-your-best」は最複雑課題で d = .41 |
| W4 | 到達不能な代理指標に判定を寄せると、狭い焦点・ゲーミング・内発的動機の低下という系統的副作用が出る | Ordóñez, Schweitzer, Galinsky & Bazerman (2009), *Academy of Management Perspectives* 23(1), 6–16 — [PDF](https://a-us.storyblok.com/f/1016826/x/313bf5dfde/goals_gone_wild_final.pdf) | 質的レビュー。narrow focus / unethical behavior / distorted risk / reduced intrinsic motivation / inhibited learning |
| W5 | 「時間」より「反復回数」が成果に近い代理指標である（語学） | Uchihara, Webb & Yanagisawa (2019), *Language Learning* 69(3), 559–599 — [Wiley](https://onlinelibrary.wiley.com/doi/abs/10.1111/lang.12343) | 26 研究 / 45 効果量 / N = 1,918。遭遇回数と付随的語彙学習の相関 r = 0.34（中程度） |
| W6 | 総時間が同じでも分散した方が学習される。分散練習と検索練習だけが "high utility" 判定 | Dunlosky, Rawson, Marsh, Nathan & Willingham (2013), *Psychological Science in the Public Interest* 14, 4–58 — [PDF](https://gwern.net/doc/psychology/spaced-repetition/2013-dunlosky.pdf) | 10 技法をレビューし、practice testing と distributed practice のみ high utility。再読・ハイライトは効果が一貫しない |
| W7 | 実行「手順」型の process goal は効くが、outcome goal は効かない | Williamson et al. (2022), *International Review of Sport and Exercise Psychology* — [Taylor & Francis](https://www.tandfonline.com/doi/full/10.1080/1750984X.2022.2116723) | 全体 d = 0.47 (95% CI 0.30–0.63, k = 27)。**process goals と performance goals は d ≥ 0.44 で有意、process が performance より有意に大きい (Q = 4.77, p = .029)。mastery / outcome / ego goals は有意な効果なし。短期目標 d ≥ 0.43 有意、長期のみの目標は d = −0.08 で無効** |

**W6 + W7 が現行設計への直接の反証。** 「週の合計分数」は、1日に固めても5日に割っても同じ値になるため、最も効く要素（分散）を判定にまったく反映しない。ユーザーの問題意識「だらだら長時間やるだけで達成できてしまう」は、この盲点の正確な記述である。

また用語の整理として: `CONTEXT.md` の週間ゴール定義は「学習量の具体的で難しいプロセス目標」だが、W7 の process goal は「実行する動作・手順の質」を指す。投入時間量は goal-setting theory の分類では process ではなく **quantity of input**。この取り違えが ADR-0003 の論理の穴になっている（§5）。

### 2.2 擁護のエビデンス（捨ててはいけない理由）

| # | 主張 | 一次ソース | 数値 |
|---|---|---|---|
| D1 | 時間ベースのサブゴールは、実際に投入量を増やす | Rai, Sharif, Chang, Shu & Milkman (2023), *Journal of Applied Psychology* 108(4), 621–634 — [PDF](https://www.hbs.edu/ris/Publication%20Files/A%20field%20experiment%20on%20subgoal%20framing%20to%20boost%20volunteering_5126b332-1a57-49ca-8107-e1a7b50bc855.pdf) | 事前登録フィールド実験 N = 9,108。年間 200 時間目標を「毎週4時間」または「隔週8時間」に分割 → 12週で投入時間 **+8%** |
| D2 | 進捗モニタリング自体が目標達成を押し上げる。物理的に記録する・公開すると効果が増す | Harkin et al. (2016), *Psychological Bulletin* 142(2), 198–229 — [APA PDF](https://www.apa.org/pubs/journals/releases/bul-bul0000025.pdf) | 138 研究 / N = 19,951。モニタリング頻度 d+ = 1.98、目標達成 **d+ = 0.40 (95% CI .32–.48)**。記録が物理的に残る・公開されるほど効果大 |
| D3 | 具体的で困難な目標は「ベストを尽くせ」より一貫して高い成果を出す | Locke & Latham (2002), *American Psychologist* 57, 705–717 — [PDF](https://med.stanford.edu/content/dam/sm/s-spire/documents/PD.locke-and-latham-retrospective_Paper.pdf) | 35年分の統合。目標困難度と成果は正の線形関数 |
| D4 | 語学では投入量そのものに効果がある（多読） | Nakanishi (2015), *TESOL Quarterly* 49(1), 6–37 — [Wiley](https://onlinelibrary.wiley.com/doi/abs/10.1002/tesq.157) | 34 研究 / 43 効果量 / N = 3,942。群間 d = 0.46、事前事後 d = 0.71。ただし指導期間の長さの効果は "ambivalent" と著者自身が結論 |

**結論**: 分数を判定から完全に外すのは行き過ぎ。D1/D2/D3 は「分数は測りやすく、モニタリング適性が高く、量を実際に増やす」ことを支持する。よって **分数は「1日あたりのフロア」として残し、達成の主軸を頻度に移す** のが両立解。

---

## 3. 代替案の比較

| 代替案 | 効果量・実証 | 適用条件 | この app への適合 | 出典 |
|---|---|---|---|---|
| **アウトプット/成果量ゴール**（模試スコア等） | sport meta で outcome goals は**有意な効果なし**。MBA 実験で distal outcome goal は学習ゴール条件より GPA が低く、目標設定直後の self-efficacy も低下 | 課題が単純で、能力が既に足りているとき | ✗ 不適。TOEIC Reading は未習の複雑課題（ADR-0003 の判断は正しい） | [Williamson 2022](https://www.tandfonline.com/doi/full/10.1080/1750984X.2022.2116723) / [Latham & Brown 2006, *Applied Psychology* 55(4)](https://iaap-journals.onlinelibrary.wiley.com/doi/abs/10.1111/j.1464-0597.2006.00246.x) |
| **完了数ベース**（タスク/セッション完了カウント） | 直接比較の RCT は見つからず（→ §7）。ただし遭遇回数と語彙学習 r = 0.34、分散練習が high utility という間接支持がある。MCII 研究の従属変数も「完了した練習問題数」（+60%） | 1単位が明確に定義でき、単位の質が担保されているとき | ◎ 最適。`rows.status = 確定` の件数・日数は追加入力ゼロで数えられる | [Uchihara 2019](https://onlinelibrary.wiley.com/doi/abs/10.1111/lang.12343) / [Dunlosky 2013](https://gwern.net/doc/psychology/spaced-repetition/2013-dunlosky.pdf) / [Duckworth et al. 2011, *Educational Psychology* 31(1)](https://www.socmot.uni-konstanz.de/sites/default/files/duckworth_self-regulation_11.pdf) |
| **実装意図 (if-then, Gollwitzer)** | **d = 0.65**（中〜大）。94 独立研究 / N > 8,000。開始・妨害からの遮蔽・失敗からの離脱の全局面で有効 | 目標へのコミットメントが既に高いとき。低いと効かない | ◎ 既に「障害プラン」として実装済み。最も費用対効果が高い既存資産 | [Gollwitzer & Sheeran 2006, *Adv. Exp. Soc. Psych.* 38, 69–119](https://kops.uni-konstanz.de/handle/123456789/10973) |
| **Proximal subgoals (Bandura & Schunk)** | N = 40 の児童。近位下位目標条件のみが自己主導学習を加速し、習熟・自己効力感・内発的興味を生んだ。**遠位目標のみは効果が実証されず (no demonstrable effects)** | 遠位目標が遠すぎて行動に結びつかないとき | ◎ 「週」という近位単位が既にこの役割。維持すべき | [Bandura & Schunk 1981, *JPSP* 41(3), 586–598](https://uploads-ssl.webflow.com/59faaf5b01b9500001e95457/5bc552d85141987915dab842_Bandura%20&%20Schunk,%201981.pdf) |
| **SMART / 具体的困難目標 (Locke & Latham)** | 目標困難度と成果は正の線形関数。ただし複雑課題で減衰（d = .41〜.48） | 努力・持続で成果が上がる課題。知識獲得が律速なら弱まる | ○ 「具体的で困難」は保つが、困難さの単位を分数から日数へ | [Locke & Latham 2002](https://med.stanford.edu/content/dam/sm/s-spire/documents/PD.locke-and-latham-retrospective_Paper.pdf) / [Wood et al. 1987](https://www.scirp.org/reference/referencespapers?referenceid=741735) |
| **学習ゴール (Seijts & Latham)** | 未習・複雑課題では「発見・実装する方略の数」を目標にすると outcome goal を上回る。MBA 実験では学習ゴール条件の GPA が distal performance goal 条件より有意に高い。実験室では「4つ以上のショートカットを特定・実装せよ」の形 | **課題が新規で、必要なのは努力ではなく知識・方略の獲得であるとき** = TOEIC Reading の状況そのもの | ○ 有望だが入力コストが増える。任意レイヤーとして提案（§6.4） | [Seijts & Latham 2001, *JOB* 22, 291–307](https://onlinelibrary.wiley.com/doi/10.1002/job.70) / [Latham & Brown 2006](https://iaap-journals.onlinelibrary.wiley.com/doi/abs/10.1111/j.1464-0597.2006.00246.x) |
| **WOOP / MCII (Oettingen)** | メタ分析 **g = 0.336**（小〜中）、21 研究 / 24 効果量 / N = 15,907。**出版バイアスがあり真の効果はより小さい可能性**。調整変数は介入形式で、対面 g = 0.465 > 文書型 **g = 0.277** | 実験者との対話がある介入設計。文書・アプリ単独では効果が落ちる | △ ADR の不採用判断を支持。ただし II 成分単独（d = 0.65）は採用済み | [Wang, Wang & Gai 2021, *Frontiers in Psychology* 12:565202](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8149892/) |
| **予備枠 / emergency reserve** | 1 フィールド研究 + 4 ラボ研究。サブゴール失敗後の**継続率**が上がる。機序は「失敗」を「進捗」に読み替えることによる知覚進捗とコミットメントの上昇 | ストリーク破断による離脱が主要な失敗モードのとき | ◎ 既存のストリーク UI と直結。低コスト | [Sharif & Shu 2021, *OBHDP* 163, 17–29](https://www.sciencedirect.com/science/article/abs/pii/S0749597818304187) |

---

## 4. 階層目標構造と先延ばし対策のエビデンス

### 4.1 「長期 → 期限つきマイルストーン → 具体的行動」の3層は達成率を上げるか

**上げる。ただし中間層の粒度を細かくしすぎると持続性が落ちる。**

| 論点 | 証拠 | 出典 |
|---|---|---|
| 上位目標と下位目標は**併用**が最良。どちらか一方だけより成功する | Höchli, Brügger & Messner (2018), *Frontiers in Psychology* 9:1879。理論・実証レビュー。上位/下位は異なる機序（意味づけ vs 実行）で寄与し、組み合わせが最良 | [Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.01879/full) |
| 遠位目標「のみ」は効かない | Bandura & Schunk (1981): distal goals had no demonstrable effects。Williamson et al. (2022): 長期のみの目標は d = −0.08 | [PDF](https://uploads-ssl.webflow.com/59faaf5b01b9500001e95457/5bc552d85141987915dab842_Bandura%20&%20Schunk,%201981.pdf) / [T&F](https://www.tandfonline.com/doi/full/10.1080/1750984X.2022.2116723) |
| 遠位目標に近位目標を足すと成果が上がる | Latham & Brown (2006): 近位目標を distal outcome goal に追加した参加者は、distal のみより GPA が高い | [Wiley](https://iaap-journals.onlinelibrary.wiley.com/doi/abs/10.1111/j.1464-0597.2006.00246.x) |
| 中間締切は**均等配置**が最良。自己設定は次善、最終締切のみが最悪 | Ariely & Wertenbroch (2002), *Psychological Science* 13(3)。校正課題で検出エラー数: 均等配置 > 自己設定 > 最終締切のみ。人は自己設定するとコストを払ってでも締切を課すが、最適には配置できない | [MIT PDF](https://web.mit.edu/ariely/www/MIT/Papers/deadlines.pdf) |
| 粒度を上げるほど良いわけではない。柔軟性とのトレードオフがある | Rai et al. (2023): 200時間目標を「毎週4時間」より「**隔週8時間**」に分割した方が、効果がより durable だった | [HBS PDF](https://www.hbs.edu/ris/Publication%20Files/A%20field%20experiment%20on%20subgoal%20framing%20to%20boost%20volunteering_5126b332-1a57-49ca-8107-e1a7b50bc855.pdf) |

**このアプリへの含意**: 本番目標（遠位・意味づけ）→ 週間ゴール（近位・期限つき）→ 具体的手順（行動）の3層は既に成立しており、研究的に妥当。**「着手日/完了日つきマイルストーン」を追加する ROI は低い**: 週境界は既に Ariely の "evenly spaced deadlines" と同型の均等配置締切として機能しており、これ以上粒度を上げると Rai et al. の示す柔軟性の損失で持続性が下がる側に振れる。

### 4.2 先延ばし研究（TMT）での裏付け

- Steel (2007), *Psychological Bulletin* 133, 65–94: 691 の相関を統合。先延ばしの強い予測因子は **task aversiveness, task delay, self-efficacy, impulsiveness, conscientiousness（自制・非散漫性・組織化・達成動機）**。神経症傾向・反抗性・刺激追求は弱い。→ [PubMed](https://pubmed.ncbi.nlm.nih.gov/17201571/)
- Steel & König (2006), *Academy of Management Review*: `Motivation = (Expectancy × Value) / (1 + Impulsiveness × Delay)`。→ [PDF](https://goal-lab.psych.umn.edu/orgpsych/readings/12.%20Judgment%20&%20Decision%20Making/Steel%20&%20Konig%20(2006).pdf)

TMT から導かれる設計指示は3つ:

1. **Delay を小さく保つ** → 週次の締切は正しい。月次・本番日だけでは分母が膨らんで動機が落ちる。
2. **Expectancy を落とさない** → 達成不能な高い目標や、1回の未達で全損する判定はやめる。予備枠（Sharif & Shu）が直接ここに効く。また Steel (2007) は self-efficacy が強い予測因子だと示しており、Bandura & Schunk の「近位目標が自己効力感を育てる」と整合する。
3. **task aversiveness を下げる** → 「今日は何をどうするか」が決まっている状態を作る。既存の「具体的手順」と「障害プラン (if-then)」がこれ。Gollwitzer & Sheeran の d = 0.65 はこの層に乗っている。

---

## 5. ADR-0003 の判定

対象文（`docs/adr/0003-process-goals-not-okr.md` 全文）:

> 成果目標（本番のスコアと日付）は具体的で期限がある。TOEIC Reading は未習の複雑課題なので、アプリ内のフィードバックは学習量（プロセス）にする。実行の科学的根拠は if-then（実装意図）で、曜日プリセットがすでにその形。WOOP の想像プロトコルや OKR 風の目標ツリーは、この1人の学習ログでは過剰で効果が薄い。

### 判定: **部分修正（partial revision）。supersede は不要。**

ADR の骨格（4つの判断のうち3つ）は一次研究で支持される。覆るのは1つ、「プロセス = 学習量（分）」という代入だけ。

#### 5.1 維持すべき判断

| ADR の判断 | 判定 | 根拠 |
|---|---|---|
| 成果目標をアプリ内フィードバックに使わない | **維持（強い支持）** | outcome goals は sport meta で有意な効果なし。distal outcome goal は学習ゴールより GPA が低く self-efficacy も下げた（Latham & Brown 2006）。複雑課題で目標効果が減衰する（Wood et al. 1987, d = .41）。ADR の「未習の複雑課題だから成果目標を判定に使わない」という推論は Seijts & Latham の論旨と一致する |
| 実行の根拠を if-then に置く | **維持（最強の支持）** | Gollwitzer & Sheeran (2006) d = 0.65、94 研究 / N > 8,000。本調査で確認したどの介入より効果量が大きい |
| OKR 風の目標ツリーを作らない | **維持** | Ordóñez et al. (2009) の系統的副作用。加えて Rai et al. (2023) の粒度／柔軟性トレードオフは、細分化を無条件に善とする OKR 的発想への直接の反証 |
| WOOP の想像プロトコルを画面にしない | **維持（根拠を精密化）** | MCII は g = 0.336 で有効だが「効果が薄い」わけではない。正確には「小〜中の効果があり、出版バイアスで真値はより小さい可能性があり、**文書ベース介入では g = 0.277 まで落ちる**」。アプリ内の文書型 WOOP という具体形に限れば ADR の判断は支持される。ADR 本文の理由づけは差し替えるべき |

#### 5.2 覆る判断

**「アプリ内のフィードバックは学習量（プロセス）にする」の "学習量 = 分数" 部分。**

覆すに足る証拠:

1. **用語の誤代入**: 研究上の process goal（Williamson et al. 2022 で d ≥ 0.44、performance goal より有意に大きい）は「実行する動作・手順の質」を指す。投入時間量ではない。ADR は "process" の権威を "分数" に転用しているが、その転用を支持する一次研究は本調査では見つからなかった。
2. **分数は成果と弱くしか結びつかない**: Credé & Kuncel (2008, N = 72,431) で study time と成績は "small to moderate at best"。Macnamara et al. (2014) で教育領域の練習量が説明する分散は 4%。
3. **分数は最も効く要素を測っていない**: Dunlosky et al. (2013) が high utility と判定したのは distributed practice と practice testing。総分数はこの2つのどちらも判定に反映しない。同じ 300 分でも1日集中と5日分散を同じ「達成」として扱う現行判定は、ユーザーの問題意識そのものを構造的に生む。
4. **語学固有の証拠も「時間」ではなく「回数」を指す**: Uchihara et al. (2019) の r = 0.34 は遭遇回数と語彙学習の相関。Nakanishi (2015) の多読メタ分析でも、著者自身が指導期間の長さの効果を "ambivalent" と結論している。

一方、分数を完全に捨てることは支持されない（§2.2 D1–D4）。よって **supersede ではなく、判定軸の差し替えという部分修正**。

#### 5.3 ADR-0003 に加えるべき改訂文（案）

> 学習量は「週の合計分数」ではなく「週 n 日 × 1日あたり最低 m 分」で判定する。総分数は表示のみ。研究上の process goal は投入時間ではなく実行手順の質を指し、投入時間と成果の相関は小さい（Credé & Kuncel 2008; Macnamara et al. 2014）。分散練習は最高評価の学習方略であり（Dunlosky et al. 2013）、頻度判定はそれを直接誘導する。WOOP を採らないのは「効果がない」からではなく、文書型 MCII の効果量が g = 0.277 と小さいため。

---

## 6. 具体設計案

### 6.1 週次判定ロジック

```ts
// convex/services/goals/weeklyTrend.ts の差し替え対象は 45–55 行のみ
// 現行: achieved = goalMinutes !== null && volumeMinutes >= goalMinutes

const dayMinutes = groupConfirmedMinutesByDate(weekRowsInRange); // Map<dateJst, minutes>
const qualifyingDays = countWhere(dayMinutes, (m) => m >= goal.dailyFloorMinutes);
const achieved = goal !== null && qualifyingDays >= goal.days;
```

- `volumeMinutes` は今まで通り算出して返す（チャートの棒は分のまま維持できる）。
- 判定に使うのは `qualifyingDays` だけ。閉じた純関数で、`convex/services/goals/` に置ける（CVX-09）。
- `dailyFloorMinutes` の初期値は「小さすぎて意味がない」を避けつつ「重すぎて続かない」を避ける。**推測**: 20〜30 分程度。一次研究で最適値を定めた証拠はない（§7）。

### 6.2 予備枠（emergency reserve）

Sharif & Shu (2021) を最小コストで入れる。**判定関数ではなくストリーク関数側**に置く。

```ts
// src/features/goals/lib/weekly-trend-streak.ts
// 未達 1 週までは連続を切らさない（2週連続の未達で切る）。
// 「予備を1つ使いました」と表示することで、未達を「失敗」ではなく「進捗」に読み替える。
```

これにより「1週落としたのでもう終わり」型の離脱（Steel 2007 の self-efficacy 低下ルート）を防ぐ。Lally et al. (2010, N = 96, *European Journal of Social Psychology*) でも、1回の機会を逃しても自動性の形成は実質的に損なわれないと報告されている → [Wiley](https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674)。

### 6.3 必要なスキーマ概念

```ts
// convex/schema.ts
weeklyGoals: defineTable({
  minutes: v.number(),                        // 既存。移行期は残す（表示・後方互換）
  days: v.optional(v.number()),               // 追加: 週に何日
  dailyFloorMinutes: v.optional(v.number()),  // 追加: 1日あたり最低分数
  ownerId: v.string(),
  weekStartJst: v.string(),
}).index("by_owner_and_week", ["ownerId", "weekStartJst"]),
```

- `days` が未設定の週は旧判定（`volumeMinutes >= minutes`）にフォールバックすれば、過去12週のトレンド表示が壊れない。
- 既定値・上下限は `convex/lib/domain.ts` に `as const satisfies` で置く（CVX-16）。
- `weeklyTrendWeekValidator` に `qualifyingDays: v.number()`, `goalDays: v.union(v.number(), v.null())`, `dailyFloorMinutes: v.union(v.number(), v.null())` を追加。`volumeMinutes` / `goalMinutes` / `achieved` は残す。

### 6.4 UI 骨格の維持可否

| 既存資産 | 維持可否 | 変更点 |
|---|---|---|
| 12週トレンドチャート (`weekly-trend-chart.tsx`) | **維持可** | 棒の値は `volumeMinutes` のまま。`referenceLines` の「目安 n分」を `days × dailyFloorMinutes` 由来に置き換えるか、日数バッジをツールチップに足す。`BarChart` の構造は不変 |
| 連続達成ストリーク (`weekly-trend-streak.ts`) | **維持可** | `achieved` の連鎖を数えるロジックはそのまま。予備枠を入れる場合のみ、この 13 行の関数を修正 |
| 未達バナー (`missed-week-banner.tsx`) | **維持可** | 判定元は同じ `achieved`。文言を「あと n 日」に変える |
| 週次進捗カード (`weekly-progress-card.tsx`) | 要修正 | 進捗表示が「分 / 目標分」から「日 / 目標日（＋今日の分数がフロアに届いているか）」になる |

**「判定関数の差し替えで済む」という制約は満たせる。** 変更の中心は `weeklyTrend.ts` の 45–55 行と、ゴール設定フォームの入力欄（1数値 → 2数値）。

### 6.5 入力コスト

- 日次の追加入力: **ゼロ**。`rows.status = 確定` と `dateJst` は既に存在する。
- 週次の追加入力: 週目標の設定が 1 数値 → 2 数値。初期値は直近4週の実績から自動提案できる（**推測**: 提案があれば実質の入力コストは増えない）。
- 任意レイヤー（学習ゴール、Seijts & Latham）: 週に1つ「今週試す方略」を書く欄。**判定には一切使わない**。入力コストが増えるため必須にしない。効果の期待値は高いが（未習の複雑課題での学習ゴールの優位）、続かなければ負けという制約を優先する。

---

## 7. 未解決点

1. **「日数」「完了件数」「分数」を直接比較した RCT は見つからなかった。** 頻度ゴール推奨は、分散練習（Dunlosky 2013）＋ process goal（Williamson 2022）＋ 反復回数（Uchihara 2019）からの**合成的推論**であり、単一の直接証拠ではない。この点は推測を含む。
2. **`dailyFloorMinutes` の最適値に一次研究の根拠がない。** 20〜30 分は推測。運用しながら調整するしかない。
3. **分散練習の効果量は「同一素材の再学習」で最も強く確立されている。** 異なる項目（多読・多聴・文法）を別日に配置する場合への外挿は推測。
4. **ストリーク UI そのものの効果に関する一次研究を今回確認していない。** 予備枠の根拠（Sharif & Shu 2021）はサブゴール失敗後の継続についてであり、ストリーク表示の是非を直接検証したものではない。
5. **n = 2 の個人アプリで効果量が再現する保証はない。** 引用した効果量はすべて群平均。A/B 検証はこの規模では不可能で、判断は理論的妥当性に依存する。
6. **`weeklyGoals.minutes` の後方互換をいつ切るか**（旧判定フォールバックの寿命）は設計判断として未決。
7. Macnamara et al. (2014) の deliberate practice メタ分析には Ericsson 側からの方法論的反論がある（[Ericsson の応答](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4101876/)）。W2 の数値は論争中の値として扱うべき。
