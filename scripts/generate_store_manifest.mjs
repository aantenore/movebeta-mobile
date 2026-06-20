import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const appJson = JSON.parse(readFileSync(join(rootDir, 'app.json'), 'utf8')).expo;
const outputPath = join(rootDir, 'docs', 'store', 'store-manifest.json');

const manifest = {
  androidPackage: appJson.android?.package ?? '',
  androidPermissions: appJson.android?.permissions ?? [],
  iosBundleIdentifier: appJson.ios?.bundleIdentifier ?? '',
  iosUsageDescriptions: appJson.ios?.infoPlist ?? {},
  listing: {
    appName: appJson.name ?? 'MoveBeta',
    category: 'Sports',
    fullDescription:
      'MoveBeta helps indoor climbers review short attempts without sending raw video to a cloud service. Calibrate capture setup, record or import a clip, run local pose analysis, review movement quality, and turn cues into drills. The app focuses on flow, pause time, bent-arm load, hip drift, and likely foot cuts while keeping reports, metrics, and diagnostics privacy-safe by default.',
    keywords: ['climbing', 'bouldering', 'training', 'movement', 'technique', 'video', 'coach', 'on-device'],
    promotionalText: 'Review climbing movement locally with pose-based cues, drills, and privacy-safe reports.',
    shortDescription: 'On-device climbing video coach for local technique review.',
    subtitle: 'Local climbing coach',
  },
  privacy: {
    cloudSyncDefault: false,
    dataLinkedToUser: false,
    diagnosticsContainRawVideo: false,
    medicalClaims: false,
    rawVideoUploadDefault: false,
    tracking: false,
  },
  screenshots: [
    { fileName: '01-analyze.png', label: 'On-device video analysis and capture setup', route: 'analyze', viewport: { height: 844, width: 390 } },
    { fileName: '02-drills.png', label: 'Evidence-based drills', route: 'drills', viewport: { height: 844, width: 390 } },
    { fileName: '03-progress.png', label: 'Technique progress trends', route: 'progress', viewport: { height: 844, width: 390 } },
    { fileName: '04-sessions.png', label: 'Local report history', route: 'sessions', viewport: { height: 844, width: 390 } },
    { fileName: '05-plan.png', label: 'Freemium plan catalog', route: 'plan', viewport: { height: 844, width: 390 } },
    { fileName: '06-privacy.png', label: 'Privacy and offline readiness', route: 'privacy', viewport: { height: 844, width: 390 } },
    { fileName: '07-release-unblock.png', label: 'Release unblock checklist', route: 'plan', viewport: { height: 844, width: 390 } },
    { fileName: '09-release-critical-path.png', label: 'Release critical path', route: 'plan', viewport: { height: 844, width: 390 } },
    { fileName: '10-release-evidence-scenarios.png', label: 'Release evidence scenarios', route: 'plan', viewport: { height: 844, width: 390 } },
    { fileName: '08-data-portability.png', label: 'Local backup restore preview', route: 'privacy', viewport: { height: 844, width: 390 } },
  ],
  version: appJson.version ?? '',
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
