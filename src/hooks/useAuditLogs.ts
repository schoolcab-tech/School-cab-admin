import { useAuth } from "@/contexts/auth-context";
import {
  getAuditLogs,
  getAuditLogsForEntity,
  getRecentAuditLogs,
  getAuditLogsByAdmin,
  getAuditLogsByDateRange,
  getAuditLogStats,
  exportAuditLogsToCSV,
  type AuditLogFilter,
  type AuditLogWithDetails,
} from "@/services/auditLogService";
import { useSimpleQuery } from "./useSimpleQuery";

export const useAuditLogs = (filters?: AuditLogFilter) => {
  const { isMasterAdmin } = useAuth();

  return useSimpleQuery<AuditLogWithDetails[]>(
    () => getAuditLogs(filters),
    [JSON.stringify(filters)],
    { enabled: isMasterAdmin }
  );
};

export const useRecentAuditLogs = (limit?: number) => {
  const { isMasterAdmin } = useAuth();

  return useSimpleQuery<AuditLogWithDetails[]>(
    () => getRecentAuditLogs(limit),
    [limit],
    { enabled: isMasterAdmin }
  );
};

export const useEntityAuditLogs = (entityType: string, entityId: number) => {
  const { isMasterAdmin } = useAuth();

  return useSimpleQuery<AuditLogWithDetails[]>(
    () => getAuditLogsForEntity(entityType, entityId),
    [entityType, entityId],
    { enabled: isMasterAdmin && !!entityType && !!entityId }
  );
};

export const useAdminAuditLogs = (adminUserId: string) => {
  const { isMasterAdmin } = useAuth();

  return useSimpleQuery<AuditLogWithDetails[]>(
    () => getAuditLogsByAdmin(adminUserId),
    [adminUserId],
    { enabled: isMasterAdmin && !!adminUserId }
  );
};

export const useDateRangeAuditLogs = (startDate: string, endDate: string) => {
  const { isMasterAdmin } = useAuth();

  return useSimpleQuery<AuditLogWithDetails[]>(
    () => getAuditLogsByDateRange(startDate, endDate),
    [startDate, endDate],
    { enabled: isMasterAdmin && !!startDate && !!endDate }
  );
};

export const useAuditLogStats = (startDate?: string, endDate?: string) => {
  const { isMasterAdmin } = useAuth();

  return useSimpleQuery(
    () => getAuditLogStats(startDate, endDate),
    [startDate, endDate],
    { enabled: isMasterAdmin }
  );
};

export const useExportAuditLogs = (filters?: AuditLogFilter) => {
  const { isMasterAdmin } = useAuth();

  return useSimpleQuery<string>(
    () => exportAuditLogsToCSV(filters),
    [JSON.stringify(filters)],
    { enabled: false }
  );
};

export const downloadAuditLogsCSV = (csvContent: string, filename?: string) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    filename || `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
