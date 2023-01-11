import type { Query } from "@tanstack/solid-query";

export function getQueryStatusLabel(query: Query) {
  return query.state.fetchStatus === "fetching"
    ? "fetching"
    : !query.getObserversCount()
    ? "inactive"
    : query.state.fetchStatus === "paused"
    ? "paused"
    : query.isStale()
    ? "stale"
    : "fresh";
}

export const queryStatusLabels = ["fresh", "stale", "paused", "inactive", "fetching"] as const;
export type IQueryStatusLabel = typeof queryStatusLabels[number];

export function getQueryStatusColor({
  queryState,
  observerCount,
  isStale,
}: {
  queryState: Query["state"];
  observerCount: number;
  isStale: boolean;
}) {
  return queryState.fetchStatus === "fetching"
    ? "blue"
    : !observerCount
    ? "gray"
    : queryState.fetchStatus === "paused"
    ? "purple"
    : isStale
    ? "yellow"
    : "green";
}
