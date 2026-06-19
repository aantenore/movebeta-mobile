export type SafetyLanguageSeverity = 'blocker' | 'warning';
export type SafetyLanguageStatus = 'clear' | 'review';

export type SafetyLanguageSource = {
  key: string;
  label: string;
  text: string;
};

export type SafetyLanguageRule = {
  guidance: string;
  key: string;
  label: string;
  pattern: RegExp;
  severity: SafetyLanguageSeverity;
};

export type SafetyLanguageIssue = {
  excerpt: string;
  guidance: string;
  key: string;
  label: string;
  ruleKey: string;
  severity: SafetyLanguageSeverity;
  sourceKey: string;
  sourceLabel: string;
};

export type SafetyLanguageGuardOptions = {
  limit: number;
  rules: SafetyLanguageRule[];
};

export type SafetyLanguageGuardSummary = {
  blockerCount: number;
  clearSourceCount: number;
  issueCount: number;
  issues: SafetyLanguageIssue[];
  recommendation: string;
  scannedSourceCount: number;
  status: SafetyLanguageStatus;
  warningCount: number;
};

export const defaultSafetyLanguageRules: SafetyLanguageRule[] = [
  {
    guidance: 'Replace injury-prevention claims with educational movement feedback language.',
    key: 'injury-prevention',
    label: 'Injury prevention claim',
    pattern: /\b(?:prevent(?:s|ing|ed)?|avoid(?:s|ing|ed)?)\s+(?:injur(?:y|ies)|falls?|accidents?|harm)\b|\binjury[-\s]?prevention\b/i,
    severity: 'blocker',
  },
  {
    guidance: 'Replace certainty with local evidence, confidence, and validation status.',
    key: 'guaranteed-outcome',
    label: 'Guaranteed outcome',
    pattern: /\b(?:guarantee(?:d|s)?|will)\s+(?:send|prevent|fix|keep you safe|make .* safe)\b/i,
    severity: 'blocker',
  },
  {
    guidance: 'Do not describe movement cues as diagnosis, treatment, or medical advice.',
    key: 'medical-claim',
    label: 'Medical claim',
    pattern: /\b(?:diagnos(?:e|is|es)|treat(?:s|ment)?|cure(?:s|d)?|medical advice)\b/i,
    severity: 'blocker',
  },
  {
    guidance: 'Avoid route-safety guarantees; point climbers to coaching, spotting, and gym rules instead.',
    key: 'route-safety',
    label: 'Route safety claim',
    pattern: /\b(?:safe to climb|risk[-\s]?free|route safety|keeps? you safe)\b/i,
    severity: 'warning',
  },
];

const defaultOptions: SafetyLanguageGuardOptions = {
  limit: 4,
  rules: defaultSafetyLanguageRules,
};

const negationCues = [
  'avoid',
  'cannot replace',
  'does not',
  'do not',
  'must not',
  'not ',
  'not a',
  'not medical',
  'without',
];

function isNegatedContext(text: string, matchIndex: number) {
  const prefix = text.slice(Math.max(0, matchIndex - 56), matchIndex).toLowerCase();
  return negationCues.some((cue) => prefix.includes(cue));
}

function excerptFor(text: string, index: number, length: number) {
  const start = Math.max(0, index - 32);
  const end = Math.min(text.length, index + length + 32);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function scanSource(source: SafetyLanguageSource, rules: SafetyLanguageRule[]) {
  return rules.flatMap((rule) => {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`);
    const matches = [...source.text.matchAll(pattern)];

    return matches.flatMap((match) => {
      const index = match.index ?? 0;
      const value = match[0] ?? '';
      if (!value || isNegatedContext(source.text, index)) return [];

      return [{
        excerpt: excerptFor(source.text, index, value.length),
        guidance: rule.guidance,
        key: `${source.key}-${rule.key}-${index}`,
        label: rule.label,
        ruleKey: rule.key,
        severity: rule.severity,
        sourceKey: source.key,
        sourceLabel: source.label,
      }];
    });
  });
}

function recommendationFor(blockerCount: number, warningCount: number) {
  if (blockerCount > 0) return 'Rewrite blocker copy before store submission, coach handoff, or production movement claims.';
  if (warningCount > 0) return 'Review warning copy and keep it framed as educational movement feedback.';
  return 'Current checked copy avoids medical, injury-prevention, and route-safety guarantees.';
}

export function buildSafetyLanguageGuard(
  sources: SafetyLanguageSource[],
  options: Partial<SafetyLanguageGuardOptions> = {},
): SafetyLanguageGuardSummary {
  const config = { ...defaultOptions, ...options };
  const issues = sources.flatMap((source) => scanSource(source, config.rules));
  const blockerCount = issues.filter((issue) => issue.severity === 'blocker').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const affectedSources = new Set(issues.map((issue) => issue.sourceKey));

  return {
    blockerCount,
    clearSourceCount: Math.max(0, sources.length - affectedSources.size),
    issueCount: issues.length,
    issues: issues.slice(0, config.limit),
    recommendation: recommendationFor(blockerCount, warningCount),
    scannedSourceCount: sources.length,
    status: issues.length > 0 ? 'review' : 'clear',
    warningCount,
  };
}
