import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatFileSize } from '../src/utils/index.ts';

const KB = 1024;
const MB = KB ** 2;
const GB = KB ** 3;
const TB = KB ** 4;
const PB = KB ** 5;

test('formatFileSize 正常值保持现有行为', () => {
  assert.equal(formatFileSize(0), '0 Bytes');
  assert.equal(formatFileSize(KB), '1 KB');
  assert.equal(formatFileSize(1536), '1.5 KB');
});

test('formatFileSize 单位边界', () => {
  assert.equal(formatFileSize(1), '1 Bytes');
  assert.equal(formatFileSize(KB - 1), '1023 Bytes');
  assert.equal(formatFileSize(MB), '1 MB');
  assert.equal(formatFileSize(GB), '1 GB');
  assert.equal(formatFileSize(TB), '1 TB');
  assert.equal(formatFileSize(PB), '1 PB');
});

test('formatFileSize 超出 PB 的有限值以 PB 兜底', () => {
  assert.equal(formatFileSize(PB * KB), '1024 PB');
  assert.equal(formatFileSize(PB * MB), '1048576 PB');
});

test('formatFileSize 异常输入统一返回 0 Bytes', () => {
  assert.equal(formatFileSize(-1), '0 Bytes');
  assert.equal(formatFileSize(-KB), '0 Bytes');
  assert.equal(formatFileSize(-0), '0 Bytes');
  assert.equal(formatFileSize(Number.NaN), '0 Bytes');
  assert.equal(formatFileSize(Number.POSITIVE_INFINITY), '0 Bytes');
  assert.equal(formatFileSize(Number.NEGATIVE_INFINITY), '0 Bytes');
});

test('formatFileSize 小于 1 的正数使用 Bytes', () => {
  assert.equal(formatFileSize(0.5), '0.5 Bytes');
  assert.equal(formatFileSize(0.9), '0.9 Bytes');
});

test('formatFileSize 最多保留两位小数', () => {
  assert.equal(formatFileSize(KB + KB / 2), '1.5 KB');
  assert.equal(formatFileSize(KB + KB / 4), '1.25 KB');
});
