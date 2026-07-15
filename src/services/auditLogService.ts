import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
type AuditLogInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];
type AppRole = Database["public"]["Enums"]["app_role"];

export type AuditLogFilter = {
  adminUserId?: string;
  actionType?: string;
  entityType?: string;
  entityId?: number;
  startDate?: string;
  endDate?: string;
};

export type AuditLogWithDetails = AuditLog & {
  admin_email?: string;
  admin_name?: string;
};

/**
 * Create an audit log entry
 */
export const createAuditLog = async (
  adminUserId: string,
  adminRole: AppRole,
  actionType: string,
  entityType: string,
  entityId?: number | null,
  oldValue?: Record<string, any> | null,
  newValue?: Record<string, any> | null,
  notes?: string | null
): Promise<AuditLog> => {
  const logData: AuditLogInsert = {
    admin_user_id: adminUserId,
    admin_role: adminRole,
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId || null,
    old_value: oldValue || null,
    new_value: newValue || null,
    notes: notes || null,
  };

  const { data, error } = await supabase
    .from("audit_logs")
    .insert(logData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get audit logs with optional filters
 */
export const getAuditLogs = async (
  filters?: AuditLogFilter
): Promise<AuditLogWithDetails[]> => {
  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.adminUserId) {
    query = query.eq("admin_user_id", filters.adminUserId);
  }

  if (filters?.actionType) {
    query = query.eq("action_type", filters.actionType);
  }

  if (filters?.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }

  if (filters?.entityId) {
    query = query.eq("entity_id", filters.entityId);
  }

  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Fetch admin user details for each log
  const logsWithDetails = await Promise.all(
    data.map(async (log) => {
      const { data: userData } = await supabase.auth.admin.getUserById(
        log.admin_user_id
      );

      return {
        ...log,
        admin_email: userData.user?.email,
        admin_name: userData.user?.user_metadata?.name || "Unknown",
      };
    })
  );

  return logsWithDetails;
};

/**
 * Get audit logs for a specific entity (e.g., all logs for a specific driver)
 */
export const getAuditLogsForEntity = async (
  entityType: string,
  entityId: number
): Promise<AuditLogWithDetails[]> => {
  return getAuditLogs({ entityType, entityId });
};

/**
 * Get recent audit logs (last 100 by default)
 */
export const getRecentAuditLogs = async (
  limit: number = 100
): Promise<AuditLogWithDetails[]> => {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Fetch admin user details for each log
  const logsWithDetails = await Promise.all(
    data.map(async (log) => {
      const { data: userData } = await supabase.auth.admin.getUserById(
        log.admin_user_id
      );

      return {
        ...log,
        admin_email: userData.user?.email,
        admin_name: userData.user?.user_metadata?.name || "Unknown",
      };
    })
  );

  return logsWithDetails;
};

/**
 * Get audit logs by admin user
 */
export const getAuditLogsByAdmin = async (
  adminUserId: string
): Promise<AuditLogWithDetails[]> => {
  return getAuditLogs({ adminUserId });
};

/**
 * Get audit logs by date range
 */
export const getAuditLogsByDateRange = async (
  startDate: string,
  endDate: string
): Promise<AuditLogWithDetails[]> => {
  return getAuditLogs({ startDate, endDate });
};

/**
 * Get audit log statistics
 */
export const getAuditLogStats = async (
  startDate?: string,
  endDate?: string
): Promise<{
  total_actions: number;
  actions_by_type: Record<string, number>;
  actions_by_entity: Record<string, number>;
  most_active_admins: Array<{ admin_user_id: string; count: number }>;
}> => {
  let query = supabase.from("audit_logs").select("*");

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Calculate statistics
  const total_actions = data.length;

  const actions_by_type: Record<string, number> = {};
  const actions_by_entity: Record<string, number> = {};
  const admin_action_counts: Record<string, number> = {};

  data.forEach((log) => {
    // Count by action type
    actions_by_type[log.action_type] =
      (actions_by_type[log.action_type] || 0) + 1;

    // Count by entity type
    actions_by_entity[log.entity_type] =
      (actions_by_entity[log.entity_type] || 0) + 1;

    // Count by admin user
    admin_action_counts[log.admin_user_id] =
      (admin_action_counts[log.admin_user_id] || 0) + 1;
  });

  // Get top 10 most active admins
  const most_active_admins = Object.entries(admin_action_counts)
    .map(([admin_user_id, count]) => ({ admin_user_id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total_actions,
    actions_by_type,
    actions_by_entity,
    most_active_admins,
  };
};

/**
 * Export audit logs to CSV format
 */
export const exportAuditLogsToCSV = async (
  filters?: AuditLogFilter
): Promise<string> => {
  const logs = await getAuditLogs(filters);

  // CSV headers
  const headers = [
    "Timestamp",
    "Admin User ID",
    "Admin Email",
    "Admin Role",
    "Action Type",
    "Entity Type",
    "Entity ID",
    "Old Value",
    "New Value",
    "Notes",
    "IP Address",
    "User Agent",
  ];

  // Convert logs to CSV rows
  const rows = logs.map((log) => [
    log.created_at,
    log.admin_user_id,
    log.admin_email || "",
    log.admin_role,
    log.action_type,
    log.entity_type,
    log.entity_id?.toString() || "",
    JSON.stringify(log.old_value || ""),
    JSON.stringify(log.new_value || ""),
    log.notes || "",
    log.ip_address?.toString() || "",
    log.user_agent || "",
  ]);

  // Build CSV string
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return csvContent;
};
