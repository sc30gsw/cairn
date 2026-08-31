export type AuthErrorContext =
  | "addPasskey"
  | "changePassword"
  | "deletePasskey"
  | "listPasskeys"
  | "signIn"
  | "signInPasskey"
  | "signUp"
  | "updateImage"
  | "updateName"
  | "updateUsername";

type AuthClientError = {
  code?: string;
  message?: string;
};

type AuthErrorCode = keyof typeof AUTH_ERROR_MESSAGES;

const CONTEXT_FALLBACKS = {
  addPasskey: "パスキーの登録に失敗しました。時間をおいて、もう一度お試しください。",
  changePassword: "パスワードの更新に失敗しました。入力内容を確認して、もう一度お試しください。",
  deletePasskey: "パスキーの削除に失敗しました。時間をおいて、もう一度お試しください。",
  listPasskeys: "パスキー一覧の取得に失敗しました。ページを更新して、もう一度お試しください。",
  signIn: "ログインに失敗しました。ユーザー名・メールアドレスとパスワードを確認してください。",
  signInPasskey:
    "パスキーでのログインに失敗しました。別の方法でログインするか、もう一度お試しください。",
  signUp: "登録に失敗しました。入力内容を確認して、もう一度お試しください。",
  updateImage: "アイコンの更新に失敗しました。時間をおいて、もう一度お試しください。",
  updateName: "表示名の更新に失敗しました。入力内容を確認して、もう一度お試しください。",
  updateUsername: "ユーザー名の更新に失敗しました。入力内容を確認して、もう一度お試しください。",
} as const satisfies Record<AuthErrorContext, string>;

const AUTH_ERROR_MESSAGES = {
  AUTH_CANCELLED: "パスキーの認証がキャンセルされました。もう一度お試しください。",
  AUTHENTICATION_FAILED:
    "パスキーでの認証に失敗しました。別の方法でログインするか、もう一度お試しください。",
  CHALLENGE_NOT_FOUND: "パスキーの認証が期限切れです。もう一度お試しください。",
  CREDENTIAL_ACCOUNT_NOT_FOUND:
    "パスワードが設定されていないアカウントです。別の方法でログインしてください。",
  EMAIL_ALREADY_VERIFIED: "メールアドレスはすでに確認済みです。",
  EMAIL_CAN_NOT_BE_UPDATED: "メールアドレスは変更できません。",
  EMAIL_MISMATCH: "メールアドレスが一致しません。入力内容を確認してください。",
  EMAIL_NOT_VERIFIED: "メールアドレスが未確認です。確認メールを確認してください。",
  FAILED_TO_CREATE_SESSION: "セッションの作成に失敗しました。もう一度ログインしてください。",
  FAILED_TO_UPDATE_PASSKEY: "パスキーの更新に失敗しました。もう一度お試しください。",
  FAILED_TO_UPDATE_USER: "プロフィールの更新に失敗しました。入力内容を確認してください。",
  FAILED_TO_VERIFY_REGISTRATION: "パスキーの登録確認に失敗しました。もう一度お試しください。",
  INVALID_DISPLAY_USERNAME: "表示用ユーザー名の形式が正しくありません。",
  INVALID_EMAIL: "メールアドレスの形式が正しくありません。",
  INVALID_EMAIL_OR_PASSWORD:
    "メールアドレスまたはパスワードが正しくありません。入力内容を確認してください。",
  INVALID_NAME: "表示名を確認してください。50文字以内で入力してください。",
  INVALID_ORIGIN: "リクエスト元が不正です。ページを更新して、もう一度お試しください。",
  INVALID_PASSWORD: "パスワードが正しくありません。入力内容を確認してください。",
  INVALID_TOKEN: "リンクの有効期限が切れています。最初からやり直してください。",
  INVALID_USERNAME: "ユーザー名の形式が正しくありません。",
  INVALID_USERNAME_OR_PASSWORD:
    "ユーザー名またはパスワードが正しくありません。入力内容を確認してください。",
  PASSKEY_NOT_FOUND: "パスキーが見つかりません。一覧を更新して、もう一度お試しください。",
  PASSWORD_ALREADY_SET: "パスワードはすでに設定されています。",
  PASSWORD_TOO_LONG: "パスワードが長すぎます。文字数を減らしてください。",
  PASSWORD_TOO_SHORT: "パスワードは8文字以上にしてください。",
  PREVIOUSLY_REGISTERED: "このパスキーはすでに登録されています。別の端末名で登録してください。",
  REGISTRATION_CANCELLED: "パスキーの登録がキャンセルされました。もう一度お試しください。",
  SESSION_EXPIRED: "セッションの有効期限が切れました。もう一度ログインしてください。",
  SESSION_REQUIRED: "パスキーを登録するには、先にログインしてください。",
  TOKEN_EXPIRED: "リンクの有効期限が切れています。最初からやり直してください。",
  UNABLE_TO_CREATE_SESSION: "セッションの作成に失敗しました。もう一度ログインしてください。",
  USER_ALREADY_EXISTS:
    "このメールアドレスはすでに登録されています。ログインするか、別のメールアドレスを使ってください。",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "このメールアドレスはすでに登録されています。別のメールアドレスを使ってください。",
  USERNAME_IS_ALREADY_TAKEN: "このユーザー名はすでに使われています。別の名前を選んでください。",
  USERNAME_TOO_LONG: "ユーザー名が長すぎます。文字数を減らしてください。",
  USERNAME_TOO_SHORT: "ユーザー名が短すぎます。文字数を増やしてください。",
  USER_NOT_FOUND: "ユーザーが見つかりません。入力内容を確認してください。",
  YOU_ARE_NOT_ALLOWED_TO_REGISTER_THIS_PASSKEY:
    "このパスキーは登録できません。別の端末で登録するか、管理者に問い合わせてください。",
} as const satisfies Record<string, string>;

