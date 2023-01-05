import { createQuery } from "@tanstack/solid-query";
import { Component, createEffect, Match, Switch } from "solid-js";
import { SolidQueryDevtools } from "../src";

const App: Component = () => {
  const res = createQuery(() => ({
    queryKey: ["test", "hello"],
    queryFn: () => "hello",
  }));
  createEffect(() => console.log(res));
  return (
    <>
      <SolidQueryDevtools />
      <Switch>
        <Match when={res.isLoading}>
          <h1>loading</h1>
        </Match>
        <Match when={res.data}>
          <h1>{res.data}</h1>
        </Match>
      </Switch>
    </>
  );
};

export default App;
