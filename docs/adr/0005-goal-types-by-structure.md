# 目標タイプは内容でなく構造で切る。試験・ペース・達成量・習得・その他の固定5値

目標の入力欄はタイプごとに変わる（discriminated union、コード駆動）。分類軸は「試験勉強か健康か」という内容領域ではなく、進捗の構造（期限日に一度だけ結果が入る / 期間ごとにリセットされる / 期限まで積み上げる / 数値を持たない）。内容領域ではこのアプリの目標は全件が学業に潰れて判別子にならない（Austin & Vancouver 1996; Google Calendar Goals の失敗例）。習慣ゴールはペースに畳み、マイルストーン型は採らない（週境界が既に均等配置の締切として機能し、細分化は持続性を下げる — Ariely & Wertenbroch 2002; Rai et al. 2023）。6枠目は意図的に空け、第1候補はマイルストーン型。タイプは所有者が追加できない固定一覧で、`~domain` のタプルが Convex validator・Valibot・UI の単一の真実。根拠: [docs/research/goal-type-taxonomy.md](../research/goal-type-taxonomy.md)
