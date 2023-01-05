import {
  Accessor,
  Component,
  createComputed,
  createSignal,
  onMount,
} from "solid-js";
import { DevtoolsPanel } from "./Devtools";

export const SolidQueryDevtools: Component = () => {
  return (
    <>
      <DevtoolsPanel />
    </>
  );
};
