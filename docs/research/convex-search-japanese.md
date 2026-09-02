# Convex 全文検索(search index)の日本語対応と制約

- 作成日: 2026-09-02
- 対象: 本アプリ(TOEIC 学習ログ)の `rows.content`(ひとこと)・`days.memo`(メモ)・`methods.bodyText`(方法カタログ本文)を対象にした全文検索機能の実現可否調査
- 目的: Convex の full text search(`searchIndex` / `withSearchIndex`)の公式仕様とトークナイズの挙動を一次情報で確定し、日本語(分かち書きなし)での部分一致検索を成立させる設計を選定するための根拠を残す
- 前提となる既存の設計判断:
  - `convex/schema.ts`: `rows`(`content: v.string()`, `dateJst: v.string()`, `ownerId: v.string()`, `deletedAt: v.optional(v.number())`)、`days`(`memo: v.optional(v.string())`, `dateJst: v.string()`, `ownerId: v.string()`, `deletedAt: v.optional(v.number())`)、`methods`(`bodyText: v.string()`, `ownerId: v.string()`。`deletedAt` は持たない=即時削除)
  - `.claude/rules/convex-rules.md` CVX-10(`.filter` 禁止、`withIndex`/`withSearchIndex` を使う)、CVX-11(`.collect()` はインデックスで絞った上で概ね1000件未満)、CVX-14(`query` ハンドラ内で `Date.now()` 禁止、`dateJst` は引数で受け取る)
  - `convex/_generated/ai/guidelines.md` の "Full text search guidelines" 節(1例のみ、`withSearchIndex` の基本形を示すだけで日本語・トークナイザには触れていない)
  - `CONTEXT.md`: 「記録」は項目・ひとこと・分数を持ち、ひとことは空でよい。「ゴミ箱」は `deletedAt` を持つ記録・日を30日で完全削除する対象
