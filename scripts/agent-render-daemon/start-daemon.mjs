#!/usr/bin/env node
/**
 * Start agent-render-daemon — kill process đang giữ port (nếu có) rồi chạy server.
 */
import { execSync } from 'node:child_process';
import { DAEMON_HOST, DAEMON_PORT } from './config.mjs';

function listListenPids(port) {
  try {
    const raw = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return [...new Set(raw.trim().split(/\s+/).filter(Boolean).map((pid) => Number(pid)))]
      .filter((pid) => Number.isFinite(pid) && pid > 0 && pid !== process.pid);
  } catch {
    return [];
  }
}

function killPids(pids, signal) {
  for (const pid of pids) {
    try {
      process.kill(pid, signal);
      console.log(`[agent-render-daemon] ${signal} pid=${pid} (port ${portLabel()})`);
    } catch (error) {
      const code = error && typeof error === 'object' ? error.code : '';
      if (code !== 'ESRCH') {
        console.warn(`[agent-render-daemon] không kill được pid=${pid}: ${error.message || error}`);
      }
    }
  }
}

function portLabel() {
  return `${DAEMON_HOST}:${DAEMON_PORT}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function freeDaemonPort() {
  let pids = listListenPids(DAEMON_PORT);
  if (!pids.length) {
    return;
  }

  console.log(
    `[agent-render-daemon] port ${portLabel()} đang bận — kill daemon cũ: ${pids.join(', ')}`,
  );
  killPids(pids, 'SIGTERM');
  await sleep(400);

  pids = listListenPids(DAEMON_PORT);
  if (!pids.length) {
    return;
  }

  console.log(`[agent-render-daemon] còn sống sau SIGTERM — SIGKILL: ${pids.join(', ')}`);
  killPids(pids, 'SIGKILL');
  await sleep(200);

  pids = listListenPids(DAEMON_PORT);
  if (pids.length) {
    throw new Error(
      `Không giải phóng được port ${portLabel()} (pid còn: ${pids.join(', ')})`,
    );
  }
}

await freeDaemonPort();
await import('./server.mjs');
