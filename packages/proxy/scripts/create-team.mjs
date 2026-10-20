#!/usr/bin/env node
// Provisions a team and prints its API key once. There is no admin UI yet —
// this is the only way to create a team against the durable registry
// (fixing fragility #1/#2: no real backend, no real auth).
import { TeamRegistry } from "../dist/infrastructure/teamRegistry.js";

const name = process.argv[2];
if (!name) {
  console.error("Usage: node scripts/create-team.mjs \"Team name\"");
  process.exit(1);
}

const dbPath = process.env.HONESTY_DB_PATH ?? "./data/honesty.db";
const registry = new TeamRegistry(dbPath);
const team = registry.createTeam(name);
const apiKey = registry.issueApiKey(team.id);
registry.close();

console.log(`Team created: ${team.id} (${team.name})`);
console.log(`API key (shown once, store it securely): ${apiKey}`);
console.log(`Use it as: X-Honesty-Api-Key: ${apiKey}`);
