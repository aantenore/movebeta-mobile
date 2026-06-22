# Environment Template Report

Generated: 2026-06-22T09:31:55.215Z

- Status: ready
- Template: .env.example
- Values included: no
- Next action: Use .env.example as the share-safe setup contract, then set credential values only in CI secrets or local shells.

| Check | Status | Detail |
| --- | --- | --- |
| Runtime public configuration | pass | 9/9 required keys are present. |
| Local operation commands | pass | 1/1 required keys are present. |
| Release credential key names | pass | 9/9 required keys are present. |
| Secret-free template | pass | No credential values, token-like strings, or local paths were detected. |
| Duplicate key guard | pass | No duplicate env keys were detected. |
| Template syntax | pass | Every non-comment line is a KEY=value assignment. |

| Category | Owner | Present | Missing keys |
| --- | --- | --- | --- |
| Runtime public configuration | engineering | 9/9 | none |
| Local operation commands | engineering | 1/1 | none |
| Release credential key names | release | 9/9 | none |
