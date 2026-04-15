import type * as Party from "partykit/server";
import { Yacht } from "../public/games/engine/yacht.js";
import { Farkle } from "../public/games/engine/farkle.js";

// ── Types ─────────────────────────────────────────────────────────────────

interface Player {
  id: string;      // permanent game ID — used in all game-state lookups
  connId: string;  // current WebSocket connection ID — updated on reconnect
  name: string;
  connected: boolean;
}

interface LogEvent {
  ts: number;
  playerId: string;
  event: string;
  data?: unknown;
}

interface ChatMessage {
  ts: number;
  playerId: string;
  playerName: string;
  text: string;
}

interface SessionState {
  sessionId: string;
  passcode: string;
  game: "yacht" | "farkle";
  tableName: string;
  tableConnId: string | null;
  phase: "waiting" | "playing" | "finished";
  players: Player[];
  turnIndex: number;
  turnPlayerId: string;
  gameState: unknown;
  log: LogEvent[];
  chat: ChatMessage[];
  endReason: "normal" | "early" | null;
}

const ENGINES: Record<string, typeof Yacht | typeof Farkle> = {
  yacht: Yacht,
  farkle: Farkle,
};

// ── Room server ───────────────────────────────────────────────────────────

export default class GameRoom implements Party.Server {
  private session: SessionState | null = null;

  constructor(readonly room: Party.Room) {}

  // Find a player by their current WebSocket connection ID.
  private playerByConn(connId: string): Player | undefined {
    return this.session?.players.find((p) => p.connId === connId);
  }

  private sendState(conn: Party.Connection): void {
    if (!this.session) return;
    // Return the player's permanent id (not the connection id) so game-state
    // lookups remain stable across reconnects.
    const player = this.playerByConn(conn.id);
    const yourId = player?.id ?? conn.id;
    conn.send(JSON.stringify({ type: "STATE", session: this.session, yourId }));
  }

  private broadcastState(): void {
    if (!this.session) return;
    for (const conn of this.room.getConnections()) {
      const player = this.playerByConn(conn.id);
      const yourId = player?.id ?? conn.id;
      conn.send(JSON.stringify({ type: "STATE", session: this.session, yourId }));
    }
  }

  private sendError(conn: Party.Connection, error: string): void {
    conn.send(JSON.stringify({ type: "ERROR", error }));
  }

  private addLog(playerId: string, event: string, data?: unknown): void {
    if (!this.session) return;
    this.session.log.push({ ts: Date.now(), playerId, event, data });
    if (this.session.log.length > 20) {
      this.session.log = this.session.log.slice(-20);
    }
  }

  // ── Connection events ───────────────────────────────────────────────────

  onConnect(conn: Party.Connection): void {
    if (this.session) this.sendState(conn);
  }

  onClose(conn: Party.Connection): void {
    if (!this.session) return;

    if (conn.id === this.session.tableConnId) {
      this.session.tableConnId = null;
      this.broadcastState();
      return;
    }

    // Mark player disconnected — match by current connId
    const player = this.playerByConn(conn.id);
    if (player) {
      player.connected = false;
      this.broadcastState();
    }
  }

  // ── Message handler ─────────────────────────────────────────────────────

  onMessage(message: string, sender: Party.Connection): void {
    let msg: { type: string; [key: string]: unknown };
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }

