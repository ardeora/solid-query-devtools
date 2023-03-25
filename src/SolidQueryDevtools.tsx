import { QueryClient, useQueryClient } from "@tanstack/solid-query";
import { Component, createMemo } from "solid-js";
import { DevtoolsQueryClientContext } from "./Context";
import { DevtoolsPanel } from "./Devtools";

interface SolidQueryDevtoolsProps {
  queryClient?: QueryClient;
}

export const SolidQueryDevtools: Component<SolidQueryDevtoolsProps> = (props) => {
  const client = createMemo(() => props.queryClient || useQueryClient());

  return (
    <DevtoolsQueryClientContext.Provider value={client()}>
      <DevtoolsPanel />
    </DevtoolsQueryClientContext.Provider>
  );
};
