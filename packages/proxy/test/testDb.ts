import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TeamRegistry } from "../src/infrastructure/teamRegistry.js";

/**
 * Provisions a real team + API key against a throwaway SQLite file, then
 * points HONESTY_DB_PATH at it so a subsequently-built server's own
 * TeamRegistry (a fresh connection to the same file) sees the same data.
 * Tests now exercise the real registry/auth path (fixing fragility #1),
 * not a stub.
 */
export function provisionTestTeam(teamName = "Test Team"): { apiKey: string; teamId: string; dbPath: string } {
  const dbPath = join(mkdtempSync(join(tmpdir(), "honesty-proxy-test-")), "honesty.db");
  process.env.HONESTY_DB_PATH = dbPath;

  const registry = new TeamRegistry(dbPath);
  const team = registry.createTeam(teamName);
  const apiKey = registry.issueApiKey(team.id);
  registry.close();

  return { apiKey, teamId: team.id, dbPath };
}