- 関連 Issue: [#70](https://github.com/sc30gsw/cairn/issues/70)(Convex 全文検索の日本語対応調査)。親 Issue: [#66](https://github.com/sc30gsw/cairn/issues/66)(仕様マップ)
- バージョン: `package.json` の `convex` は `^1.44.0`。本書のソースコード調査は `get-convex/convex-backend` の `main` ブランチ(取得時点のコミット `830d181b7acb65508304ac499553422111a90eb2`。同リポジトリ内 `npm-packages/convex/package.json` の `version` は `1.45.0`)を用いた。`1.44.0`→`1.45.0` の `CHANGELOG.md` に search 関連の変更は無い([一次ソース](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/CHANGELOG.md))。ただし Convex はマネージドサービスであり、実際にデプロイされるバックエンドのバージョンはこのリポジトリの `main` と完全一致する保証はない。**この差分に起因する仕様変更の可能性は [未検証]** とし、§7 の実機確認手順で埋める。
- 実行環境の制約: このセッションのネットワークポリシーは `docs.convex.dev` および `docs.rs` への直接アクセスを拒否した(`403 policy denial`、プロキシの `recentRelayFailures` で確認)。そのため本書の Convex 公式ドキュメントの引用は、`docs.convex.dev` を生成しているソースリポジトリ `get-convex/convex-backend` 内の `npm-packages/docs/docs/**/*.mdx`(ビルド前の Markdown ソースそのもの)を直接読んで行った。文面は公開サイトと同一のはずだが、サイト上のレンダリング結果そのものは目視確認できていない。

> 本書の主張にはすべて出典 URL を付す。一次ソース(公式ドキュメントの原文・Convex のオープンソースバックエンドのソースコード・`convex-test` のソースコード)で裏付けが取れなかったものは **[未検証]** と明記した。設計上の判断で一次情報からは直接導けないものは「推測」と明記した。

---

## 1. 要約

**結論**: `rows.content` / `days.memo` のような**空白区切りのない日本語自由記述**に対して、Convex 標準の `searchIndex` は「文中の任意の位置を含む部分一致」を実用的な精度では実現できない。理由は Convex のトークナイザ(Tantivy の `SimpleTokenizer` 相当)が**単語分割をせず、Unicode の英数字コードポイントが連続する区間をまるごと1トークンにする**ため、日本語の文はほぼ丸ごと1トークンになり、かつ**そのトークンが UTF-8 で32バイト(日本語で概ね10〜11文字)を超えると黙って索引から欠落する**という、一次ソース(Tantivy フォークのソースコード)から確認した挙動があるため(§3)。

このアプリの規模(所有者1名、1日数件〜十数件、1年で数千件オーダー)であれば、**(c) 所有者の対象文書をインデックスで読み TypeScript 側で `includes` 判定**が最も確実で実装コストも低い。(b) の書き込み時 bigram 索引は「入力中に検索結果が絞られる」体験を優先する場合の拡張であり、今の規模では過剰投資になりうる。

| 案 | 部分一致の精度 | reactive(購読の自動更新) | 実装量 | 読み取りコスト(このアプリの規模) | 備考 |
|---|---|---|---|---|---|
| **(a) `searchIndex` をそのまま使う** | 低い。日本語は語の連続がほぼ1トークン化され、10文字前後を超えると索引から脱落(§3)。前方一致は「クエリ最終語のみ」で「文書側トークンの先頭」からしか掛からない(§2) | ○(`withSearchIndex` は通常のクエリなので reactive) | 小(スキーマに `searchIndex` を1行追加するだけ) | 低い(検索エンジン側で完結) | 英語中心データなら妥当。日本語自由記述には不向き。10文字を超える「ひとこと」で無言の検索漏れが起きる |
| **(b) 書き込み時に bigram フィールドを生成し `searchIndex` を張る** | 中〜高。2文字ずつの重なり合うシャドウフィールドを作れば、各シャドウ「語」は最大でも数バイトなので32バイト上限に掛からず、クエリ側もbigram化すれば部分一致に近づく(§4.2)。ただし公式に案内された手法ではなく、本書での**設計上の推測** | ○(`searchIndex` である限り reactive) | 中(書き込みパスに変換処理を追加、二重フィールド管理) | 低い(検索エンジン側で完結、ただしインデックスサイズは増える) | 誤マッチ(異なる並びの文字が同じbigramの組を持つ場合)があるため、候補をTS側で`includes`により確定させるハイブリッドが必要 |
| **(c) `withIndex` で所有者の文書を読み、TS 側で `includes` 判定** | 高い(正確な部分文字列一致) | ○(通常の Convex クエリなので reactive) | 小(既存の `by_owner_and_...` インデックス + `.filter(Array#filter)` + `String#includes`) | このアプリの規模では低い。CVX-11 の「概ね1000件未満」やトランザクション上限(Documents scanned 32,000 / Data read 16 MiB、§4.3)に対し、1年数千件は十分小さい | 検索語を含むかどうかの判定を自前のロジックで完全制御できる。将来件数が数万件規模になったら再検討が必要 |

**推奨**: 今は **(c)** を採用し、`ownerId` + (ゴミ箱なら) `deletedAt` の複合インデックスで対象範囲を絞ってから `.collect()` し、TypeScript 側で正規化(小文字化・NFKC正規化など)した上で `String#includes` により判定する。入力補助(タイプアヘッド)や大量データ化など、体感速度が問題になった時点で (b) のbigram索引を追加検討する。(a) 単体は不採用(日本語の取りこぼしが構造的に発生するため)。

---

## 2. Convex full text search の公式仕様(設問1)

一次ソース: `get-convex/convex-backend` の公開ドキュメントソース [`npm-packages/docs/docs/search/text-search.mdx`](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx)(`docs.convex.dev/search/text-search` を生成しているファイルそのもの)、[`npm-packages/docs/docs/production/state/limits.mdx`](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/production/state/limits.mdx)、[`npm-packages/docs/docs/database/reading-data/indexes/indexes.mdx`](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/database/reading-data/indexes/indexes.mdx)、および TypeScript 型定義 [`npm-packages/convex/src/server/schema.ts`](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/src/server/schema.ts) / [`npm-packages/convex/src/server/search_filter_builder.ts`](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/src/server/search_filter_builder.ts)。

### 2.1 スキーマ定義側の制約

| 項目 | 値 | 出典 |
|---|---|---|
| `searchField` の数 | **ちょうど1つ**。型は `string` でなければならない(ドキュメント上の説明。ただし TypeScript の型制約自体は「フィールドパスが存在すること」しか強制していない。§3.4 参照) | [text-search.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx) "A `searchField` ... It must be of type `string`." |
| `filterFields` の数 | 任意個、**上限16** | [text-search.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx)、[limits.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/production/state/limits.mdx) "Filters per search index \| 16" |
| ネストしたフィールド | `properties.name` のようなドット区切りパスを `searchField`/`filterFields` に指定可能 | [text-search.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx) |
| `staged` フラグ | 任意 (`boolean`)。`true` にすると通常のインデックスと同様、デプロイ後に非同期でバックフィルされ、完了までクエリに使えない(大規模テーブル向け) | [text-search.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx) |
| テーブルあたりの search index 数 | **4**(明記された専用の上限) | [limits.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/production/state/limits.mdx) "Search indexes per table \| 4" |
| テーブルあたりの総インデックス数(DB index + search index + vector index 合算) | 32。search index もこの合計にカウントされる | [text-search.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx) "Search indexes count against the limit of 32 indexes per table."、[indexes.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/database/reading-data/indexes/indexes.mdx) "You can define 32 indexes on each table." |

**このアプリへの含意**: `rows`・`days`・`methods` はそれぞれ別テーブルなので、テーブルごとに4個までの search index 枠がある。`searchField` は1つしか持てないため、「ひとこと・メモ・方法本文を横断して1つの検索窓で探す」UI を作るなら、**テーブルごとに別々の `searchIndex` を定義し、クライアント側(または1つの action)で3クエリの結果をマージする**必要がある(§6)。

### 2.2 クエリ側の制約と挙動

| 項目 | 値 | 出典 |
|---|---|---|
| 検索フィルタ式の構造 | `q.search(field, query)` 1つ(検索対象フィールドへの唯一の検索式)+ `q.eq(filterField, value)` 0個以上、という順序の連鎖のみ | [text-search.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx)、[search_filter_builder.ts](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/src/server/search_filter_builder.ts) |
| クエリ内の検索語(word)数上限 | **16** | [limits.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/production/state/limits.mdx) "Terms per search query \| 16"、ソース: [`constants.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/constants.rs) `MAX_QUERY_TERMS: usize = 16` |
| クエリ内の `.eq` フィルタ式数上限 | **8** | [limits.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/production/state/limits.mdx) "Filters per search query \| 8"、ソース: [`constants.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/constants.rs) `MAX_FILTER_CONDITIONS: usize = 8` |
| 検索一致の意味論 | **OR**(クエリ中のいずれかの語が一致すれば候補になり、一致度でランキングされる)。AND ではない | [search_filter_builder.ts](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/src/server/search_filter_builder.ts) "This will do a full text search that returns results where **any word** of query appears in the field." |
| 返る件数の上限(索引からスキャンする候補数) | **1024**。`.collect()` はこれを超えると例外を投げる。`.take(n)` や `.paginate()` を推奨 | [text-search.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx)、[limits.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/production/state/limits.mdx) "Maximum result set \| 1024"、ソース: `MAX_CANDIDATE_REVISIONS: usize = 1024`([constants.rs](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/constants.rs)) |
| 関連度順(ordering) | 常に**関連度順のみ**。他の並び替えは不可。BM25 スコア + 一致箇所の近接度・完全一致数など複数要因の組み合わせ。**この計算式は今後変更されうる**、と明記。同スコアなら新しいドキュメントが先 | [text-search.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx) "Relevance order is subject to change." |
| prefix matching(前方一致) | クエリの**最後の語のみ**に前方一致が適用される(タイプアヘッド用)。例: `search("body", "r")` は `"rabbit"` にも `"send request"`(`request` の `r`)にもマッチしうる、という趣旨の例が docs にある | [text-search.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx) "Typeahead Search" |
| typo tolerance(fuzzy) | **非推奨・廃止済み**。「2025年1月15日以降、`"stake"` の打ち間違いに対して `"snake"` を結果に含めなくなる」と明記 | [text-search.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx) "Fuzzy search matches are deprecated." |
| reactive に再実行されるか | される。「search クエリは自動的に reactive・consistent・transactional。ミューテーションで作られた新規ドキュメントも含む」と明記。実装は通常の `db.query(...).withSearchIndex(...)` であり、他の Convex クエリと同じ購読の仕組みに乗る | [text-search.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx) |
| `.filter()` の追加 | `withSearchIndex` の後にも通常の `.filter()` を重ねられるが、**索引で絞った後に一件ずつ評価**されるため、絞り込みはできるだけ `filterFields`(`.eq`)に寄せることが公式に推奨されている | [text-search.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx) "For performance, always put as many of your filters as possible into `.withSearchIndex`." |
| 欠損フィールドの絞り込み | `q.eq("fieldName", undefined)` で「そのフィールドを持たない文書」に絞れる(公式に明記) | [text-search.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx) "To filter to documents that are missing a field, use `q.eq("fieldName", undefined)`." |

---

## 3. トークナイズの仕様と日本語での挙動(設問2)

### 3.1 公式ドキュメントの記述

Convex 公式ドキュメントはトークナイザの詳細を次のように明記している(CJK への直接の言及は無い):

> "Search indexes work best with English or other Latin-script languages. Text is tokenized using Tantivy's `SimpleTokenizer`, which splits on whitespace and punctuation. We also limit terms to 32 characters in length and lowercase them."

出典: [text-search.mdx "Limits"](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx)

ここで言う「32 characters」は、同じ公式ドキュメントの上限一覧表では次のように表現されている:

> "Maximum term length \| 32 B"

出典: [limits.mdx "Full text search"](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/production/state/limits.mdx)

**「32 characters」と「32 B(バイト)」という2つの言い回しが公式ドキュメント内で併存している**。英語(ASCII)なら1文字=1バイトなので違いが顕在化しないが、日本語では意味が大きく変わる。次節でソースコードから実装上の真実(バイト単位である)を確認する。

### 3.2 ソースコードで確認したトークナイザの実装(一次ソース: `get-convex/convex-backend` / フォーク版 `get-convex/tantivy`)

Convex の検索インデックスは Tantivy(Rust製の全文検索ライブラリ)上に構築されており、フォーク版 `get-convex/tantivy`(Cargo.toml でリビジョン `2bb95afa29cc2ac94e303ea68ca4e16222d8e777` に固定)を使う。Convex 独自のアナライザ `convex_en` は次の3段で構成される:

```rust
pub fn convex_en() -> TextAnalyzer {
    TextAnalyzer::from(SimpleTokenizer)
        .filter(RemoveLongFilter::limit(MAX_TEXT_TERM_LENGTH)) // = 32
        .filter(LowerCaser)
}
```
出典: [`crates/search/src/constants.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/constants.rs)

この `convex_en` は、書き込み時(索引構築)にもクエリ文字列の解析時にも**同一の関数**が使われる(索引側の登録: [`incremental_index.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/incremental_index.rs) `.register(CONVEX_EN_TOKENIZER, convex_en())` / クエリ側: [`query.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/query.rs) `pub fn tokenize(value: ConvexString) -> SearchValueTokens { let analyzer = convex_en(); ... }`)。**言語やロケールに応じてトークナイザを切り替えるオプションは公開 API に存在しない**(`SearchIndexConfig` の型定義に `searchField` / `filterFields` / `staged` 以外のオプションは無い。[`schema.ts`](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/src/server/schema.ts))。

#### (1) `SimpleTokenizer` — 単語分割はしない。「英数字コードポイントの連続」を1トークンにするだけ

```rust
impl<'a> SimpleTokenStream<'a> {
    fn search_token_end(&mut self) -> usize {
        (&mut self.chars)
            .filter(|(_, c)| !c.is_alphanumeric())
            .map(|(offset, _)| offset)
            .next()
            .unwrap_or(self.text.len())
    }
}
impl<'a> TokenStream for SimpleTokenStream<'a> {
    fn advance(&mut self) -> bool {
        ...
        while let Some((offset_from, c)) = self.chars.next() {
            if c.is_alphanumeric() {
                let offset_to = self.search_token_end();
                ...
                return true;
            }
        }
        false
    }
}
```
出典: [`get-convex/tantivy` `src/tokenizer/simple_tokenizer.rs`](https://github.com/get-convex/tantivy/blob/2bb95afa29cc2ac94e303ea68ca4e16222d8e777/src/tokenizer/simple_tokenizer.rs)

`char::is_alphanumeric()` は Rust 標準ライブラリの Unicode 一般カテゴリ判定で、ひらがな・カタカナ・漢字はいずれも Unicode の「文字(Letter)」カテゴリに属するため `true` を返す。つまりこのトークナイザは **形態素解析(MeCab/Sudachi 等)のような辞書ベースの分かち書きを一切行わない**。空白や句読点(`、` `。` `「` `」` など、英数字でない文字はすべて)で区切られた**連続する英数字(≒ラテン文字・数字・仮名・漢字を区別せず)の塊をまるごと1トークン**として扱う。

**具体例(このアプリの `rows.content` を想定)**:

| 入力(ひとこと) | トークン化結果(句読点等で自然に区切られる場合) |
|---|---|
| `"模試1(28/30)"` | `模試1`, `28`, `30`(`(` `)` `/` が非英数字として区切りに使われる) |
| `"英語の長文読解が苦手"`(句読点なし、10文字) | `英語の長文読解が苦手` という**1個のトークン**(§3.3 の理由でこれは32バイト未満のため生き残る) |
| `"今日は集中して長文読解の演習を継続的に行った"`(句読点なし、21文字) | 1個のトークンになろうとするが、UTF-8で21文字×3バイト=63バイトとなり **32バイト上限を超えるため丸ごと索引から脱落**(§3.3) |

#### (2) `RemoveLongFilter` — 上限は「文字数」ではなく「UTF-8バイト数」。超過分は切り詰めではなく**完全に削除**

```rust
/// Creates a `RemoveLongFilter` given a limit in bytes of the UTF-8 representation.
pub fn limit(length_limit: usize) -> RemoveLongFilter { ... }
impl<'a> RemoveLongFilterStream<'a> {
    fn predicate(&self, token: &Token) -> bool {
        token.text.len() < self.token_length_limit  // String::len() はバイト長
    }
}
```
出典: [`get-convex/tantivy` `src/tokenizer/remove_long.rs`](https://github.com/get-convex/tantivy/blob/2bb95afa29cc2ac94e303ea68ca4e16222d8e777/src/tokenizer/remove_long.rs)

Rust の `String::len()` はバイト長を返す。ドキュメント冒頭のコメントも "given a limit in **bytes** of the UTF-8 representation" と明記している。Convex はこれを `RemoveLongFilter::limit(32)` として使っている([`constants.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/constants.rs) の `MAX_TEXT_TERM_LENGTH: usize = 32`、コメント "the maximum length of a single text term? We will **silently drop** terms that exceed this length.")。