const AUTH_ERROR_ENGLISH_TO_CODE = {
  "auth cancelled": "AUTH_CANCELLED",
  "authentication failed": "AUTHENTICATION_FAILED",
  "challenge not found": "CHALLENGE_NOT_FOUND",
  "credential account not found": "CREDENTIAL_ACCOUNT_NOT_FOUND",
  "email already verified": "EMAIL_ALREADY_VERIFIED",
  "email can not be updated": "EMAIL_CAN_NOT_BE_UPDATED",
  "email mismatch": "EMAIL_MISMATCH",
  "email not verified": "EMAIL_NOT_VERIFIED",
  "failed to create session": "FAILED_TO_CREATE_SESSION",
  "failed to update passkey": "FAILED_TO_UPDATE_PASSKEY",
  "failed to update user": "FAILED_TO_UPDATE_USER",
  "failed to verify registration": "FAILED_TO_VERIFY_REGISTRATION",
  "invalid display username": "INVALID_DISPLAY_USERNAME",
  "invalid email": "INVALID_EMAIL",
  "invalid email or password": "INVALID_EMAIL_OR_PASSWORD",
  "invalid name": "INVALID_NAME",
  "invalid origin": "INVALID_ORIGIN",
  "invalid password": "INVALID_PASSWORD",
  "invalid token": "INVALID_TOKEN",
  "invalid username": "INVALID_USERNAME",
  "invalid username or password": "INVALID_USERNAME_OR_PASSWORD",
  "email already registered": "USER_ALREADY_EXISTS",
  "not found": "PASSKEY_NOT_FOUND",
  "password already set": "PASSWORD_ALREADY_SET",
  "password too long": "PASSWORD_TOO_LONG",
  "password too short": "PASSWORD_TOO_SHORT",
  "previously registered": "PREVIOUSLY_REGISTERED",
  "registration cancelled": "REGISTRATION_CANCELLED",
  "session expired. re-authenticate to perform this action.": "SESSION_EXPIRED",
  "passkey registration requires an authenticated session": "SESSION_REQUIRED",
  "token expired": "TOKEN_EXPIRED",
  "unable to create session": "UNABLE_TO_CREATE_SESSION",
  "user already exists": "USER_ALREADY_EXISTS",
  "user already exists. use another email.": "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
  "username is already taken. please try another.": "USERNAME_IS_ALREADY_TAKEN",
  "username too long": "USERNAME_TOO_LONG",
  "username too short": "USERNAME_TOO_SHORT",
  "user not found": "USER_NOT_FOUND",
  "passkey not found": "PASSKEY_NOT_FOUND",
  "wrong password": "INVALID_PASSWORD",
  "you are not allowed to register this passkey": "YOU_ARE_NOT_ALLOWED_TO_REGISTER_THIS_PASSKEY",
} as const satisfies Record<string, AuthErrorCode>;

const CONTEXT_CODE_OVERRIDES: Partial<
  Record<AuthErrorContext, Partial<Record<AuthErrorCode, string>>>
> = {
  changePassword: {
    INVALID_PASSWORD: "現在のパスワードが正しくありません。もう一度入力してください。",
  },
  signIn: {
    INVALID_PASSWORD:
      "パスワードが正しくありません。入力内容を確認するか、別のログイン方法をお試しください。",
  },
  signUp: {
    PASSWORD_TOO_SHORT: "パスワードは8文字以上にしてください。",
  },
};

function normalizeAuthErrorKey(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function isJapaneseText(value: string): boolean {
  return /[\u3040-\u30ff\u4e00-\u9faf]/.test(value);
}

function extractAuthClientError(error: unknown): AuthClientError | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }
  const code = Reflect.get(error, "code");
  const message = Reflect.get(error, "message");
  if (typeof code !== "string" && typeof message !== "string") {
    return null;
  }
  return {
    ...(typeof code === "string" ? { code } : {}),
    ...(typeof message === "string" ? { message } : {}),
  };
}

function messageFromCode(code: string, context: AuthErrorContext): string | null {
  const authCode = code as AuthErrorCode;
  const override = CONTEXT_CODE_OVERRIDES[context]?.[authCode];
  if (override !== undefined) {
    return override;
  }
  const mapped = AUTH_ERROR_MESSAGES[authCode];
  return mapped ?? null;
}

function messageFromEnglishText(message: string, context: AuthErrorContext): string | null {
  const code =
    AUTH_ERROR_ENGLISH_TO_CODE[
      normalizeAuthErrorKey(message) as keyof typeof AUTH_ERROR_ENGLISH_TO_CODE
    ];
  if (code === undefined) {
    return null;
  }
  return messageFromCode(code, context);
}

export function presentAuthError(error: unknown, context: AuthErrorContext): string {
  const fallback = CONTEXT_FALLBACKS[context];
  const authError = extractAuthClientError(error);

  if (authError?.code !== undefined) {
    const byCode = messageFromCode(authError.code, context);
    if (byCode !== null) {
      return byCode;
    }
  }

  const rawMessage = authError?.message;
  if (rawMessage !== undefined && rawMessage !== "") {
    if (isJapaneseText(rawMessage)) {
      return rawMessage;
    }
    const byMessage = messageFromEnglishText(rawMessage, context);
    if (byMessage !== null) {
      return byMessage;
    }
  }

  if (error instanceof Error && error.message !== "" && isJapaneseText(error.message)) {
    return error.message;
  }

  return fallback;
}
