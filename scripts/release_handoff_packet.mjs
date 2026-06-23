import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TRACK_REQUIREMENTS } from './launch_readiness_doctor.mjs';

export const RELEASE_HANDOFF_PACKET_SCHEMA_VERSION = 'movebeta.release-handoff-packet.v1';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/release-handoff-packet.json');
}

export function resolveDefaultMarkdownOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/release-handoff-packet.md');
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function exists(rootDir, relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function gitValue(rootDir, args, fallback = 'unknown') {
  try {
    return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function gitStatusPath(line) {
  const filePath = line.trimStart().replace(/^[ MADRCU?!]{1,2}\s+/, '');
  return filePath.replace(/^"/, '').replace(/"$/, '');
}

function gitStatusLines(rootDir) {
  const generatedPacketPaths = new Set(['docs/sdlc/release-handoff-packet.json', 'docs/sdlc/release-handoff-packet.md']);
  const output = gitValue(rootDir, ['status', '--short'], '');
  return output
    .split('\n')
    .filter(Boolean)
    .filter((line) => {
      return !generatedPacketPaths.has(gitStatusPath(line));
    })
    .map((line) => line.trim());
}

function tracksForCheck(checkKey) {
  return Object.entries(TRACK_REQUIREMENTS)
    .filter(([, keys]) => keys.includes(checkKey))
    .map(([track]) => track);
}

function artifact(rootDir, label, relativePath) {
  return {
    exists: exists(rootDir, relativePath),
    label,
    path: relativePath,
  };
}

function command(key, label, value, requiredFor) {
  return { command: value, key, label, requiredFor };
}

/**
 * @param {{ commitSha?: string, generatedAt?: string, remoteUrl?: string, rootDir?: string }} [options]
 */
export function buildReleaseHandoffPacket({
  commitSha,
  generatedAt = new Date().toISOString(),
  remoteUrl,
  rootDir = resolveProjectRoot(),
} = {}) {
  const packageJson = readJsonIfExists(path.join(rootDir, 'package.json')) ?? {};
  const appJson = readJsonIfExists(path.join(rootDir, 'app.json'))?.expo ?? {};
  const launchReadiness = readJsonIfExists(path.join(rootDir, 'docs/sdlc/launch-readiness-report.json')) ?? {};
  const releaseGate = readJsonIfExists(path.join(rootDir, 'docs/sdlc/release-gate-report.json')) ?? {};
  const modelVerificationSuite = readJsonIfExists(path.join(rootDir, 'docs/sdlc/model-verification-suite-report.json')) ?? {};
  const moveNetReadiness = readJsonIfExists(path.join(rootDir, 'docs/sdlc/movenet-readiness-report.json')) ?? {};
  const storeManifest = readJsonIfExists(path.join(rootDir, 'docs/store/store-manifest.json')) ?? {};
  const expectedScreenshots = Array.isArray(storeManifest.screenshots) ? storeManifest.screenshots : [];
  const screenshots = expectedScreenshots.map((item) => {
    const fileName = item.fileName ?? '';
    const relativePath = path.join('docs/store/screenshots', fileName);
    return {
      exists: fileName.length > 0 && exists(rootDir, relativePath),
      fileName,
      label: item.label ?? fileName,
      path: relativePath,
    };
  });
  const blockers = Array.isArray(launchReadiness.checks)
    ? launchReadiness.checks
        .filter((check) => check.status !== 'verified')
        .map((check) => ({
          action: check.action,
          key: check.key,
          label: check.label,
          owner: check.owner,
          status: check.status,
          tracks: tracksForCheck(check.key),
        }))
    : [];

  return {
    artifacts: [
      artifact(rootDir, 'Release readiness report', 'docs/sdlc/release-readiness-report.md'),
      artifact(rootDir, 'Release gate report', 'docs/sdlc/release-gate-report.json'),
      artifact(rootDir, 'Launch readiness report', 'docs/sdlc/launch-readiness-report.json'),
      artifact(rootDir, 'Feature completion report', 'docs/sdlc/feature-completion-report.json'),
      artifact(rootDir, 'Cue validation starter kit report', 'docs/sdlc/cue-validation-starter-kit-report.json'),
      artifact(rootDir, 'Cue validation review worksheet CSV', 'docs/validation/cue-validation-review-worksheet.csv'),
      artifact(rootDir, 'Release blocker issues report', 'docs/sdlc/release-blocker-issues-report.json'),
      artifact(rootDir, 'Release blocker issue filing plan', 'docs/sdlc/release-blocker-issue-filing-plan.json'),
      artifact(rootDir, 'Release blocker issue web links', 'docs/sdlc/release-blocker-issue-web-links.json'),
      artifact(rootDir, 'External evidence intake report', 'docs/sdlc/external-evidence-intake-report.json'),
      artifact(rootDir, 'External evidence intake template', 'docs/sdlc/external-evidence-intake.template.json'),
      artifact(rootDir, 'MoveNet readiness report', 'docs/sdlc/movenet-readiness-report.json'),
      artifact(rootDir, 'MoveNet static assets report', 'docs/sdlc/movenet-static-assets-report.json'),
      artifact(rootDir, 'Model asset provenance report', 'docs/sdlc/model-asset-provenance-report.json'),
      artifact(rootDir, 'Model asset attribution notice', 'docs/sdlc/model-asset-attribution.md'),
      artifact(rootDir, 'Model analysis replay report', 'docs/sdlc/model-analysis-replay-report.json'),
      artifact(rootDir, 'Model verification suite report', 'docs/sdlc/model-verification-suite-report.json'),
      artifact(rootDir, 'Native QA runbook', 'docs/sdlc/native-qa-runbook.json'),
      artifact(rootDir, 'Native QA evidence starter report', 'docs/sdlc/native-qa-evidence-starter-report.json'),
      artifact(rootDir, 'Native QA evidence input template', 'docs/sdlc/native-qa-evidence-input.template.json'),
      artifact(rootDir, 'GitHub workflow report', 'docs/sdlc/github-workflow-report.json'),
      artifact(rootDir, 'Dependency license report', 'docs/sdlc/dependency-license-report.json'),
      artifact(rootDir, 'Release evidence freshness report', 'docs/sdlc/release-freshness-report.json'),
      artifact(rootDir, 'PWA readiness report', 'docs/sdlc/pwa-readiness-report.json'),
      artifact(rootDir, 'Vercel deployment report', 'docs/sdlc/vercel-deployment-report.json'),
      artifact(rootDir, 'Vercel workflow report', 'docs/sdlc/vercel-workflow-report.json'),
      artifact(rootDir, 'Store credentials setup packet', 'docs/sdlc/store-credentials-setup-packet.json'),
      artifact(rootDir, 'Store credentials env template', 'docs/sdlc/store-credentials.env.template'),
      artifact(rootDir, 'EAS project binding template', 'docs/sdlc/eas-project-binding.template.json'),
      artifact(rootDir, 'Store manifest', 'docs/store/store-manifest.json'),
      artifact(rootDir, 'Screenshot gallery', 'docs/screenshots.md'),
      artifact(rootDir, 'Release unblock screenshot', 'docs/store/screenshots/07-release-unblock.png'),
      artifact(rootDir, 'Release critical path screenshot', 'docs/store/screenshots/09-release-critical-path.png'),
      artifact(rootDir, 'Release evidence scenarios screenshot', 'docs/store/screenshots/10-release-evidence-scenarios.png'),
      artifact(rootDir, 'Release evidence freshness screenshot', 'docs/store/screenshots/11-release-freshness.png'),
      artifact(rootDir, 'Source archive', '../movebeta-mobile-source.zip'),
      artifact(rootDir, 'Web dist archive', '../movebeta-mobile-web-dist.zip'),
      artifact(rootDir, 'Release archives manifest', '../movebeta-mobile-release-archives.json'),
      artifact(rootDir, 'Release archives summary', '../movebeta-mobile-release-archives.md'),
    ],
    blockers,
    commands: [
      command('release-full', 'Full local release gate', 'npm run release:full', ['demo', 'internal', 'store']),
      command('web-smoke', 'Exported web smoke', 'MOVEBETA_SMOKE_URL=http://127.0.0.1:8083 python3 scripts/smoke_web_video.py', [
        'demo',
        'internal',
        'store',
      ]),
      command('store-screenshots', 'Store screenshot capture', 'MOVEBETA_SMOKE_URL=http://127.0.0.1:8083 npm run store:screenshots', [
        'demo',
        'store',
      ]),
      command('model-verification-suite', 'Model verification suite', 'npm run model:verification:suite', [
        'demo',
        'internal',
        'store',
      ]),
      command('movenet-static-assets', 'MoveNet static assets doctor', 'npm run model:movenet:assets:check', [
        'demo',
        'internal',
        'store',
      ]),
      command('model-asset-provenance', 'Model asset provenance doctor', 'npm run model:assets:provenance', [
        'demo',
        'internal',
        'store',
      ]),
      command('native-qa-starter', 'Native QA evidence starter', 'npm run native:qa:starter', ['internal', 'store']),
      command('native-qa', 'Physical-device QA validator', 'npm run native:qa:validate', ['internal', 'store']),
      command('cue-validation-starter', 'Cue-validation starter kit', 'npm run validation:cue:starter', ['store']),
      command('cue-validation', 'Coach cue-validation gate', 'npm run validation:cue', ['store']),
      command('store-credentials-starter', 'Store credentials starter', 'npm run release:credentials:starter', ['store']),
      command('github-workflow', 'GitHub workflow doctor', 'npm run release:github:doctor', ['demo', 'internal', 'store']),
      command('dependency-licenses', 'Dependency license report', 'npm run security:licenses', ['demo', 'internal', 'store']),
      command('feature-completion', 'Feature completion doctor', 'npm run feature:doctor', ['demo', 'internal', 'store']),
      command('release-blocker-issues', 'Release blocker issue report', 'npm run release:blocker-issues', [
        'demo',
        'internal',
        'store',
      ]),
      command('release-blocker-issue-filing', 'Release blocker issue filing plan', 'npm run release:blocker-issues:file', [
        'demo',
        'internal',
        'store',
      ]),
      command('release-blocker-issue-links', 'Release blocker issue web links', 'npm run release:blocker-issues:links', [
        'demo',
        'internal',
        'store',
      ]),
      command('external-evidence-intake', 'External evidence intake', 'npm run release:evidence:intake', [
        'internal',
        'store',
      ]),
      command('release-freshness', 'Release evidence freshness doctor', 'npm run release:freshness:doctor', [
        'demo',
        'internal',
        'store',
      ]),
      command('pwa-readiness', 'PWA static readiness doctor', 'npm run export:web && npm run web:pwa:check', [
        'demo',
        'internal',
      ]),
      command('vercel-readiness', 'Vercel deployment readiness doctor', 'npm run web:vercel:check', [
        'demo',
        'internal',
      ]),
      command('vercel-workflow', 'Vercel workflow readiness doctor', 'npm run web:vercel:workflow', [
        'demo',
        'internal',
      ]),
      command('vercel-deploy', 'Vercel prebuilt production deploy', 'npx vercel build --prod --token=$VERCEL_TOKEN && npx vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN', [
        'demo',
      ]),
      command('eas-strict', 'Strict EAS store gate', 'npm run release:eas:strict', ['store']),
    ],
    generatedAt,
    product: {
      androidPackage: appJson.android?.package ?? '',
      appName: appJson.name ?? packageJson.name ?? 'MoveBeta',
      iosBundleIdentifier: appJson.ios?.bundleIdentifier ?? '',
      slug: appJson.slug ?? '',
      version: appJson.version ?? packageJson.version ?? '',
    },
    repository: {
      branch: gitValue(rootDir, ['branch', '--show-current']),
      baseCommitSha: commitSha ?? gitValue(rootDir, ['rev-parse', 'HEAD']),
      changedPaths: gitStatusLines(rootDir),
      commitSha: commitSha ?? gitValue(rootDir, ['rev-parse', 'HEAD']),
      remoteUrl: remoteUrl ?? gitValue(rootDir, ['config', '--get', 'remote.origin.url']),
      worktreeDirty: gitStatusLines(rootDir).length > 0,
    },
    schemaVersion: RELEASE_HANDOFF_PACKET_SCHEMA_VERSION,
    screenshots,
    summary: {
      blockerCount: blockers.length,
      existingScreenshots: screenshots.filter((item) => item.exists).length,
      expectedScreenshots: screenshots.length,
      launchNextAction: launchReadiness.summary?.nextAction ?? 'Run npm run release:readiness.',
      launchStatus: launchReadiness.summary?.status ?? 'unknown',
      moveNetAverageInferenceMs: moveNetReadiness.averageInferenceMs ?? null,
      moveNetLoadMs: moveNetReadiness.loadMs ?? null,
      moveNetStatus: moveNetReadiness.status ?? 'unknown',
      modelVerificationStatus: modelVerificationSuite.status ?? 'unknown',
      readyTracks: launchReadiness.summary?.readyTracks ?? 0,
      releaseGateStatus: releaseGate.status ?? 'unknown',
      totalTracks: launchReadiness.summary?.totalTracks ?? 0,
    },
  };
}

export function renderReleaseHandoffMarkdown(packet) {
  const blockerLines = packet.blockers.length
    ? packet.blockers.map((item) => `- ${item.label} (${item.owner}, ${item.tracks.join(', ')}): ${item.action}`).join('\n')
    : '- No external blockers detected.';
  const artifactLines = packet.artifacts
    .map((item) => `- ${item.exists ? '[x]' : '[ ]'} ${item.label}: \`${item.path}\``)
    .join('\n');
  const commandLines = packet.commands.map((item) => `- ${item.label}: \`${item.command}\``).join('\n');
  const screenshotLines = packet.screenshots
    .map((item) => `- ${item.exists ? '[x]' : '[ ]'} ${item.label}: \`${item.path}\``)
    .join('\n');

  return `# MoveBeta Release Handoff Packet

Generated: ${packet.generatedAt}

## Build

- Product: ${packet.product.appName} ${packet.product.version}
- Repository: ${packet.repository.remoteUrl}
- Branch: ${packet.repository.branch}
- Base commit at generation: ${packet.repository.baseCommitSha ?? packet.repository.commitSha}
- Worktree dirty at generation: ${packet.repository.worktreeDirty ? 'yes' : 'no'}

## Summary

- Release gate: ${packet.summary.releaseGateStatus}
- Launch readiness: ${packet.summary.launchStatus} (${packet.summary.readyTracks}/${packet.summary.totalTracks} tracks ready)
- MoveNet readiness: ${packet.summary.moveNetStatus}; load ${packet.summary.moveNetLoadMs ?? 'n/a'}ms; average inference ${packet.summary.moveNetAverageInferenceMs ?? 'n/a'}ms
- Model verification suite: ${packet.summary.modelVerificationStatus}
- Screenshots: ${packet.summary.existingScreenshots}/${packet.summary.expectedScreenshots}
- Blockers: ${packet.summary.blockerCount}
- Next action: ${packet.summary.launchNextAction}

## External Blockers

${blockerLines}

## Verification Commands

${commandLines}

## Artifacts

${artifactLines}

## Screenshots

${screenshotLines}
`;
}

/**
 * @param {{ generatedAt?: string, jsonOutputPath?: string, markdownOutputPath?: string, rootDir?: string }} [options]
 */
export function writeReleaseHandoffPacket({
  generatedAt,
  jsonOutputPath,
  markdownOutputPath,
  rootDir = resolveProjectRoot(),
} = {}) {
  const packet = buildReleaseHandoffPacket({ generatedAt, rootDir });
  const jsonTarget = jsonOutputPath ?? resolveDefaultJsonOutputPath(rootDir);
  const markdownTarget = markdownOutputPath ?? resolveDefaultMarkdownOutputPath(rootDir);

  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true });
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true });
  fs.writeFileSync(jsonTarget, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(markdownTarget, renderReleaseHandoffMarkdown(packet));

  return { jsonTarget, markdownTarget, packet };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonTarget, markdownTarget, packet } = writeReleaseHandoffPacket();
  console.log(`Wrote release handoff packet to ${jsonTarget}`);
  console.log(`Wrote release handoff summary to ${markdownTarget}`);
  console.log(`Status: ${packet.summary.launchStatus}; blockers: ${packet.summary.blockerCount}`);
}
