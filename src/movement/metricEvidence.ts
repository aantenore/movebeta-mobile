import type { MovementMetric } from './contracts';

export function measuredMovementMetrics(metrics: MovementMetric[]) {
  return metrics.filter((metric) => metric.status === 'measured');
}

export function movementMetricIsMeasured(metric: MovementMetric | null | undefined): metric is MovementMetric {
  return metric?.status === 'measured';
}
