#!/usr/bin/env node

/**
 * External dev access over cellular data (no same Wi‑Fi required):
 * - Cloudflare quick tunnel → Spring Boot API (localhost:8080)
 * - Cloudflare quick tunnel → Metro bundler (localhost:8081)
 * - Expo starts in LAN mode with EXPO_PACKAGER_PROXY_URL (avoids Expo/ngrok --tunnel)
 */

const { spawn } = require('child_process');

const API_LOCAL = 'http://localhost:8080';
const METRO_LOCAL = 'http://localhost:8081';
const TUNNEL_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

let cloudflaredApi;
let cloudflaredMetro;
let expo;
let shuttingDown = false;

let apiTunnelUrl = null;
let metroTunnelUrl = null;

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
  log('\nStopping Expo and Cloudflare tunnels...');
  kill(expo);
  kill(cloudflaredApi);
  kill(cloudflaredMetro);
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function startExpo() {
  log('\n--- Ready ---');
  log(`API:   ${apiTunnelUrl}`);
  log(`Metro: ${metroTunnelUrl}`);
  log('Starting Expo (LAN + Cloudflare proxy, no ngrok)...\n');

  let expoCmd;
  let expoArgs;
  if (process.platform === 'win32') {
    expoCmd = 'cmd.exe';
    expoArgs = ['/c', 'npx', 'expo', 'start', '--lan', '--clear'];
  } else {
    expoCmd = 'npx';
    expoArgs = ['expo', 'start', '--lan', '--clear'];
  }

  expo = spawn(expoCmd, expoArgs, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      EXPO_PUBLIC_API_URL: apiTunnelUrl,
      EXPO_PACKAGER_PROXY_URL: metroTunnelUrl,
    },
    stdio: 'inherit',
  });

  expo.on('exit', (code, signal) => {
    if (!shuttingDown) {
      log(`Expo exited (${signal || code}). Stopping tunnels...`);
      kill(cloudflaredApi);
      kill(cloudflaredMetro);
      process.exit(code ?? 0);
    }
  });
}

function maybeStartExpo() {
  if (expo || !apiTunnelUrl || !metroTunnelUrl) return;
  startExpo();
}

function watchTunnelOutput(label, chunk, assignUrl) {
  const text = chunk.toString();
  process.stdout.write(text);
  if (assignUrl) return;
  const match = text.match(TUNNEL_URL_RE);
  if (match) {
    if (label === 'api') {
      apiTunnelUrl = match[0];
      log(`\n[API tunnel] ${apiTunnelUrl}`);
    } else {
      metroTunnelUrl = match[0];
      log(`\n[Metro tunnel] ${metroTunnelUrl}`);
    }
    maybeStartExpo();
  }
}

function spawnCloudflared(label, localUrl) {
  const child = spawn('cloudflared', ['tunnel', '--url', localUrl], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => watchTunnelOutput(label, chunk, false));
  child.stderr.on('data', (chunk) => watchTunnelOutput(label, chunk, false));

  child.on('error', (err) => {
    if (err && err.code === 'ENOENT') {
      console.error('cloudflared is not installed. Run: brew install cloudflared');
    } else {
      console.error(`Failed to start cloudflared (${label}):`, err?.message || err);
    }
    shutdown();
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      log(`Cloudflare tunnel (${label}) exited (${signal || code}).`);
      kill(expo);
      kill(cloudflaredApi);
      kill(cloudflaredMetro);
      process.exit(code ?? 0);
    }
  });

  return child;
}

log('Starting external dev mode (Cloudflare only — no Expo/ngrok tunnel)...');
log(`  API tunnel  → ${API_LOCAL}`);
log(`  Metro tunnel → ${METRO_LOCAL}`);
log('Keep this terminal open. Press Ctrl+C to stop everything.\n');

cloudflaredApi = spawnCloudflared('api', API_LOCAL);
cloudflaredMetro = spawnCloudflared('metro', METRO_LOCAL);
