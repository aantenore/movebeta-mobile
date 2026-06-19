import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RELEASE_ARCHIVES_SCHEMA_VERSION = 'movebeta.release-archives.v1';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultOutputDir(rootDir = resolveProjectRoot()) {
  return path.dirname(rootDir);
}

function gitValue(rootDir, args, fallback = 'unknown') {
  try {
    return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function gitStatusLines(rootDir) {
  const output = gitValue(rootDir, ['status', '--short'], '');
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^.. /, '').replace(/^"/, '').replace(/"$/, ''));
}

export function sha256File(filePath) {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

export function archiveInfo({ filePath, key, label }) {
  const stats = fs.statSync(filePath);
  return {
    bytes: stats.size,
    key,
    label,
    path: filePath,
    sha256: sha256File(filePath),
  };
}

export function buildReleaseArchiveManifest({
  archives,
  generatedAt = new Date().toISOString(),
  rootDir = resolveProjectRoot(),
}) {
  return {
    archives: archives.map((archive) => archiveInfo(archive)),
    generatedAt,
    repository: {
      branch: gitValue(rootDir, ['branch', '--show-current']),
      changedPaths: gitStatusLines(rootDir),
      commitSha: gitValue(rootDir, ['rev-parse', 'HEAD']),
      remoteUrl: gitValue(rootDir, ['config', '--get', 'remote.origin.url']),
      worktreeDirty: gitStatusLines(rootDir).length > 0,
    },
    schemaVersion: RELEASE_ARCHIVES_SCHEMA_VERSION,
  };
}

export function renderReleaseArchiveMarkdown(manifest) {
  const rows = manifest.archives
    .map((archive) => `| ${archive.label} | \`${archive.path}\` | ${archive.bytes} | \`${archive.sha256}\` |`)
    .join('\n');

  return `# MoveBeta Release Archives

Generated: ${manifest.generatedAt}

- Repository: ${manifest.repository.remoteUrl}
- Branch: ${manifest.repository.branch}
- Commit: ${manifest.repository.commitSha}
- Worktree dirty at generation: ${manifest.repository.worktreeDirty ? 'yes' : 'no'}

| Archive | Path | Bytes | SHA-256 |
| --- | --- | ---: | --- |
${rows}
`;
}

export function writeReleaseArchiveManifest({
  archives,
  generatedAt,
  jsonOutputPath,
  markdownOutputPath,
  rootDir = resolveProjectRoot(),
}) {
  const manifest = buildReleaseArchiveManifest({ archives, generatedAt, rootDir });

  fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownOutputPath), { recursive: true });
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(markdownOutputPath, renderReleaseArchiveMarkdown(manifest));

  return { jsonOutputPath, manifest, markdownOutputPath };
}

export function createReleaseArchives({
  generatedAt,
  outputDir = resolveDefaultOutputDir(),
  rootDir = resolveProjectRoot(),
} = {}) {
  const distDir = path.join(rootDir, 'dist');
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error('Missing dist/index.html. Run npm run export:web before release:archives.');
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const sourceArchivePath = path.join(outputDir, 'movebeta-mobile-source.zip');
  const webArchivePath = path.join(outputDir, 'movebeta-mobile-web-dist.zip');
  const jsonOutputPath = path.join(outputDir, 'movebeta-mobile-release-archives.json');
  const markdownOutputPath = path.join(outputDir, 'movebeta-mobile-release-archives.md');

  execFileSync('git', ['archive', '--format=zip', `--output=${sourceArchivePath}`, 'HEAD'], {
    cwd: rootDir,
    stdio: 'inherit',
  });
  if (fs.existsSync(webArchivePath)) fs.rmSync(webArchivePath);
  execFileSync('zip', ['-qry', webArchivePath, '.'], {
    cwd: distDir,
    stdio: 'inherit',
  });

  return writeReleaseArchiveManifest({
    archives: [
      { filePath: sourceArchivePath, key: 'source', label: 'Source archive' },
      { filePath: webArchivePath, key: 'web-dist', label: 'Web dist archive' },
    ],
    generatedAt,
    jsonOutputPath,
    markdownOutputPath,
    rootDir,
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonOutputPath, manifest, markdownOutputPath } = createReleaseArchives();
  console.log(`Wrote release archive manifest to ${jsonOutputPath}`);
  console.log(`Wrote release archive summary to ${markdownOutputPath}`);
  for (const archive of manifest.archives) {
    console.log(`${archive.label}: ${archive.bytes} bytes; sha256=${archive.sha256}`);
  }
}
