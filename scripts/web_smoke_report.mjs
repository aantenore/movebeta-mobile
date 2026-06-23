import { spawn } from 'node:child_process';
import fs, { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

export const WEB_SMOKE_REPORT_SCHEMA_VERSION = 'movebeta.web-smoke-report.v1';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 8083;
const DEFAULT_TIMEOUT_MS = 180_000;
const MAX_LOG_CHARS = 8_000;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const forbiddenWebSmokeValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/web-smoke-report.json');
}

export function resolveDefaultMarkdownOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/web-smoke-report.md');
}

function containsForbiddenValue(value) {
  if (typeof value === 'string') return forbiddenWebSmokeValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function redactUnsafeText(value = '', rootDir = resolveProjectRoot()) {
  const rootPattern = rootDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(value)
    .replace(new RegExp(rootPattern, 'g'), '<project-root>')
    .replace(/file:\/\/\S+/gi, '<file-uri>')
    .replace(/content:\/\/\S+/gi, '<content-uri>')
    .replace(/asset:\/\/\S+/gi, '<asset-uri>')
    .replace(/ph:\/\/\S+/gi, '<photo-uri>')
    .replace(/\/Users\/[^\s'")]+/g, '<local-path>')
    .replace(/\/private\/[^\s'")]+/g, '<local-path>')
    .replace(/\/var\/mobile\/[^\s'")]+/g, '<local-path>')
    .replace(/[A-Za-z]:\\[^\s'")]+/g, '<local-path>')
    .replace(/\b\S+\.(mov|mp4)\b/gi, '<media-file>')
    .replace(/BEGIN PRIVATE KEY/g, '<private-key>')
    .replace(/ghp_[A-Za-z0-9_]+/g, '<token>')
    .replace(/github_pat_[A-Za-z0-9_]+/g, '<token>')
    .replace(/pat_[A-Za-z0-9_]+/g, '<token>')
    .replace(/sk_live_[A-Za-z0-9_]+/g, '<token>')
    .replace(/sk_test_[A-Za-z0-9_]+/g, '<token>')
    .replace(/bearer\s+[A-Za-z0-9._-]+/gi, 'bearer <token>')
    .replace(/eyJ[A-Za-z0-9_-]{20,}/g, '<jwt>');
}

function boundedTail(value = '') {
  const text = String(value);
  return text.length > MAX_LOG_CHARS ? text.slice(text.length - MAX_LOG_CHARS) : text;
}

function safeUrl(value) {
  try {
    const parsed = new URL(value);
    parsed.username = '';
    parsed.password = '';
    parsed.search = parsed.search ? '?redacted=true' : '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return redactUnsafeText(value);
  }
}

function relativePath(rootDir, targetPath) {
  const relative = path.relative(rootDir, targetPath);
  return relative.length > 0 && !relative.startsWith('..') ? relative : path.basename(targetPath);
}

function resolveStaticFile(distDir, urlPath) {
  const root = path.resolve(distDir);
  const cleanPath = decodeURIComponent((urlPath ?? '/').split('?')[0] ?? '/');
  const normalized = path.normalize(cleanPath).replace(/^(\.\.[/\\])+/, '');
  const candidate = path.resolve(path.join(root, normalized));

  if (candidate.startsWith(root) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  return path.join(root, 'index.html');
}

function staticServer(distDir) {
  return createServer((request, response) => {
    const filePath = resolveStaticFile(distDir, request.url);
    if (!fs.existsSync(filePath)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.setHeader('Content-Type', contentTypes[path.extname(filePath)] ?? 'application/octet-stream');
    createReadStream(filePath).pipe(response);
  });
}

function listen(server, { host, port }) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

export async function startWebSmokeStaticServer({
  distDir = path.join(resolveProjectRoot(), 'dist'),
  host = DEFAULT_HOST,
  port = Number(process.env.MOVEBETA_SMOKE_PORT ?? DEFAULT_PORT),
  portAttempts = 10,
} = {}) {
  for (let offset = 0; offset < portAttempts; offset += 1) {
    const nextPort = port + offset;
    const server = staticServer(distDir);
    try {
      await listen(server, { host, port: nextPort });
      return {
        close: () => closeServer(server),
        mode: 'local-static-dist',
        port: nextPort,
        url: `http://${host}:${nextPort}/`,
      };
    } catch (error) {
      if (error?.code !== 'EADDRINUSE' && error?.code !== 'EACCES') throw error;
    }
  }

  throw new Error(`Unable to start web smoke static server on ${host}:${port}-${port + portAttempts - 1}.`);
}

export function assertWebSmokeReportIsShareSafe(report) {
  if (containsForbiddenValue(report)) {
    throw new Error('Web smoke report contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return report;
}

export function buildWebSmokeReport({
  command = 'python3 scripts/smoke_web_video.py',
  completedAt = new Date().toISOString(),
  distDir = 'dist',
  durationMs = 0,
  errorMessage,
  exitCode = 0,
  generatedAt = completedAt,
  mode = 'provided-url',
  rootDir = resolveProjectRoot(),
  smokeUrl = '',
  startedAt = completedAt,
  status = exitCode === 0 ? 'pass' : 'fail',
  stderr = '',
  stdout = '',
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const safeStatus = status === 'pass' ? 'pass' : 'fail';
  const sanitizedError = errorMessage ? redactUnsafeText(errorMessage, rootDir) : undefined;
  const diagnostics =
    safeStatus === 'pass'
      ? undefined
      : {
          error: sanitizedError,
          stderrTail: redactUnsafeText(boundedTail(stderr), rootDir),
          stdoutTail: redactUnsafeText(boundedTail(stdout), rootDir),
        };
  const checks = [
    {
      detail: 'Runs the exported bundle in Playwright against the selected smoke URL.',
      key: 'playwright-exported-bundle-smoke',
      label: 'Playwright exported-bundle smoke',
      status: safeStatus,
    },
    {
      detail: 'Covers mobile and desktop release workflows asserted by scripts/smoke_web_video.py.',
      key: 'responsive-release-ui',
      label: 'Responsive release UI',
      status: safeStatus,
    },
    {
      detail: 'Covers installable PWA, service worker, offline boot, and static model cache checks.',
      key: 'pwa-offline-model-cache',
      label: 'PWA offline model cache',
      status: safeStatus,
    },
    {
      detail: 'Uses SDLC report-derived counts for launch, feature, model, and PWA expectations.',
      key: 'report-derived-expectations',
      label: 'Report-derived expectations',
      status: safeStatus,
    },
  ];
  const report = {
    checks,
    command: {
      timeoutMs,
      value: command,
    },
    completedAt,
    diagnostics,
    durationMs: Math.max(0, Math.round(durationMs)),
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    schemaVersion: WEB_SMOKE_REPORT_SCHEMA_VERSION,
    startedAt,
    status: safeStatus,
    summary: {
      failedChecks: checks.filter((check) => check.status !== 'pass').length,
      nextAction:
        safeStatus === 'pass'
          ? 'Keep the exported PWA smoke report fresh after UI, PWA, model-delivery, or release-evidence changes.'
          : 'Inspect the sanitized diagnostics, refresh the web export, and rerun npm run web:smoke:report.',
      passedChecks: checks.filter((check) => check.status === 'pass').length,
      status: safeStatus,
      totalChecks: checks.length,
    },
    target: {
      distDir,
      mode,
      url: safeUrl(smokeUrl),
    },
    tool: {
      runner: 'playwright-python',
      script: 'scripts/smoke_web_video.py',
    },
  };

  return assertWebSmokeReportIsShareSafe(report);
}

export function renderWebSmokeReportMarkdown(report) {
  const checkRows = report.checks
    .map((check) => `| ${check.label} | ${check.status} | ${check.detail} |`)
    .join('\n');
  const diagnostics = report.diagnostics
    ? `
## Diagnostics

- Error: ${report.diagnostics.error ?? 'n/a'}
- Stdout tail: \`${report.diagnostics.stdoutTail || 'empty'}\`
- Stderr tail: \`${report.diagnostics.stderrTail || 'empty'}\`
`
    : '';

  return `# Web Smoke Report

Generated: ${report.generatedAt}

- Status: ${report.status}
- Target: ${report.target.url}
- Mode: ${report.target.mode}
- Command: \`${report.command.value}\`
- Duration: ${report.durationMs}ms
- Checks: ${report.summary.passedChecks}/${report.summary.totalChecks}
- Next action: ${report.summary.nextAction}
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Check | Status | Detail |
| --- | --- | --- |
${checkRows}
${diagnostics}`;
}

export function writeWebSmokeReport({
  jsonOutputPath = resolveDefaultJsonOutputPath(),
  markdownOutputPath = resolveDefaultMarkdownOutputPath(),
  report,
}) {
  fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownOutputPath), { recursive: true });
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownOutputPath, renderWebSmokeReportMarkdown(report));
  return { jsonOutputPath, markdownOutputPath, report };
}

function runPythonSmoke({ rootDir, smokeUrl, timeoutMs }) {
  const started = performance.now();
  const command = 'python3 scripts/smoke_web_video.py';

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const child = spawn('python3', ['scripts/smoke_web_video.py'], {
      cwd: rootDir,
      env: {
        ...process.env,
        MOVEBETA_SMOKE_URL: smokeUrl,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      resolve({
        command,
        durationMs: performance.now() - started,
        errorMessage: `Web smoke timed out after ${timeoutMs}ms.`,
        exitCode: null,
        status: 'fail',
        stderr,
        stdout,
      });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      process.stdout.write(text);
      stdout = boundedTail(stdout + text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      process.stderr.write(text);
      stderr = boundedTail(stderr + text);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        command,
        durationMs: performance.now() - started,
        exitCode: code,
        status: code === 0 ? 'pass' : 'fail',
        stderr,
        stdout,
      });
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        command,
        durationMs: performance.now() - started,
        errorMessage: error instanceof Error ? error.message : String(error),
        exitCode: null,
        status: 'fail',
        stderr,
        stdout,
      });
    });
  });
}

export async function runWebSmokeReport({
  distDir = path.join(resolveProjectRoot(), 'dist'),
  generatedAt,
  jsonOutputPath,
  markdownOutputPath,
  rootDir = resolveProjectRoot(),
  smokeUrl = process.env.MOVEBETA_SMOKE_URL,
  timeoutMs = Number(process.env.MOVEBETA_SMOKE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
} = {}) {
  const startedAt = new Date().toISOString();
  const started = performance.now();
  let server;
  let mode = smokeUrl ? 'provided-url' : 'local-static-dist';
  let targetUrl = smokeUrl;
  let result;

  try {
    if (!targetUrl) {
      server = await startWebSmokeStaticServer({ distDir });
      targetUrl = server.url;
      mode = server.mode;
      console.log(`Web smoke static server listening on ${targetUrl}`);
    }

    result = await runPythonSmoke({ rootDir, smokeUrl: targetUrl, timeoutMs });
  } catch (error) {
    result = {
      command: 'python3 scripts/smoke_web_video.py',
      durationMs: performance.now() - started,
      errorMessage: error instanceof Error ? error.message : String(error),
      exitCode: null,
      status: 'fail',
      stderr: '',
      stdout: '',
    };
  } finally {
    if (server) await server.close();
  }

  const completedAt = new Date().toISOString();
  const command = `MOVEBETA_SMOKE_URL=${safeUrl(targetUrl ?? '')} ${result.command}`;
  const report = buildWebSmokeReport({
    command,
    completedAt,
    distDir: relativePath(rootDir, distDir),
    durationMs: result.durationMs,
    errorMessage: result.errorMessage,
    exitCode: result.exitCode,
    generatedAt: generatedAt ?? completedAt,
    mode,
    rootDir,
    smokeUrl: targetUrl ?? '',
    startedAt,
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout,
    timeoutMs,
  });
  const targets = writeWebSmokeReport({
    jsonOutputPath: jsonOutputPath ?? resolveDefaultJsonOutputPath(rootDir),
    markdownOutputPath: markdownOutputPath ?? resolveDefaultMarkdownOutputPath(rootDir),
    report,
  });

  console.log(`Wrote web smoke report to ${targets.jsonOutputPath}`);
  console.log(`Wrote web smoke summary to ${targets.markdownOutputPath}`);
  console.log(`Status: ${report.status}; checks: ${report.summary.passedChecks}/${report.summary.totalChecks}`);

  return targets;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { report } = await runWebSmokeReport();
  if (report.status !== 'pass') {
    process.exitCode = 1;
  }
}
