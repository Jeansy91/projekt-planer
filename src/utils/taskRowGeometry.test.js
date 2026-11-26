import { describe, it, expect } from 'vitest';
import { MS_PER_WEEK, gridInnerWidth, taskBoxPx, isTaskBoxOffScreen } from './taskRowGeometry';

describe('gridInnerWidth', () => {
  it('subtracts horizontal padding when measured', () => {
    expect(gridInnerWidth(800)).toBe(768);
  });

  it('falls back to 1000 before measurement', () => {
    expect(gridInnerWidth(0)).toBe(1000);
    expect(gridInnerWidth(-1)).toBe(1000);
  });
});

describe('taskBoxPx', () => {
  const viewStartDate = '2026-01-05'; // Monday

  it('places a Task starting at viewStartDate at left=0', () => {
    const { leftPx, widthPx } = taskBoxPx({
      task: { startDate: '2026-01-05', duration: 2 },
      viewStartDate, weeksShown: 12, innerWidth: 1200,
    });
    expect(leftPx).toBe(0);
    expect(widthPx).toBe(200); // 2/12 * 1200
  });

  it('places a Task one week in at innerWidth/weeksShown', () => {
    const { leftPx } = taskBoxPx({
      task: { startDate: '2026-01-12', duration: 1 },
      viewStartDate, weeksShown: 12, innerWidth: 1200,
    });
    expect(leftPx).toBe(100);
  });

  it('returns negative leftPx for Tasks before viewStartDate', () => {
    const { leftPx } = taskBoxPx({
      task: { startDate: '2025-12-29', duration: 1 },
      viewStartDate, weeksShown: 12, innerWidth: 1200,
    });
    expect(leftPx).toBe(-100);
  });

  it('accepts a numeric viewStartDate', () => {
    const viewMs = new Date('2026-01-05').getTime();
    const { leftPx } = taskBoxPx({
      task: { startDate: '2026-01-12', duration: 1 },
      viewStartDate: viewMs, weeksShown: 12, innerWidth: 1200,
    });
    expect(leftPx).toBe(100);
  });
});

describe('isTaskBoxOffScreen', () => {
  it('true when entirely to the right', () => {
    expect(isTaskBoxOffScreen({ leftPx: 1300, widthPx: 100 }, 1200)).toBe(true);
  });
  it('true when entirely to the left', () => {
    expect(isTaskBoxOffScreen({ leftPx: -200, widthPx: 100 }, 1200)).toBe(true);
  });
  it('false when partially visible from the left', () => {
    expect(isTaskBoxOffScreen({ leftPx: -50, widthPx: 200 }, 1200)).toBe(false);
  });
});

describe('MS_PER_WEEK', () => {
  it('matches the constant duplicated across the codebase', () => {
    expect(MS_PER_WEEK).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
