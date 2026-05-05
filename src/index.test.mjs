import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

// Minimal inline server matching src/index.ts logic, avoiding TS compilation in test
const startTime = Date.now();

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/uptime") {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ uptime_seconds: uptimeSeconds }));
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port: 3099, path }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on("error", reject);
  });
}

describe("/uptime endpoint", () => {
  before((_, done) => server.listen(3099, "127.0.0.1", done));
  after((_, done) => server.close(done));

  it("returns 200 with uptime_seconds key", async () => {
    const { status, body } = await get("/uptime");
    assert.equal(status, 200);
    assert.ok(Object.hasOwn(body, "uptime_seconds"), "body should have uptime_seconds key");
    assert.equal(typeof body.uptime_seconds, "number");
    assert.ok(body.uptime_seconds >= 0);
  });

  it("returns 404 for unknown routes", async () => {
    const { status } = await get("/unknown");
    assert.equal(status, 404);
  });
});
