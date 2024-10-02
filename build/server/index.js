"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const path_1 = __importDefault(require("path"));
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const express_1 = __importDefault(require("express"));
const colyseus_1 = require("colyseus");
const http_1 = require("http");
const ws_transport_1 = require("@colyseus/ws-transport");
const rooms_1 = require("./utils/rooms");
const discord_js_1 = require("discord.js");
const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds] });
client.once('ready', () => {
    console.log('Discord bot ready!');
    client.application?.commands.create({
        name: 'launch_activity',
        description: 'Launches the activity',
    });
});
client.login(process.env.DISCORD_BOT_TOKEN);
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, "../client"), {
    setHeaders: (res, path) => {
        if (path.endsWith(".gz")) {
            res.appendHeader("Content-Encoding", "gzip");
        }
        if (path.endsWith(".br")) {
            res.appendHeader("Content-Encoding", "br");
        }
        if (path.endsWith(".wasm.gz") || path.endsWith(".wasm.br") || path.endsWith(".wasm")) {
            res.appendHeader("Content-Type", "application/wasm");
        }
        if (path.endsWith(".js.gz") || path.endsWith(".js.br") || path.endsWith(".js")) {
            res.appendHeader("Content-Type", "application/javascript");
        }
        if (path.endsWith(".data") || path.endsWith(".mem")) {
            res.appendHeader('Content-Type', 'application/octet-stream');
        }
    }
}));
app.post("/api/token", async (req, res) => {
    if (!req.body.code)
        return res.status(400);
    const response = await (0, cross_fetch_1.default)(`https://discord.com/api/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: process.env.PUBLIC_CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: "authorization_code",
            code: req.body.code,
        })
    });
    const { access_token } = await response.json();
    res.send({ access_token });
    return;
});
if (process.env.COLYSEUS.toLowerCase() == "true") {
    const colyseusServer = new colyseus_1.Server({
        transport: new ws_transport_1.WebSocketTransport({
            server: (0, http_1.createServer)(app)
        })
    });
    colyseusServer.define("matchmaking", rooms_1.MatchmakingRoom)
        .filterBy(["instanceId"]);
    colyseusServer.define("game", rooms_1.GameRoom)
        .filterBy(["instanceId", "userId"]);
    colyseusServer.listen(Number(process.env.PORT));
}
else {
    app.listen(Number(process.env.PORT));
}
console.log(`Server initialized with port ${Number(process.env.PORT)}`);
