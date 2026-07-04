export function normalizeAgentPhase(raw) {
  const phase = String(raw || '2').trim();
  if (phase === '1') {
    return '1';
  }
  if (phase === 'continue') {
    return 'continue';
  }
  if (phase === 'import_assemble') {
    return 'import_assemble';
  }
  return '2';
}

export function promptFileName(phase) {
  const normalized = normalizeAgentPhase(phase);
  if (normalized === '1') {
    return 'agent-script-prompt.md';
  }
  if (normalized === 'continue') {
    return 'agent-continue-prompt.md';
  }
  if (normalized === 'import_assemble') {
    return 'agent-import-assemble-prompt.md';
  }
  return 'agent-render-prompt.md';
}

export function promptRelativePath(shortVideoId, phase) {
  return `storage/agent-renders/${shortVideoId}/assets/${promptFileName(phase)}`;
}
