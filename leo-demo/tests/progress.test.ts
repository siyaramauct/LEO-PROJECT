import { describe, expect, test } from "vitest";
import { scoreBand } from "../src/domain/progress";

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
});