日本語の常用漢字・ひらがな・カタカナは UTF-8 で**1文字あたり3バイト**(基本多言語面、大多数の実用文字がここに収まる)。したがって:

> **句読点や空白を含まない日本語の連続した文字列は、およそ10〜11文字を超えると、索引からトークンごと完全に欠落する(切り詰めではなく削除)。**

これは英語話者を想定した「32文字≒長い英単語1つ分」という設計意図(コメント "It is especially useful when indexing unconstrained content. e.g. Mail containing base-64 encoded pictures etc." — Base64文字列のような巨大な塊を弾く目的)が、句読点のない日本語の通常の文には裏目に出る、という構造的な問題である。

#### (3) `LowerCaser` — 日本語には無関係(仮名・漢字に大文字小文字の区別はない)

全角/半角の英数字が `content` に混在するケースを除けば、この段は日本語部分には影響しない。

#### (4) タイポ許容関連の定数は残っているが、公式ドキュメント上は廃止済み

ソースには `EXACT_SEARCH_MAX_WORD_LENGTH`・`SINGLE_TYPO_SEARCH_MAX_WORD_LENGTH`・`MAX_EDIT_DISTANCE`・`levenshtein_dfa.rs` など fuzzy 検索(タイポ許容)関連のコードが今も存在する([`constants.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/constants.rs)、[`levenshtein_dfa.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/levenshtein_dfa.rs))が、§2.2 の通り公式ドキュメントは「2025年1月15日以降、fuzzy マッチは結果に出ない」と明記している。**ソースコードに実装が残っていることと、現在の本番挙動として有効であることは別**であり、本書では公式ドキュメントの記述(廃止済み)を現在の挙動として採用する。

