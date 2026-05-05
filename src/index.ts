import http from "http";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    const body = JSON.stringify({ ok: true, ts: Date.now() });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(body);
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
