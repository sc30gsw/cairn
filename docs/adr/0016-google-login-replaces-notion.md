---
status: accepted
---

# ログインの外部プロバイダを Notion から Google に替え、アカウント連携を有効にする

カレンダー同期（[ADR-0017](./0017-google-calendar-two-way-sync.md)）は Google カレンダー API を所有者の Google アカウントで
叩く必要があり、Notion ログインの OAuth トークンでは何もできない（Notion カレンダーには公開 API が無く、Google アカウント
経由でしか予定を表示できない）。そこで Better Auth の `socialProviders` から Notion を外し、Google を唯一の外部ログインにする。
email / username / password とパスキーのログインは残す（Google 障害時の逃げ道）。

Better Auth の **アカウント連携を有効にする**（ADR-0009「アカウント連携は v1 では行わない」を覆す）。`trustedProviders: ["google"]`
で、Google のメールが既存ユーザーのメールと一致すればサインイン時に同じユーザーへ自動で繋ぎ、Notion ログインで作られた
ユーザーのデータをそのまま引き継ぐ。メールが一致しない既存ユーザーは移行せず、新規ユーザーとして扱う（利用者は実質2人で、
手で作り直せる範囲）。`allowDifferentEmails: true` も付け、パスワードでログインしている人が別メールの Google アカウントを
連携できるようにする（連携はログイン中の本人が明示的に押す操作なので、メール一致を求めない）。

カレンダーの権限はログイン時に求めず、マイページの「Google カレンダーと連携」で追加で求める（段階的認可、`linkSocial` に
`scopes` を渡す）。Google でログインしただけでは同期は始まらない。リフレッシュトークンを得るため Google プロバイダは
`accessType: "offline"` にする。

**Considered Options:** Notion を残して Google を「連携専用」に足す案（ログイン手段が3つになり、Notion トークンは
用途が無いのに暗号化保存し続ける）、Better Auth を通さず自前で Google OAuth とトークン保管を実装する案（秘密情報の
管理・リフレッシュ・失効を自分で持つことになる）、ログイン時にカレンダー権限まで一括で求める案（初回の同意画面が重く、
同期を使わない人にも権限を求める）。

**Consequences:** `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` は `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` に替わる。
`publicConfig.notionSignIn` は `googleSignIn` になる。Google の OAuth 同意画面は Calendar のスコープ（sensitive）を含むため、
公開するなら Google の審査が要る（テストユーザー登録なら不要）。ADR-0001 と ADR-0009 の「Notion OAuth」の記述は履歴として
残し、本 ADR が現状を表す。
