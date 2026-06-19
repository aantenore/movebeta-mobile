import type { ClimbSession, LocalAnalysisReport } from './contracts';

export type ProgressFilters = {
  grade: string;
  gym: string;
  wallAngle: ClimbSession['wallAngle'] | 'all';
};

export type ProgressFilterOptions = {
  grades: string[];
  gyms: string[];
  wallAngles: ClimbSession['wallAngle'][];
};

export const defaultProgressFilters: ProgressFilters = {
  grade: 'all',
  gym: 'all',
  wallAngle: 'all',
};

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function deriveProgressFilterOptions(reports: LocalAnalysisReport[]): ProgressFilterOptions {
  return {
    grades: uniqueSorted(reports.map((report) => report.session.grade)),
    gyms: uniqueSorted(reports.map((report) => report.session.gym)),
    wallAngles: uniqueSorted(reports.map((report) => report.session.wallAngle)) as ClimbSession['wallAngle'][],
  };
}

export function filterProgressReports(reports: LocalAnalysisReport[], filters: ProgressFilters) {
  return reports.filter((report) => {
    const wallAngleMatches = filters.wallAngle === 'all' || report.session.wallAngle === filters.wallAngle;
    const gradeMatches = filters.grade === 'all' || report.session.grade === filters.grade;
    const gymMatches = filters.gym === 'all' || report.session.gym === filters.gym;
    return wallAngleMatches && gradeMatches && gymMatches;
  });
}

export function activeProgressFilterCount(filters: ProgressFilters) {
  return Number(filters.wallAngle !== 'all') + Number(filters.grade !== 'all') + Number(filters.gym !== 'all');
}
