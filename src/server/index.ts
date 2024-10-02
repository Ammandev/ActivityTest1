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

// Register the Interaction Handler
app.post('/interactions', express.json(), async (req, res) => {
  const { type, data, member } = req.body;

  if (type === 2) { // Interaction Type 2 indicates a Slash Command
    if (data.name === 'activity-command') {
      try {
        // Fetch the voice channel ID from the user's current voice state (if any)
        const voiceChannelId = member?.voice?.channel_id;

        if (!voiceChannelId) {
          return res.send({
            type: 4, // Channel message with source
            data: {
              content: 'You need to be in a voice channel to start an activity.'
            }
          });
        }

        // Define the activity type (e.g., "YouTube Together" activity ID)
        const activityType = '1264501575338954823'; // Replace with the desired activity ID

        // Send the request to Discord to create the activity invite
        const response = await fetch(`https://discord.com/api/v9/channels/${voiceChannelId}/invites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          },
          body: JSON.stringify({
            max_age: 86400, // 24 hours
            max_uses: 0, // Unlimited uses
            target_application_id: activityType,
            target_type: 2, // 2 indicates an embedded application
            temporary: false,
          }),
        });

        const invite = await response.json();

        if (!response.ok) {
          throw new Error(`Failed to create activity invite: ${invite.message}`);
        }

        // Respond with the invite link
        return res.send({
          type: 4, // Channel message with source
          data: {
            content: `Click to join the activity: https://discord.gg/${invite.code}`
          }
        });

      } catch (error) {
        console.error('Error handling activity-command:', error);
        return res.status(500).send({ error: 'Failed to handle command.' });
      }
    }
  }

  // If the interaction type is not handled, return 400
  return res.status(400).send({ error: 'Invalid interaction type.' });
});

// Function to delete the entry point command
const deleteEntryPointCommand = async () => {
  const token: string = process.env.DISCORD_TOKEN!;
  const clientId: string = process.env.PUBLIC_CLIENT_ID!;
  const rest = new REST({ version: '10' }).setToken(token);
  const commandId = '1264502700385763400'; // Replace with the actual command ID

  try {
    await rest.delete(Routes.applicationCommand(clientId, commandId));
    console.log('Entry Point command deleted successfully.');
  } catch (error) {
    console.error('Error deleting Entry Point command:', error);
  }
};

// Function to register commands
const registerCommands = async () => {
  const token: string = process.env.DISCORD_TOKEN!;
  const clientId: string = process.env.PUBLIC_CLIENT_ID!;

  const commands = [
    {
      name: 'activity-command',
      description: 'Launches the activity in DMs or groups.',
      type: 1, // Indicates it's a slash command
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

// Function to delete the entry point and then register commands
const updateCommands = async () => {
  await deleteEntryPointCommand(); // Step 1: Delete the entry point command
  await registerCommands(); // Step 2: Register the new commands
};

// Call the function to update commands
updateCommands();

// HTTP ROUTES - Fetch token from developer portal and return to the embedded app
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

// Colyseus server setup (your existing code)
if (process.env.COLYSEUS!.toLowerCase() === "true") {
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
