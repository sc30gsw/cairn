# Account sign-up and sign-in

Account auth lets a visitor create a username + email + password account, skip optional passkey setup, reach the signed-in shell, sign out, and sign back in with the same credentials.

## Sub-features

- `auth-signup` creates an account from the login card and lands in the signed-in app.
- `auth-passkey-skip` dismisses the post-signup passkey dialog without registering a credential.
- `auth-signout` returns the visitor to the login card.
- `auth-signin` signs the same account back in from `ログイン`.

## How to get to it (user POV)

- Open `/` while signed out. The login card titled `学習ログ` is the only screen.
- Choose `新規登録` or `ログイン` on the segmented control.
- After signup, a modal asks `パスキーを登録しますか？`.
- While signed in, open `アカウントメニュー` and choose `ログアウト`.

## Driving it with playwright-cli

Preconditions:

- `control-cairn doctor` is OK at `http://127.0.0.1:3000/`.
- The chosen username `vfy_<runid>` does not already exist on this Convex deployment.
- Playwright session `cairn-verify-$CAIRN_VERIFY_RUN_ID` is open at `/` and at least 1280px wide.

- **Open signup.** Choose `新規登録`. Run `playwright-cli -s="$SESSION" click "getByRole('radio', { name: '新規登録' })"`. If the snapshot shows a tab or button instead of a radio, click that control whose name is `新規登録`. The fields `ユーザー名`, `表示名`, `メールアドレス`, and `パスワード` are visible, and the submit button reads `アカウントを作成`.
- **Fill account.** Run `playwright-cli -s="$SESSION" fill "getByLabel('ユーザー名')" "vfy_<runid>"`, then the same for `表示名` (`Verify <runid>`), `メールアドレス` (`vfy-<runid>@example.test`), and `パスワード` (`Verify1!cairn`). Each field shows the typed value.
- **Create account.** Run `playwright-cli -s="$SESSION" click "getByRole('button', { name: 'アカウントを作成' })"`. Either the signed-in shell appears (right-rail nav `日`) or the dialog `パスキーを登録しますか？` opens.
- **Skip passkey.** If the dialog is open, run `playwright-cli -s="$SESSION" click "getByRole('button', { name: 'あとで' })"`. The dialog closes. The page shows nav links including `日` and the `アカウントメニュー` button.
- **Dismiss setup if needed.** If an alert `はじめのセットアップ` covers the page, run `playwright-cli -s="$SESSION" click "getByRole('button', { name: 'あとで設定' })"` before asserting the day page. Signup is still proven by the nav + account menu, not by dismissing setup.
- **Sign out.** Run `playwright-cli -s="$SESSION" click "getByRole('button', { name: 'アカウントメニュー' })"` then `playwright-cli -s="$SESSION" click "getByRole('menuitem', { name: 'ログアウト' })"`. The login card heading `学習ログ` and button `ログイン` return.
- **Sign in.** Choose `ログイン` if needed. Fill `ユーザー名またはメールアドレス` with `vfy_<runid>` and `パスワード` with `Verify1!cairn`. Run `playwright-cli -s="$SESSION" click "getByRole('button', { name: 'ログイン' })"`. The signed-in shell returns with nav `日`.
- **Proof.** Capture the signed-in shell. Run `playwright-cli -s="$SESSION" --raw snapshot > "$ART/signed-in.aria.yml"` and `playwright-cli -s="$SESSION" screenshot --filename="$ART/signed-in.png"`. Both identify `学習ログ` or `日` and `アカウントメニュー`. Write `proof.txt` with feature ID `auth-signin` and entry `ログイン`.

## Gotchas

- Username allows only ASCII letters, digits, and underscore, minimum 3 characters. Hyphens fail validation.
- Password minimum is 8 characters. `Verify1!cairn` meets it.
- Sign-up is rate-limited (`/sign-up/email` max 3 per 60s). A unique `runid` avoids collisions; retries in the same minute can fail with a Japanese error under the form.
- `パスキーでログイン` and `Notion でログイン` are not this feature. Do not click them for default proof.
- If `AUTH_DISABLE_SIGNUP` is set on the Convex deployment, the segmented control disappears and only `ログイン` remains. Report that precondition instead of inventing a signup path.
- After signup the home stepper may appear. It is not a failed login.
