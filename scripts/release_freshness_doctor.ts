import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildReleaseEvidenceFreshness,
  buildReleaseEvidenceFreshnessArtifactInputs,
  type ReleaseEvidenceFreshness,
  type ReleaseEvidenceFreshnessReportBundle,
} from '../src/core/releaseEvidenceFreshness';

function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function readJsonIfExists(rootDir: string, relativePath: string) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readReports(rootDir: string): ReleaseEvidenceFreshnessReportBundle {
  return {
    acquisitionReadinessPacket: readJsonIfExists(rootDir, 'docs/sdlc/acquisition-readiness-packet.json'),
    cueValidationDatasetReport: readJsonIfExists(rootDir, 'docs/sdlc/cue-validation-dataset-report.json'),
    cueValidationStarterKitReport: readJsonIfExists(rootDir, 'docs/sdlc/cue-validation-starter-kit-report.json'),
    dataRoomIndex: readJsonIfExists(rootDir, 'docs/sdlc/data-room-index.json'),
    dependencyLicenseReport: readJsonIfExists(rootDir, 'docs/sdlc/dependency-license-report.json'),
    envTemplateReport: readJsonIfExists(rootDir, 'docs/sdlc/env-template-report.json'),
    externalEvidenceApplyReport: readJsonIfExists(rootDir, 'docs/sdlc/external-evidence-apply-report.json'),
    externalEvidenceIntakeReport: readJsonIfExists(rootDir, 'docs/sdlc/external-evidence-intake-report.json'),
    externalEvidencePromotionReport: readJsonIfExists(rootDir, 'docs/sdlc/external-evidence-promotion-report.json'),
    externalEvidenceValidationReport: readJsonIfExists(rootDir, 'docs/sdlc/external-evidence-validation-report.json'),
    featureCompletionReport: readJsonIfExists(rootDir, 'docs/sdlc/feature-completion-report.json'),
    githubWorkflowReport: readJsonIfExists(rootDir, 'docs/sdlc/github-workflow-report.json'),
    iosToolchainReport: readJsonIfExists(rootDir, 'docs/sdlc/ios-toolchain-report.json'),
    launchReadinessReport: readJsonIfExists(rootDir, 'docs/sdlc/launch-readiness-report.json'),
    licenseReviewPacket: readJsonIfExists(rootDir, 'docs/sdlc/license-review-packet.json'),
    releaseBlockerIssueFilingPlan: readJsonIfExists(rootDir, 'docs/sdlc/release-blocker-issue-filing-plan.json'),
    releaseBlockerIssueWebLinks: readJsonIfExists(rootDir, 'docs/sdlc/release-blocker-issue-web-links.json'),
    releaseBlockerIssuesReport: readJsonIfExists(rootDir, 'docs/sdlc/release-blocker-issues-report.json'),
    releaseBlockerProgressReport: readJsonIfExists(rootDir, 'docs/sdlc/release-blocker-progress.json'),
    modelAssetProvenanceReport: readJsonIfExists(rootDir, 'docs/sdlc/model-asset-provenance-report.json'),
    modelAnalysisReplayReport: readJsonIfExists(rootDir, 'docs/sdlc/model-analysis-replay-report.json'),
    modelDeliveryLifecycleReport: readJsonIfExists(rootDir, 'docs/sdlc/model-delivery-lifecycle-report.json'),
    moveNetStaticAssetsReport: readJsonIfExists(rootDir, 'docs/sdlc/movenet-static-assets-report.json'),
    modelVerificationSuiteReport: readJsonIfExists(rootDir, 'docs/sdlc/model-verification-suite-report.json'),
    moveNetReadinessReport: readJsonIfExists(rootDir, 'docs/sdlc/movenet-readiness-report.json'),
    nativeQaEvidenceStarterReport: readJsonIfExists(rootDir, 'docs/sdlc/native-qa-evidence-starter-report.json'),
    pwaReadinessReport: readJsonIfExists(rootDir, 'docs/sdlc/pwa-readiness-report.json'),
    storeReleaseAccountRunbook: readJsonIfExists(rootDir, 'docs/sdlc/store-release-account-runbook.json'),
    storeCredentialsSetupPacket: readJsonIfExists(rootDir, 'docs/sdlc/store-credentials-setup-packet.json'),
    storeCredentialsReport: readJsonIfExists(rootDir, 'docs/sdlc/store-credentials-report.json'),
    storeSubmissionPacket: readJsonIfExists(rootDir, 'docs/store/store-submission-packet.json'),
    vercelDeploymentHandoff: readJsonIfExists(rootDir, 'docs/sdlc/vercel-deployment-handoff.json'),
    vercelDeploymentReport: readJsonIfExists(rootDir, 'docs/sdlc/vercel-deployment-report.json'),
    vercelWorkflowReport: readJsonIfExists(rootDir, 'docs/sdlc/vercel-workflow-report.json'),
    webSmokeReport: readJsonIfExists(rootDir, 'docs/sdlc/web-smoke-report.json'),
  };
}

function renderMarkdown(report: ReleaseEvidenceFreshness) {
  const rows = report.artifacts
    .map((artifact) => {
      const age = typeof artifact.ageHours === 'number' ? `${artifact.ageHours}h` : 'n/a';
      return `| ${artifact.label} | ${artifact.status} | ${age} | ${artifact.maxAgeHours}h | \`${artifact.refreshCommand}\` |`;
    })
    .join('\n');

  return `# Release Evidence Freshness Report

Generated: ${report.generatedAt}

- Status: ${report.summary.status}
- Fresh artifacts: ${report.summary.freshCount}/${report.summary.artifactCount}
- Stale artifacts: ${report.summary.staleCount}
- Missing timestamps: ${report.summary.missingDateCount}
- Invalid timestamps: ${report.summary.invalidDateCount}
- Oldest artifact: ${report.summary.oldestArtifactKey}
- Next action: ${report.summary.nextAction}
- Credential values included: no
- Local paths included: no
- Raw artifacts included: no
- Raw video included: no

| Artifact | Status | Age | Window | Refresh |
| --- | --- | ---: | ---: | --- |
${rows}
`;
}

function writeReport({
  jsonOutputPath,
  markdownOutputPath,
  report,
}: {
  jsonOutputPath: string;
  markdownOutputPath: string;
  report: ReleaseEvidenceFreshness;
}) {
  fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownOutputPath), { recursive: true });
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownOutputPath, renderMarkdown(report));
}

const rootDir = resolveProjectRoot();
const generatedAt = new Date().toISOString();
const report = buildReleaseEvidenceFreshness({
  artifacts: buildReleaseEvidenceFreshnessArtifactInputs(readReports(rootDir)),
  generatedAt,
  now: generatedAt,
});
const jsonOutputPath = path.join(rootDir, 'docs/sdlc/release-freshness-report.json');
const markdownOutputPath = path.join(rootDir, 'docs/sdlc/release-freshness-report.md');

writeReport({ jsonOutputPath, markdownOutputPath, report });

console.log(`Wrote release evidence freshness report to ${jsonOutputPath}`);
console.log(`Wrote release evidence freshness summary to ${markdownOutputPath}`);
console.log(`Status: ${report.summary.status}; fresh: ${report.summary.freshCount}/${report.summary.artifactCount}; stale: ${report.summary.staleCount}`);

if (report.summary.status !== 'ready') {
  process.exitCode = 1;
}
