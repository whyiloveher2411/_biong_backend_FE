import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const feRoot = path.resolve(__dirname, '..');
const remotionRoot = path.resolve(
  feRoot,
  '../_biong_backend/resources/views/plugins/vn4-e-learning/services/remotion-short-video'
);

const children = [];

function run(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      REMOTION_WATCH_POLLING: process.env.REMOTION_WATCH_POLLING || '0',
    },
  });
  children.push(child);
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    if (code && code !== 0) {
      console.error(`[${name}] thoát với mã ${code}`);
      shutdown(code);
    }
  });
  return child;
}

function shutdown(code = 0) {
  children.forEach((child) => {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  });
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('CMS FE: craco start');
console.log('Remotion: build:watch (bundle cho export server)');
console.log(`Remotion path: ${remotionRoot}`);

run('cms-fe', 'npm', ['start'], feRoot);
run('remotion', 'npm', ['run', 'build:watch'], remotionRoot);
