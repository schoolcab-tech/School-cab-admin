import { supabase } from "@/integrations/supabase/client";
import { useSimpleQuery } from "./useSimpleQuery";

type AnalyticsDateRange = {
  start: string;
  end: string;
};

const fetchAnalytics = async (dateRange?: AnalyticsDateRange) => {
  let query = supabase.from("payments").select("*");

  if (dateRange) {
    query = query
      .gte("payment_date", dateRange.start)
      .lte("payment_date", dateRange.end);
  }

  const { data, error } = await query.order("payment_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};

export function useAnalytics(dateRange?: AnalyticsDateRange) {
  return useSimpleQuery(
    () => fetchAnalytics(dateRange),
    [dateRange?.start, dateRange?.end]
  );
}
