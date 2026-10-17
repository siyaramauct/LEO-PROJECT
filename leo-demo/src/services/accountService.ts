// -----------------------------------------------------------------------------
// Account Service
//
// What happens around a user's account, step by step: making sure a signed-in
// user has a profile, choosing a role (which also gives a username), and
// deleting the account. AuthContext and the account pages call these instead
// of querying Supabase (see src/data).
// -----------------------------------------------------------------------------

import type { User } from "@supabase/supabase-js";
import { signOut } from "../data/auth";
import { DataError, errorMessage, isDuplicateError } from "../data/errors";
import {
  deleteOwnProfile,
  getAccountProfile,
  getUsername,
  insertAccountProfile,
  isUsernameTaken,
  saveRole,
  type AccountProfile,
} from "../data/profiles";

// -- Profile -----------------------------------------------------------------------

type ProfileResult = {
  profile: AccountProfile | null;
  error: string | null; // A readable message if the profile could not be loaded.
};

// Reads the user's profile, creating it if it doesn't exist yet. Never throws.
export async function loadOrCreateProfile(user: User): Promise<ProfileResult> {
  try {
    // 1. Normal case: the profile already exists.
    const existing = await getAccountProfile(user.id);

    if (existing) {
      return { profile: existing, error: null };
    }

    // 2. A first-time Google user may arrive before any database trigger has
    //    created their profile, so create it here.
    try {
      return { profile: await insertAccountProfile(user.id, profileNames(user)), error: null };
    } catch (insertError) {
      // 3. The row was created in the meantime (a race with the trigger), so
      //    read it again instead of failing.
      if (isDuplicateError(insertError)) {
        const created = await getAccountProfile(user.id);

        if (created) {
          return { profile: created, error: null };
        }
      }

      throw insertError;
    }
  } catch (profileError) {
    console.error("Failed to load profile:", profileError);
    return {
      profile: null,
      error: errorMessage(profileError, "Your profile could not be loaded."),
    };
  }
}

// Works out a first name and surname from whatever the sign-in provider sent.
// Google sends a full name plus given and family names; email signups send
// name and surname directly.
function profileNames(user: User) {
  const metadata = user.user_metadata;
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  const parts = fullName.split(/\s+/).filter(Boolean);
  const emailName = user.email?.split("@")[0] ?? "Learner";

  const suppliedFirstName =
    typeof metadata.given_name === "string"
      ? metadata.given_name.trim()
      : typeof metadata.first_name === "string"
        ? metadata.first_name.trim()
        : "";

  // Some providers put the whole name in given_name; keep only the first word then.
  const firstName =
    suppliedFirstName === fullName && parts.length > 1 ? parts[0] : suppliedFirstName;

  return {
    name: firstName || parts[0] || metadata.name || emailName,
    surname: metadata.surname || metadata.family_name || parts.slice(1).join(" ") || "",
  };
}

// -- Role -----------------------------------------------------------------------------

type ChooseRoleInput = {
  userId: string;
  role: string;
  name: string;
  surname: string;
};

export async function chooseRole({ userId, role, name, surname }: ChooseRoleInput) {
  // 1. Keep an existing username; otherwise generate a free one.
  const username = (await getUsername(userId)) ?? (await generateUsername(name, surname));

  // 2. Save the role and username together.
  await saveRole(userId, role, username);
}

// Three letters of the surname and the first letter of the name, then three
// random digits, e.g. "smij042". Tries up to 10 times to find a free one.
async function generateUsername(name: string, surname: string) {
  const prefix = usernamePrefix(name, surname);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const randomDigits = (crypto.getRandomValues(new Uint32Array(1))[0] % 1000)
      .toString()
      .padStart(3, "0");
    const candidate = `${prefix}${randomDigits}`;

    if (!(await isUsernameTaken(candidate))) {
      return candidate;
    }
  }

  throw new DataError("Could not generate a unique username. Please try again.");
}

function usernamePrefix(name: string, surname: string) {
  const surnamePart = surname
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toLowerCase()
    .padEnd(3, "x");

  const namePart =
    name
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 1)
      .toLowerCase() || "x";

  return `${surnamePart}${namePart}`;
}

// -- Deleting -----------------------------------------------------------------------------

// Deletes the profile row, then signs out. The sign-in account itself stays in
// Supabase Auth; removing that needs a server-side function.
export async function deleteAccount(userId: string): Promise<void> {
  await deleteOwnProfile(userId);
  await signOut();
}
