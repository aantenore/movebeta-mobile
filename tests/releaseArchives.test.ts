import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildReleaseArchiveManifest,
  RELEASE_ARCHIVES_SCHEMA_VERSION,
  renderReleaseArchiveMarkdown,
  sha256File,
  writeReleaseArchiveManifest,
} from '../scripts/release_archives.mjs';

const tmpRoots: string[] = [];

function makeTempDir() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-archives-'));
  tmpRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('release archives manifest', () => {
  it('computes SHA-256 checksums for archive files', () => {
    const root = makeTempDir();
    const archivePath = path.join(root, 'archive.zip');
    fs.writeFileSync(archivePath, 'movebeta');

    expect(sha256File(archivePath)).toBe('57611202116c41c5585e565c28773333271c036ccb61afb97e1d99de9d4473aa');
  });

  it('builds a manifest with archive size, checksum, and repository metadata', () => {
    const root = makeTempDir();
    const sourceArchive = path.join(root, 'source.zip');
    const webArchive = path.join(root, 'web.zip');
    fs.writeFileSync(sourceArchive, 'source');
    fs.writeFileSync(webArchive, 'web');

    const manifest = buildReleaseArchiveManifest({
      archives: [
        { filePath: sourceArchive, key: 'source', label: 'Source archive' },
        { filePath: webArchive, key: 'web-dist', label: 'Web dist archive' },
      ],
      generatedAt: '2026-06-20T10:00:00.000Z',
      rootDir: root,
    });

    expect(manifest.schemaVersion).toBe(RELEASE_ARCHIVES_SCHEMA_VERSION);
    expect(manifest.archives).toHaveLength(2);
    expect(manifest.archives[0]).toMatchObject({
      bytes: 6,
      key: 'source',
      label: 'Source archive',
    });
    expect(manifest.archives[0].sha256).toHaveLength(64);
    expect(manifest.repository.commitSha).toBe('unknown');
    expect(manifest.repository.changedPaths).toEqual([]);
    expect(manifest.repository.worktreeDirty).toBe(false);
  });

  it('renders and writes durable JSON plus Markdown summaries', () => {
    const root = makeTempDir();
    const archivePath = path.join(root, 'source.zip');
    const jsonOutputPath = path.join(root, 'release-archives.json');
    const markdownOutputPath = path.join(root, 'release-archives.md');
    fs.writeFileSync(archivePath, 'source');

    const { manifest } = writeReleaseArchiveManifest({
      archives: [{ filePath: archivePath, key: 'source', label: 'Source archive' }],
      generatedAt: '2026-06-20T10:00:00.000Z',
      jsonOutputPath,
      markdownOutputPath,
      rootDir: root,
    });

    expect(JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'))).toEqual(manifest);
    expect(fs.readFileSync(markdownOutputPath, 'utf8')).toContain('| Source archive |');
    expect(fs.readFileSync(markdownOutputPath, 'utf8')).toContain('Worktree dirty at generation: no');
    expect(renderReleaseArchiveMarkdown(manifest)).toContain('SHA-256');
  });
});
