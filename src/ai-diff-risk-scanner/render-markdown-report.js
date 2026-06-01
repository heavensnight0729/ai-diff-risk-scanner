const EMPTY_FINDINGS_MESSAGE = 'No high-signal AI diff risks detected.';

export function renderMarkdownRiskReport(report) {
  assertReportObject(report);

  const lines = [
    '# AI Diff Risk Report',
    '',
    '## Summary',
    '',
    '| Total | Critical | High | Medium | Low |',
    '| ---: | ---: | ---: | ---: | ---: |',
    `| ${report.summary.totalFindings} | ${report.summary.critical} | ${report.summary.high} | ${report.summary.medium} | ${report.summary.low} |`,
    '',
    '## Changed Files',
    '',
    ...renderChangedFiles(report.changedFiles),
    '',
    '## Findings',
    '',
    ...renderFindings(report.findings),
  ];

  return `${lines.join('\n')}\n`;
}

function renderChangedFiles(changedFiles) {
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) {
    return ['- None'];
  }

  return changedFiles.map((filePath) => `- \`${filePath}\``);
}

function renderFindings(findings) {
  if (!Array.isArray(findings) || findings.length === 0) {
    return [EMPTY_FINDINGS_MESSAGE];
  }

  return [
    '| Severity | Rule | Location | Snippet | Rationale |',
    '| --- | --- | --- | --- | --- |',
    ...findings.map((finding) => [
      `| ${escapeTableCell(finding.severity)}`,
      escapeTableCell(finding.label),
      `\`${formatLocation(finding)}\``,
      `\`${escapeTableCell(finding.snippet)}\``,
      `${escapeTableCell(finding.rationale)} |`,
    ].join(' | ')),
  ];
}

function formatLocation(finding) {
  if (finding.filePath && Number.isInteger(finding.lineNumber)) {
    return `${finding.filePath}:${finding.lineNumber}`;
  }

  return finding.filePath ?? 'unknown';
}

function escapeTableCell(value) {
  return String(value ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');
}

function assertReportObject(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new TypeError('report must be an object');
  }

  if (!report.summary || typeof report.summary !== 'object') {
    throw new TypeError('report.summary must be an object');
  }
}
