import { PAPER_TOKENS } from "../src/lib/paper-tokens.ts";

export function renderOfflineHtml(): string {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="${PAPER_TOKENS.desk}" />
    <title>オフラインです — 学習ログ</title>
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        align-items: center;
        background: ${PAPER_TOKENS.desk};
        color: ${PAPER_TOKENS.ink};
        display: flex;
        /*? 手書きフォントは外部から来る。オフラインで待たされるだけなので system-ui に落とす */
        font-family: system-ui, sans-serif;
        justify-content: center;
        line-height: 1.8;
        margin: 0;
        min-height: 100vh;
        padding: 24px;
      }
      .sheet {
        background: ${PAPER_TOKENS.paper};
        border: 1.5px solid ${PAPER_TOKENS.ink};
        border-radius: 8px 14px 9px 16px/16px 9px 14px 8px;
        box-shadow: 2px 3px 0 rgba(16, 15, 15, 0.12);
        max-width: 26rem;
        padding: 28px 24px;
        width: 100%;
      }
      h1 {
        font-size: 1.35rem;
        margin: 0 0 12px;
      }
      p {
        margin: 0 0 20px;
      }
      button {
        background: ${PAPER_TOKENS.paper};
        border: 1.5px solid ${PAPER_TOKENS.orangeAccent};
        border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
        box-shadow: 2px 2px 0 rgba(16, 15, 15, 0.15);
        color: ${PAPER_TOKENS.orangeAccent};
        cursor: pointer;
        font: inherit;
        min-height: 46px;
        padding: 10px 22px;
      }
      .note {
        color: ${PAPER_TOKENS.muted2};
        font-size: 0.85rem;
        margin: 18px 0 0;
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <h1>オフラインです</h1>
      <p>電波が戻ると自動で元の画面に戻ります。オフラインでは記録できません。</p>
      <button type="button" onclick="location.reload()">読み込み直す</button>
      <p class="note">机の上の紙は、電波が戻るまで待っています。</p>
    </main>
    <script>
      addEventListener("online", function () {
        location.replace("/");
      });
    </script>
  </body>
</html>
`;
}
