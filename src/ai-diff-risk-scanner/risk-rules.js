export const AI_DIFF_RISK_RULES = deepFreeze([
  {
    ruleId: 'secret-like-addition',
    severity: 'high',
    label: 'Secret-like value added',
    rationale: 'Hardcoded secrets can be committed accidentally when AI fills placeholders.',
    pattern: /\b[A-Za-z0-9_-]*(?:api[_-]?key|token|secret|password|private[_-]?key)[A-Za-z0-9_-]*\b\s*[:=]\s*['"][^'"]{8,}['"]|(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{12,}|sk-[A-Za-z0-9_-]{12,}/i,
  },
  {
    ruleId: 'unchecked-network-input',
    severity: 'high',
    label: 'Network call uses unchecked input',
    rationale: 'Network calls with raw request-like input should have explicit validation at the boundary.',
    pattern: /\b(?:fetch|axios|got|request|superagent)\s*(?:\.|\(|<).*?\b(?:rawInput|req\.body|request\.body|body)\b/i,
  },
  {
    ruleId: 'todo-left-in-added-code',
    severity: 'medium',
    label: 'TODO or FIXME left in added code',
    rationale: 'Generated code often leaves incomplete validation, error handling, or test coverage markers.',
    pattern: /\b(?:TODO|FIXME|HACK)\b/i,
  },
]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  for (const childValue of Object.values(value)) {
    deepFreeze(childValue);
  }

  return Object.freeze(value);
}
