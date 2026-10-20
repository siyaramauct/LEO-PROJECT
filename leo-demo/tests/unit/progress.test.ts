import { describe, expect, test } from "vitest";
import { scoreBand, studentFlags } from "../../src/domain/progress";

describe("scoreBand", () => {
  test("Test A - 80% or more is mastered", () => {
    expect(scoreBand(80)).toBe("mastered");
    expect(scoreBand(100)).toBe("mastered");
  });

  test("Test B - 50% up to 79% is developing", () => {
    expect(scoreBand(79)).toBe("developing");
    expect(scoreBand(50)).toBe("developing");
  });

  test("Test C - below 50% needs support", () => {
    expect(scoreBand(49)).toBe("support");
    expect(scoreBand(0)).toBe("support");
  });

  test("Test D - an invalid score throws an error", () => {
    expect(() => scoreBand(-1)).toThrow();
    expect(() => scoreBand(101)).toThrow();
  });
});

describe("studentFlags", () => {
  // A student with no problems. Each test changes one field to trigger one rule.
  const onTrack = {
    averagePercent: 75,
    daysSinceActive: 1,
    completedLessons: 4,
    releasedLessons: 4,
  };

  test("Test A - a student on track has no flags", () => {
    expect(studentFlags(onTrack)).toEqual([]);
  });

  test("Test B - an average below 50% is flagged as low scores", () => {
    expect(studentFlags({ ...onTrack, averagePercent: 49 })).toEqual(["low-scores"]);
    expect(studentFlags({ ...onTrack, averagePercent: 50 })).toEqual([]);
  });

  test("Test C - no scores yet is not the same as low scores", () => {
    expect(studentFlags({ ...onTrack, averagePercent: null })).toEqual([]);
  });

  test("Test D - 7 or more days without study is flagged as inactive", () => {
    expect(studentFlags({ ...onTrack, daysSinceActive: 6 })).toEqual([]);
    expect(studentFlags({ ...onTrack, daysSinceActive: 7 })).toEqual(["inactive"]);
  });

  test("Test E - no recent activity at all is flagged as inactive", () => {
    expect(studentFlags({ ...onTrack, daysSinceActive: null })).toEqual(["inactive"]);
  });

  test("Test F - finishing less than half the released lessons is flagged as behind", () => {
    expect(studentFlags({ ...onTrack, completedLessons: 1, releasedLessons: 4 })).toEqual([
      "behind",
    ]);
    // Exactly half is not behind.
    expect(studentFlags({ ...onTrack, completedLessons: 2, releasedLessons: 4 })).toEqual([]);
  });

  test("Test G - nobody is behind until at least two lessons are released", () => {
    expect(studentFlags({ ...onTrack, completedLessons: 0, releasedLessons: 1 })).toEqual([]);
    expect(studentFlags({ ...onTrack, completedLessons: 0, releasedLessons: 0 })).toEqual([]);
  });

  test("Test H - a student can have every flag at once", () => {
    const struggling = {
      averagePercent: 30,
      daysSinceActive: null,
      completedLessons: 0,
      releasedLessons: 5,
    };

    expect(studentFlags(struggling)).toEqual(["low-scores", "inactive", "behind"]);
  });
});
