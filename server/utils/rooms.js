"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = exports.MatchmakingRoom = void 0;
const colyseus_1 = require("colyseus");
const structures_1 = require("./structures");
const roomsMap = new Map();
class MatchmakingRoom extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = 1;
        this.disconnectTimeout = null;
    }
    onCreate(options) {
        if (typeof options.instanceId != "string")
            return this.disconnect();
        this.setState(new structures_1.MatchmakingState());
    }
    onJoin(client, options) {
        this.disconnectTimeout = setTimeout(() => { client.leave(); }, 5_000);
        const roomValue = roomsMap.get(options.instanceId);
        client.send("matchmake", {
            exists: roomValue ?? false,
        });
    }
    onLeave(_client, _consented) {
        clearTimeout(this.disconnectTimeout);
    }
}
exports.MatchmakingRoom = MatchmakingRoom;
class GameRoom extends colyseus_1.Room {
    onCreate(options) {
        if (typeof options.instanceId != "string")
            return this.disconnect();
        roomsMap.set(options.instanceId, true);
        this.setSeatReservationTime(20);
        this.roomId = options.instanceId;
        this.setState(new structures_1.GameState());
    }
    onJoin(client, options) {
        if (typeof options?.userId != "string")
            return client.leave();
        console.log(`Client joined to room with instance id: ${this.roomId}`);
        const player = new structures_1.Player();
        player.userId = options.userId;
        const state = this.state;
        state.players.set(client.sessionId, new structures_1.Player());
    }
    async onLeave(client, consented) {
        const state = this.state;
        state.players.get(client.sessionId).connected = false;
        try {
            if (consented) {
                throw new Error("Consented disconnect");
            }
            await this.allowReconnection(client, 5);
            state.players.get(client.sessionId).connected = true;
        }
        catch (err) {
            console.log(`Client left room with instance id: ${this.roomId}`);
            state.players.delete(client.sessionId);
        }
    }
    onDispose() {
        console.log(`Room with instance id ${this.roomId} disposed\n`);
        roomsMap.delete(this.roomId);
    }
}
exports.GameRoom = GameRoom;
