"use client";
import { useCallback, useEffect, useState } from "react";
import { getIds } from "./collection-client";

export function useCollectionIds() {
  const [owned, setOwned] = useState<string[]>([]);
  const [wanted, setWanted] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    getIds("owned").then(setOwned);
    getIds("wanted").then(setWanted).finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("fl-collection", refresh);
    window.addEventListener("fl-auth", refresh);
    return () => {
      window.removeEventListener("fl-collection", refresh);
      window.removeEventListener("fl-auth", refresh);
    };
  }, [refresh]);

  return { owned, wanted, loaded };
}
