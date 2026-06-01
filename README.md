# AI Diff Risk Scanner

Local CLI that scans unified diffs for high-signal AI coding risks and renders a GitHub-ready Markdown report.

It is intentionally small, deterministic, and dependency-free. The first MVP focuses on risks that often appear in fast AI-assisted coding:

- Secret-like values added to source code
- Network calls using raw request-like input
- `TODO`, `FIXME`, or `HACK` markers left in added code

## Install

```bash
npm install
```

## Usage

Scan the current git diff from stdin:

```bash
git diff | node src/ai-diff-risk-scanner/cli.js
```

Scan a saved diff file:

```bash
node src/ai-diff-risk-scanner/cli.js --file changes.diff
```

When installed as a package, use the bin:

```bash
git diff | ai-diff-risk-scanner
```

## Exit Codes

- `0`: no findings
- `1`: one or more findings
- `2`: CLI/runtime error

## Development

```bash
npm test
```

## Security Notes

This tool does not send code, diffs, or findings to any external service. It only reads local stdin or a local file path and writes Markdown to stdout.

The rules are heuristics, not a replacement for full code review or secret scanning.
