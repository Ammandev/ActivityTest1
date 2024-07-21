import { DiscordSDK } from "@discord/embedded-app-sdk";

// TODO: ここにDiscordアプリケーションのクライアントIDを入力
const client_id = "1263875000717414431"

// DiscordSDKのインスタンスを生成
const discordSdk = new DiscordSDK(client_id);

// DiscordSDKの初期設定
async function setupDiscordSdk() {
    let auth = null;
    console.log("DiscordSDK is setting up");

    // DiscordSDKの初期化
    await discordSdk.ready();
    console.log("DiscordSDK is ready");

    // 認証処理
    const { code } = await discordSdk.commands.authorize({
        client_id: client_id, // クライアントIDを取得
        response_type: "code",
        state: "",
        prompt: "none",
        scope: [
            "identify",
            "guilds",
        ],
    });
    console.log("Authorization is successful");

    // トークンの取得
    const response = await fetch("/.proxy/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            code,
        }),
    });
    console.log("Token is fetched");

    const { access_token } = await response.json();
    // 認可処理
    auth = await discordSdk.commands.authenticate({
        access_token,
    });
    console.log("Authentication is successful");

    if (auth == null) {
        throw new Error("Authenticate command failed");
    }

    return auth;
}

(async () => {
    try{
        let auth = await setupDiscordSdk();
        console.log("DiscordSDK is set up");

        // channel nameを表示
        const channel = await discordSdk.commands.getChannel({ channel_id: discordSdk.channelId });
        document.getElementById("channel-name").innerText = channel.name;

        // guild iconを表示
        const guilds = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
            headers: {
                Authorization: `Bearer ${auth.access_token}`,
                'Content-Type': 'application/json',
            },
        });
        const guildsJson = await guilds.json(); // サーバー情報を取得
        const currentGuild = guildsJson.find((g) => g.id === discordSdk.guildId);
        const guildImg = document.createElement('img');
        guildImg.setAttribute(
            'src',
            `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.webp?size=128`
        );
        document.getElementById("guild-icon").appendChild(guildImg);
        console.log(currentGuild.id);
    }catch(e){
        console.error(e);
        console.log("Error in setupdiscord and guild");
    }
})();

