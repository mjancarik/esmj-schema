// Pure, testable budget-comparison logic shared by scripts/agent/test-size.mjs
// and its tooling regression tests.

export function evaluateBudgets(measurements, budgets) {
  const results = [];
  let failed = false;

  for (const [entry, size] of Object.entries(measurements)) {
    const budget = budgets[entry];
    if (budget === undefined) {
      results.push({ entry, size, budget: null, status: 'informational' });
      continue;
    }
    if (size > budget) {
      failed = true;
      results.push({ entry, size, budget, status: 'fail' });
    } else {
      results.push({ entry, size, budget, status: 'pass' });
    }
  }

  return { results, failed };
}
