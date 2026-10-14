// Pure, testable preflight logic shared by scripts/agent/doctor.mjs and its
// tooling regression tests.

export function nodeVersionStatus(versionString, minMajor, recommendedMajor) {
  const major = Number.parseInt(versionString.split('.')[0], 10);
  if (major < minMajor) {
    return { level: 'fail', major };
  }
  if (major < recommendedMajor) {
    return { level: 'warn', major };
  }
  return { level: 'ok', major };
}
