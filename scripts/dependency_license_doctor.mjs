import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEPENDENCY_LICENSE_REPORT_SCHEMA_VERSION = 'movebeta.dependency-license-report.v1';

const permittedLicensePatterns = [
  /^0BSD$/i,
  /^Apache-2\.0$/i,
  /^BSD-2-Clause$/i,
  /^BSD-3-Clause$/i,
  /^BlueOak-1\.0\.0$/i,
  /^CC0-1\.0$/i,
  /^ISC$/i,
  /^MIT$/i,
  /^Python-2\.0$/i,
  /^Unlicense$/i,
];

const reviewLicensePatterns = [/^CC-BY-/i, /^MPL-2\.0$/i];
const restrictedLicensePatterns = [/AGPL/i, /GPL/i, /LGPL/i, /SSPL/i, /BUSL/i, /Commons Clause/i];

function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultJsonPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/dependency-license-report.json');
}

export function resolveDefaultMarkdownPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/dependency-license-report.md');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function packageNameFromLockPath(lockPath) {
  const parts = lockPath.split('/');
  const nodeModulesIndex = parts.lastIndexOf('node_modules');
  if (nodeModulesIndex < 0) return null;

  const first = parts[nodeModulesIndex + 1];
  if (!first) return null;
  if (first.startsWith('@')) return `${first}/${parts[nodeModulesIndex + 2]}`;
  return first;
}

function normalizeLicense(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : item?.type))
      .filter(Boolean)
      .join(' OR ');
  }
  if (value && typeof value === 'object') return value.type ?? '';
  if (typeof value === 'string') return value.trim();
  return '';
}

