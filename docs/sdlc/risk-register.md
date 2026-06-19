# Risk Register

| ID | Risk | Probability | Impact | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| RSK-001 | Native pose provider quality varies by platform and device | Medium | High | Native platform adapter is implemented; validate accuracy on real clips and devices | Engineering | Monitoring |
| RSK-002 | Cue quality is weak on real clips | Medium | High | Collect consented validation set and require `npm run validation:cue` before production movement-quality claims | Product/QA | Open |
| RSK-003 | Users misunderstand feedback as medical or safety advice | Medium | High | Keep safety note, avoid diagnosis language, review copy | Product | Mitigated |
| RSK-004 | Pose landmarks become sensitive data without controls | Medium | High | Minimize stored artifacts, add deletion controls, persist consent records, encrypt future sync | Security | Monitoring |
| RSK-005 | Dependency vulnerabilities delay release | Medium | Medium | Run `npm run security:audit` and triage high/critical findings | Engineering | Open |
| RSK-006 | Battery or thermal cost is too high on older phones | Medium | Medium | Benchmark frame rate and model mode on target devices | Mobile | Open |
