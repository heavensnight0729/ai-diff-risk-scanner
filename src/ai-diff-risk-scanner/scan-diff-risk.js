import {
  AI_DIFF_RISK_RULES,
} from './risk-rules.js';

const SUMMARY_SEVERITIES = Object.freeze([
  'critical',
  'high',
  'medium',
  'low',
]);

export function scanDiffRisk(diffText, options = {}) {
  assertDiffText(diffText);
  assertOptionsObject(options);

  const rules = options.rules ?? AI_DIFF_RISK_RULES;
  const addedLines = parseAddedDiffLines(diffText);
  const changedFiles = uniquePreserveOrder(
    addedLines.map((line) => line.filePath).filter(Boolean),
  );
  const findings = addedLines.flatMap((line) => findRisksForLine(line, rules));

  return deepFreeze({
    schemaVersion: 'ai_diff_risk_scanner.report/v1',
    changedFiles,
    summary: summarizeFindings(findings),
    findings,
  });
}

function parseAddedDiffLines(diffText) {
  const lines = diffText.split(/\r?\n/);
  const parsedLines = [];
  let currentFilePath = null;
  let currentNewLineNumber = null;

  for (const rawLine of lines) {
    if (rawLine.startsWith('+++ ')) {
      currentFilePath = normalizeDiffFilePath(rawLine.slice(4).trim());
      continue;
    }

    if (rawLine.startsWith('@@')) {
      currentNewLineNumber = parseHunkNewLineStart(rawLine);
      continue;
    }

    if (rawLine.startsWith('+')) {
      if (!rawLine.startsWith('+++')) {
        parsedLines.push({
          filePath: currentFilePath,
          lineNumber: currentNewLineNumber,
          content: rawLine.slice(1),
        });
        currentNewLineNumber = incrementLineNumber(currentNewLineNumber);
      }
      continue;
    }

    if (rawLine.startsWith('-')) {
      continue;
    }

    currentNewLineNumber = incrementLineNumber(currentNewLineNumber);
  }

  return parsedLines;
}

function normalizeDiffFilePath(rawPath) {
  if (rawPath === '/dev/null') {
    return null;
  }

  return rawPath.replace(/^"?(?:a|b)\//, '').replace(/"$/, '');
}

function parseHunkNewLineStart(hunkHeader) {
  const match = hunkHeader.match(/\+(\d+)(?:,\d+)?/);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

function incrementLineNumber(lineNumber) {
  if (!Number.isInteger(lineNumber)) {
    return lineNumber;
  }

  return lineNumber + 1;
}

function findRisksForLine(line, rules) {
  return rules
    .filter((rule) => rule.pattern.test(line.content))
    .map((rule) => ({
      ruleId: rule.ruleId,
      severity: rule.severity,
      label: rule.label,
      rationale: rule.rationale,
      filePath: line.filePath,
      lineNumber: line.lineNumber,
      snippet: line.content.trim(),
    }));
}

function summarizeFindings(findings) {
  const severityCounts = Object.fromEntries(
    SUMMARY_SEVERITIES.map((severity) => [severity, 0]),
  );

  for (const finding of findings) {
    severityCounts[finding.severity] = (severityCounts[finding.severity] ?? 0) + 1;
  }

  return {
    totalFindings: findings.length,
    ...severityCounts,
  };
}

function uniquePreserveOrder(values) {
  return [...new Set(values)];
}

function assertDiffText(diffText) {
  if (typeof diffText !== 'string') {
    throw new TypeError('diffText must be a string');
  }
}

function assertOptionsObject(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  for (const childValue of Object.values(value)) {
    deepFreeze(childValue);
  }

  return Object.freeze(value);
}
