#!/usr/bin/env node
// One-time helper: gets a Chrome Web Store API refresh token and saves it to .env.
//
// Needs CWS_CLIENT_ID and CWS_CLIENT_SECRET in .env (an OAuth client of type
// "Desktop app"). Prints a Google consent URL, waits for you to approve it as the
// account that owns the Web Store listing, then writes CWS_REFRESH_TOKEN to .env.
// The token is never printed.
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';
const TIMEOUT_MS = 5 * 60 * 1000;

function readEnv() {
  const env = {};
  readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach(function(line) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (match) {
        env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
      }
    });
  return env;
}

function saveRefreshToken(token) {
  const text = readFileSync(envPath, 'utf8');
  const line = `CWS_REFRESH_TOKEN=${token}`;
  const next = /^CWS_REFRESH_TOKEN=.*$/m.test(text)
    ? text.replace(/^CWS_REFRESH_TOKEN=.*$/m, line)
    : text.replace(/\n?$/, `\n${line}\n`);
  writeFileSync(envPath, next);
}

async function tokenRequest(params) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams(params),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Token request failed: ${body.error} ${body.error_description || ''}`);
  }
  return body;
}

// Starts a loopback server, prints the consent URL and resolves with the
// authorization code plus the redirect URI it was issued for.
function authorize(clientId, state) {
  return new Promise(function(resolveAuth, reject) {
    let redirectUri;
    const server = createServer(function(req, res) {
      const url = new URL(req.url, 'http://127.0.0.1');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      if (!code && !error) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(error ? `Authorization failed: ${error}` : 'Done. You can close this tab.');
      server.close();
      if (error || url.searchParams.get('state') !== state) {
        reject(new Error(error || 'State mismatch, ignoring response'));
      } else {
        resolveAuth({ code: code, redirectUri: redirectUri });
      }
    });
    server.listen(0, '127.0.0.1', function() {
      redirectUri = `http://127.0.0.1:${server.address().port}`;
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPE,
        access_type: 'offline',
        prompt: 'consent',
        state: state,
      })}`;
      console.log('Open this URL and approve access as the Web Store listing owner:\n');
      console.log(authUrl, '\n');
      execFile('open', [authUrl], function() {});
    });
    setTimeout(function() {
      server.close();
      reject(new Error('Timed out waiting for authorization'));
    }, TIMEOUT_MS).unref();
  });
}

async function main() {
  const env = readEnv();
  if (!env.CWS_CLIENT_ID || !env.CWS_CLIENT_SECRET) {
    throw new Error('Set CWS_CLIENT_ID and CWS_CLIENT_SECRET in .env first');
  }
  const auth = await authorize(env.CWS_CLIENT_ID, randomUUID());

  const tokens = await tokenRequest({
    code: auth.code,
    client_id: env.CWS_CLIENT_ID,
    client_secret: env.CWS_CLIENT_SECRET,
    redirect_uri: auth.redirectUri,
    grant_type: 'authorization_code',
  });
  if (!tokens.refresh_token) {
    throw new Error('Google did not return a refresh token; revoke the app at myaccount.google.com/permissions and retry');
  }
  saveRefreshToken(tokens.refresh_token);

  // Prove the saved token works before declaring success.
  await tokenRequest({
    client_id: env.CWS_CLIENT_ID,
    client_secret: env.CWS_CLIENT_SECRET,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  });
  console.log('Saved CWS_REFRESH_TOKEN to .env and confirmed it can mint an access token.');
}

main().catch(function(e) {
  console.error(e.message);
  process.exitCode = 1;
});
