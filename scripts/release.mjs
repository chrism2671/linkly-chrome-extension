#!/usr/bin/env node
// Builds the Chrome and Firefox packages and submits them to the stores.
//
//   node scripts/release.mjs --dry-run        build both zips only, no network
//   node scripts/release.mjs                  build, confirm, upload + submit for review
//   node scripts/release.mjs --chrome-only | --firefox-only
//   node scripts/release.mjs --no-publish     Chrome: upload the draft but don't submit
//   node scripts/release.mjs --notes "text"   Firefox release notes
//   node scripts/release.mjs --yes            skip the confirmation prompt
//
// Credentials come from .env (see .env.example) or the environment. Secrets are
// never printed. Both stores still review the release before it goes live.
import { createHmac, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const SHIPPED_FILES = [
  'manifest.json',
  'background.js',
  'icon16.png',
  'icon32.png',
  'icon48.png',
  'icon128.png',
];

// Firefox's data-collection declaration. "none" matches the privacy statement in
// the README (the extension itself transmits nothing); change it if that stops
// being true.
const FIREFOX_DATA_COLLECTION = { required: ['none'] };
const FIREFOX_MIN_VERSION = '128.0';

const CWS_API = 'https://chromewebstore.googleapis.com';
const CWS_SCOPE = 'https://www.googleapis.com/auth/chromewebstore';
const AMO_API = 'https://addons.mozilla.org/api/v5';

function parseArgs(argv) {
  const args = { notes: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--notes') {
      i += 1;
      args.notes = argv[i] || '';
    } else if (arg.startsWith('--')) {
      args[arg.slice(2)] = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function loadEnv() {
  const path = join(root, '.env');
  if (!existsSync(path)) {
    return;
  }
  readFileSync(path, 'utf8')
    .split('\n')
    .forEach(function(line) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (match && !(match[1] in process.env)) {
        process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
      }
    });
}

function need(...names) {
  const missing = names.filter(function(name) {
    return !process.env[name];
  });
  if (missing.length) {
    throw new Error(`Missing in .env: ${missing.join(', ')}`);
  }
}

function zipFiles(cwd, files, out) {
  rmSync(out, { force: true });
  execFileSync('zip', ['-q', out].concat(files), { cwd: cwd });
}

function buildChrome(version) {
  const out = join(distDir, `linkly-chrome-${version}.zip`);
  zipFiles(root, SHIPPED_FILES, out);
  return out;
}

// Firefox has no background.service_worker and doesn't support
// externally_connectable, and needs a gecko id for the existing listing.
function buildFirefox(manifest, version) {
  const dir = join(distDir, 'firefox-build');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  SHIPPED_FILES.filter(function(file) {
    return file !== 'manifest.json';
  }).forEach(function(file) {
    copyFileSync(join(root, file), join(dir, file));
  });

  const firefoxManifest = JSON.parse(JSON.stringify(manifest));
  firefoxManifest.background = { scripts: ['background.js'] };
  delete firefoxManifest.externally_connectable;
  firefoxManifest.browser_specific_settings = {
    gecko: {
      id: process.env.AMO_ADDON_ID,
      strict_min_version: FIREFOX_MIN_VERSION,
      data_collection_permissions: FIREFOX_DATA_COLLECTION,
    },
  };
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify(firefoxManifest, null, 2).concat('\n')
  );

  const out = join(distDir, `linkly-firefox-${version}.zip`);
  zipFiles(dir, SHIPPED_FILES, out);
  return out;
}

async function request(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `${(options && options.method) || 'GET'} ${url} -> ${res.status}: ${text.slice(0, 600)}`
    );
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    return { raw: text };
  }
}

function sleep(ms) {
  return new Promise(function(resolveSleep) {
    setTimeout(resolveSleep, ms);
  });
}