function licenseTokens(expression) {
  return String(expression)
    .replace(/[()]/g, ' ')
    .split(/\s+(?:OR|AND)\s+|\s+/i)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isPermittedToken(token) {
  return permittedLicensePatterns.some((pattern) => pattern.test(token));
}

function isReviewToken(token) {
  return reviewLicensePatterns.some((pattern) => pattern.test(token));
}

function isRestrictedToken(token) {
  return restrictedLicensePatterns.some((pattern) => pattern.test(token));
}

export function classifyLicense(expression) {
  const license = normalizeLicense(expression);
  if (!license) {
    return {
      reason: 'License metadata is missing.',
      status: 'blocked',
    };
  }

  const tokens = licenseTokens(license);
  if (tokens.some(isPermittedToken)) {
    return {
      reason: 'At least one permissive license option is available.',
      status: tokens.some(isReviewToken) ? 'review' : 'pass',
    };
  }

  if (tokens.some(isRestrictedToken)) {
    return {
      reason: 'No permissive alternative was detected for a restricted/copyleft license.',
      status: 'blocked',
    };
  }

  if (tokens.some(isReviewToken)) {
    return {
      reason: 'License has notice or file-level obligations that should be reviewed before distribution.',
      status: 'review',
    };
  }

  return {
    reason: 'License is not in the reviewed allowlist.',
    status: 'review',
  };
}

function directDependencyNames(rootPackage) {
  return new Set([
    ...Object.keys(rootPackage.dependencies ?? {}),
    ...Object.keys(rootPackage.devDependencies ?? {}),
    ...Object.keys(rootPackage.optionalDependencies ?? {}),
    ...Object.keys(rootPackage.peerDependencies ?? {}),
  ]);
}

function licenseFromInstalledPackage(rootDir, lockPath) {
  const packageJsonPath = path.join(rootDir, lockPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return '';
  try {
    const installedPackage = readJson(packageJsonPath);
    return normalizeLicense(installedPackage.license ?? installedPackage.licenses);
  } catch {
    return '';
  }
}

function summarizeLicenses(packages) {
  return packages
    .reduce((items, item) => {
      const existing = items.find((entry) => entry.license === item.license);
      if (existing) {
        existing.count += 1;
      } else {
        items.push({ count: 1, license: item.license });
      }
      return items;
    }, [])
    .sort((a, b) => b.count - a.count || a.license.localeCompare(b.license));
}

function isInternalPackage(metadata) {
  return metadata.link === true || String(metadata.resolved ?? '').startsWith('file:') || String(metadata.resolved ?? '').startsWith('modules/');
}

/**
 * @param {{ generatedAt?: string, rootDir?: string }} [options]
 */
export function buildDependencyLicenseReport({
  generatedAt = new Date().toISOString(),
  rootDir = resolveProjectRoot(),
} = {}) {
  const lockfile = readJson(path.join(rootDir, 'package-lock.json'));
  const rootPackage = readJson(path.join(rootDir, 'package.json'));
  const directNames = directDependencyNames(rootPackage);
  const packages = Object.entries(lockfile.packages ?? {})
    .filter(([lockPath]) => lockPath.startsWith('node_modules/'))
    .map(([lockPath, metadata]) => {
      const name = metadata.name ?? packageNameFromLockPath(lockPath) ?? lockPath;
      const license = normalizeLicense(metadata.license) || licenseFromInstalledPackage(rootDir, lockPath);
      const internal = isInternalPackage(metadata);
      const classification = internal
        ? { reason: 'Local linked package is owned by the app repository.', status: 'internal' }
        : classifyLicense(license);

      return {
        direct: directNames.has(name),
        internal,
        license,
        name,
        path: lockPath,
        reason: classification.reason,
        status: classification.status,
        version: metadata.version ?? '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
  const blockedPackages = packages.filter((item) => item.status === 'blocked');
  const reviewPackages = packages.filter((item) => item.status === 'review');
  const status = blockedPackages.length > 0 ? 'blocked' : reviewPackages.length > 0 ? 'review' : 'ready';

  return {
    generatedAt,
    licenseSummary: summarizeLicenses(packages),
    nextAction:
      status === 'ready'
        ? 'Keep npm audit and dependency-license reports updated before release handoff.'
        : status === 'blocked'
          ? 'Resolve missing or restricted dependency licenses before app distribution.'
          : 'Review notice/attribution obligations before app distribution.',
    packages,
    privacy: {
      localAbsolutePathsIncluded: false,
      secretValuesIncluded: false,
      tokenValuesIncluded: false,
    },
    schemaVersion: DEPENDENCY_LICENSE_REPORT_SCHEMA_VERSION,
    status,
    summary: {
      blockedCount: blockedPackages.length,
      directPackageCount: packages.filter((item) => item.direct).length,
      internalPackageCount: packages.filter((item) => item.internal).length,
      packageCount: packages.length,
      reviewCount: reviewPackages.length,
    },
  };
}

function packageRows(packages) {
  return packages.length
    ? packages
        .slice(0, 25)
        .map((item) => `| ${item.name} | ${item.version} | ${item.license || 'missing'} | ${item.status} | ${item.reason} |`)
        .join('\n')
    : '| None |  |  |  |  |';
}

export function renderDependencyLicenseMarkdown(report) {
  const topLicenses = report.licenseSummary
    .slice(0, 12)
    .map((item) => `| ${item.license || 'missing'} | ${item.count} |`)
    .join('\n');
  const reviewPackages = report.packages.filter((item) => item.status === 'review');
  const blockedPackages = report.packages.filter((item) => item.status === 'blocked');

  return `# Dependency License Report

Generated: ${report.generatedAt}

- Status: ${report.status}
- Packages: ${report.summary.packageCount}
- Review packages: ${report.summary.reviewCount}
- Blocked packages: ${report.summary.blockedCount}
- Token values included: no
- Next action: ${report.nextAction}

## Top Licenses

| License | Count |
| --- | ---: |
${topLicenses}

## Review Packages

| Package | Version | License | Status | Reason |
| --- | --- | --- | --- | --- |
${packageRows(reviewPackages)}

## Blocked Packages

| Package | Version | License | Status | Reason |
| --- | --- | --- | --- | --- |
${packageRows(blockedPackages)}
`;
}

/**
 * @param {{ jsonPath?: string, markdownPath?: string, report?: ReturnType<typeof buildDependencyLicenseReport> }} [options]
 */
export function writeDependencyLicenseReport({
  jsonPath = resolveDefaultJsonPath(),
  markdownPath = resolveDefaultMarkdownPath(),
  report,
} = {}) {
  const rootDir = path.resolve(path.dirname(jsonPath), '../..');
  const nextReport = report ?? buildDependencyLicenseReport({ rootDir });
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(nextReport, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderDependencyLicenseMarkdown(nextReport));
  return { jsonPath, markdownPath, report: nextReport };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { jsonPath, markdownPath, report } = writeDependencyLicenseReport();
  console.log(`Wrote dependency license report to ${jsonPath}`);
  console.log(`Wrote dependency license summary to ${markdownPath}`);
  console.log(
    `Status: ${report.status}; packages: ${report.summary.packageCount}; review: ${report.summary.reviewCount}; blocked: ${report.summary.blockedCount}`,
  );
}
