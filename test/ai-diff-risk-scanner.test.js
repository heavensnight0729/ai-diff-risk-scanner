import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  scanDiffRisk,
} from '../src/ai-diff-risk-scanner/scan-diff-risk.js';
import {
  renderMarkdownRiskReport,
} from '../src/ai-diff-risk-scanner/render-markdown-report.js';
import {
  runAiDiffRiskScannerCli,
} from '../src/ai-diff-risk-scanner/cli.js';

test('detects secret-like additions unchecked network input and todo markers', () => {
  const diffText = [
    'diff --git a/src/client.js b/src/client.js',
    'index 1111111..2222222 100644',
    '--- a/src/client.js',
    '+++ b/src/client.js',
    '@@ -1,2 +1,5 @@',
    '+const OPENAI_API_KEY = "fixture-secret-value";',
    '+fetch("/api/health", { method: "POST", body: rawInput });',
    '+// TODO: add validation',
  ].join('\n');

  const report = scanDiffRisk(diffText);

  assert.equal(report.summary.totalFindings, 3);
  assert.equal(report.summary.high, 2);
  assert.equal(report.summary.medium, 1);
  assert.deepEqual(
    report.findings.map((finding) => finding.ruleId),
    [
      'secret-like-addition',
      'unchecked-network-input',
      'todo-left-in-added-code',
    ],
  );
  assert.deepEqual(report.changedFiles, ['src/client.js']);
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.findings), true);
});

test('ignores removed lines context lines and diff metadata', () => {
  const diffText = [
    'diff --git a/src/config.js b/src/config.js',
    '--- a/src/config.js',
    '+++ b/src/config.js',
    '@@ -1,4 +1,4 @@',
    '-const API_TOKEN = "old-secret";',
    ' const unchanged = "TODO: existing note";',
    '+const safeValue = "configured at runtime";',
  ].join('\n');

  const report = scanDiffRisk(diffText);

  assert.equal(report.summary.totalFindings, 0);
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.changedFiles, ['src/config.js']);
});

test('renders deterministic markdown with summary and escaped finding snippets', () => {
  const report = scanDiffRisk([
    'diff --git a/src/client.js b/src/client.js',
    '+++ b/src/client.js',
    '@@ -10,2 +10,4 @@',
    '+const API_TOKEN = "abcdef1234567890";',
    '+// TODO: handle a | b',
  ].join('\n'));

  const markdown = renderMarkdownRiskReport(report);

  assert.match(markdown, /^# AI Diff Risk Report/);
  assert.match(markdown, /\| Total \| Critical \| High \| Medium \| Low \|/);
  assert.match(markdown, /\| 2 \| 0 \| 1 \| 1 \| 0 \|/);
  assert.match(markdown, /`src\/client\.js:10`/);
  assert.match(markdown, /`src\/client\.js:11`/);
  assert.match(markdown, /Secret-like value added/);
  assert.match(markdown, /TODO or FIXME left in added code/);
  assert.match(markdown, /handle a \\| b/);
});

test('cli reads diff text from stdin by default and writes markdown output', async () => {
  const writes = [];

  const exitCode = await runAiDiffRiskScannerCli({
    argv: [],
    readStdin: async () => [
      'diff --git a/src/client.js b/src/client.js',
      '+++ b/src/client.js',
      '@@ -1,1 +1,2 @@',
      '+const API_TOKEN = "abcdef1234567890";',
    ].join('\n'),
    readFile: async () => {
      throw new Error('readFile should not be called');
    },
    writeOutput: (value) => writes.push(value),
  });

  assert.equal(exitCode, 1);
  assert.equal(writes.length, 1);
  assert.match(writes[0], /# AI Diff Risk Report/);
  assert.match(writes[0], /Secret-like value added/);
});

test('cli reads diff text from --file path and returns zero when there are no findings', async () => {
  const writes = [];
  const readPaths = [];

  const exitCode = await runAiDiffRiskScannerCli({
    argv: ['--file', 'fixtures/safe.diff'],
    readStdin: async () => {
      throw new Error('readStdin should not be called');
    },
    readFile: async (filePath) => {
      readPaths.push(filePath);
      return [
        'diff --git a/src/config.js b/src/config.js',
        '+++ b/src/config.js',
        '@@ -1,1 +1,1 @@',
        '+const safeValue = "runtime";',
      ].join('\n');
    },
    writeOutput: (value) => writes.push(value),
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(readPaths, ['fixtures/safe.diff']);
  assert.match(writes[0], /No high-signal AI diff risks detected\./);
});

test('cli renders help without reading input', async () => {
  const writes = [];

  const exitCode = await runAiDiffRiskScannerCli({
    argv: ['--help'],
    readStdin: async () => {
      throw new Error('readStdin should not be called');
    },
    readFile: async () => {
      throw new Error('readFile should not be called');
    },
    writeOutput: (value) => writes.push(value),
  });

  assert.equal(exitCode, 0);
  assert.match(writes[0], /Usage: ai-diff-risk-scanner/);
});
