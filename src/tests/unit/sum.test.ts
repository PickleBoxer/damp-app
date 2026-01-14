import { expect, test } from 'vitest';

function sum(a: number, b: number): number {
  return a + b;
}

test('sum', () => {
  const param1 = 2;
  const param2 = 2;

  const result: number = sum(param1, param2);

  expect(result).toBe(4);
});
