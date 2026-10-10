// -----------------------------------------------------------------------------
// Notifications
//
// Writes rows to the notifications table. The NotificationBell component
// listens for new rows in real time and shows them to the recipient.
//
// Sending is best effort: a failure is logged but never stops the action that
// triggered it (creating a lesson, sharing a material, and so on).
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";

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
