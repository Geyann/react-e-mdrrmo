// src/utils/notifications.js
import { supabase } from "../createClient";

/**
 * Only columns that actually exist on public.notifications:
 *   user_id, title, message, type, is_read, related_id
 * (created_at has a default)
 */
export async function createNotification(
  userId,
  title,
  message,
  type = "info",
  relatedId = null,
) {
  if (!userId) {
    console.warn("[notif] skipped: no userId");
    return false;
  }

  // Strict whitelist – nothing else is ever sent
  const payload = {
    user_id: String(userId),
    title: String(title || "Notification").slice(0, 200),
    message: String(message || "").slice(0, 1000),
    type: ["info", "success", "error", "warning"].includes(type)
      ? type
      : "info",
    is_read: false,
  };

  if (relatedId != null && relatedId !== "") {
    const n = Number(relatedId);
    if (!Number.isNaN(n)) {
      payload.related_id = n;
    }
  }

  // Debug – look at the Network tab / console to confirm the body
  console.log("[notif] inserting payload:", JSON.stringify(payload));

  const { data, error } = await supabase
    .from("notifications")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("[notif] insert failed:", error.message, error);
    return false;
  }

  console.log("[notif] inserted id:", data?.id);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mdrrmo:notif-refresh"));
    window.dispatchEvent(new Event("mdrrmo:badge-refresh"));
  }

  return true;
}

export async function notifyFiled(userId, formLabel, detail = null, relatedId = null) {
  return createNotification(
    userId,
    `${formLabel} Filed`,
    `Your ${formLabel.toLowerCase()}${detail ? ` (${detail})` : ""} has been submitted and is awaiting review.`,
    "info",
    relatedId,
  );
}

export async function notifyApproved(userId, formLabel, detail = null, relatedId = null) {
  return createNotification(
    userId,
    `${formLabel} Approved`,
    `Your ${formLabel.toLowerCase()}${detail ? ` (${detail})` : ""} has been approved.`,
    "success",
    relatedId,
  );
}

export async function notifyDeclined(
  userId,
  formLabel,
  detail = null,
  reason = null,
  relatedId = null,
) {
  const reasonText = reason ? ` Reason: ${reason}` : "";
  return createNotification(
    userId,
    `${formLabel} Declined`,
    `Your ${formLabel.toLowerCase()}${detail ? ` (${detail})` : ""} was declined.${reasonText}`,
    "error",
    relatedId,
  );
}

export async function notifyUnderReview(userId, formLabel, detail = null, relatedId = null) {
  return createNotification(
    userId,
    `${formLabel} Under Review`,
    `Your ${formLabel.toLowerCase()}${detail ? ` (${detail})` : ""} is now under review by MDRRMO staff.`,
    "info",
    relatedId,
  );
}

export async function notifyResolved(userId, formLabel, detail = null, relatedId = null) {
  return createNotification(
    userId,
    `${formLabel} Resolved`,
    `Your ${formLabel.toLowerCase()}${detail ? ` (${detail})` : ""} has been marked as resolved.`,
    "success",
    relatedId,
  );
}