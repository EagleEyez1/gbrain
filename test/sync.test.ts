import { describe, test, expect } from 'bun:test';
import { buildSyncManifest, isSyncable, pathToSlug } from '../src/core/sync.ts';

describe('buildSyncManifest', () => {
  test('parses A/M/D entries from single commit', () => {
    const output = `A\tpeople/new-person.md\nM\tpeople/existing-person.md\nD\tpeople/deleted-person.md`;
    const manifest = buildSyncManifest(output);
    expect(manifest.added).toEqual(['people/new-person.md']);
    expect(manifest.modified).toEqual(['people/existing-person.md']);
    expect(manifest.deleted).toEqual(['people/deleted-person.md']);
    expect(manifest.renamed).toEqual([]);
  });

  test('parses R100 rename entries', () => {
    const output = `R100\tpeople/old-name.md\tpeople/new-name.md`;
    const manifest = buildSyncManifest(output);
    expect(manifest.renamed).toEqual([{ from: 'people/old-name.md', to: 'people/new-name.md' }]);
    expect(manifest.added).toEqual([]);
    expect(manifest.modified).toEqual([]);
    expect(manifest.deleted).toEqual([]);
  });

  test('parses partial rename (R075)', () => {
    const output = `R075\tpeople/old.md\tpeople/new.md`;
    const manifest = buildSyncManifest(output);
    expect(manifest.renamed).toEqual([{ from: 'people/old.md', to: 'people/new.md' }]);
  });

  test('handles empty diff', () => {
    const manifest = buildSyncManifest('');
    expect(manifest.added).toEqual([]);
    expect(manifest.modified).toEqual([]);
    expect(manifest.deleted).toEqual([]);
    expect(manifest.renamed).toEqual([]);
  });

  test('handles mixed entries with blank lines', () => {
    const output = `A\tpeople/a.md\n\nM\tpeople/b.md\n\nD\tpeople/c.md`;
    const manifest = buildSyncManifest(output);
    expect(manifest.added).toEqual(['people/a.md']);
    expect(manifest.modified).toEqual(['people/b.md']);
    expect(manifest.deleted).toEqual(['people/c.md']);
  });

  test('skips malformed lines', () => {
    const output = `A\tpeople/a.md\ngarbage line\nM\tpeople/b.md`;
    const manifest = buildSyncManifest(output);
    expect(manifest.added).toEqual(['people/a.md']);
    expect(manifest.modified).toEqual(['people/b.md']);
  });
});

describe('isSyncable', () => {
  test('accepts normal .md files', () => {
    expect(isSyncable('people/pedro-franceschi.md')).toBe(true);
    expect(isSyncable('meetings/2026-04-03-lunch.md')).toBe(true);
    expect(isSyncable('daily/2026-04-05.md')).toBe(true);
    expect(isSyncable('notes.md')).toBe(true);
  });

  test('rejects non-.md files', () => {
    expect(isSyncable('people/photo.jpg')).toBe(false);
    expect(isSyncable('config.json')).toBe(false);
    expect(isSyncable('src/cli.ts')).toBe(false);
  });

  test('rejects files in hidden directories', () => {
    expect(isSyncable('.git/config')).toBe(false);
    expect(isSyncable('.obsidian/plugins.md')).toBe(false);
    expect(isSyncable('people/.hidden/secret.md')).toBe(false);
  });

  test('rejects .raw/ sidecar directories', () => {
    expect(isSyncable('people/pedro.raw/source.md')).toBe(false);
    expect(isSyncable('dir/.raw/notes.md')).toBe(false);
  });

  test('rejects skip-list basenames', () => {
    expect(isSyncable('schema.md')).toBe(false);
    expect(isSyncable('index.md')).toBe(false);
    expect(isSyncable('log.md')).toBe(false);
    expect(isSyncable('README.md')).toBe(false);
    expect(isSyncable('people/README.md')).toBe(false);
  });

  test('rejects ops/ directory', () => {
    expect(isSyncable('ops/deploy-log.md')).toBe(false);
    expect(isSyncable('ops/config.md')).toBe(false);
  });
});

describe('pathToSlug', () => {
  test('strips .md extension', () => {
    expect(pathToSlug('people/pedro-franceschi.md')).toBe('people/pedro-franceschi');
  });

  test('preserves case', () => {
    expect(pathToSlug('People/Pedro-Franceschi.md')).toBe('People/Pedro-Franceschi');
  });

  test('strips leading slash', () => {
    expect(pathToSlug('/people/pedro.md')).toBe('people/pedro');
  });

  test('normalizes backslash separators', () => {
    expect(pathToSlug('people\\pedro.md')).toBe('people/pedro');
  });

  test('handles flat files', () => {
    expect(pathToSlug('notes.md')).toBe('notes');
  });

  test('handles nested paths', () => {
    expect(pathToSlug('projects/gbrain/spec.md')).toBe('projects/gbrain/spec');
  });

  test('adds repo prefix when provided', () => {
    expect(pathToSlug('people/pedro.md', 'brain')).toBe('brain/people/pedro');
  });

  test('no prefix when not provided', () => {
    expect(pathToSlug('people/pedro.md')).toBe('people/pedro');
  });
});
