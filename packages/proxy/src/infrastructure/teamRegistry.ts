import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import { Actor } from "@honesty/core";

// Neither a static nor a dynamic `import` of "node:sqlite" survives Vite's
// import analysis (its builtin-module list predates this module's addition
// to Node, in both the proxy's own tsc/esm build and vitest's transform) —
// createRequire sidesteps module-specifier analysis entirely by going
// through Node's CJS loader as an ordinary function call.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");

/**
 * Durable backend (fixes fragility #1/#2): a real team/API-key registry,
 * replacing the self-asserted X-Honesty-Team-Id header that let any caller
 * claim to be any team. Uses node:sqlite (built into Node 22+, no native
 * dependency to install/build) — a single file is the declared durable
 * store (A5.10). Plaintext keys are never stored; only their SHA-256 hash.
 */
export class TeamRegistry {
  private readonly db: InstanceType<typeof DatabaseSync>;

  constructor(dbPath: string) {
    if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS api_keys (
        key_hash TEXT PRIMARY KEY,
        team_id TEXT NOT NULL REFERENCES teams(id),
        created_at TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_kind TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        metadata_json TEXT NOT NULL
      );
    `);
  }

  createTeam(name: string): { id: string; name: string } {
    const id = `team_${randomUUID()}`;
    this.db.prepare("INSERT INTO teams (id, name, created_at) VALUES (?, ?, ?)").run(id, name, new Date().toISOString());
    return { id, name };
  }

  /** Returns the plaintext key exactly once — it is never retrievable again, only its hash is stored. */
  issueApiKey(teamId: string): string {
    const plaintext = `hl_live_${randomBytes(24).toString("hex")}`;
    const hash = TeamRegistry.hash(plaintext);
    this.db.prepare("INSERT INTO api_keys (key_hash, team_id, created_at) VALUES (?, ?, ?)").run(hash, teamId, new Date().toISOString());
    return plaintext;
  }

  revokeApiKey(plaintextKey: string): void {
    this.db.prepare("UPDATE api_keys SET revoked_at = ? WHERE key_hash = ?").run(new Date().toISOString(), TeamRegistry.hash(plaintextKey));
  }

  /** The only path from an incoming request to an Actor. No header is ever trusted on its own. */
  verifyApiKey(plaintextKey: string): Actor | null {
    const hash = TeamRegistry.hash(plaintextKey);
    const row = this.db.prepare("SELECT team_id FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL").get(hash) as { team_id: string } | undefined;
    if (!row) return null;
    return new Actor({ id: row.team_id, kind: "team" });
  }

  recordAuditEvent(params: { type: string; actorId: string; actorKind: string; occurredAt: string; metadata: Record<string, unknown> }): void {
    this.db
      .prepare("INSERT INTO audit_log (event_type, actor_id, actor_kind, occurred_at, metadata_json) VALUES (?, ?, ?, ?, ?)")
      .run(params.type, params.actorId, params.actorKind, params.occurredAt, JSON.stringify(params.metadata));
  }

  private static hash(plaintext: string): string {
    return createHash("sha256").update(plaintext).digest("hex");
  }

  private closed = false;

  close(): void {
    if (this.closed) return;
    this.db.close();
    this.closed = true;
  }
}
