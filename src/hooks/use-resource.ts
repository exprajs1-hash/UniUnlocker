"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/client-api";

interface ResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/** Loads a JSON resource on mount and exposes `reload` and local `setData` for optimistic edits. */
export function useResource<T>(url: string) {
  const [state, setState] = useState<ResourceState<T>>({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    apiFetch<T>(url)
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (active) setState((current) => ({ ...current, error: errorMessage(error), loading: false }));
      });
    return () => {
      active = false;
    };
  }, [url, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const setData = useCallback((updater: (current: T | null) => T | null) => {
    setState((current) => ({ ...current, data: updater(current.data) }));
  }, []);

  return { ...state, reload, setData };
}
