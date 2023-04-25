import { QueryClient, useQueryClient } from "@tanstack/solid-query";
import { Component, createMemo, createSignal, DEV } from "solid-js";
import { isServer } from "solid-js/web";
import { DevtoolsQueryClientContext } from "./Context";
import { DevtoolsPanel } from "./Devtools";
import clientOnly from "./clientOnly";

export interface SolidQueryDevtoolsProps {
	queryClient?: QueryClient;
}

export const SolidQueryDevtools = clientOnly(() => import("./Devtools"));
