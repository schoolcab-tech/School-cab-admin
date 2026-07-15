import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import { format } from "date-fns";
import { AlertCircle, DollarSign, Loader2 } from "lucide-react";
import { useState } from "react";

interface WithdrawalFromDB {
  withdrawal_id: number;
  driver_id: number;
  amount: number;
  status: string; // pending, completed, rejected
  request_date: string;
  processed_date: string | null;
  transaction_id: string | null;
  school_id: number | null;
  notes: string | null;
}

interface School {
  school_id: number;
  name: string;
}

interface Withdrawal {
  withdrawal_id: number;
  amount: number;
  status: "pending" | "completed" | "rejected";
  request_date: string;
  processed_date: string | null;
  transaction_id: string | null;
  school_name: string;
}

export function DriverWithdrawalHistory({ driverId }: { driverId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    data: withdrawals,
    isLoading,
    error,
  } = useSimpleQuery<Withdrawal[]>(
    async () => {
      try {
        const { data, error } = await supabase
          .from("driver_withdrawals")
          .select("*")
          .eq("driver_id", parseInt(driverId))
          .order("request_date", { ascending: false });

        if (error) throw error;
        if (!data) return [];
        const withdrawalsData = data as any[];

        const schoolIds = withdrawalsData
          .map((w) => (w.school_id !== null ? String(w.school_id) : null))
          .filter((id): id is string => id !== null);

        const { data: schoolsData, error: schoolsErr } = schoolIds.length
          ? await supabase
              .from("schools")
              .select("school_id, name")
              .in("school_id", schoolIds as any)
          : { data: [], error: null };

        if (schoolsErr) throw schoolsErr;
        const schools = (schoolsData as any[]) || [];
        const schoolMap = new Map<string, string>();
        schools.forEach((s) => schoolMap.set(String(s.school_id), s.name));

        return withdrawalsData.map((w) => ({
          withdrawal_id: w.withdrawal_id,
          amount: w.amount || 0,
          status:
            (w.status as "pending" | "completed" | "rejected") || "pending",
          request_date: w.request_date,
          processed_date: w.processed_date,
          transaction_id: w.transaction_id,
          school_name: w.school_id
            ? schoolMap.get(String(w.school_id)) || "N/A"
            : "N/A",
        }));
      } catch (err) {
        console.error("Error fetching withdrawals:", err);
        toast({
          title: "Error",
          description: "Failed to load withdrawals",
          variant: "destructive",
        });
        throw err;
      }
    },
    [driverId],
    { enabled: isOpen }
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-2">
          <DollarSign className="h-4 w-4 mr-2" />
          View Withdrawals
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Withdrawal History</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <p>Error loading withdrawals</p>
            </div>
          </div>
        ) : !withdrawals || withdrawals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No withdrawals found
          </div>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Withdrawal ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>School</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((w) => (
                  <TableRow key={w.withdrawal_id}>
                    <TableCell>
                      {format(new Date(w.request_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {String(w.withdrawal_id).slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(w.amount)}
                    </TableCell>
                    <TableCell>{statusBadge(w.status)}</TableCell>
                    <TableCell>{w.school_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
