import { describe, expect, it } from 'vitest';

import { buildSafetyLanguageGuard, type SafetyLanguageRule } from '../src/core/safetyLanguage';

describe('safety language guard', () => {
  it('passes educational movement copy without risky guarantees', () => {
    const summary = buildSafetyLanguageGuard([
      {
        key: 'cue',
        label: 'Coach cue',
        text: 'Use the hip-shift cue as local movement feedback and compare the next repeat before changing grade.',
      },
      {
        key: 'model',
        label: 'Model evidence',
        text: 'Synthetic inference proves execution only; real climbing-video accuracy still needs coach-reviewed clips.',
      },
    ]);

    expect(summary).toMatchObject({
      blockerCount: 0,
      clearSourceCount: 2,
      issueCount: 0,
      scannedSourceCount: 2,
      status: 'clear',
      warningCount: 0,
    });
    expect(summary.recommendation).toContain('avoids medical');
  });

  it('flags injury, medical, route-safety, and guaranteed-outcome claims', () => {
    const summary = buildSafetyLanguageGuard([
      {
        key: 'unsafe',
        label: 'Unsafe copy',
        text: 'This drill prevents injuries, guarantees send success, diagnoses elbow pain, and is safe to climb.',
      },
    ]);

    expect(summary.status).toBe('review');
    expect(summary.blockerCount).toBe(3);
    expect(summary.warningCount).toBe(1);
    expect(summary.issues.map((issue) => issue.ruleKey)).toEqual([
      'injury-prevention',
      'guaranteed-outcome',
      'medical-claim',
      'route-safety',
    ]);
  });

  it('does not flag negated policy and disclaimer copy', () => {
    const summary = buildSafetyLanguageGuard([
      {
        key: 'policy',
        label: 'Store policy',
        text: 'Do not claim injury prevention, route safety, medical diagnosis, or guaranteed sends.',
      },
      {
        key: 'disclaimer',
        label: 'Disclaimer',
        text: 'Movement feedback is not medical advice and cannot replace coaching, spotting, or gym safety rules.',
      },
    ]);

    expect(summary.status).toBe('clear');
    expect(summary.issueCount).toBe(0);
  });

  it('supports replaceable rule sets and visible issue limits', () => {
    const rules: SafetyLanguageRule[] = [
      {
        guidance: 'Use measurable evidence instead of magic language.',
        key: 'magic',
        label: 'Magic claim',
        pattern: /\bmagic\b/i,
        severity: 'warning',
      },
    ];
    const summary = buildSafetyLanguageGuard(
      [
        { key: 'one', label: 'One', text: 'magic' },
        { key: 'two', label: 'Two', text: 'magic' },
      ],
      { limit: 1, rules },
    );

    expect(summary.issueCount).toBe(2);
    expect(summary.issues).toHaveLength(1);
    expect(summary.issues[0]).toMatchObject({
      label: 'Magic claim',
      sourceLabel: 'One',
    });
  });
});
