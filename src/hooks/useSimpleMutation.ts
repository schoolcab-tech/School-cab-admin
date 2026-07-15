import { useCallback, useRef, useState } from "react";

interface SimpleMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  onError?: (error: Error, variables: TVariables) => void;
}

interface MutateCallbacks<TData> {
  onSuccess?: (data: TData) => void | Promise<void>;
  onError?: (error: Error) => void;
}

interface SimpleMutationResult<TData, TVariables> {
  mutate: (variables: TVariables, callbacks?: MutateCallbacks<TData>) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isPending: boolean;
  error: Error | null;
  reset: () => void;
}

export function useSimpleMutation<TData = unknown, TVariables = void>(
  options: SimpleMutationOptions<TData, TVariables>
): SimpleMutationResult<TData, TVariables> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Normalize errors into a real Error.
  // Supabase PostgrestError (and many other API errors) are plain objects with
  // a `.message` string field — `err instanceof Error` is false for them, so
  // `String(err)` falls back to "[object Object]". Extract `.message` first.
  const toError = (err: unknown): Error => {
    if (err instanceof Error) return err;
    if (err && typeof err === "object") {
      const obj = err as Record<string, unknown>;
      const message =
        (typeof obj.message === "string" && obj.message) ||
        (typeof obj.details === "string" && obj.details) ||
        (typeof obj.hint === "string" && obj.hint) ||
        "Unknown error";
      const wrapped = new Error(message);
      // Preserve original fields for callers that read them
      Object.assign(wrapped, obj);
      return wrapped;
    }
    return new Error(String(err));
  };

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsPending(true);
      setError(null);
      try {
        const result = await optionsRef.current.mutationFn(variables);
        await optionsRef.current.onSuccess?.(result, variables);
        return result;
      } catch (err) {
        const error = toError(err);
        setError(error);
        optionsRef.current.onError?.(error, variables);
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  const mutate = useCallback(
    (variables: TVariables, callbacks?: MutateCallbacks<TData>) => {
      mutateAsync(variables)
        .then((data) => {
          callbacks?.onSuccess?.(data);
        })
        .catch((err) => {
          callbacks?.onError?.(toError(err));
        });
    },
    [mutateAsync]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsPending(false);
  }, []);

  return { mutate, mutateAsync, isPending, error, reset };
}