// Prefers a service account (impersonated through gcloud, so no key or secret is
// stored); falls back to an OAuth client + refresh token from scripts/cws-auth.mjs.
async function chromeAccessToken() {
  if (process.env.CWS_SERVICE_ACCOUNT) {
    // `gcloud --impersonate-service-account` ignores --scopes, so ask the IAM
    // Credentials API for a token with the Web Store scope directly.
    const userToken = execFileSync('gcloud', ['auth', 'print-access-token'], {
      encoding: 'utf8',
    }).trim();
    const minted = await request(
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${process.env.CWS_SERVICE_ACCOUNT}:generateAccessToken`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scope: [CWS_SCOPE] }),
      }
    );
    return minted.accessToken;
  }
  need('CWS_CLIENT_ID', 'CWS_CLIENT_SECRET', 'CWS_REFRESH_TOKEN');
  const token = await request('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.CWS_CLIENT_ID,
      client_secret: process.env.CWS_CLIENT_SECRET,
      refresh_token: process.env.CWS_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  return token.access_token;
}

async function releaseChrome(zipPath, args) {
  need('CWS_PUBLISHER_ID', 'CWS_EXTENSION_ID');
  const headers = { Authorization: `Bearer ${await chromeAccessToken()}` };
  const item = `publishers/${process.env.CWS_PUBLISHER_ID}/items/${process.env.CWS_EXTENSION_ID}`;

  console.log('Chrome: uploading', basename(zipPath));
  const upload = await request(`${CWS_API}/upload/v2/${item}:upload`, {
    method: 'POST',
    headers: headers,
    body: readFileSync(zipPath),
  });
  let state = upload.uploadState;
  for (let i = 0; state === 'IN_PROGRESS' && i < 20; i += 1) {
    await sleep(3000);
    const status = await request(`${CWS_API}/v2/${item}:fetchStatus`, {
      headers: headers,
    });
    state = status.lastAsyncUploadState;
  }
  if (state !== 'SUCCEEDED') {
    throw new Error(`Chrome upload did not succeed (state: ${state})`);
  }
  console.log('Chrome: upload succeeded');

  if (args['no-publish']) {
    console.log('Chrome: --no-publish, left as a draft in the dashboard');
    return;
  }
  const published = await request(`${CWS_API}/v2/${item}:publish`, {
    method: 'POST',
    headers: headers,
  });
  console.log('Chrome: submitted for review, state:', published.state || 'unknown');
}

function amoJwt() {
  const encode = function(value) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  };
  const now = Math.floor(Date.now() / 1000);
  const data = [
    encode({ alg: 'HS256', typ: 'JWT' }),
    encode({
      iss: process.env.AMO_JWT_ISSUER,
      jti: randomUUID(),
      iat: now,
      exp: now + 60,
    }),
  ].join('.');
  const signature = createHmac('sha256', process.env.AMO_JWT_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

function amoHeaders() {
  return { Authorization: `JWT ${amoJwt()}` };
}

async function releaseFirefox(zipPath, args) {
  need('AMO_JWT_ISSUER', 'AMO_JWT_SECRET', 'AMO_ADDON_ID');

  console.log('Firefox: uploading', basename(zipPath));
  const form = new FormData();
  form.append('upload', new Blob([readFileSync(zipPath)]), basename(zipPath));
  form.append('channel', 'listed');
  let upload = await request(`${AMO_API}/addons/upload/`, {
    method: 'POST',
    headers: amoHeaders(),
    body: form,
  });
  for (let i = 0; !upload.processed && i < 40; i += 1) {
    await sleep(3000);
    upload = await request(`${AMO_API}/addons/upload/${upload.uuid}/`, {
      headers: amoHeaders(),
    });
  }
  if (!upload.processed || !upload.valid) {
    throw new Error(
      `Firefox validation failed: ${JSON.stringify(upload.validation || upload).slice(0, 1500)}`
    );
  }

  const body = { upload: upload.uuid };
  if (args.notes) {
    body.release_notes = { 'en-US': args.notes };
  }
  const version = await request(
    `${AMO_API}/addons/addon/${encodeURIComponent(process.env.AMO_ADDON_ID)}/versions/`,
    {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, amoHeaders()),
      body: JSON.stringify(body),
    }
  );
  console.log('Firefox: submitted for review, version', version.version || '?');
}

async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnv();

  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  const version = manifest.version;
  const doChrome = !args['firefox-only'];
  const doFirefox = !args['chrome-only'];

  if (doFirefox) {
    need('AMO_ADDON_ID');
  }

  const dirty = execFileSync(
    'git',
    ['status', '--porcelain', '--'].concat(SHIPPED_FILES),
    { cwd: root, encoding: 'utf8' }
  ).trim();
  if (dirty && !args['dry-run']) {
    throw new Error(`Commit these before releasing:\n${dirty}`);
  }

  mkdirSync(distDir, { recursive: true });
  const zips = [];
  if (doChrome) {
    zips.push(buildChrome(version));
  }
  if (doFirefox) {
    zips.push(buildFirefox(manifest, version));
  }
  console.log(`Built v${version}:\n  ${zips.join('\n  ')}`);

  if (args['dry-run']) {
    console.log('Dry run: nothing uploaded.');
    return;
  }

  const targets = [doChrome && 'Chrome Web Store', doFirefox && 'Firefox AMO']
    .filter(Boolean)
    .join(' and ');
  if (!args.yes && !(await confirm(`Submit v${version} to ${targets} for review? [y/N] `))) {
    console.log('Aborted.');
    return;
  }

  // Run both so one store's failure doesn't block the other; report at the end.
  const failures = [];
  if (doChrome) {
    try {
      await releaseChrome(zips[0], args);
    } catch (e) {
      failures.push(`Chrome: ${e.message}`);
    }
  }
  if (doFirefox) {
    try {
      await releaseFirefox(zips[zips.length - 1], args);
    } catch (e) {
      failures.push(`Firefox: ${e.message}`);
    }
  }
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  }
}

main().catch(function(e) {
  console.error(e.message);
  process.exitCode = 1;
});
