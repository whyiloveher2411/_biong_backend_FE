import crypto from 'node:crypto';
import { DAEMON_SECRET } from './config.mjs';
import { normalizeAgentPhase } from './agent-phase.mjs';

function resolveDaemonSecret() {
  return String(process.env.BIONG_RENDER_DAEMON_TOKEN || DAEMON_SECRET || '').trim();
}

function verifySignature({ id, exp, phase, signature, secret, legacy = false }) {
  const payload = legacy ? `${id}|${exp}` : `${id}|${exp}|${phase}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (signature.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function verifyLaunchToken(shortVideoId, launchToken) {
  const result = diagnoseLaunchToken(shortVideoId, launchToken);
  return result.ok;
}

export function diagnoseLaunchToken(shortVideoId, launchToken) {
  const token = String(launchToken || '').trim();
  const id = Number(shortVideoId || 0);
  const secret = resolveDaemonSecret();

  if (!secret) {
    return {
      ok: false,
      phase: '2',
      reason: 'missing_daemon_secret',
      message: 'Daemon thiếu BIONG_RENDER_DAEMON_TOKEN — kiểm tra scripts/agent-render-daemon/.env.local',
    };
  }
  if (!token || !Number.isInteger(id) || id <= 0) {
    return { ok: false, phase: '2', reason: 'invalid_input', message: 'Thiếu short_video_id hoặc launch_token' };
  }

  const parts = token.split('.');
  let exp = 0;
  let phase = '2';
  let signature = '';
  let legacy = false;

  if (parts.length === 3) {
    exp = Number(parts[0]);
    phase = normalizeAgentPhase(parts[1]);
    signature = String(parts[2] || '').trim().toLowerCase();
  } else if (parts.length === 2) {
    legacy = true;
    exp = Number(parts[0]);
    signature = String(parts[1] || '').trim().toLowerCase();
    phase = '2';
  } else {
    return { ok: false, phase: '2', reason: 'malformed_token', message: 'launch_token sai định dạng' };
  }

  if (!Number.isFinite(exp) || exp <= 0 || !/^[a-f0-9]{64}$/.test(signature)) {
    return { ok: false, phase, reason: 'malformed_token', message: 'launch_token có exp/signature không hợp lệ' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (exp < now) {
    return { ok: false, phase, reason: 'expired', message: 'launch_token đã hết hạn — bấm Chạy agent lại trên CMS' };
  }

  const valid = verifySignature({ id, exp, phase, signature, secret, legacy });
  if (!valid) {
    return {
      ok: false,
      phase,
      reason: 'signature_mismatch',
      message: 'launch_token không khớp — đồng bộ BIONG_RENDER_DAEMON_TOKEN giữa backend .env và daemon .env.local rồi restart daemon',
    };
  }

  return { ok: true, phase, reason: 'ok', message: '' };
}
