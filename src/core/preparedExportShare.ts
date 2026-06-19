export const preparedExportShareSchemaVersion = 'movebeta.prepared-export-share.v1';

export type PreparedExportPayload = {
  body: string;
  title: string;
};

export type PreparedExportFilePlan = {
  body: string;
  fileName: string;
  mimeType: string;
  schemaVersion: typeof preparedExportShareSchemaVersion;
  title: string;
  uti: string;
};

export type PreparedExportShareResult = {
  fileName?: string;
  method: 'file' | 'text';
  uri?: string;
};

export type PreparedExportShareDependencies = {
  cacheDirectory?: string | null;
  isFileSharingAvailable: () => Promise<boolean>;
  shareFile: (uri: string, options: { dialogTitle: string; mimeType: string; UTI: string }) => Promise<void>;
  shareText: (payload: { message: string; title: string }) => Promise<void>;
  writeFile: (uri: string, body: string, options: { encoding?: 'base64' | 'utf8' }) => Promise<void>;
};

const extensionByTitlePattern = [
  { extension: 'csv', matcher: /csv|worksheet/i, mimeType: 'text/csv', uti: 'public.comma-separated-values-text' },
  { extension: 'json', matcher: /dataset|packet|export|status|report|backup|diagnostic|library/i, mimeType: 'application/json', uti: 'public.json' },
] as const;

function sanitizeFileStem(title: string) {
  const stem = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return stem || 'movebeta-export';
}

function inferFileType(title: string, body: string) {
  const explicit = extensionByTitlePattern.find((candidate) => candidate.matcher.test(title));
  if (explicit) return explicit;

  const trimmed = body.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return extensionByTitlePattern[1];
  }

  if (trimmed.includes(',') && trimmed.includes('\n')) {
    return extensionByTitlePattern[0];
  }

  return { extension: 'txt', mimeType: 'text/plain', uti: 'public.plain-text' } as const;
}

export function buildPreparedExportFilePlan(payload: PreparedExportPayload): PreparedExportFilePlan {
  const fileType = inferFileType(payload.title, payload.body);

  return {
    body: payload.body,
    fileName: `${sanitizeFileStem(payload.title)}.${fileType.extension}`,
    mimeType: fileType.mimeType,
    schemaVersion: preparedExportShareSchemaVersion,
    title: payload.title,
    uti: fileType.uti,
  };
}

async function defaultDependencies(): Promise<PreparedExportShareDependencies> {
  const fileSystem = await import('expo-file-system/legacy');
  const sharing = await import('expo-sharing');
  const reactNative = await import('react-native');

  return {
    cacheDirectory: fileSystem.cacheDirectory,
    isFileSharingAvailable: sharing.isAvailableAsync,
    shareFile: sharing.shareAsync,
    shareText: async (payload) => {
      await reactNative.Share.share(payload);
    },
    writeFile: fileSystem.writeAsStringAsync,
  };
}

export async function sharePreparedExport(
  payload: PreparedExportPayload,
  dependencies?: PreparedExportShareDependencies,
): Promise<PreparedExportShareResult> {
  const plan = buildPreparedExportFilePlan(payload);
  const deps = dependencies ?? (await defaultDependencies());
  const textPayload = {
    message: `${payload.title}\n\n${payload.body}`,
    title: payload.title,
  };

  if (!deps.cacheDirectory || !(await deps.isFileSharingAvailable())) {
    await deps.shareText(textPayload);
    return { method: 'text' };
  }

  try {
    const uri = `${deps.cacheDirectory}${plan.fileName}`;
    await deps.writeFile(uri, plan.body, { encoding: 'utf8' });
    await deps.shareFile(uri, {
      UTI: plan.uti,
      dialogTitle: plan.title,
      mimeType: plan.mimeType,
    });
    return { fileName: plan.fileName, method: 'file', uri };
  } catch {
    await deps.shareText(textPayload);
    return { method: 'text' };
  }
}
