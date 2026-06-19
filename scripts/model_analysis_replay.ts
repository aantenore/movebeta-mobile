import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runModelAnalysisReplay } from '../src/movement/modelAnalysisReplay';

export function resolveProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveDefaultOutputPath(rootDir = resolveProjectRoot()) {
  return path.join(rootDir, 'docs/sdlc/model-analysis-replay-report.json');
}

export function writeModelAnalysisReplayReport(report: unknown, outputPath = resolveDefaultOutputPath()) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

function readCliOptions(argv: string[]) {
  const outputIndex = argv.indexOf('--output');
  const minQualityIndex = argv.indexOf('--min-quality');

  return {
    minQualityScore: minQualityIndex >= 0 ? Number(argv[minQualityIndex + 1]) : 90,
    outputPath: outputIndex >= 0 ? argv[outputIndex + 1] : resolveDefaultOutputPath(),
  };
}

async function main() {
  const options = readCliOptions(process.argv.slice(2));
  const report = await runModelAnalysisReplay({
    minQualityScore: options.minQualityScore,
  });
  const targetPath = writeModelAnalysisReplayReport(report, options.outputPath);

  console.log(`Wrote model analysis replay report to ${targetPath}`);
  console.log(
    `Status: ${report.status}; attempts: ${report.summary.passedAttempts}/${report.summary.totalAttempts}; min quality: ${report.summary.minQualityScore}`,
  );

  if (report.status !== 'pass') {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
