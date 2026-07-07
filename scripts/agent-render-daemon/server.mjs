import http from 'node:http';
import {
  assertDaemonConfig,
  DAEMON_HOST,
  DAEMON_PORT,
  DAEMON_VERSION,
} from './config.mjs';
import { triggerAgentRender } from './trigger-render.mjs';
import { runAssembleImportHtml, runRenderImportHtml } from './import-html-script.mjs';
import { getPreviewStatus, startPreviewServer } from './preview-server.mjs';
import { diagnoseLaunchToken } from './launch-token.mjs';

function sendJson(res, statusCode, payload, req) {
  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  };
  applyCorsHeaders(req, headers);
  res.writeHead(statusCode, headers);
  res.end(body);
}

function applyCorsHeaders(req, headers) {
  const origin = String(req.headers.origin || '').trim();
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept';
    headers.Vary = 'Origin';
  }
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
  if (req.method === 'OPTIONS') {
    const headers = {};
    applyCorsHeaders(req, headers);
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${DAEMON_HOST}:${DAEMON_PORT}`);
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, { ok: true, version: DAEMON_VERSION }, req);
    return;
  }

  if (req.method === 'GET' && pathname === '/v1/preview/status') {
    const shortVideoId = Number(url.searchParams.get('short_video_id') || 0);
    sendJson(res, 200, {
      success: true,
      short_video_id: shortVideoId,
      ...getPreviewStatus(shortVideoId),
    }, req);
    return;
  }

  if (req.method === 'POST' && pathname === '/v1/assemble') {
    let shortVideoId = 0;
    try {
      const body = await readJsonBody(req);
      shortVideoId = Number(body?.short_video_id || 0);
      const auth = extractBearer(req);
      console.log(`[agent-render-daemon] assemble start short_video_id=${shortVideoId}`);
      const result = await runAssembleImportHtml(body, auth);
      sendJson(res, 200, result, req);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[agent-render-daemon] assemble fail short_video_id=${shortVideoId}: ${message}`);
      sendJson(res, 400, { success: false, message }, req);
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/v1/preview') {
    let shortVideoId = 0;
    try {
      const body = await readJsonBody(req);
      shortVideoId = Number(body?.short_video_id || 0);
      const auth = extractBearer(req);
      const tokenCheck = diagnoseLaunchToken(shortVideoId, auth);
      if (!tokenCheck.ok) {
        throw new Error(tokenCheck.message || 'launch_token không hợp lệ');
      }
      console.log(`[agent-render-daemon] preview start short_video_id=${shortVideoId}`);
      const preview = await startPreviewServer(shortVideoId);
      sendJson(res, 200, {
        success: true,
        short_video_id: shortVideoId,
        ...preview,
      }, req);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[agent-render-daemon] preview fail short_video_id=${shortVideoId}: ${message}`);
      sendJson(res, 400, { success: false, message }, req);
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/v1/render-import-html') {
    let shortVideoId = 0;
    try {
      const body = await readJsonBody(req);
      shortVideoId = Number(body?.short_video_id || 0);
      const auth = extractBearer(req);
      console.log(`[agent-render-daemon] render-import-html start short_video_id=${shortVideoId}`);
      const result = await runRenderImportHtml(body, auth);
      sendJson(res, 200, result, req);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[agent-render-daemon] render-import-html fail short_video_id=${shortVideoId}: ${message}`);
      sendJson(res, 400, { success: false, message }, req);
    }
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
      sendJson(res, 200, result, req);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[agent-render-daemon] render fail short_video_id=${shortVideoId}: ${message}`);
      sendJson(res, 400, {
        success: false,
        message,
      }, req);
    }
    return;
  }

  sendJson(res, 404, { success: false, message: 'Not found' }, req);
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
    }, req);
  });
});

server.listen(DAEMON_PORT, DAEMON_HOST, () => {
  console.log(`[agent-render-daemon] listening on http://${DAEMON_HOST}:${DAEMON_PORT}`);
});
