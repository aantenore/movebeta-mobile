import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function isGitIgnored(relativePath) {
  return spawnSync('git', ['check-ignore', '--no-index', '--quiet', relativePath], {
    cwd: rootDir,
  }).status === 0;
}

describe('static web security', () => {
  it('loads service worker registration from a same-origin external script', () => {
    const htmlSource = read('src/app/+html.tsx');
    const registration = read('public/pwa-register.js');

    expect(htmlSource).toContain('src="/pwa-register.js"');
    expect(htmlSource).toContain('data-service-worker="/sw.js"');
    expect(htmlSource).not.toContain('dangerouslySetInnerHTML');
    expect(registration).toContain('navigator.serviceWorker.register(serviceWorkerUrl)');
  });

  it('sets restrictive deployment headers while allowing local video and model execution', () => {
    const config = JSON.parse(read('vercel.json'));
    const globalHeaders = config.headers.find((entry) => entry.source === '/(.*)')?.headers ?? [];
    const headers = new Map(globalHeaders.map((entry) => [entry.key, entry.value]));
    const csp = headers.get('Content-Security-Policy') ?? '';
    const scriptDirective = csp.split(';').find((directive) => directive.trim().startsWith('script-src')) ?? '';

    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("media-src 'self' data: blob: mediastream:");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(scriptDirective).not.toContain("'unsafe-inline'");
  });

  it('revalidates mutable model and registration URLs', () => {
    const config = JSON.parse(read('vercel.json'));
    const cacheHeaderFor = (source) =>
      config.headers.find((entry) => entry.source === source)?.headers?.find((entry) => entry.key === 'Cache-Control')?.value;

    expect(cacheHeaderFor('/models/(.*)')).toBe('public, max-age=0, must-revalidate');
    expect(cacheHeaderFor('/models/(.*)')).not.toContain('immutable');
    expect(cacheHeaderFor('/pwa-register.js')).toBe('public, max-age=0, must-revalidate');
  });

  it('ignores local secrets while preserving share-safe environment examples', () => {
    expect(isGitIgnored('.env')).toBe(true);
    expect(isGitIgnored('.env.production')).toBe(true);
    expect(isGitIgnored('.env.local')).toBe(true);
    expect(isGitIgnored('.env.example')).toBe(false);
    expect(isGitIgnored('.env.production.example')).toBe(false);
    expect(isGitIgnored('secrets/movebeta-service-account.json')).toBe(true);
    expect(isGitIgnored('secrets/movebeta_service_account_prod.json')).toBe(true);
    expect(isGitIgnored('secrets/serviceAccountKey.json')).toBe(true);
  });
});
