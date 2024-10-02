import { config } from "dotenv";
config();
import path from "path";
import fetch from "cross-fetch";
import express from "express";

// Import Discord.js REST module and Routes for command registration
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

// Colyseus
import { Server } from "colyseus";
import { createServer } from "http";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { MatchmakingRoom, GameRoom } from "./utils/rooms";

// Prepare express server
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "../client"), {
  setHeaders: (res, path) => {
    if (path.endsWith(".gz")) {
      res.setHeader("Content-Encoding", "gzip");
    }

    if (path.endsWith(".br")) {
      res.setHeader("Content-Encoding", "br");
    }

    if (path.endsWith(".wasm.gz") || path.endsWith(".wasm.br") || path.endsWith(".wasm")) {
      res.setHeader("Content-Type", "application/wasm");
    }

    if (path.endsWith(".js.gz") || path.endsWith(".js.br") || path.endsWith(".js")) {
      res.setHeader("Content-Type", "application/javascript");
    }

    if (path.endsWith(".data") || path.endsWith(".mem")) {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
  }
}));

// Register Discord Slash Commands
const registerCommands = async () => {
  const token: string = process.env.DISCORD_TOKEN!;
  const clientId: string = process.env.PUBLIC_CLIENT_ID!;

  const commands = [
    {
      name: 'activity-command',
      description: 'Launches the activity in DMs or groups.',
      type: 1, // Indicates it's a slash command
      integration_types: ['dm', 'group', 'guild'], // Specify where this command is available
      contexts: ['dm', 'group', 'guild_text', 'guild_voice'] // Allows the command to work in these contexts
    }
  ];

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
};

// Call the function to register commands
registerCommands();

//# HTTP ROUTES - - - - -
// Fetch token from developer portal and return to the embedded app
app.post("/api/token", async (req, res) => {
  if (!req.body.code) return res.status(400);

  const response = await fetch(`https://discord.com/api/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.PUBLIC_CLIENT_ID!,
      client_secret: process.env.CLIENT_SECRET!,
      grant_type: "authorization_code",
      code: req.body.code,
    })
  });

  const { access_token } = await response.json();

  res.send({ access_token });
  return;
});

//? Colyseus server
if (process.env.COLYSEUS!.toLowerCase() == "true") {
  const colyseusServer = new Server({
    transport: new WebSocketTransport({
      server: createServer(app)
    })
  });
  
  // Expose the rooms
  colyseusServer.define("matchmaking", MatchmakingRoom)
    .filterBy(["instanceId"]);

  colyseusServer.define("game", GameRoom)
    .filterBy(["instanceId", "userId"]);

  // Listen to port
  colyseusServer.listen(Number(process.env.PORT!));
} else {
  // Just express server
  app.listen(Number(process.env.PORT!));
}

console.log(`Server initialized with port ${Number(process.env.PORT!)}`);
