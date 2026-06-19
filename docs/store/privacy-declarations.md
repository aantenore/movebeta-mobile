# Store Privacy Declarations

Source of truth: `docs/store/store-manifest.json`, generated with `npm run store:manifest`.

## Default Product Behavior

| Area | Declaration |
| --- | --- |
| Raw video upload | Off by default |
| Cloud sync | Off by default |
| Diagnostics raw video | Not included |
| Tracking | Not used |
| Data linked to user | Not used in this prototype |
| Medical claims | Not made |

## Platform Permission Copy

| Platform | Permission | Copy |
| --- | --- | --- |
| iOS | Camera | MoveBeta uses the camera to analyze climbing attempts on-device when you choose to record. |
| iOS | Microphone | Not declared; standard recordings are muted for movement analysis. |
| iOS | Photo Library | MoveBeta can import a climbing video you select for on-device movement analysis. |
| iOS | Add to Photo Library | MoveBeta can save recorded attempts only when you choose to keep them. |
| Android | Camera | Required for recording a climbing attempt. |
| Android | Read media video | Required for importing a selected local climbing video. |

## Data Safety Notes

- Raw clips remain in the local app/media sandbox unless the user explicitly exports or shares them.
- Reports store pose landmarks, metrics, cues, timeline events, analysis quality, provider metadata, private training logs,
  and private drill practice records.
- Diagnostics packets include aggregate quality, provider, consent, and sanitized events only.
- Coach review packets exclude raw video, video URI, key-frame landmarks, and medical assessment.
