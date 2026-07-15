import { useCallback, useEffect, useRef, useState } from "react";

interface SimpleQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
  requestTimeout?: number; // ms, defaults to 30000
}

interface SimpleQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Normalize an unknown error into a real Error.
// Supabase PostgrestError + StorageError are plain objects with a `.message`
// string field — `err instanceof Error` is false for them, so the previous
// `String(err)` fallback produced "[object Object]". Pull .message first.
function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const message =
      (typeof obj.message === "string" && obj.message) ||
      (typeof obj.details === "string" && obj.details) ||
      (typeof obj.hint === "string" && obj.hint) ||
      "Unknown error";
    const wrapped = new Error(message);
    Object.assign(wrapped, obj);
    return wrapped;
  }
  return new Error(String(err));
}

export function useSimpleQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[] = [],
  options?: SimpleQueryOptions
): SimpleQueryResult<T> {
  const { enabled = true, refetchInterval, requestTimeout = 30000 } = options ?? {};
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;
  // Each new fetch increments this counter; stale in-flight requests
  // see their id no longer matches and skip state updates.
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await Promise.race([
        queryFnRef.current(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), requestTimeout)
        ),
      ]);
      if (id === fetchIdRef.current) {
        setData(result);
      }
    } catch (err) {
      if (id === fetchIdRef.current) {
        const wrappedError = toError(err);
        // eslint-disable-next-line no-console
        console.error("useSimpleQuery error:", wrappedError.message, err);
        setError(wrappedError);
      }
    } finally {
      if (id === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (enabled) {
      fetchData();
    } else {
      setIsLoading(false);
    }
    // On cleanup (deps change or unmount), invalidate any in-flight request
    return () => {
      fetchIdRef.current++;
    };
  }, [enabled, fetchData]);

  // Auto-refetch interval
  useEffect(() => {
    if (!enabled || !refetchInterval) return;
    const id = setInterval(() => {
      fetchData();
    }, refetchInterval);
    return () => clearInterval(id);
  }, [enabled, refetchInterval, fetchData]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch };
}
