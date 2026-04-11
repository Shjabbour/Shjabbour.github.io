import { createReadStream, existsSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import http from "node:http";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";

const rootDir = resolve(".");
const args = new Set(process.argv.slice(2));
const localOnly = args.has("--local");
const host = process.env.HOST ?? "127.0.0.1";
const requestedPort = Number.parseInt(process.env.PORT ?? "4173", 10);
const tunnelUrlPath = join(rootDir, "current-tunnel-url.txt");
const desktopDir = process.env.USERPROFILE ? join(process.env.USERPROFILE, "Desktop") : null;
const desktopTunnelUrlPath = desktopDir ? join(desktopDir, "Shadi Portfolio Current Dev URL.txt") : null;

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"]
]);

function sendNotFound(response) {
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
}

function resolvePath(urlPath) {
  const pathname = decodeURIComponent((urlPath ?? "/").split("?")[0]);
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const absolutePath = resolve(join(rootDir, safePath));

  if (!absolutePath.startsWith(rootDir)) {
    return null;
  }

  if (!existsSync(absolutePath)) {
    return null;
  }

  const stats = statSync(absolutePath);

  if (stats.isDirectory()) {
    const nestedIndex = resolve(join(absolutePath, "index.html"));
    if (!nestedIndex.startsWith(rootDir) || !existsSync(nestedIndex)) {
      return null;
    }
    return nestedIndex;
  }

  return absolutePath;
}

const server = http.createServer((request, response) => {
  const filePath = resolvePath(request.url);

  if (!filePath) {
    sendNotFound(response);
    return;
  }

  const extension = extname(filePath).toLowerCase();
  const contentType = mimeTypes.get(extension) ?? "application/octet-stream";

  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });

  createReadStream(filePath).on("error", () => {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Failed to read file");
  }).pipe(response);
});

let shuttingDown = false;
let cloudflaredProcess = null;
let activePort = requestedPort;

async function findAvailablePort(startPort, attempts = 20) {
  for (let candidatePort = startPort; candidatePort < startPort + attempts; candidatePort += 1) {
    const isAvailable = await new Promise((resolvePort) => {
      const tester = net.createServer();

      tester.once("error", () => {
        resolvePort(false);
      });

      tester.once("listening", () => {
        tester.close(() => resolvePort(true));
      });

      tester.listen(candidatePort, host);
    });

    if (isAvailable) {
      return candidatePort;
    }
  }

  throw new Error(`No open port found between ${startPort} and ${startPort + attempts - 1}.`);
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (cloudflaredProcess && !cloudflaredProcess.killed) {
    cloudflaredProcess.kill();
  }

  rmSync(tunnelUrlPath, { force: true });
  if (desktopTunnelUrlPath) {
    rmSync(desktopTunnelUrlPath, { force: true });
  }

  server.close(() => {
    process.exit(exitCode);
  });
}

function persistPublicUrl(url) {
  const body = `${url}\n`;
  writeFileSync(tunnelUrlPath, body, "utf8");

  if (desktopTunnelUrlPath) {
    writeFileSync(desktopTunnelUrlPath, body, "utf8");
  }
}

function copyToClipboard(url) {
  if (process.platform !== "win32") {
    return;
  }

  spawnSync("clip", {
    input: url,
    shell: true,
    stdio: ["pipe", "ignore", "ignore"]
  });
}

function openInBrowser(url) {
  const command = process.platform === "win32" ? "cmd.exe" : "open";
  const commandArgs =
    process.platform === "win32" ? ["/c", "start", "", url] : [url];

  spawn(command, commandArgs, {
    detached: true,
    stdio: "ignore",
    shell: process.platform === "win32"
  }).unref();
}

function startCloudflareTunnel() {
  const targetUrl = `http://${host}:${activePort}`;
  const command = process.platform === "win32" ? "cloudflared.cmd" : "cloudflared";
  const tunnelArgs = ["tunnel", "--url", targetUrl, "--no-autoupdate"];

  cloudflaredProcess = spawn(command, tunnelArgs, {
    cwd: rootDir,
    env: process.env,
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"]
  });

  let publicUrlPrinted = false;
  let tunnelLog = "";

  const handleChunk = (chunk, streamName) => {
    const text = chunk.toString();
    tunnelLog += text;

    if (!publicUrlPrinted) {
      const match = tunnelLog.match(/https:\/\/[-a-z0-9.]+trycloudflare\.com/iu);
      if (match) {
        publicUrlPrinted = true;
        persistPublicUrl(match[0]);
        copyToClipboard(match[0]);
        openInBrowser(match[0]);
        console.log(`\nPublic URL: ${match[0]}`);
        console.log(`Saved to ${tunnelUrlPath}`);
        if (desktopTunnelUrlPath) {
          console.log(`Saved to ${desktopTunnelUrlPath}`);
        }
        if (process.platform === "win32") {
          console.log("Copied to clipboard and opened in your browser.");
        }
      }
    }

    if (streamName === "stderr" && /failed|error/i.test(text) && !publicUrlPrinted) {
      console.log("\nCloudflare tunnel reported an error before the public URL was ready.");
    }
  };

  cloudflaredProcess.stdout.on("data", (chunk) => handleChunk(chunk, "stdout"));
  cloudflaredProcess.stderr.on("data", (chunk) => handleChunk(chunk, "stderr"));

  cloudflaredProcess.on("exit", (code) => {
    cloudflaredProcess = null;

    if (!shuttingDown) {
      console.log(`\nCloudflare tunnel stopped with exit code ${code ?? 0}.`);

      if (!publicUrlPrinted && tunnelLog.trim()) {
        const lines = tunnelLog.trim().split(/\r?\n/).slice(-8);
        console.log(lines.join("\n"));
      }
    }
  });
}

try {
  activePort = await findAvailablePort(requestedPort);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unable to find an open port.");
  process.exit(1);
}

if (activePort !== requestedPort) {
  console.log(`Port ${requestedPort} is busy. Using ${activePort} instead.`);
}

server.listen(activePort, host, () => {
  console.log(`Local portfolio server running at http://${host}:${activePort}`);

  if (localOnly) {
    console.log("Local-only mode enabled. Use `pnpm dev` for Cloudflare access.");
    return;
  }

  console.log("Starting Cloudflare tunnel. This machine still needs internet access.");
  startCloudflareTunnel();
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