### 3.3 まとめ: 日本語の単語一致・部分一致はどう振る舞うか(一次情報から導ける範囲)

1. **文書側**: 句読点・かぎ括弧・スペース・スラッシュなどで区切られた「まとまり」ごとに1トークンになる。日本語の自由記述は通常これらの区切りが少ないため、**1つの文がほぼ丸ごと1トークンになりやすい**。
2. **32バイト(≒10〜11文字)を超えるまとまりは、そのトークンが検索インデックスに一切乗らない**(§3.2-(2))。短いトークン(例: 助詞・句読点で区切られた短い語)だけが生き残る。
3. **クエリ側も同じ `convex_en` アナライザを通る**(§3.2 冒頭)ため、ユーザーが句読点なしの長い日本語文をそのまま検索ボックスに打つと、クエリ側のトークンも32バイト超で脱落し、有効な検索語が0個になりうる。
4. **前方一致はクエリの最終語のみ、かつトークンの先頭からしか掛からない**(§2.2)。文中の任意の位置に一致させる「部分一致」の意味論そのものが無い。トークンが「大きな塊」である日本語では、この前方一致もほぼ機能しない(トークン自体が長い文になっているため、その文の先頭からしか前方一致しない)。
5. 結論として、**Convex 標準の `searchIndex` は日本語の自由記述に対して「短い語(既に句読点等で区切られている場合)の完全一致に近いものしか拾えない」**。「ひとこと」「メモ」のような助詞を含む自然文の途中の単語で検索するユースケースには構造的に適合しない。

### 3.4 補足: `days.memo` のような `v.optional(v.string())` を `searchField` にできるか

TypeScript の型定義 `searchIndex<... SearchField extends ExtractFieldPaths<DocumentType> ...>`([`schema.ts`](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/src/server/schema.ts))は「フィールドパスが存在すること」だけを要求しており、値の型が `string` 単体か `string | undefined` かは型レベルで区別していない。バックエンド側の索引構築コードも:

