// -----------------------------------------------------------------------------
// Notifications
//
// Writes and reads the notifications table. The NotificationBell component
// shows the recipient's notifications and listens for new ones in real time.
//
// Sending and marking as read are best effort: a failure is logged but never
// stops the action that triggered it (creating a lesson, sharing a material,
// and so on). Reading throws a DataError.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";
import { DataError } from "./errors";

type NotificationInput = {
  recipient_id: string;
  type: string;
  title: string;
  body?: string | null;
  link_url?: string | null; // In-app path opened when the notification is clicked.
};

export async function notifyUsers(notifications: NotificationInput[]) {
  if (!notifications.length) return;

  const { error } = await supabase.from("notifications").insert(notifications);
  if (error) console.error("Error creating notifications:", error);
}

export async function notifyUser(notification: NotificationInput) {
  await notifyUsers([notification]);
}

// Sends the same notification to every student enrolled in a classroom.
export async function notifyClassroomStudents(
  classroomId: string,
  notification: Omit<NotificationInput, "recipient_id">,
) {
  const { data: students, error } = await supabase
    .from("classroom_students")
    .select("student_id")
    .eq("classroom_id", classroomId);

  if (error) {
    console.error("Error loading classroom students for notifications:", error);
    return;
  }

  await notifyUsers(
    (students ?? []).map((student) => ({
      ...notification,
      recipient_id: student.student_id,
    })),
  );
}

export type NotificationRow = {
  notification_id: number;
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

// The user's newest notifications.
export async function getNotifications(userId: string, limit: number): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("notification_id, type, title, body, link_url, is_read, created_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new DataError("Notifications could not be loaded right now.", error);
  }

  return data as NotificationRow[];
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("notification_id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new DataError("The unread notification count could not be loaded.", error);
  }

  return count ?? 0;
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("notification_id", notificationId);

  if (error) {
    console.error("Error marking notification as read:", error);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("Error marking all notifications as read:", error);
  }
}

// Calls onInsert whenever a notification arrives for the user. channelKey must
// be unique per listener: the phone and desktop headers both render a bell for
// the same user, and reusing a channel name makes supabase-js hand back an
// already-subscribed channel, which throws. Returns a function that stops it.
export function listenForNotifications(
  userId: string,
  channelKey: string,
  onInsert: () => void,
): () => void {
  const channel = supabase
    .channel(`notifications:${userId}:${channelKey}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${userId}`,
      },
      onInsert,
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
