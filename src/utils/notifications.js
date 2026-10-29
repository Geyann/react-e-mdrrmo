import { supabase } from "../createClient";

/**
 * Insert a row into public.notifications and refresh UI panels.
 *
 * @param {string} userId   - auth.users.id (uuid)
 * @param {string} title
 * @param {string} message
 * @param {"info"|"success"|"error"|"warning"} [type="info"]
 * @param {number|string|null} [relatedId=null]
 */
export async function createNotification(
  userId,
  title,
  message,
  type = "info",
  relatedId = null,
) {
  if (!userId) return;

  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      related_id: relatedId ?? null,
      is_read: false,
    });

    if (error) {
      console.error("[notif] insert failed:", error);
      return;
    }

    window.dispatchEvent(new Event("mdrrmo:notif-refresh"));
  } catch (err) {
    console.error("[notif] unexpected error:", err);
  }
}

/**
 * Convenience helpers for common lifecycle events.
 */
export async function notifyFiled(userId, formLabel, detail, relatedId = null) {
  return createNotification(
    userId,
    `${formLabel} Filed`,
    `Your ${formLabel.toLowerCase()} ${detail ? `(${detail}) ` : ""}has been submitted and is awaiting review.`,
    "info",
    relatedId,
  );
}

export async function notifyApproved(userId, formLabel, detail, relatedId = null) {
  return createNotification(
    userId,
    `${formLabel} Approved`,
    `Your ${formLabel.toLowerCase()} ${detail ? `(${detail}) ` : ""}has been approved.`,
    "success",
    relatedId,
  );
}

export async function notifyDeclined(
  userId,
  formLabel,
  detail,
  reason = null,
  relatedId = null,
) {
  const reasonText =
    reason && String(reason).trim()
      ? String(reason).trim()
      : "No reason provided.";

  return createNotification(
    userId,
    `${formLabel} Declined`,
    `Your ${formLabel.toLowerCase()} ${detail ? `(${detail}) ` : ""}has been declined.\n\nReason: ${reasonText}`,
    "error",
    relatedId,
  );
}