import { createQuery } from "@tanstack/solid-query";
import { Component, createEffect, Match, Switch } from "solid-js";
import { SolidQueryDevtools } from "../src";

const App: Component = () => {
  const res = createQuery(() => ({
    queryKey: ["test", "hello"],
    queryFn: () => {
      return new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve("hello world");
        }, 2000);
      });
    },
  }));
  return (
    <>
      <Switch>
        <Match when={res.isLoading}>
          <h1>loading</h1>
        </Match>
        <Match when={res.data}>
          <h1>{res.data}</h1>
        </Match>
      </Switch>
      <SolidQueryDevtools />
    </>
  );
};

export default App;
