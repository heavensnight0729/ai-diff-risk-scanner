#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  renderMarkdownRiskReport,
} from './render-markdown-report.js';
import {
  scanDiffRisk,
} from './scan-diff-risk.js';

const HELP_TEXT = `Usage: ai-diff-risk-scanner [--file <path>] [--format markdown]

Scans unified diff text for high-signal AI coding risks.

Options:
  --file <path>       Read diff text from a file instead of stdin.
  --format markdown   Render Markdown output. This is the default.
  --help              Show this help message.
`;

export async function runAiDiffRiskScannerCli({
  argv = process.argv.slice(2),
  readStdin = readProcessStdin,
  readFile: readFileDependency = readFile,
  writeOutput = (value) => process.stdout.write(value),
} = {}) {
  const parsedArgs = parseArgs(argv);

  if (parsedArgs.help) {
    writeOutput(HELP_TEXT);
    return 0;
  }

  const diffText = parsedArgs.filePath
    ? await readFileDependency(parsedArgs.filePath, 'utf8')
    : await readStdin();
  const report = scanDiffRisk(diffText);
  const output = renderMarkdownRiskReport(report);

  writeOutput(output);

  return report.summary.totalFindings > 0 ? 1 : 0;
}

function parseArgs(argv) {
  const args = [...argv];
  const parsedArgs = {
    filePath: null,
    format: 'markdown',
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      parsedArgs.help = true;
      continue;
    }

    if (arg === '--file') {
      const filePath = args[index + 1];
      if (!filePath || filePath.startsWith('--')) {
        throw new RangeError('--file requires a path');
      }
      parsedArgs.filePath = filePath;
      index += 1;
      continue;
    }

    if (arg === '--format') {
      const format = args[index + 1];
      if (format !== 'markdown') {
        throw new RangeError('--format currently supports markdown only');
      }
      parsedArgs.format = format;
      index += 1;
      continue;
    }

    throw new RangeError(`Unsupported argument: ${arg}`);
  }

  return parsedArgs;
}

async function readProcessStdin() {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

if (isDirectExecution()) {
  runAiDiffRiskScannerCli()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 2;
    });
}

function isDirectExecution() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(process.argv[1]).href;
}
