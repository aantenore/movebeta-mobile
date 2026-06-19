import { describe, expect, it, vi } from 'vitest';

import {
  buildPreparedExportFilePlan,
  preparedExportShareSchemaVersion,
  sharePreparedExport,
  type PreparedExportShareDependencies,
} from '../src/core/preparedExportShare';

function dependencies(overrides: Partial<PreparedExportShareDependencies> = {}): PreparedExportShareDependencies {
  return {
    cacheDirectory: 'file:///cache/',
    isFileSharingAvailable: vi.fn(async () => true),
    shareFile: vi.fn(async () => undefined),
    shareText: vi.fn(async () => undefined),
    writeFile: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('prepared export share', () => {
  it('builds a stable JSON file plan from export titles', () => {
    const plan = buildPreparedExportFilePlan({
      body: '{"schemaVersion":"movebeta.coach-validation-workflow.v1"}',
      title: 'Prepared validation campaign status',
    });

    expect(plan).toMatchObject({
      fileName: 'prepared-validation-campaign-status.json',
      mimeType: 'application/json',
      schemaVersion: preparedExportShareSchemaVersion,
      uti: 'public.json',
    });
  });

  it('builds a CSV file plan for worksheet exports', () => {
    const plan = buildPreparedExportFilePlan({
      body: 'worksheetRowId,clipId\nrow-1,clip-1\n',
      title: 'Prepared cue validation worksheet CSV',
    });

    expect(plan).toMatchObject({
      fileName: 'prepared-cue-validation-worksheet-csv.csv',
      mimeType: 'text/csv',
      uti: 'public.comma-separated-values-text',
    });
  });

  it('writes and shares a file when native file sharing is available', async () => {
    const deps = dependencies();
    const result = await sharePreparedExport(
      {
        body: '{"ok":true}',
        title: 'Prepared coach packet',
      },
      deps,
    );

    expect(deps.writeFile).toHaveBeenCalledWith('file:///cache/prepared-coach-packet.json', '{"ok":true}', {
      encoding: 'utf8',
    });
    expect(deps.shareFile).toHaveBeenCalledWith('file:///cache/prepared-coach-packet.json', {
      UTI: 'public.json',
      dialogTitle: 'Prepared coach packet',
      mimeType: 'application/json',
    });
    expect(deps.shareText).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      fileName: 'prepared-coach-packet.json',
      method: 'file',
      uri: 'file:///cache/prepared-coach-packet.json',
    });
  });

  it('falls back to text sharing when file sharing is unavailable', async () => {
    const deps = dependencies({
      isFileSharingAvailable: vi.fn(async () => false),
    });
    const result = await sharePreparedExport(
      {
        body: 'payload',
        title: 'Prepared export',
      },
      deps,
    );

    expect(deps.writeFile).not.toHaveBeenCalled();
    expect(deps.shareFile).not.toHaveBeenCalled();
    expect(deps.shareText).toHaveBeenCalledWith({
      message: 'Prepared export\n\npayload',
      title: 'Prepared export',
    });
    expect(result).toEqual({ method: 'text' });
  });

  it('falls back to text sharing when file writing fails', async () => {
    const deps = dependencies({
      writeFile: vi.fn(async () => {
        throw new Error('disk full');
      }),
    });
    const result = await sharePreparedExport(
      {
        body: 'payload',
        title: 'Prepared export',
      },
      deps,
    );

    expect(deps.shareFile).not.toHaveBeenCalled();
    expect(deps.shareText).toHaveBeenCalledWith({
      message: 'Prepared export\n\npayload',
      title: 'Prepared export',
    });
    expect(result).toEqual({ method: 'text' });
  });
});
