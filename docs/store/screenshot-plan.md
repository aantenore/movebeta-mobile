# Screenshot Plan

Generate the consumer screenshots from the exported web build with the documented Pexels climbing fixture or another
licensed local clip:

```bash
npm run export:web
npm run preview:web
MOVEBETA_TEST_VIDEO=/absolute/path/to/climbing.mp4 npm run store:screenshots
```

Current fixture: [Pexels 5382881](https://www.pexels.com/video/woman-in-activewear-climbing-up-the-wall-5382881/),
SHA-256 `f7ae1d5d02f34e9a376012ba988400f5d928cb173848710aaf02412467699f14`. The media file is not committed.

| File | View | Product proof |
| --- | --- | --- |
| `01-coach.png` | Coach | Import-first PWA flow and capture guidance. |
| `02-analysis.png` | Analysis | Local pose overlay, one measured focus, and movement signals. |
| `03-repeat.png` | Repeat | Explicit baseline comparison for the same climb project. |
| `04-attempts.png` | Attempts | Local derived-report history. |
| `05-progress.png` | Progress | Latest compatible repeat and longitudinal signal summary. |
| `06-settings.png` | Settings | No-upload boundary, export, and local deletion. |

Screenshots must use licensed or explicitly consented media, avoid prominent identifiable faces, exclude account data,
and avoid claims that exceed the 2D pose evidence. The capture command removes obsolete screenshots before writing the
current set.
