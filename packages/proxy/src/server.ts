import Fastify from "fastify";
import { buildContainer } from "./presentation/container.js";
import { registerRoutes } from "./presentation/routes.js";

/**
 * Zero retention (NFR): Fastify's default logger would log request bodies at
 * debug level; disabled explicitly. No body is ever written to disk or logs
 * by this service (A7.no-content-in-telemetry).
 */
export function buildServer() {
  const app = Fastify({ logger: { level: "info", redact: ["req.body", "req.headers.authorization", "req.headers['x-api-key']"] } });
  const container = buildContainer();
  registerRoutes(app, container);
  return app;
}

export async function start() {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 8787);
  await app.listen({ port, host: "0.0.0.0" });
  return app;
}

if (process.argv[1] && process.argv[1].endsWith("server.js")) {
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
