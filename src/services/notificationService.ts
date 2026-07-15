import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  notification_id?: number;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read?: boolean;
  created_at?: string;
  read_at?: string | null;
}

export interface CreateNotificationInput {
  user_id: string;
  type: string;
  title: string;
  message: string;
}

/**
 * Create a new notification
 */
export const createNotification = async (data: CreateNotificationInput) => {
  const { data: notification, error } = await supabase
    .from("notifications")
    .insert({
      user_id: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      is_read: false,
    })
    .select()
    .single();

  if (error) throw error;
  return notification;
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (userId: string, limit = 20) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

/**
 * Get all notifications (for admin dashboard)
 */
export const getAllNotifications = async (limit = 20) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: number) => {
  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("notification_id", notificationId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string) => {
  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("is_read", false)
    .select();

  if (error) throw error;
  return data;
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: number) => {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("notification_id", notificationId);

  if (error) throw error;
};

/**
 * Get unread notification count for a user
 */
export const getUnreadNotificationCount = async (userId: string) => {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count || 0;
};

// Utility functions for creating common notification types

export const createDriverApprovalNotification = async (
  userId: string,
  driverName: string
) => {
  return createNotification({
    user_id: userId,
    type: "driver_approval",
    title: "Driver Verification Completed",
    message: `${driverName} has been verified and approved as a driver.`,
  });
};

export const createBookingNotification = async (
  userId: string,
  studentName: string,
  schoolName: string
) => {
  return createNotification({
    user_id: userId,
    type: "booking",
    title: "New Booking Request",
    message: `${studentName} has requested a ride to ${schoolName}.`,
  });
};

export const createPaymentNotification = async (
  userId: string,
  amount: number,
  routeInfo?: string
) => {
  return createNotification({
    user_id: userId,
    type: "payment",
    title: "Payment Received",
    message: `₹${amount.toLocaleString()} payment received${
      routeInfo ? ` for ${routeInfo}` : ""
    }.`,
  });
};

export const createSystemNotification = async (
  userId: string,
  title: string,
  message: string
) => {
  return createNotification({
    user_id: userId,
    type: "system",
    title,
    message,
  });
};
