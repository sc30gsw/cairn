//* Better Auth の username / password 制約の SSoT。
//? better-auth はこれらのオプションを省略するとプラグイン内蔵のデフォルト値
//? (username: min 3 / max 30 / `/^[a-zA-Z0-9_.]+$/`、emailAndPassword: min 8)に暗黙で
//? フォールバックする。convex/auth.ts (プラグインオプション) と
//? src/lib/validation/account-fields.ts (Valibot) がここを読み、値を明示的に揃える(CVX-16)。
export const USERNAME_MIN_LENGTH = 3;

export const USERNAME_MAX_LENGTH = 30;

//* 英数字とアンダースコアのみ許可。better-auth の既定バリデータはドット(`.`)も許可するが、
//? このプロジェクトはドットを許可しない、より厳しい制約を意図的に採用している。
export const USERNAME_PATTERN = /^[\dA-Za-z_]+$/;

export const PASSWORD_MIN_LENGTH = 8;
