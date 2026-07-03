import assert from 'node:assert/strict';
import crypto from 'node:crypto';
process.env.BIONG_RENDER_DAEMON_TOKEN = 'test-secret';

const { verifyLaunchToken, diagnoseLaunchToken } = await import('./launch-token.mjs');

const shortVideoId = 9;
const exp = Math.floor(Date.now() / 1000) + 300;

function sign(phase, legacy = false) {
  const payload = legacy ? `${shortVideoId}|${exp}` : `${shortVideoId}|${exp}|${phase}`;
  const signature = crypto.createHmac('sha256', 'test-secret').update(payload).digest('hex');
  return legacy ? `${exp}.${signature}` : `${exp}.${phase}.${signature}`;
}

assert.equal(verifyLaunchToken(shortVideoId, sign('1')), true);
assert.equal(diagnoseLaunchToken(shortVideoId, sign('1')).phase, '1');
assert.equal(verifyLaunchToken(shortVideoId, sign('2')), true);
assert.equal(diagnoseLaunchToken(shortVideoId, sign('2')).phase, '2');
assert.equal(verifyLaunchToken(shortVideoId, sign('continue')), true);
assert.equal(diagnoseLaunchToken(shortVideoId, sign('continue')).phase, 'continue');
assert.equal(verifyLaunchToken(shortVideoId, sign('2', true)), true);
assert.equal(diagnoseLaunchToken(shortVideoId, sign('2', true)).phase, '2');
assert.equal(verifyLaunchToken(shortVideoId, 'bad.token'), false);

console.log('launch-token.test.mjs: ok');
