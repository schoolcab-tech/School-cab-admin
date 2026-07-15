import {
  createBookingNotification,
  createDriverApprovalNotification,
  createPaymentNotification,
  createSystemNotification,
} from "./notificationService";

/**
 * Utility function to create sample notifications for testing
 * Call this function once to populate your notifications table with sample data
 */
export const createSampleNotifications = async (adminUserId: string) => {
  try {
    // Create various types of notifications
    await createDriverApprovalNotification(adminUserId, "Anil Sharma");
    await createBookingNotification(adminUserId, "Rahul Kumar", "DPS School");
    await createPaymentNotification(adminUserId, 2500, "Route ABC123");
    await createSystemNotification(
      adminUserId,
      "System Maintenance",
      "Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM"
    );
    await createDriverApprovalNotification(adminUserId, "Suresh Gupta");
    await createBookingNotification(
      adminUserId,
      "Priya Sharma",
      "St. Mary's School"
    );
    await createPaymentNotification(adminUserId, 1800, "Route XYZ456");

    console.log("Sample notifications created successfully!");
    return true;
  } catch (error) {
    console.error("Error creating sample notifications:", error);
    return false;
  }
};

/**
 * Get current authenticated user ID
 */
export const getCurrentUserId = async () => {
  const { supabase } = await import("@/integrations/supabase/client");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
};

/**
 * Create sample notifications for the current user
 */
export const createSampleNotificationsForCurrentUser = async () => {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.error("No authenticated user found");
    return false;
  }

  return await createSampleNotifications(userId);
};
