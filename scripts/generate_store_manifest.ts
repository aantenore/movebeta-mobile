import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildStoreReadinessManifest, type ExpoStoreConfig } from '../src/core/storeReadiness';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8')) as {
  expo: {
    android?: ExpoStoreConfig['android'];
    ios?: ExpoStoreConfig['ios'];
    name?: string;
    version?: string;
  };
};
const manifestPath = path.join(rootDir, 'docs/store/store-manifest.json');
const listingPath = path.join(rootDir, 'docs/store/store-listing.md');
const manifest = buildStoreReadinessManifest(appJson.expo);

const listing = `# Store Listing Copy

## App Name

${manifest.listing.appName}

## Subtitle

${manifest.listing.subtitle}

## Short Description

${manifest.listing.shortDescription}

## Promotional Text

${manifest.listing.promotionalText}

## Full Description

${manifest.listing.fullDescription}

## Keywords

${manifest.listing.keywords.join(', ')}
`;

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(listingPath, listing);
console.log(`Wrote ${manifestPath}`);
console.log(`Wrote ${listingPath}`);
