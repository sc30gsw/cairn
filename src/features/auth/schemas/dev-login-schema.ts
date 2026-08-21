import * as v from "valibot";

export const DevLoginSchema = v.object({
  email: v.pipe(
    v.string("メールアドレスを入力してください"),
    v.nonEmpty("メールアドレスを入力してください"),
    v.email("メールアドレスの形式が正しくありません"),
  ),
  password: v.pipe(
    v.string("パスワードを入力してください"),
    v.nonEmpty("パスワードを入力してください"),
    v.minLength(8, "パスワードは8文字以上にしてください"),
  ),
});
