
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;
const MAX_SIZE = 2 * 1024 * 1024;

function send(res, status, type, body) {
  res.writeHead(status, {
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'"
  });
  res.end(body);
}

function analyze(source) {
  const lines = source ? source.split(/\r\n|\r|\n/).length : 0;
  const bytes = Buffer.byteLength(source, "utf8");

  const loadstringCalls =
    (source.match(/\bloadstring\s*\(/g) || []).length;

  const loadCalls =
    (source.match(/\bload\s*\(/g) || []).length;

  const comments =
    (source.match(/--[^\r\n]*/g) || []).length;

  const readable =
    (source.match(/[A-Za-z0-9_ \t\r\n.,;:()[\]{}'"=!+\-*/%<>]/g) || []).length;

  const readability = source.length
    ? Math.round(readable / source.length * 100)
    : 0;

  const strings =
    source.match(/(["'])(?:\\.|(?!\1)[^\\])*\1/g) || [];

  const longStrings =
    source.match(/\[\[[\s\S]*?\]\]/g) || [];

  const fragments = [
    ...strings.map(s => s.slice(1, -1)),
    ...longStrings.map(s => s.slice(2, -2))
  ].filter(s => s.trim().length >= 3).slice(0, 250);

  return {
    summary: [
      "KINGMOR E184 ANALYSIS",
      "---------------------",
      "Static inspection completed.",
      "No submitted code was executed.",
      "",
      `Size: ${bytes} bytes`,
      `Lines: ${lines}`,
      `Loadstring calls: ${loadstringCalls}`,
      `Load calls: ${loadCalls}`,
      `Comments: ${comments}`,
      `Readability: ${readability}%`,
      `Fragments: ${fragments.length}`
    ].join("\n"),
    fragments,
    stats: {
      bytes,
      lines,
      loadstringCalls,
      loadCalls,
      comments,
      readability,
      fragmentCount: fragments.length
    }
  };
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/analyze") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;

      if (Buffer.byteLength(body) > MAX_SIZE) {
        send(res, 413, "application/json",
          JSON.stringify({ error: "Maximum input size is 2 MB." }));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");

        if (typeof data.source !== "string") {
          return send(res, 400, "application/json",
            JSON.stringify({ error: "Invalid source." }));
        }

        if (Buffer.byteLength(data.source) > MAX_SIZE) {
          return send(res, 413, "application/json",
            JSON.stringify({ error: "Maximum input size is 2 MB." }));
        }

        send(res, 200, "application/json",
          JSON.stringify(analyze(data.source)));

      } catch {
        send(res, 400, "application/json",
          JSON.stringify({ error: "Invalid request." }));
      }
    });

    return;
  }

  const requested = req.url === "/"
    ? "index.html"
    : decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");

  const file = path.resolve(ROOT, requested);

  if (!file.startsWith(ROOT + path.sep)) {
    return send(res, 403, "text/plain", "Forbidden");
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      return send(res, 404, "text/plain", "Not found");
    }

    const ext = path.extname(file);

    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8"
    };

    send(res, 200, types[ext] || "application/octet-stream", data);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Kingmor E184 running on port ${PORT}`);
});

