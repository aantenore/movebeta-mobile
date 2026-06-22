import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ReleaseBlockerIssuePacketSchema, type ReleaseBlockerIssuePacket } from '../src/core/releaseBlockerIssuePacket';
import {
  assertReleaseBlockerIssueWebLinksPacketIsShareSafe,
  buildReleaseBlockerIssueWebLinksPacket,
  normalizeGitHubRepository,
  releaseBlockerIssueWebLinksSchemaVersion,
  renderReleaseBlockerIssueWebLinksMarkdown,
  type ReleaseBlockerIssueWebLinksPacket,
} from '../src/core/releaseBlockerIssueWebLinks';

export const RELEASE_BLOCKER_ISSUE_WEB_LINKS_SCHEMA_VERSION = releaseBlockerIssueWebLinksSchemaVersion;

export {
  assertReleaseBlockerIssueWebLinksPacketIsShareSafe,
  buildReleaseBlockerIssueWebLinksPacket,
  normalizeGitHubRepository,
  renderReleaseBlockerIssueWebLinksMarkdown,
  type ReleaseBlockerIssueWebLinksPacket,
} from '../src/core/releaseBlockerIssueWebLinks';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultInputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/release-blocker-issues-report.json');
}

export function resolveDefaultJsonOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/release-blocker-issue-web-links.json');
}

export function resolveDefaultMarkdownOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/release-blocker-issue-web-links.md');
}

export function readReleaseBlockerIssuePacket(inputPath: string): ReleaseBlockerIssuePacket {
  return ReleaseBlockerIssuePacketSchema.parse(JSON.parse(fs.readFileSync(inputPath, 'utf8')));
}

function readJsonIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
}

function readConfiguredRepository(rootDir: string) {
  const appJson = readJsonIfExists(path.join(rootDir, 'app.json'));
  if (!appJson || typeof appJson !== 'object' || Array.isArray(appJson)) return undefined;
  const expo = 'expo' in appJson && appJson.expo && typeof appJson.expo === 'object' && !Array.isArray(appJson.expo) ? appJson.expo : undefined;
  const extra = expo && 'extra' in expo && expo.extra && typeof expo.extra === 'object' && !Array.isArray(expo.extra) ? expo.extra : undefined;
  return extra && 'releaseRepository' in extra ? normalizeGitHubRepository(extra.releaseRepository) : undefined;
}

function readGitRemoteRepository(rootDir: string) {
  try {
    const remote = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return normalizeGitHubRepository(remote);
  } catch {
    return undefined;
  }
}

function defaultRepository(rootDir: string, cliRepository?: string) {
  return normalizeGitHubRepository(cliRepository) ?? readConfiguredRepository(rootDir) ?? readGitRemoteRepository(rootDir);
}

export function writeReleaseBlockerIssueWebLinksPacket({
  jsonOutputPath,
  markdownOutputPath,
  packet,
}: {
  jsonOutputPath: string;
  markdownOutputPath: string;
  packet: ReleaseBlockerIssueWebLinksPacket;
}) {
  assertReleaseBlockerIssueWebLinksPacketIsShareSafe(packet);
  fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownOutputPath), { recursive: true });
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(markdownOutputPath, renderReleaseBlockerIssueWebLinksMarkdown(packet));
}

function readCliOptions(argv: string[], rootDir = resolveProjectRoot()) {
  const optionValue = (name: string, fallback: string | undefined = undefined) => {
    const index = argv.indexOf(name);
    const value = index >= 0 ? argv[index + 1] : undefined;
    return value && !value.startsWith('--') ? value : fallback;
  };

  return {
    inputPath: optionValue('--input', resolveDefaultInputPath(rootDir)) ?? resolveDefaultInputPath(rootDir),
    jsonOutputPath: optionValue('--output', resolveDefaultJsonOutputPath(rootDir)) ?? resolveDefaultJsonOutputPath(rootDir),
    markdownOutputPath:
      optionValue('--markdown-output', resolveDefaultMarkdownOutputPath(rootDir)) ?? resolveDefaultMarkdownOutputPath(rootDir),
    repository: defaultRepository(rootDir, optionValue('--repo')),
    urlLengthBudget: Number(optionValue('--url-length-budget', '8192')),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = readCliOptions(process.argv.slice(2));
  const packet = readReleaseBlockerIssuePacket(options.inputPath);
  const webLinksPacket = buildReleaseBlockerIssueWebLinksPacket({
    packet,
    repository: options.repository,
    urlLengthBudget: options.urlLengthBudget,
  });

  writeReleaseBlockerIssueWebLinksPacket({
    jsonOutputPath: options.jsonOutputPath,
    markdownOutputPath: options.markdownOutputPath,
    packet: webLinksPacket,
  });

  console.log(`Wrote release blocker issue web links to ${options.jsonOutputPath}`);
  console.log(`Wrote release blocker issue web link summary to ${options.markdownOutputPath}`);
  console.log(
    `Status: ${webLinksPacket.summary.status}; ready links: ${webLinksPacket.summary.readyLinkCount}/${webLinksPacket.summary.issueCount}; repository: ${webLinksPacket.repository ?? 'not configured'}`,
  );
}
