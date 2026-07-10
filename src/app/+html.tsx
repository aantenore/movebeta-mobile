import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="IE=edge" httpEquiv="X-UA-Compatible" />
        <meta content="width=device-width, initial-scale=1, shrink-to-fit=no" name="viewport" />
        <meta content="#0F766E" name="theme-color" />
        <meta content="MoveBeta keeps climbing video analysis local-first and installable on supported browsers." name="description" />
        <link href="/manifest.json" rel="manifest" />
        <link href="/favicon.ico" rel="icon" />
        <link href="/pwa/icon-192.png" rel="apple-touch-icon" />
        <link href="/pwa.css" rel="stylesheet" />
        <script data-service-worker="/sw.js" defer src="/pwa-register.js" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
