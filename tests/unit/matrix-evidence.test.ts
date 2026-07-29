import { expect, test } from '@rstest/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const matrixPath = resolve(
  import.meta.dirname,
  '../../docs/monorail/compatibility-matrix.md',
);

test('Target, Replacement, and Extension rows link evidence (no bare Pending)', () => {
  const matrix = readFileSync(matrixPath, 'utf8');
  const sections = matrix.split(/\n(?=### )/);
  const barePending: string[] = [];

  for (const section of sections) {
    if (!section.startsWith('### ')) {
      continue;
    }
    const id = section.match(/^### ([A-Z]+-\d+)/)?.[1];
    if (id === undefined) {
      continue;
    }
    const classification = section.match(
      /- Classification \/ 分类: ([^\n]+)/,
    )?.[1];
    if (classification === undefined) {
      continue;
    }
    const isRequired =
      classification.includes('Target') ||
      classification.includes('Replacement') ||
      classification.includes('Extension') ||
      classification.includes('目标') ||
      classification.includes('替代') ||
      classification.includes('扩展');
    if (!isRequired) {
      continue;
    }
    const evidence = section.match(/- Evidence \/ 证据: ([^\n]+)/)?.[1] ?? '';
    if (
      /^Pending\b/i.test(evidence.trim()) ||
      evidence.trim() === 'Pending / 待实现'
    ) {
      barePending.push(id);
    }
  }

  expect(barePending).toEqual([]);
});

test('DEV-004 and DEV-005 headings exist for Preload updates and error recovery', () => {
  const matrix = readFileSync(matrixPath, 'utf8');
  expect(matrix).toContain('### DEV-004');
  expect(matrix).toContain('### DEV-005');
});
