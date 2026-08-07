import { expect, test } from '@rstest/core';
import {
  checkRsbuildWindow,
  createRsbuildWindowWarning,
  isWithinTestedWindow,
  RSBUILD_TESTED_WINDOW,
} from '../../packages/core/src/rsbuild/window.ts';

const TESTED = '2.1.7';

test('isWithinTestedWindow accepts versions on the tested minor line', () => {
  expect(isWithinTestedWindow('2.1.7', TESTED)).toBe(true);
  expect(isWithinTestedWindow('2.1.99', TESTED)).toBe(true);
  expect(isWithinTestedWindow('2.1.0', TESTED)).toBe(true);
  expect(isWithinTestedWindow('2.1.99', '2.1.0')).toBe(true);
});

test('isWithinTestedWindow rejects other minor lines, majors, and prereleases', () => {
  expect(isWithinTestedWindow('2.2.0', TESTED)).toBe(false);
  expect(isWithinTestedWindow('2.0.9', TESTED)).toBe(false);
  expect(isWithinTestedWindow('3.0.0', TESTED)).toBe(false);
  expect(isWithinTestedWindow('1.9.0', TESTED)).toBe(false);
  expect(isWithinTestedWindow('2.1.0-beta.1', TESTED)).toBe(false);
  expect(isWithinTestedWindow('2.2.0-rc.1', TESTED)).toBe(false);
});

test('isWithinTestedWindow rejects malformed versions conservatively', () => {
  expect(isWithinTestedWindow('2', TESTED)).toBe(false);
  expect(isWithinTestedWindow('not-a-version', TESTED)).toBe(false);
  expect(isWithinTestedWindow('', TESTED)).toBe(false);
  expect(isWithinTestedWindow('2.1.7', 'garbage')).toBe(false);
});

test('createRsbuildWindowWarning yields a project-level structured warning', () => {
  const warning = createRsbuildWindowWarning('2.2.0');
  expect(warning.code).toBe('RSELECTRON_RSBUILD_UNTESTED');
  expect(warning.role).toBeUndefined();
  expect(warning.message).toContain('2.2.0');
  expect(warning.message).toContain('>=2.1.0 <2.2.0');
  expect(warning.message).toContain('tested window');
});

test('checkRsbuildWindow returns no warning for the workspace rsbuild version', () => {
  // The workspace pins @rsbuild/core 2.1.7 as a devDependency; the frozen
  // tested window must match it, so resolving the repo's own copy yields no
  // false positive.
  expect(RSBUILD_TESTED_WINDOW.tested).toBe('2.1.7');
  expect(checkRsbuildWindow()).toBeUndefined();
});
