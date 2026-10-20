import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamRegistry } from "../src/infrastructure/teamRegistry.js";

let registry: TeamRegistry;

beforeEach(() => {
  const dbPath = join(mkdtempSync(join(tmpdir(), "honesty-registry-test-")), "honesty.db");
  registry = new TeamRegistry(dbPath);
});

afterEach(() => {
  registry.close();
});

describe("TeamRegistry (fixes fragility #1/#2: real auth, durable store)", () => {
  it("issues a key that verifies to the team that owns it", () => {
    const team = registry.createTeam("Acme");
    const apiKey = registry.issueApiKey(team.id);

    const actor = registry.verifyApiKey(apiKey);
    expect(actor?.id).toBe(team.id);
    expect(actor?.kind).toBe("team");
  });

  it("rejects a key that was never issued", () => {
    expect(registry.verifyApiKey("hl_live_totally_made_up")).toBeNull();
  });

  it("rejects a key after it is revoked", () => {
    const team = registry.createTeam("Acme");
    const apiKey = registry.issueApiKey(team.id);
    expect(registry.verifyApiKey(apiKey)).not.toBeNull();

    registry.revokeApiKey(apiKey);
    expect(registry.verifyApiKey(apiKey)).toBeNull();
  });

  it("never stores the plaintext key — only its hash is persisted", () => {
    const team = registry.createTeam("Acme");
    const apiKey = registry.issueApiKey(team.id);
    // Reaching into the private db is the only way to assert this from outside;
    // verifyApiKey round-tripping correctly (above) already proves hashing works,
    // this asserts the plaintext itself isn't sitting in the row.
    const row = (registry as unknown as { db: { prepare(sql: string): { get(...args: unknown[]): unknown } } }).db
      .prepare("SELECT key_hash FROM api_keys WHERE team_id = ?")
      .get(team.id) as { key_hash: string };
    expect(row.key_hash).not.toBe(apiKey);
    expect(row.key_hash).toHaveLength(64); // sha256 hex
  });

  it("scopes a key to its own team — doesn't verify under a different team", () => {
    const teamA = registry.createTeam("A");
    const teamB = registry.createTeam("B");
    const keyA = registry.issueApiKey(teamA.id);

    const actor = registry.verifyApiKey(keyA);
    expect(actor?.id).toBe(teamA.id);
    expect(actor?.id).not.toBe(teamB.id);
  });

  it("persists across separate connections to the same file (durable, not in-memory-only)", () => {
    const team = registry.createTeam("Durable Co");
    const apiKey = registry.issueApiKey(team.id);
    const dbPath = (registry as unknown as { db: { location(): string } }).db.location();
    registry.close();

    const reopened = new TeamRegistry(dbPath);
    const actor = reopened.verifyApiKey(apiKey);
    expect(actor?.id).toBe(team.id);
    reopened.close();
  });

  it("records audit events durably, queryable after the fact", () => {
    const team = registry.createTeam("Acme");
    registry.recordAuditEvent({
      type: "directive_applied",
      actorId: team.id,
      actorKind: "team",
      occurredAt: new Date().toISOString(),
      metadata: { modelFamily: "openai" },
    });
    const row = (registry as unknown as { db: { prepare(sql: string): { get(...args: unknown[]): unknown } } }).db
      .prepare("SELECT event_type, actor_id FROM audit_log WHERE actor_id = ?")
      .get(team.id) as { event_type: string; actor_id: string };
    expect(row.event_type).toBe("directive_applied");
    expect(row.actor_id).toBe(team.id);
  });
});
