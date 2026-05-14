#!/usr/bin/env node

const { spawn } = require('child_process');

const BACKEND_URL = 'http://localhost:8080';
const TUNNEL_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

let cloudflared;
let expo;
let shuttingDown = false;

function log(message) {
  process.stdout.write(`${message}\n`);
}

function kill(child) {
  if (child && !child.killed) {
    child.kill('SIGINT');
  }
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  log('\nStopping Expo and Cloudflare tunnel...');
  kill(expo);
  kill(cloudflared);
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function startExpo(publicApiUrl) {
  log(`\nUsing API tunnel: ${publicApiUrl}`);
  log('Starting Expo tunnel...\n');

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  expo = spawn(npx, ['expo', 'start', '--tunnel', '--clear'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      EXPO_PUBLIC_API_URL: publicApiUrl,
    },
    stdio: 'inherit',
  });

  expo.on('exit', (code, signal) => {
    if (!shuttingDown) {
      log(`Expo exited (${signal || code}). Stopping Cloudflare tunnel...`);
      kill(cloudflared);
      process.exit(code ?? 0);
    }
  });
}

function handleCloudflaredOutput(chunk) {
  const text = chunk.toString();
  process.stdout.write(text);

  if (expo) return;
  const match = text.match(TUNNEL_URL_RE);
  if (match) {
    startExpo(match[0]);
  }
}

log(`Starting Cloudflare tunnel for ${BACKEND_URL}...`);
log('Keep this terminal open. Press Ctrl+C to stop everything.\n');

cloudflared = spawn('cloudflared', ['tunnel', '--url', BACKEND_URL], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});

cloudflared.stdout.on('data', handleCloudflaredOutput);
cloudflared.stderr.on('data', handleCloudflaredOutput);

cloudflared.on('error', (err) => {
  if (err && err.code === 'ENOENT') {
    console.error('cloudflared is not installed. Run: brew install cloudflared');
  } else {
    console.error('Failed to start cloudflared:', err?.message || err);
  }
  process.exit(1);
});

cloudflared.on('exit', (code, signal) => {
  if (!shuttingDown) {
    log(`Cloudflare tunnel exited (${signal || code}).`);
    kill(expo);
    process.exit(code ?? 0);
  }
});
