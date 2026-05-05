import * as http from "http";

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

const PORT = process.env.PORT ?? 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { server };
