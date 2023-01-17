import type { Query } from "@tanstack/solid-query";
import SuperJSON from "superjson";

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

export function getQueryStatusColorByLabel(label: IQueryStatusLabel) {
  return label === "fresh"
    ? "green"
    : label === "stale"
    ? "yellow"
    : label === "paused"
    ? "purple"
    : label === "inactive"
    ? "gray"
    : "blue";
}

/**
 * Displays a string regardless the type of the data
 * @param {unknown} value Value to be stringified
 * @param {boolean} beautify Formats json to multiline
 */
export const displayValue = (value: unknown, beautify: boolean = false) => {
  const { json } = SuperJSON.serialize(value);

  return JSON.stringify(json, null, beautify ? 2 : undefined);
};
