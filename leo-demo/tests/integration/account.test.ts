// -----------------------------------------------------------------------------
// Account Tests
//
// What happens around a user's account, through the app's real service
// (src/services/accountService.ts) while signed in: making sure a signed-in
// user has a profile, choosing a role (which also gives a username), and
// deleting the account. Setup that isn't being tested uses the seed helpers.
//
// Several rules here are enforced by database triggers rather than the app:
//   guard_user_role        a role is set once, only to student or teacher
//   make_username_unique   a clashing username gets new digits
//   before/after_profile_delete   deleting a profile removes the user's data
//                                 and their sign-in account
// -----------------------------------------------------------------------------

import { describe, expect, test } from "vitest";
import { chooseRole, deleteAccount, loadOrCreateProfile } from "../../src/services/accountService";
import { supabase } from "../../src/supabase-client";
import {
  admin,
  seedClassroom,
  seedEnrolment,
  seedLesson,
  seedUser,
  signInAs,
  signOut,
  type TestUser,
} from "./helpers";

// -- Shared steps ---------------------------------------------------------------------

// The signed-in user as Supabase Auth returns it, which is what AuthContext
// passes to loadOrCreateProfile.
async function currentUser() {
  const { data } = await supabase.auth.getUser();

  return data.user!;
}

// The profile row, read as admin so RLS can't hide it.
async function profileRow(user: TestUser) {
  const { data } = await admin
    .from("profiles")
    .select("name, surname, user_role, username")
    .eq("id", user.id)
    .maybeSingle();

  return data;
}

// The message the guard_user_role trigger raises when a role change is refused.
const ROLE_GUARD_REFUSAL = "Your role has already been set";

// The database's own message behind a DataError (kept as its cause), so a test
// can check WHICH rule refused something, not just that something failed.
function refusedBy(error: unknown) {
  return ((error as Error).cause as { message?: string } | undefined)?.message ?? "";
}

// How many rows of a table still belong to the user.
async function rowsFor(table: string, column: string, user: TestUser) {
  const { count } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, user.id);

  return count ?? 0;
}

// -- Loading or creating a profile ----------------------------------------------------

describe("Loading or creating a profile", () => {
  test("Test A - A signed-in user's existing profile is returned", async () => {
    const user = await seedUser("student");

    await signInAs(user);
    const result = await loadOrCreateProfile(await currentUser());

    expect(result.error).toBeNull();
    expect(result.profile).toEqual({
      id: user.id,
      name: "Test",
      surname: "Student",
      user_role: "student",
    });
  });

  test("Test B - A missing profile is created from the names Google sent", async () => {
    const user = await seedUser(null, {
      metadata: { full_name: "Thandi Mokoena", given_name: "Thandi", family_name: "Mokoena" },
    });

    // Simulate a first Google sign-in that arrives before any profile exists.
    await admin.from("profiles").delete().eq("id", user.id);

    await signInAs(user);
    const result = await loadOrCreateProfile(await currentUser());

    expect(result.error).toBeNull();
    expect(result.profile).toEqual({
      id: user.id,
      name: "Thandi",
      surname: "Mokoena",
      user_role: null, // Picked next, on /select-role.
    });
    expect(await profileRow(user)).not.toBeNull();
  });

  test("Test C - It never throws: a failure comes back as a readable message", async () => {
    const user = await seedUser("student");
    await signInAs(user);
    const authUser = await currentUser();

    // Signed out, the profile can neither be read nor created.
    await signOut();
    const result = await loadOrCreateProfile(authUser);

    expect(result.profile).toBeNull();
    expect(result.error).toMatch(/profile could not be created/);
  });
});

// -- Choosing a role ------------------------------------------------------------------