```rust
if let Some(ConvexValue::String(s)) = document.value().get_path(&self.search_field_path) {
    tantivy_document.add_text(self.search_field, s);
}
```
出典: [`crates/search/src/lib.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/lib.rs) `index_into_tantivy_document`

`if let Some(ConvexValue::String(s))` は値が欠損(`undefined`)または文字列以外の場合に**エラーにせず単に索引に追加しない**。したがって `days.memo`(`v.optional(v.string())`)を `searchField` にしても、`memo` が未設定の日は単に検索対象に含まれないだけで、スキーマ上・実行時ともにエラーにはならない。

### 3.5 [未検証]の範囲と、実機で確認すべき最小のテスト手順

本書の §3.2-3.4 はいずれも一次ソース(公開されているソースコードそのもの)から論理的に導いた挙動であり、**実際に稼働している Convex デプロイでの目視確認はしていない**。特に次の点は [未検証]:

- Tantivy の BM25 スコアリングや「一致箇所の近接度」補正が、1トークンしかない極端に長い日本語文に対してどう振る舞うか(スコア計算自体はブラックボックス化されており、ソースの `scoring.rs` は読めるが実際の相対順位までは机上では確定しづらい)
- ダッシュボードや `npx convex logs` 等で、索引から実際に脱落したトークンを開発者が確認できる手段があるか(公開ドキュメント・型定義からは見つからなかった)
- マネージドの Convex Cloud が `main` ブランチと厳密に同じトークナイザ実装を配備しているか

これらを埋めるための最小の実機確認手順を2段階で示す。

#### 手順A: `convex-test` での最小疎通確認(API配線の確認まで。トークナイザの再現性は無い — 理由は後述)

```typescript
// convex/schema.ts に一時的なテスト用テーブルを足すか、既存 rows に準ずるテーブルで検証
const schema = defineSchema({
  memoProbe: defineTable({
    ownerId: v.string(),
    text: v.string(),
    deletedAt: v.optional(v.number()),
  }).searchIndex("by_text", {
    searchField: "text",
    filterFields: ["ownerId", "deletedAt"],
  }),
});

test("日本語の長い文はそのまま検索できるか(convex-test上の挙動)", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await ctx.db.insert("memoProbe", {
      ownerId: "u1",
      text: "英語の長文読解が苦手だったので集中的に演習した",
    });
  });
  const hit = await t.run((ctx) =>
    ctx.db
      .query("memoProbe")
      .withSearchIndex("by_text", (q) =>
        q.search("text", "長文読解").eq("ownerId", "u1"),
      )
      .collect(),
  );
  // ここで hit が空でも、convex-test の簡易実装のせいなのか
  // 本物の32バイト上限のせいなのかは区別できない(下記の注意参照)
});
```

**重要な注意(一次ソースから確認した `convex-test` の実装との乖離)**: `convex-test` 自身の検索シミュレーションは、Tantivy とは異なる簡易ロジックで実装されている。

```typescript
case "Search": {
  const queryTerms = filter.value.toLowerCase().split(/\s+/).filter((term) => term.length > 0);
  const documentWords = (result as string).split(/\s+/).map((word) => word.toLowerCase());
  return queryTerms.some((queryTerm) => documentWords.some((word) => word.startsWith(queryTerm)));
}
```
出典: [`get-convex/convex-test` `index.ts` `evaluateSearchFilter`](https://github.com/get-convex/convex-test/blob/20c89b800d5d5905d56c77d0535af3a5912e3d8c/index.ts#L1082-L1103)

この実装は **空白 (`/\s+/`) だけで分割し、句読点では分割しない**。**32バイト上限による脱落も一切シミュレートしない**。**BM25 による関連度順ソートもしない**(検索クエリの結果は `fieldPathsToSortBy = []` で、関連度順を再現しない。[`index.ts`](https://github.com/get-convex/convex-test/blob/20c89b800d5d5905d56c77d0535af3a5912e3d8c/index.ts#L733-L744))。つまり **`convex-test` は `withSearchIndex` / `.eq` の配線(検索フィルタとイコールフィルタの組み合わせ、`ownerId` 絞り込み、`deletedAt` の undefined 判定)を確認する用途には使えるが、日本語トークナイズの実際の挙動(32バイト脱落・句読点分割)を検証する手段にはならない**。

一方で `convex-test` 自身のテストスイートには、本書の設問4(ゴミ箱除外)と全く同型のテストがすでに存在する:

```typescript
test("withSearchIndex .eq with undefined values", async () => {
  const schema = defineSchema({
    messages: defineTable({
      body: v.string(),
      author: v.optional(v.string()),
      deletionTime: v.optional(v.number()),
    }).searchIndex("body", { searchField: "body", filterFields: ["author", "deletionTime"] }),
  });
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await ctx.db.insert("messages", { body: "Hello world", author: "alice" });
    await ctx.db.insert("messages", { body: "Goodbye world", author: "bob", deletionTime: 123456 });
  });
  const undefinedResults = await t.run((ctx) =>
    ctx.db.query("messages").withSearchIndex("body", (q) =>
      q.search("body", "world").eq("deletionTime", undefined),
    ).collect(),
  );
  expect(undefinedResults).toMatchObject([{ body: "Hello world", author: "alice" }]);
});
```
出典: [`get-convex/convex-test` `convex/searchFilterEq.test.ts`](https://github.com/get-convex/convex-test/blob/20c89b800d5d5905d56c77d0535af3a5912e3d8c/convex/searchFilterEq.test.ts)

このテストの `deletionTime` は本アプリの `rows.deletedAt` / `days.deletedAt` と全く同じ形(`v.optional(v.number())`)であり、そのまま流用してゴミ箱除外ロジックの単体テストの雛形にできる(§5)。

#### 手順B: `npx convex dev`(実バックエンド)での確認(トークナイザの実挙動を確かめるにはこちらが必須)

1. スキーマに `text: v.string()` を持つ使い捨てテーブルと `searchIndex` を1つ定義し、`npx convex dev` でローカル/開発デプロイに反映する。
2. 次の3種類のドキュメントを挿入する:
   - (i) 句読点なし・10文字以内の日本語(例: `"英語の長文読解"`, 7文字=21バイト)
   - (ii) 句読点なし・15文字以上の日本語(例: `"今日は集中して長文読解の演習を継続的に行った"`, 21文字=63バイト)
   - (iii) 句読点で区切られた日本語(例: `"模試1回目、28/30点でした。"`)
3. Convex ダッシュボードの関数実行(Functions タブ)またはテスト用の一時 `query` から、(ii) の文中の一部(例: `"長文読解"`)で `q.search(...)` を実行し、(ii) がヒットするかを確認する。**一次ソース(§3.2)からの予測はヒットしない**(トークンが63バイトで脱落するため)。
4. (i) の全文一致・前方一致でヒットするかを確認する(21バイト<32バイトなので予測はヒットする)。
5. (iii) が句読点位置で区切られた複数トークンとして扱われるか(例: `"模試1"` だけで検索して当たるか)を確認する。
6. 結果を本書に追記し、[未検証] の注記を外す。

---

## 4. 日本語で部分一致検索を成立させる代替案の比較(設問3)

前提: CVX-11 は「`.collect()` は結果セットが小さい(概ね1000件未満)場合のみ」「全件無条件の `.collect()` は禁止、インデックスで絞る」ことを求める。本アプリの規模は「1所有者・1日数件〜十数件・1年で数千件オーダー」(Issue本文の前提)であり、`rows`/`days` はいずれも `by_owner_and_date` または `by_owner_and_deletedAt` の複合インデックスを既に持つ(`convex/schema.ts`)。

### 4.1 (a) `searchIndex` をそのまま使う

- **精度**: §3 の通り、句読点のない自然文では実用的な部分一致にならない。CONTEXT.md の「ひとこと」の例(`"模試 1（28 / 30）"`)のように区切り記号が多い書き方なら短いトークンに割れて機能する可能性があるが、それを前提にできない(ユーザーの自由記述に強制はできない)。
- **reactive**: 標準の Convex クエリなので reactive(§2.2)。
- **実装量**: 最小(スキーマに `searchIndex` を1行追加するだけ)。
- **読み取りコスト**: 検索エンジン側(Tantivy)で完結するため、TypeScript 側の読み取り量は結果件数のみ。
- **リスク**: 「検索しても出てこない」という**無言の失敗**が起きる。ユーザーは「ひとこと」に書いた内容が検索できない理由を理解できない。

### 4.2 (b) 書き込み時に bigram(2文字単位)の文字列を別フィールドへ生成して `searchIndex` を張る

**設計の要点(公式に案内された手法ではなく、§3.2 のトークナイザ挙動から導いた「推測」の設計)**:

1. 書き込み(insert/patch)時に、`content` から生成した「重なり合う2文字ずつのシャドウ文字列」を追加フィールド(例: `contentBigrams: v.string()`)に保存する。例: `"長文読解"` → `"長文 文読 読解"`(スペース区切りで bigram を連結)。
2. `contentBigrams` に `searchField` を張る `searchIndex` を用意する。スペース区切りにしてあるため、`SimpleTokenizer` は各 bigram(2文字=UTF-8で最大6〜8バイト)を独立したトークンとして認識でき、**32バイト上限に一切引っかからない**(§3.2-(2) の欠落問題を構造的に回避できる)。
3. 検索時は、ユーザーの入力文字列も同じ規則で bigram 化してから `q.search("contentBigrams", bigram化した文字列)` に渡す。`.search()` は「いずれかの語が一致すれば候補になる」OR 意味論(§2.2)なので、bigram が複数一致するほど関連度スコアが上がり、**候補の絞り込みには使える**。
4. ただし bigram の一致は「同じ2文字の並びが両者に含まれる」ことしか保証せず、**元の文字列に本当にその部分文字列が含まれるかは保証しない**(異なる位置の bigram が偶然両方一致する場合、誤検出になりうる)。したがって、**bigram 索引はあくまで「候補を絞るための一次フィルタ」とし、最終的な真偽判定は候補ドキュメントに対して TypeScript 側で `content.includes(query)` を行うハイブリッド構成にする**ことを推奨する(このハイブリッド構成自体も一次ソースからの直接の指示ではなく「推測」)。
- **reactive**: `searchIndex` である以上、通常の Convex クエリと同じく reactive(§2.2)。
- **実装量**: 中。書き込みパス(insert/patch/delete の全経路)で bigram フィールドを同期する処理が要る(CVX-15: 関連する書き込みは同一トランザクション内で完結させる、と整合させる必要がある)。フィールドが二重管理になるため、生成ロジックの単体テストも要る。
- **コスト**: インデックスサイズは元データの2〜3倍程度に増える(bigram はオーバーラップするため元の文字数に近い数のトークンが生成される)。Search storage の課金は共有の GB 単位([limits.mdx "Search pricing"](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/production/state/limits.mdx))だが、本アプリの規模(数千件/年、1件あたり数十文字)では無視できる量。
- **向いている場面**: 入力中に候補が絞られる体験(タイプアヘッド)を将来的に提供したい場合。

### 4.3 (c) 所有者の対象文書をインデックスで読み、TypeScript 側で `includes` 判定

- **精度**: 完全な部分文字列一致(`String#includes`)であり、取りこぼしがない。大文字小文字や全角半角の正規化もTypeScript側で自由に制御できる(例: `String#normalize("NFKC")` を通してから比較する、といった調整が可能)。
- **reactive**: 通常の Convex `query` はすべて reactive なので、この方式でも当然 reactive(§CVX-14 の通り `dateJst` などの「今」に依存する値だけクライアントから渡す必要がある点に注意)。
- **実装量**: 最小。既存の `by_owner_and_date` / `by_owner_and_deletedAt` インデックスで `withIndex` を使い、その後 TypeScript の `Array#filter` + `String#includes` を通すだけ。新しいスキーマ変更もバックフィルも不要。
- **読み取りコスト**: `.withIndex("by_owner_and_deletedAt", q => q.eq("ownerId", ownerId))` で1所有者の該当テーブル全件を `.collect()` する形になる。
  - CVX-11 の目安「概ね1000件未満」に対して、1年数千件は超える可能性があるが、Convex のトランザクション上限(1関数呼び出しあたり Documents scanned 32,000 / Data read 16 MiB。[limits.mdx "Transactions"](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/production/state/limits.mdx))には全く届かない規模である。
  - ただし「所有者が何年も使い続けた結果、数万件になった」場合は CVX-11 の目安を明確に超えるため、その時点で日付範囲を絞る(例: 直近1年分だけを対象にする、`dateJst` の範囲で `withIndex` を絞る)設計変更が要る。**この閾値超えは推測(現時点のデータからの外挿)であり、実測値ではない**。
