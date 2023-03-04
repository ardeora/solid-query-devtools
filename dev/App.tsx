import { createQuery, createQueries } from "@tanstack/solid-query";
import { Component, createEffect, Match, Switch } from "solid-js";
import { SolidQueryDevtools } from "../src";

const companies = [
  "Catalog",
  "Capsule",
  "Hourglass",
  "Pillar",
  "Layers",
  "Cubes",
  "Quotient",
  "Sisyphus",
  "Circles",
  "Squares",
  "Triangles",
];

const App: Component = () => {
  const res2 = createQuery(() => ({
    queryKey: [
      "users",
      {
        page: 1,
        limit: 100,
      },
    ],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return fetch("https://62b01cd2b0a980a2ef4a699c.mockapi.io/v1/users").then((res) =>
        res.json(),
      );
    },
    refetchInterval: 1500,
  }));

  const bwl = createQuery(() => ({
    queryKey: ["active_now"],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "yolo";
    },
    staleTime: 1000000,
  }));

  const bl = createQuery(() => ({
    queryKey: ["customers"],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "yolo";
    },
  }));

  const res = createQueries(() => ({
    queries: companies.map((company) => ({
      queryKey: ["company_profile", company.toLowerCase()],
      queryFn: async () => {
        return "yolo";
      },
    })),
  }));

  return (
    <>
      <div class="yolo"></div>
      <SolidQueryDevtools />
    </>
  );
};

export default App;
