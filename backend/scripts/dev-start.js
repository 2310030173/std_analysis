import { spawn } from "node:child_process";
import process from "node:process";
import killPort from "kill-port";

const port = Number(process.env.PORT || 4000);

async function freePort() {
  try {
    await killPort(port);
    console.log(`Freed port ${port} before dev start.`);
  } catch {
    console.log(`Port ${port} was already free.`);
  }
}

function startWatchServer() {
  const child = spawn(process.execPath, ["src/server.js"], {
    stdio: "inherit",
    cwd: process.cwd()
  });

  const forwardSignal = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on("SIGINT", () => forwardSignal("SIGINT"));
  process.on("SIGTERM", () => forwardSignal("SIGTERM"));

  child.on("error", (error) => {
    console.error(`Failed to start watch server: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

await freePort();
startWatchServer();
