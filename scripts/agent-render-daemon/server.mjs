import http from 'node:http';
import {
  assertDaemonConfig,
  DAEMON_HOST,
  DAEMON_PORT,
  DAEMON_VERSION,
} from './config.mjs';
import { triggerAgentRender } from './trigger-render.mjs';

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Body không phải JSON hợp lệ'));
      }
    });
    req.on('error', reject);
  });
}

function extractBearer(req) {
  const header = String(req.headers.authorization || '').trim();
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? String(match[1] || '').trim() : '';
}

async function handleRequest(req, res) {
  const url = new URL(req.url || '/', `http://${DAEMON_HOST}:${DAEMON_PORT}`);
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, { ok: true, version: DAEMON_VERSION });
    return;
  }

  if (req.method === 'POST' && pathname === '/v1/render') {
    let shortVideoId = 0;
    try {
      const body = await readJsonBody(req);
      shortVideoId = Number(body?.short_video_id || 0);
      const auth = extractBearer(req);
      console.log(`[agent-render-daemon] render start short_video_id=${shortVideoId} phase=${body?.phase || '2'}`);
      const result = await triggerAgentRender(body, auth);
      console.log(
        `[agent-render-daemon] render ok short_video_id=${shortVideoId} prompt=${result.prompt_relative}`,
      );
      sendJson(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[agent-render-daemon] render fail short_video_id=${shortVideoId}: ${message}`);
      sendJson(res, 400, {
        success: false,
        message,
      });
    }
    return;
  }

  sendJson(res, 404, { success: false, message: 'Not found' });
}

try {
  assertDaemonConfig();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    sendJson(res, 500, {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    });
  });
});

server.listen(DAEMON_PORT, DAEMON_HOST, () => {
  console.log(`[agent-render-daemon] listening on http://${DAEMON_HOST}:${DAEMON_PORT}`);
});
