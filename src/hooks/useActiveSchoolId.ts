import { useAuth } from "@/contexts/auth-context";
import { useModeratorSchoolContextOptional } from "@/contexts/moderator-school-context";

/**
 * Active school for school-scoped admin pages.
 * School admins: their single linked school.
 * Moderators: selected school from the switcher.
 */
export function useActiveSchoolId(): number | null {
  const { isSchoolAdmin, isModerator, linkedSchoolId } = useAuth();
  const modCtx = useModeratorSchoolContextOptional();

  if (isSchoolAdmin) {
    return linkedSchoolId;
  }

  if (isModerator) {
    return modCtx?.activeSchoolId ?? null;
  }

  return null;
}
