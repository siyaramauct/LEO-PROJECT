// -----------------------------------------------------------------------------
// Roles
//
// The two account types. Stored in profiles.user_role and checked by
// GuardRoute to decide which pages a user may open.
// -----------------------------------------------------------------------------

export const Role = {
  Student: "student",
  Teacher: "teacher",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
