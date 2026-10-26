// -----------------------------------------------------------------------------
// Profiles
//
// Reads people's names (the profiles table). Row-level security lets users read
// their own profile, and teachers read the profiles of students they teach.
//
// Every function throws a DataError when Supabase reports a problem.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";
import { DataError, friendlyMessage } from "./errors";

export type ProfileName = {
  name: string | null;
  surname: string | null;
};

export type StudentProfile = ProfileName & {
  id: string;
  username: string | null;
  user_role: string | null;
};

// Null when the profile does not exist yet.
export async function getProfileName(userId: string): Promise<ProfileName | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("name, surname")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new DataError("Your profile could not be loaded right now.", error);
  }

  return data as ProfileName | null;
}

export async function getStudentProfiles(studentIds: string[]): Promise<StudentProfile[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, surname, username, user_role")
    .in("id", studentIds);

  if (error) {
    throw new DataError("Student names could not be loaded right now.", error);
  }

  return data as StudentProfile[];
}

// The signed-in user's own profile, as the rest of the app sees it.
export type AccountProfile = {
  id: string;
  name: string;
  surname: string;
  user_role: string | null; // Null until the user picks a role on /select-role.
};

const ACCOUNT_COLUMNS = "id, name, surname, user_role";

// Null when the profile does not exist yet.
export async function getAccountProfile(userId: string): Promise<AccountProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(ACCOUNT_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new DataError(
      friendlyMessage(error, "Your profile could not be loaded right now. Please try again."),
      error,
    );
  }

  return data as AccountProfile | null;
}

// Throws a DataError whose isDuplicateError() is true if the row already exists.
export async function insertAccountProfile(
  userId: string,
  names: { name: string; surname: string },
): Promise<AccountProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, ...names })
    .select(ACCOUNT_COLUMNS)
    .single();

  if (error) {
    throw new DataError(
      friendlyMessage(
        error,
        "You're signed in, but your profile couldn't be set up. Please refresh the page to try again.",
      ),
      error,
    );
  }

  return data as AccountProfile;
}

export type StudentAccount = ProfileName & { username: string | null };

// The student's name and username, for their profile page. Null if missing.
export async function getStudentAccount(userId: string): Promise<StudentAccount | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("name, surname, username")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new DataError("Your profile could not be loaded right now.", error);
  }

  return data as StudentAccount | null;
}

export async function getUsername(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();

  if (error) {
    throw new DataError("Your profile could not be loaded right now.", error);
  }

  return data.username as string | null;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw new DataError("Usernames could not be checked right now.", error);
  }

  return data !== null;
}

export async function saveRole(userId: string, role: string, username: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ user_role: role, username })
    .eq("id", userId);

  if (error) {
    throw new DataError("Your role could not be saved. Please try again.", error);
  }
}

export async function deleteOwnProfile(userId: string): Promise<void> {
  const { error } = await supabase.from("profiles").delete().eq("id", userId);

  if (error) {
    throw new DataError("Your account could not be deleted. Please try again.", error);
  }
}
