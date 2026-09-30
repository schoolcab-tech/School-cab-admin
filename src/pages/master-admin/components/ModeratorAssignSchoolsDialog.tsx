import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignSchoolToModerator } from "@/hooks/useModerators";
import { useSchools } from "@/hooks/useSchools";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ModeratorWithSchoolCount } from "@/services/moderatorService";

interface Props {
  moderator: ModeratorWithSchoolCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function ModeratorAssignSchoolsDialog({
  moderator,
  open,
  onOpenChange,
  onUpdated,
}: Props) {
  const { data: schoolsResult, refetch: refetchSchools } = useSchools({
    limit: 5000,
    page: 1,
  } as any);
  const schools: any[] = (schoolsResult as any)?.data ?? [];
  const assignMutation = useAssignSchoolToModerator();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");

  useEffect(() => {
    if (!open) setSelectedSchoolId("");
  }, [open]);

  const handleAssign = async () => {
    if (!moderator || !selectedSchoolId) return;
    try {
      await assignMutation.mutateAsync({
        schoolId: parseInt(selectedSchoolId, 10),
        moderatorId: moderator.moderator_id,
      });
      toast.success("School assigned to moderator");
      setSelectedSchoolId("");
      refetchSchools();
      onUpdated?.();
    } catch (e: any) {
      toast.error("Failed to assign school: " + e.message);
    }
  };

  const handleUnassign = async (schoolId: number) => {
    try {
      await assignMutation.mutateAsync({ schoolId, moderatorId: null });
      toast.success("School returned to platform (unassigned)");
      refetchSchools();
      onUpdated?.();
    } catch (e: any) {
      toast.error("Failed to unassign: " + e.message);
    }
  };

  const ownedSchools = schools.filter((s) => s.moderatorId === moderator?.moderator_id);
  const unassignedSchools = schools.filter((s) => !s.moderatorId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign schools</DialogTitle>
          <DialogDescription>
            {moderator
              ? `Map schools to ${moderator.contact_person}. Moving a school from another moderator reassigns it.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select school to assign" />
              </SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                    {s.moderatorId && s.moderatorId !== moderator?.moderator_id
                      ? " (owned by another moderator)"
                      : s.moderatorId
                        ? " (already yours)"
                        : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssign}
              disabled={!selectedSchoolId || assignMutation.isPending}
            >
              {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Currently assigned ({ownedSchools.length})</p>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {ownedSchools.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                >
                  <span>{s.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleUnassign(parseInt(s.id, 10))}
                    disabled={assignMutation.isPending}
                  >
                    Unassign
                  </Button>
                </li>
              ))}
              {ownedSchools.length === 0 && (
                <li className="text-sm text-muted-foreground">No schools assigned yet.</li>
              )}
            </ul>
          </div>

          {unassignedSchools.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {unassignedSchools.length} unassigned school(s) on the platform.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