describe("Choosing a role", () => {
  test("Test A - A new user picks a role and gets a username made from their name", async () => {
    const user = await seedUser(null, { metadata: { name: "Thandi", surname: "Mokoena" } });

    await signInAs(user);
    await chooseRole({ userId: user.id, role: "teacher", name: "Thandi", surname: "Mokoena" });

    const profile = await profileRow(user);

    expect(profile?.user_role).toBe("teacher");
    // Three letters of the surname, the first letter of the name, then digits.
    expect(profile?.username).toMatch(/^mokt\d{3,4}$/);
  });

  test("Test B - An existing username is kept", async () => {
    const user = await seedUser(null);

    // A unique username, so earlier runs' data can't clash with it, read back
    // in case make_username_unique adjusted it.
    const username = `keep-${crypto.randomUUID().slice(0, 8)}`;
    await admin.from("profiles").update({ username }).eq("id", user.id);
    const usernameBefore = (await profileRow(user))?.username;

    await signInAs(user);
    await chooseRole({ userId: user.id, role: "student", name: "Test", surname: "Student" });

    expect(usernameBefore).toBeTruthy();
    expect((await profileRow(user))?.username).toBe(usernameBefore);
  });

  test("Test C - Two people with the same name get different usernames", async () => {
    const metadata = { name: "Sipho", surname: "Dlamini" };
    const first = await seedUser(null, { metadata });
    const second = await seedUser(null, { metadata });

    for (const user of [first, second]) {
      await signInAs(user);
      await chooseRole({ userId: user.id, role: "student", name: "Sipho", surname: "Dlamini" });
    }

    const firstName = (await profileRow(first))?.username;
    const secondName = (await profileRow(second))?.username;

    expect(firstName).toMatch(/^dlas\d+$/);
    expect(secondName).toMatch(/^dlas\d+$/);
    expect(firstName).not.toBe(secondName);
  });

  test("Test D - A role can't be changed once it has been set", async () => {
    const user = await seedUser("student");

    await signInAs(user);
    const error = await chooseRole({
      userId: user.id,
      role: "teacher",
      name: "Test",
      surname: "Student",
    }).catch((caught: Error) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Your role could not be saved. Please try again.");
    expect(refusedBy(error)).toMatch(ROLE_GUARD_REFUSAL);

    expect((await profileRow(user))?.user_role).toBe("student");
  });

  test("Test E - A user can't make themselves an admin", async () => {
    const user = await seedUser(null);

    await signInAs(user);
    const error = await chooseRole({
      userId: user.id,
      role: "admin",
      name: "Test",
      surname: "Student",
    }).catch((caught: Error) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(refusedBy(error)).toMatch(ROLE_GUARD_REFUSAL);

    expect((await profileRow(user))?.user_role).toBeNull();
  });

  test("Test F - A user can't choose a role for someone else", async () => {
    const user = await seedUser(null);
    const otherUser = await seedUser(null);

    await signInAs(user);
    // RLS hides the other profile, so the call fails or changes nothing.
    await chooseRole({
      userId: otherUser.id,
      role: "teacher",
      name: "Test",
      surname: "Student",
    }).catch(() => undefined);

    expect((await profileRow(otherUser))?.user_role).toBeNull();
  });
});

// -- Deleting an account --------------------------------------------------------------

describe("Deleting an account", () => {
  test("Test A - The profile and the sign-in account are both deleted, and the user is signed out", async () => {
    const user = await seedUser("student");

    await signInAs(user);
    await deleteAccount(user.id);

    const { data: authUser } = await admin.auth.admin.getUserById(user.id);
    const { data: session } = await supabase.auth.getUser();

    expect(await profileRow(user)).toBeNull();
    expect(authUser.user).toBeNull();
    expect(session.user).toBeNull();
  });

  test("Test B - A student's enrolments, notifications and attempts go with them", async () => {
    const teacher = await seedUser("teacher");
    const student = await seedUser("student");
    const classroomId = await seedClassroom(teacher);
    const lessonId = await seedLesson(classroomId);
    await seedEnrolment(student, classroomId);

    await admin.from("notifications").insert({
      recipient_id: student.id,
      type: "new_lesson",
      title: "New lesson available",
    });
    await admin.from("lesson_attempts").insert({
      student_id: student.id,
      lesson_id: lessonId,
      score: 3,
      completed_at: new Date().toISOString(),
    });

    await signInAs(student);
    await deleteAccount(student.id);

    expect(await rowsFor("classroom_students", "student_id", student)).toBe(0);
    expect(await rowsFor("notifications", "recipient_id", student)).toBe(0);
    expect(await rowsFor("lesson_attempts", "student_id", student)).toBe(0);
  });

  test("Test C - A teacher's classrooms and lessons go with them", async () => {
    const teacher = await seedUser("teacher");
    const classroomId = await seedClassroom(teacher);
    await seedLesson(classroomId);

    await signInAs(teacher);
    await deleteAccount(teacher.id);

    const { count: lessonsLeft } = await admin
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("classroom_id", classroomId);

    expect(await rowsFor("classrooms", "teacher_id", teacher)).toBe(0);
    expect(lessonsLeft).toBe(0);
  });

  test("Test D - A user can't delete someone else's account", async () => {
    const user = await seedUser("student");
    const otherUser = await seedUser("student");

    await signInAs(user);
    // RLS doesn't raise an error for a refused delete; it deletes nothing.
    await deleteAccount(otherUser.id);

    const { data: otherAuthUser } = await admin.auth.admin.getUserById(otherUser.id);

    expect(await profileRow(otherUser)).not.toBeNull();
    expect(otherAuthUser.user).not.toBeNull();
  });
});
