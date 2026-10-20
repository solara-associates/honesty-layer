import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/** Stands in for OpenAI/Anthropic in tests: echoes back the request it received as JSON. */
export function startFakeUpstream(): Promise<{ server: Server; url: string; receivedBodies: unknown[]; receivedHeaders: Record<string, string | string[] | undefined>[] }> {
  const receivedBodies: unknown[] = [];
  const receivedHeaders: Record<string, string | string[] | undefined>[] = [];
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        const parsed = raw ? JSON.parse(raw) : {};
        receivedBodies.push(parsed);
        receivedHeaders.push({ ...req.headers });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ echoed: parsed }));
      });
    });
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}`, receivedBodies, receivedHeaders });
    });
  });
}
