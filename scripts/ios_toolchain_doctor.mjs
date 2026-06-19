import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const IOS_TOOLCHAIN_REPORT_SCHEMA_VERSION = 'movebeta.ios-toolchain-report.v1';

function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/ios-toolchain-report.json');
}

export function resolveDefaultMarkdownPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/ios-toolchain-report.md');
}

function runCommand(binary, args, options = {}) {
  try {
    return {
      output: execFileSync(binary, args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeoutMs ?? 15_000,
      }).trim(),
      ok: true,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
    };
  }
}

function check(status, id, label, detail, action) {
  return { action, detail, id, label, status };
}

function statusFromChecks(checks) {
  if (checks.some((item) => item.status === 'fail')) return 'blocked';
  if (checks.some((item) => item.status === 'warn')) return 'review';
  return 'ready';
}

function isFullXcodeDeveloperPath(developerPath) {
  return /\/Applications\/Xcode\.app\/Contents\/Developer\/?$/.test(developerPath ?? '');
}

function isCommandLineToolsPath(developerPath) {
  return /\/Library\/Developer\/CommandLineTools\/?$/.test(developerPath ?? '');
}

export function buildIosToolchainReport({
  commandRunner = runCommand,
  fileExists = fs.existsSync,
  generatedAt = new Date().toISOString(),
  rootDir = resolveProjectRoot(),
} = {}) {
  const xcodeSelect = commandRunner('xcode-select', ['-p']);
  const xcodebuildVersion = commandRunner('xcodebuild', ['-version']);
  const developerPath = xcodeSelect.ok ? xcodeSelect.output : '';
  const fullXcode = isFullXcodeDeveloperPath(developerPath) || fileExists('/Applications/Xcode.app');
  const commandLineToolsOnly = isCommandLineToolsPath(developerPath) && !fullXcode;
  const workspacePath = path.join(rootDir, 'ios/MoveBeta.xcworkspace');
  const podManifestPath = path.join(rootDir, 'ios/Pods/Manifest.lock');
  const moveBetaPosePodPath = path.join(rootDir, 'ios/Pods/Local Podspecs/MoveBetaPose.podspec.json');
  const workspaceExists = fileExists(workspacePath);
  const podsInstalled = fileExists(podManifestPath) && fileExists(moveBetaPosePodPath);
  const shouldRunBuildSettings = fullXcode && workspaceExists && podsInstalled;
  const buildSettings = shouldRunBuildSettings
    ? commandRunner(
        'xcodebuild',
        ['-workspace', workspacePath, '-scheme', 'MoveBeta', '-configuration', 'Debug', '-sdk', 'iphonesimulator', '-showBuildSettings'],
        { timeoutMs: 45_000 },
      )
    : { ok: false, output: '', skipped: true };

  const checks = [
    check(
      xcodeSelect.ok ? 'pass' : 'fail',
      'xcode-select',
      'Developer directory',
      xcodeSelect.ok ? developerPath : xcodeSelect.error ?? 'xcode-select is not available.',
      'Install Xcode and select it with sudo xcode-select -s /Applications/Xcode.app/Contents/Developer.',
    ),
    check(
      fullXcode ? 'pass' : 'fail',
      'full-xcode',
      'Full Xcode',
      fullXcode
        ? 'Full Xcode is selected or installed at /Applications/Xcode.app.'
        : commandLineToolsOnly
          ? 'Only Command Line Tools are selected; iOS simulator/device builds require full Xcode.'
          : 'Full Xcode is not installed at /Applications/Xcode.app.',
      'Install full Xcode from Apple, open it once, accept licenses, then select its Developer directory.',
    ),
    check(
      xcodebuildVersion.ok ? 'pass' : 'fail',
      'xcodebuild-version',
      'xcodebuild availability',
      xcodebuildVersion.ok ? xcodebuildVersion.output.replace(/\n/g, ' · ') : xcodebuildVersion.error ?? 'xcodebuild is not available.',
      'Run xcodebuild -version after installing Xcode.',
    ),
    check(
      workspaceExists ? 'pass' : 'fail',
      'workspace',
      'iOS workspace',
      workspaceExists ? 'ios/MoveBeta.xcworkspace exists.' : 'ios/MoveBeta.xcworkspace is missing.',
      'Run npx expo prebuild --platform ios or npm run native:ios:pods to regenerate the workspace.',
    ),
    check(
      podsInstalled ? 'pass' : 'fail',
      'pods',
      'CocoaPods install',
      podsInstalled ? 'Pods are installed and include MoveBetaPose.' : 'Pods are missing or MoveBetaPose is not installed.',
      'Run npm run native:ios:pods.',
    ),
    check(
      buildSettings.ok ? 'pass' : shouldRunBuildSettings ? 'fail' : 'warn',
      'build-settings',
      'Build settings probe',
      buildSettings.ok
        ? 'xcodebuild can load the MoveBeta workspace and scheme for iphonesimulator.'
        : shouldRunBuildSettings
          ? buildSettings.error ?? 'xcodebuild failed to load build settings.'
          : 'Skipped until full Xcode, workspace, and pods are all ready.',
      'Run xcodebuild -workspace ios/MoveBeta.xcworkspace -scheme MoveBeta -configuration Debug -sdk iphonesimulator -showBuildSettings.',
    ),
  ];
  const status = statusFromChecks(checks);

  return {
    checks,
    developerPath,
    generatedAt,
    nextAction:
      status === 'ready'
        ? 'Run npx expo run:ios or an Xcode simulator/device build to capture final iOS build evidence.'
        : checks.find((item) => item.status === 'fail')?.action ?? 'Review warning checks before iOS release validation.',
    schemaVersion: IOS_TOOLCHAIN_REPORT_SCHEMA_VERSION,
    status,
    summary: {
      buildSettingsProbe: buildSettings.ok ? 'pass' : shouldRunBuildSettings ? 'fail' : 'skipped',
      commandLineToolsOnly,
      fullXcode,
      podsInstalled,
      workspaceExists,
      xcodebuildAvailable: xcodebuildVersion.ok,
    },
  };
}

export function renderIosToolchainMarkdown(report) {
  const rows = report.checks
    .map((item) => `| ${item.label} | ${item.status} | ${item.detail.replace(/\n/g, ' ')} | ${item.action} |`)
    .join('\n');

  return `# iOS Toolchain Report

Generated: ${report.generatedAt}

- Status: ${report.status}
- Developer path: ${report.developerPath || 'not detected'}
- Next action: ${report.nextAction}

| Check | Status | Detail | Action |
| --- | --- | --- | --- |
${rows}
`;
}

export function writeIosToolchainReport({
  jsonPath = resolveDefaultJsonPath(),
  markdownPath = resolveDefaultMarkdownPath(),
  report = buildIosToolchainReport({ rootDir: path.resolve(path.dirname(jsonPath), '../..') }),
} = {}) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderIosToolchainMarkdown(report));
  return { jsonPath, markdownPath, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonPath, markdownPath, report } = writeIosToolchainReport();
  console.log(`Wrote iOS toolchain report to ${jsonPath}`);
  console.log(`Wrote iOS toolchain summary to ${markdownPath}`);
  console.log(`Status: ${report.status}; next action: ${report.nextAction}`);
}
