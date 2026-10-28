import { describe, expect, test } from "vitest";
import {
  classroomDescriptionError,
  classroomDetailsError,
  classroomNameError,
  MAX_CLASSROOM_DESCRIPTION_LENGTH,
  MAX_CLASSROOM_NAME_LENGTH,
  MIN_CLASSROOM_DESCRIPTION_LENGTH,
} from "../../src/domain/classroomValidation";

const description = "Vocabulary for meetings, emails and presentations.";

describe("classroomNameError", () => {
  test("Test A - a normal name passes", () => {
    expect(classroomNameError("Business English")).toBeNull();
  });

  test("Test B - empty or space-only names are refused", () => {
    expect(classroomNameError("")).toBe("Enter a classroom name.");
    expect(classroomNameError("   ")).toBe("Enter a classroom name.");
  });

  test("Test C - a name over the limit is refused, ignoring outer spaces", () => {
    const longest = "a".repeat(MAX_CLASSROOM_NAME_LENGTH);

    expect(classroomNameError(`  ${longest}  `)).toBeNull();
    expect(classroomNameError(`${longest}a`)).toMatch(/under 80 characters/);
  });
});

describe("classroomDescriptionError", () => {
  test("Test A - a normal description passes", () => {
    expect(classroomDescriptionError(description)).toBeNull();
  });

  test("Test B - empty or space-only descriptions are refused", () => {
    expect(classroomDescriptionError("")).toBe("Add a short classroom description.");
    expect(classroomDescriptionError("  \n ")).toBe("Add a short classroom description.");
  });

  test("Test C - a description shorter than the minimum is refused, ignoring outer spaces", () => {
    const shortest = "a".repeat(MIN_CLASSROOM_DESCRIPTION_LENGTH);

    expect(classroomDescriptionError(shortest)).toBeNull();
    expect(classroomDescriptionError(`   ${shortest.slice(1)}   `)).toMatch(
      /at least 10 characters/,
    );
  });

  test("Test D - a description over the limit is refused", () => {
    const longest = "a".repeat(MAX_CLASSROOM_DESCRIPTION_LENGTH);

    expect(classroomDescriptionError(longest)).toBeNull();
    expect(classroomDescriptionError(`${longest}a`)).toMatch(/under 240 characters/);
  });
});

describe("classroomDetailsError", () => {
  test("Test A - valid details pass", () => {
    expect(classroomDetailsError("Business English", description)).toBeNull();
  });

  test("Test B - the name's problem is reported before the description's", () => {
    expect(classroomDetailsError("", "")).toBe("Enter a classroom name.");
    expect(classroomDetailsError("Business English", "short")).toMatch(/at least 10/);
  });
});