- **向いている場面**: 現在の規模(所有者1〜2名、数千件/年)。実装コストと精度のバランスが最も良い。

### 4.4 比較のまとめ

§1 の表を参照。CVX-11 の観点(「.collect() は小さい結果セットのみ」)は (c) がインデックスで `ownerId` に絞った上での `.collect()` である限り満たされる(CVX-11 が禁止するのは「インデックス条件のない `.collect()`」であり、インデックスで絞った上での `.collect()` 自体は容認されている。`.claude/rules/convex-rules.md` CVX-11)。

---

## 5. `ownerId` でのスコープ絞り込みとゴミ箱除外(設問4)

### 5.1 `ownerId` によるスコープ絞り込み

`filterFields` に `ownerId` を加え、`q.eq("ownerId", ownerId)` で絞り込むのが標準的な使い方であり、公式ドキュメントの例そのもの(`channel` を `ownerId` に読み替えるだけ)である([text-search.mdx](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx) の `eq("channel", "#general")` 参照)。

```ts
// convex/schema.ts の rows テーブルへの追加例(searchIndex案を採る場合)
rows: defineTable({ ... })
  .searchIndex("search_content", {
    searchField: "content",
    filterFields: ["ownerId", "deletedAt", "dateJst"],
  })
```

`filterFields` の上限16に対し、`ownerId` / `deletedAt` / `dateJst` の3つは十分に収まる(§2.1)。

