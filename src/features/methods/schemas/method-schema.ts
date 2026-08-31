import * as v from "valibot";

export const MethodTitleSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "方法のタイトルは必須です")),
});

//? 開いたカードの Formisch フォームは タイトル + 本文(textarea)。完了条件・メモは TipTap が持ち、
//? 保存時に editor.getHTML() を合流させる(空を許す — 参照専用のカタログに確定ゲートは無い)。
export const MethodEditSchema = v.object({
  bodyText: v.string(),
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "方法のタイトルは必須です")),
});
