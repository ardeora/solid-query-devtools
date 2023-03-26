import { QueryClient, useQueryClient } from "@tanstack/solid-query";
import { createContext, useContext } from "solid-js";
export const DevtoolsQueryClientContext = createContext<QueryClient>(new QueryClient());
