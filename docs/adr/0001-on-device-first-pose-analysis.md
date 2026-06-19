# ADR 0001: On-Device First Pose Analysis

Date: 2026-06-17
Status: Accepted

## Context

MoveBeta analyzes climbing videos that can include biometric-adjacent movement data and bystanders in gyms. Cloud upload
would increase privacy, consent, cost, and latency risks.

## Decision

The default architecture keeps raw video on-device. Pose estimation is abstracted behind `PoseEstimator`, and analysis
reports store minimal landmarks, metrics, cues, timeline events, and session metadata. Cloud sync is a separate opt-in
product layer.

## Consequences

- The app can run the core workflow offline.
- Native model integration is required for production camera/import analysis.
- Provider swaps can happen without rewriting UI screens.
- Privacy review remains mandatory for future sync, export, or coach-sharing workflows.
