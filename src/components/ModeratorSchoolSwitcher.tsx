import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useModeratorSchoolContext } from "@/contexts/moderator-school-context";
import { useModeratorSchools } from "@/hooks/useModerators";
import { GraduationCap, Loader2 } from "lucide-react";

export function ModeratorSchoolSwitcher() {
  const { isModerator, moderatorId } = useAuth();
  const { activeSchoolId, setActiveSchoolId, isLoadingSchools } =
    useModeratorSchoolContext();
  const { data: schools = [] } = useModeratorSchools(isModerator ? moderatorId : null);

  if (!isModerator) return null;

  if (isLoadingSchools) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading schools…
      </div>
    );
  }

  if (schools.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">No schools yet — add one from Schools</span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <GraduationCap className="h-4 w-4 text-muted-foreground hidden sm:block" />
      <Select
        value={activeSchoolId != null ? String(activeSchoolId) : undefined}
        onValueChange={(v) => setActiveSchoolId(parseInt(v, 10))}
      >
        <SelectTrigger className="w-[200px] md:w-[280px] h-9">
          <SelectValue placeholder="Select school" />
        </SelectTrigger>
        <SelectContent>
          {schools.map((s: { school_id: number; name: string }) => (
            <SelectItem key={s.school_id} value={String(s.school_id)}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