### 5.2 `deletedAt` を持つゴミ箱の記録の除外

`rows.deletedAt` / `days.deletedAt` はいずれも `v.optional(v.number())`。§2.2 の通り、公式ドキュメントは「`q.eq("fieldName", undefined)` で、そのフィールドを持たない(=未削除の)文書に絞れる」と明記している。この挙動は `convex-test` のテストでも直接確認できる(§3.5 手順Aで引用した `withSearchIndex .eq with undefined values` テスト、`deletionTime` が本アプリの `deletedAt` と同型)。

```ts
const results = await ctx.db
  .query("rows")
  .withSearchIndex("search_content", (q) =>
    q.search("content", query).eq("ownerId", ownerId).eq("deletedAt", undefined),
  )
  .take(20);
```

`convex-test` にはさらに **`undefined` と `null` を区別する**テストも存在する(`status: v.optional(v.union(v.string(), v.null()))` に対し `eq("status", undefined)` と `eq("status", null)` が異なる結果を返す)([`get-convex/convex-test` `convex/searchFilterEq.test.ts`](https://github.com/get-convex/convex-test/blob/20c89b800d5d5905d56c77d0535af3a5912e3d8c/convex/searchFilterEq.test.ts))。本アプリの `deletedAt` は `v.optional(v.number())` で `v.null()` を含まないため、この区別自体は問題にならないが、**`deletedAt: undefined` と誤って `deletedAt: null` を書き込むコードが混入すると `eq("deletedAt", undefined)` で除外されなくなる**ため、書き込み側のバリデータが `v.optional(v.number())` のままであることを保つ必要がある。

(c) 案(TypeScript 側で判定)を採る場合も同様に、`withIndex("by_owner_and_deletedAt", q => q.eq("ownerId", ownerId).eq("deletedAt", undefined))` で同じ絞り込みができる(こちらは Convex の一般的な `withIndex` の挙動であり、`schema.ts` に既存の `by_owner_and_deletedAt` インデックスがそのまま使える)。

---

## 6. 検索結果を「日へのリンク」として返す設計上の注意(設問5)

### 6.1 `dateJst` を返却 DTO に含める

- `rows` テーブルは `dayId: v.id("days")` に加えて **`dateJst: v.string()` を非正規化して既に持っている**(`convex/schema.ts`)。したがって `rows.content` の検索結果から「その記録がある日」へのリンクを作るのに、`days` への追加の読み取り(join)は不要で、検索結果の `dateJst` をそのままクライアントに返せばよい。
- `days` テーブル自身は `dateJst` が主キー相当のフィールドなので、`days.memo` の検索結果はそのまま `dateJst` を持つ。
- `filterFields` に `dateJst` を含めておけば、「特定期間内だけを検索」のような追加の絞り込み(`.eq` のみ対応。範囲指定は `.eq` では不可なので、範囲を絞りたい場合は `withSearchIndex` の後に通常の `.filter()` を重ねるか、TypeScript 側で候補を絞る)にも使える。ただし「常に返す」なら `filterFields` に入れる必要はなく、返却 DTO のプロジェクションとして `dateJst` を含めるだけで足りる。
- `methods.bodyText` は日に紐づかない概念(`CONTEXT.md`「方法カタログ」は「記録・未着手・プリセット・目標のどれにも触れない(参照専用)」と明記)なので、**この検索結果だけは「日へのリンク」を持たせようがない**。UI 上は方法カタログの該当カード(レーン内の位置)へのリンクにする設計が必要になる。

### 6.2 3テーブル横断の検索窓を作る場合の設計

§2.1 の通り `searchField` は1テーブルにつき1個までであり、かつ `rows` / `days` / `methods` は別テーブルなので、**1つの `searchIndex` で3フィールドを串刺しに検索することはできない**。「1つの検索窓でひとこと・メモ・方法本文を横断検索する」UI にするなら:

1. `rows`(`content`)・`days`(`memo`)・`methods`(`bodyText`)にそれぞれ独立した `searchIndex`(または (c) 案なら独立した `withIndex` 読み取り)を用意する。
2. それらを呼び出す `query`(または集約が必要なら `action` 経由で複数の `internalQuery` を呼ぶ。CVX-07 の「action内でのシーケンシャルな `ctx.runQuery` の多用は避ける」がここで関係するが、3つの独立した読み取りをまとめて1回で行うぶんには大きな問題にならない)。
3. クライアント側(またはサーバー側の集約関数)で3種類の結果を1つのリストにマージし、種別(記録/日メモ/方法)ごとに異なる遷移先(日ページ or 方法カタログ)を出し分ける。

### 6.3 ハイライト(一致箇所の強調表示)はクライアント側で行う必要がある

Convex の検索インターフェース(`SearchFilterBuilder` / `SearchFilterFinalizer` / 通常の `Query`)の TypeScript 型定義([`search_filter_builder.ts`](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/src/server/search_filter_builder.ts))を確認した限り、**一致箇所の位置(オフセット)やハイライト用のスニペットを返す API は存在しない**。`.search()` はスコアリングに使うだけで、返る値は通常のドキュメント(`.collect()` / `.take()` などで得られる完全なドキュメント)であり、一致位置の情報は一切含まれない。

したがって、検索結果の一覧でクエリ文字列を太字にするなどのハイライトは、**返ってきたドキュメントの `content` / `memo` / `bodyText` に対して、クライアント側で(あるいはサーバー側で DTO を組み立てる際に)クエリ文字列を素朴な文字列検索(`String#indexOf` や正規表現)で再度探し、その位置を使って表示を作る**しかない。

ここで注意が必要なのは、**(a) 案(`searchIndex` そのまま)を採る場合、Convex 側のトークン一致とクライアント側の文字列一致は別物**という点である。Convex が(たまたま短いトークンで)ヒットさせた文書に対し、クライアント側でクエリ文字列をそのまま `indexOf` しても、日本語は分かち書きされていないため**トークン境界とは無関係に**素直な部分文字列探索で問題なく位置が取れる(むしろクライアント側の方が Convex のトークン境界に引きずられず正確にハイライトできる)。(c) 案(TypeScript 側で `includes` 判定)を採る場合は、判定に使った位置情報(`String#indexOf` の戻り値)をそのままハイライトにも流用できるため、この観点でも (c) 案は実装が単純である。

---

## 7. 未解決点・今後の実機確認事項

1. §3.5 手順B(`npx convex dev` での実機確認)を実施し、[未検証] としたトークナイザの実挙動(32バイト脱落・句読点分割・BM25順位)を確定させること。
2. マネージドの Convex Cloud に実際にデプロイされているバックエンドのバージョンが、本書で参照した `get-convex/convex-backend` `main` ブランチの実装と一致するかどうかは未確認。将来的な仕様変更(例: CJK 対応トークナイザの追加)がある場合は、Convex の公式 CHANGELOG(`docs.convex.dev` または `get-convex/convex-backend` の `npm-packages/convex/CHANGELOG.md`)を確認し直すこと。
3. (b) bigram 案を実装する場合の具体的なバイグラム生成関数(NFKC正規化の要否、サロゲートペア文字・絵文字が `content` に含まれた場合の扱いなど)は、CVX-09 に従い `convex/services/<domain>/` に副作用のない純粋関数として切り出し、`convex-test` ではなく **文字列変換のみを検証する通常の単体テスト**(convex-test 不要)でカバーする設計にすること。

---

## 参考文献

Convex 公式ドキュメント(ソース: `get-convex/convex-backend`。コミット `830d181b7acb65508304ac499553422111a90eb2` 時点):

- [Full Text Search (text-search.mdx)](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/text-search.mdx) — `docs.convex.dev/search/text-search` のソース
- [AI & Search Overview (overview.mdx)](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/search/overview.mdx)
- [Limits (limits.mdx)](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/production/state/limits.mdx) — `docs.convex.dev/production/state/limits` のソース
- [Indexes (indexes.mdx)](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/database/reading-data/indexes/indexes.mdx)
- [CHANGELOG.md (convex npm package)](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/CHANGELOG.md)

Convex ソースコード(Rust、`get-convex/convex-backend`):

- [`crates/search/src/constants.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/constants.rs) — `MAX_QUERY_TERMS`, `MAX_TEXT_TERM_LENGTH`, `MAX_CANDIDATE_REVISIONS`, `MAX_FILTER_CONDITIONS`, `convex_en()` の定義
- [`crates/search/src/lib.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/lib.rs) — `index_into_tantivy_document`, `index_into_terms`(欠損フィールドの扱い)
- [`crates/search/src/query.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/query.rs) — `TextQueryTerm::Exact`/`Prefix`(最終語のみ前方一致)、`tokenize()`
- [`crates/search/src/incremental_index.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/incremental_index.rs) / [`crates/search/src/disk_index.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/search/src/disk_index.rs) — `CONVEX_EN_TOKENIZER` の登録
- [`crates/common/src/bootstrap_model/index/text_index/index_config.rs`](https://github.com/get-convex/convex-backend/blob/main/crates/common/src/bootstrap_model/index/text_index/index_config.rs)

Convex ソースコード(TypeScript、`get-convex/convex-backend` 内 `npm-packages/convex`):

- [`src/server/schema.ts`](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/src/server/schema.ts) — `SearchIndexConfig`, `TableDefinition.searchIndex()`
- [`src/server/search_filter_builder.ts`](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/src/server/search_filter_builder.ts) — `SearchFilterBuilder`, `SearchFilterFinalizer`(ハイライト用APIが無いことの根拠)

Tantivy フォーク(`get-convex/tantivy`。リビジョン `2bb95afa29cc2ac94e303ea68ca4e16222d8e777`):

- [`src/tokenizer/simple_tokenizer.rs`](https://github.com/get-convex/tantivy/blob/2bb95afa29cc2ac94e303ea68ca4e16222d8e777/src/tokenizer/simple_tokenizer.rs) — `char::is_alphanumeric()` による分割ロジック
- [`src/tokenizer/remove_long.rs`](https://github.com/get-convex/tantivy/blob/2bb95afa29cc2ac94e303ea68ca4e16222d8e777/src/tokenizer/remove_long.rs) — バイト数上限であることの根拠

`convex-test`(`get-convex/convex-test`。コミット `20c89b800d5d5905d56c77d0535af3a5912e3d8c`):

- [`index.ts` (`evaluateSearchFilter`ほか)](https://github.com/get-convex/convex-test/blob/20c89b800d5d5905d56c77d0535af3a5912e3d8c/index.ts) — 簡易シミュレーションの実装(空白のみで分割、32バイト上限なし、関連度ソートなし)
- [`convex/searchFilterEq.test.ts`](https://github.com/get-convex/convex-test/blob/20c89b800d5d5905d56c77d0535af3a5912e3d8c/convex/searchFilterEq.test.ts) — `deletionTime`(`v.optional(v.number())`)に対する `eq(..., undefined)` のテスト。本アプリの `deletedAt` 除外ロジックの雛形
- [`convex/textSearch.ts`](https://github.com/get-convex/convex-test/blob/20c89b800d5d5905d56c77d0535af3a5912e3d8c/convex/textSearch.ts)

このリポジトリ内(`sc30gsw/cairn`):

- `convex/schema.ts`
- `CONTEXT.md`
- `.claude/rules/convex-rules.md`(CVX-10, CVX-11, CVX-14, CVX-15)
- `convex/_generated/ai/guidelines.md`("Full text search guidelines" 節)
- Issue [#70](https://github.com/sc30gsw/cairn/issues/70) / [#66](https://github.com/sc30gsw/cairn/issues/66)
