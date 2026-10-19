import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export interface FakeJevRequest {
  state: string;
  model: string;
  questions: Record<string, unknown>;
}

/**
 * Stands in for a Jev-compatible decision server (e.g. razorback16/openjev)
 * in tests. Scripted answers, not a real model — tests assert on the wiring
 * (request shape in, answers routed out), never on model judgment quality.
 */
export function startFakeJevServer(answerFor: (req: FakeJevRequest) => Record<string, unknown>): Promise<{ server: Server; url: string; requests: FakeJevRequest[] }> {
  const requests: FakeJevRequest[] = [];
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as FakeJevRequest;
        requests.push(body);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ model: body.model, answers: answerFor(body), usage: { input_tokens: 10, output_tokens: 0 } }));
      });
    });
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}`, requests });
    });
  });
}