    switch (msg.type) {
      case "CREATE_SESSION": this.handleCreate(msg, sender);      break;
      case "CLAIM_TABLE":    this.handleClaimTable(sender);       break;
      case "JOIN_SESSION":   this.handleJoin(msg, sender);        break;
      case "OBSERVE":        /* read-only — state sent in onConnect */ break;
      case "START_GAME":     this.handleStart(sender);            break;
      case "RESET_GAME":     this.handleReset(sender);            break;
      case "SKIP_TURN":      this.handleSkip(sender);             break;
      case "CALL_GAME_OVER": this.handleCallGameOver(sender);     break;
      case "PLAYER_ACTION":  this.handleAction(msg, sender);      break;
      case "CHAT_MSG":       this.handleChat(msg, sender);        break;
      case "LEAVE":          this.handleLeave(sender);            break;
    }
  }

  // ── CREATE_SESSION ────────────────────────────────────────────────────

  private handleCreate(
    msg: { game?: unknown; tableName?: unknown; passcode?: unknown },
    sender: Party.Connection
  ): void {
    if (this.session) {
      this.sendError(sender, "A session already exists in this room.");
      return;
    }

    const game = msg.game as string;
    if (game !== "yacht" && game !== "farkle") {
      this.sendError(sender, "Invalid game selection.");
      return;
    }

    const tableName = String(msg.tableName || "Game Table").slice(0, 30).trim();
    const passcode  = String(msg.passcode || "").trim();
    if (!/^\d{4}$/.test(passcode)) {
      this.sendError(sender, "Passcode must be exactly 4 digits.");
      return;
    }

    this.session = {
      sessionId:    this.room.id,
      passcode,
      game:         game as "yacht" | "farkle",
      tableName,
      tableConnId:  sender.id,
      phase:        "waiting",
      players:      [],
      turnIndex:    0,
      turnPlayerId: "",
      gameState:    {},
      log:          [],
      chat:         [],
      endReason:    null,
    };

    this.broadcastState();
  }

  // ── CLAIM_TABLE ───────────────────────────────────────────────────────

  private handleClaimTable(sender: Party.Connection): void {
    if (!this.session) {
      this.sendError(sender, "No session to claim. Create a session first.");
      return;
    }
    this.session.tableConnId = sender.id;
    this.sendState(sender);
    this.broadcastState();
  }

  // ── JOIN_SESSION ──────────────────────────────────────────────────────

  private handleJoin(
    msg: { passcode?: unknown; playerName?: unknown },
    sender: Party.Connection
  ): void {
    if (!this.session) {
      this.sendError(sender, "No session found. Check the session ID.");
      return;
    }

    if (this.session.passcode !== String(msg.passcode || "").trim()) {
      this.sendError(sender, "Incorrect passcode.");
      return;
    }

    const rawName = String(msg.playerName || "Player").slice(0, 20).trim();

    // ── Reconnect: same connection ID (page refresh in same tab)
    let existing = this.session.players.find((p) => p.connId === sender.id);

    // ── Reconnect: new connection ID (browser closed/opened), match by name
    // Only reconnect to a disconnected slot — prevents impersonation.
    if (!existing) {
      existing = this.session.players.find(
        (p) => !p.connected && p.name === rawName
      );
    }

    if (existing) {
      existing.connId    = sender.id;
      existing.connected = true;
      this.sendState(sender);
      this.broadcastState();
      return;
    }

    if (this.session.phase !== "waiting") {
      this.sendError(sender, "The game has already started.");
      return;
    }

    if (this.session.players.length >= 8) {
      this.sendError(sender, "Session is full (max 8 players).");
      return;
    }

    // ── Deduplicate name for new players
    let name = rawName;
    let suffix = 2;
    while (this.session.players.some((p) => p.name === name)) {
      name = `${rawName.slice(0, 17)} ${suffix}`;
      suffix++;
    }

    this.session.players.push({
      id:        sender.id,
      connId:    sender.id,
      name,
      connected: true,
    });
    this.broadcastState();
  }

  // ── START_GAME ────────────────────────────────────────────────────────

  private handleStart(sender: Party.Connection): void {
    if (!this.session) return;

    if (sender.id !== this.session.tableConnId) {
      this.sendError(sender, "Only the game table can start the game.");
      return;
    }

    if (this.session.phase !== "waiting") {
      this.sendError(sender, "Game is already in progress.");
      return;
    }

    if (this.session.players.length < 1) {
      this.sendError(sender, "Need at least 1 player to start.");
      return;
    }

    const engine    = ENGINES[this.session.game];
    const playerIds = this.session.players.map((p) => p.id);
    this.session.gameState    = engine.init(playerIds, this.session.players);
    this.session.phase        = "playing";
    this.session.turnIndex    = 0;
    this.session.turnPlayerId = this.session.players[0].id;

    this.addLog("table", "game_started");
    this.broadcastState();
  }

  // ── PLAYER_ACTION ─────────────────────────────────────────────────────

  private handleAction(
    msg: { action?: unknown },
    sender: Party.Connection
  ): void {
    if (!this.session || this.session.phase !== "playing") return;

    // Resolve the sender's permanent player ID via their current connection.
    const player = this.playerByConn(sender.id);
    if (!player || player.id !== this.session.turnPlayerId) {
      this.sendError(sender, "It's not your turn.");
      return;
    }

    const engine = ENGINES[this.session.game];
    const action = msg.action as { type: string; payload?: unknown };

    const result = engine.applyAction(
      this.session.gameState,
      player.id,           // permanent ID — game state is keyed by this
      action,
      this.session.players
    );

    if (result.error) {
      this.sendError(sender, result.error);
      return;
    }

    this.session.gameState = result.state;
    result.events.forEach((evt: LogEvent) =>
      this.addLog(player.id, evt.event, evt.data)
    );

    if (result.turnEnded) {
      this.session.turnIndex =
        (this.session.turnIndex + 1) % this.session.players.length;
      this.session.turnPlayerId =
        this.session.players[this.session.turnIndex].id;
    }

    if (engine.isGameOver(this.session.gameState, this.session.players)) {
      this.session.phase = "finished";
      this.addLog("table", "game_finished");
    }

    this.broadcastState();
  }

  // ── RESET_GAME ────────────────────────────────────────────────────────
  // Table only. Resets a finished game back to waiting so all players can
  // replay without disconnecting. Players list and chat are preserved.

  private handleReset(sender: Party.Connection): void {
    if (!this.session) return;
    if (sender.id !== this.session.tableConnId) {
      this.sendError(sender, "Only the game table can reset the game.");
      return;
    }
    if (this.session.phase !== "finished") return;

    this.session.phase        = "waiting";
    this.session.gameState    = {};
    this.session.turnIndex    = 0;
    this.session.turnPlayerId = "";
    this.session.log          = [];
    this.session.endReason    = null;
    // Players, passcode, game, tableName, and chat are intentionally preserved.

    this.broadcastState();
  }

  // ── SKIP_TURN ─────────────────────────────────────────────────────────

  private handleSkip(sender: Party.Connection): void {
    if (!this.session) return;

    if (sender.id !== this.session.tableConnId) {
      this.sendError(sender, "Only the game table can skip a turn.");
      return;
    }

    if (this.session.phase !== "playing") return;

    const skippedId = this.session.turnPlayerId;
    this.session.turnIndex =
      (this.session.turnIndex + 1) % this.session.players.length;
    this.session.turnPlayerId =
      this.session.players[this.session.turnIndex].id;

    // Farkle final-lap: skipped player counts as having taken their final turn.
    const gs = this.session.gameState as Record<string, unknown>;
    if (gs?.finalLapActive && gs.finalLapInitiator !== skippedId) {
      const lastLap = gs.lastLap as Record<string, boolean> | undefined;
      if (lastLap) lastLap[skippedId] = true;
    }

    this.addLog("table", "turn_skipped", { skippedId });

    const engine = ENGINES[this.session.game];
    if (engine.isGameOver(this.session.gameState, this.session.players)) {
      this.session.phase     = "finished";
      this.session.endReason = null;
      this.addLog("table", "game_finished");
    }

    this.broadcastState();
  }

  // ── CALL_GAME_OVER ────────────────────────────────────────────────────

  private handleCallGameOver(sender: Party.Connection): void {
    if (!this.session) return;
    if (sender.id !== this.session.tableConnId) {
      this.sendError(sender, "Only the game table can call game over.");
      return;
    }
    if (this.session.phase !== "playing") return;

    this.session.phase     = "finished";
    this.session.endReason = "early";
    this.addLog("table", "game_finished");
    this.broadcastState();
  }

  // ── CHAT_MSG ──────────────────────────────────────────────────────────

  private handleChat(
    msg: { text?: unknown },
    sender: Party.Connection
  ): void {
    if (!this.session) return;
    const player = this.playerByConn(sender.id);
    if (!player) return;

    const text = String(msg.text || "").slice(0, 200).trim();
    if (!text) return;

    this.session.chat.push({
      ts:         Date.now(),
      playerId:   player.id,
      playerName: player.name,
      text,
    });
    if (this.session.chat.length > 50) {
      this.session.chat = this.session.chat.slice(-50);
    }
    this.broadcastState();
  }

  // ── LEAVE ─────────────────────────────────────────────────────────────

  private handleLeave(sender: Party.Connection): void {
    if (!this.session) return;

    if (sender.id === this.session.tableConnId) {
      this.session.tableConnId = null;
      this.broadcastState();
      return;
    }

    const player = this.playerByConn(sender.id);
    if (player) {
      this.session.players = this.session.players.filter(
        (p) => p.id !== player.id
      );
    }

    if (this.session.players.length === 0 && !this.session.tableConnId) {
      this.session = null;
    } else if (this.session) {
      this.broadcastState();
    }
  }
}
