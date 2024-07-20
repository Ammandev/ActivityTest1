const express = require('express');
const app = express();
const PORT = 3000; // ポート番号は3000

// JSONを受け取るための設定
app.use(express.json());

// /api/tokenへのPOSTリクエストを処理を登録
app.post('/api/token', async (req, res) => {
    // token取得用のcodeを受け取る
    code = req.body.code;
    console.log("code:", code);

    // DiscordのAPIを叩いてtokenを取得
    params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID, // 環境変数から取得
        client_secret: process.env.DISCORD_CLIENT_SECRET, // 環境変数から取得
        grant_type: "authorization_code",
        code: code,
    });
    console.log("params:", params);

    const response = await fetch(`https://discord.com/api/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
    });
    const { access_token } = await response.json();
    console.log("access token:", access_token);

    // tokenを返す
    res.json({ access_token });
});

// /app/token以外のアクセスには、distディレクトリ内のファイルを返す
app.use(express.static('dist'));

// サーバーを起動
app.listen(PORT, () => {
    console.log(`サーバーが${PORT}番ポートで起動しました。`);
});
