import { Key } from "@solid-primitives/keyed";
import { createQuery, createQueries } from "@tanstack/solid-query";
import {
	Component,
	createEffect,
	createSignal,
	ErrorBoundary,
	Match,
	Show,
	Suspense,
	Switch,
} from "solid-js";
import { reconcile } from "solid-js/store";
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
let count = 0;

const App: Component = () => {
	const [showMore, setShowMore] = createSignal(false);

	// const query = createQuery(() => ({
	//   queryKey: ["pikachu"],
	//   queryFn: async () => {
	//     count++;
	//     const res = await fetch("https://pokeapi.co/api/v2/pokemon/" + count);
	//     return res.json();
	//   },
	//   // refetchInterval: 2000,
	//   // structuralSharing(oldData, newData) {
	//   //   return reconcile(newData)(oldData);
	//   // },
	// }));

	for (let i = 0; i < 1; i++) {
		const query = createQuery(() => ({
			queryKey: ["pokemon", 1],
			queryFn: async () => {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				return {
					count: 1,
				};
			},
			refetchInterval: 2000,
		}));
	}

	// const queries = createQueries(() => ({
	//   queries: Array.from(Array(80).keys()).map((i) => ({
	//     queryKey: ["pokemon", i + 1],
	//     queryFn: async () => {
	//       const res = await fetch("https://pokeapi.co/api/v2/pokemon/" + (i + 1));
	//       return res.json();
	//     },
	//   })),
	// }));

	// createEffect(() => {
	//   if (!query.data) return;
	//   console.log("query", { ...query });
	// });

	// createEffect(() => {
	//   if (!query.data) return;
	//   console.log("query Data", query.data);
	// });

	const query2 = createQuery(() => ({
		queryKey: ["set"],
		queryFn: async () => {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			const set = new Set();
			set.add("a");
			set.add("b");
			set.add("c");
			return set;
		},
		// staleTime: 10000,
		// refetchInterval: 2000,
	}));

	const query3 = createQuery(() => ({
		queryKey: ["map"],
		queryFn: async () => {
			// const map = new Map();
			// map.set("a", "apple");
			// map.set("b", "banana");
			// map.set("c", "carrot");
			// map.set("d", "dog");
			// map.set("e", "elephant");
			// map.set("f", "fish");

			// const map2 = new Map();
			// map2.set("a", "apple");
			// map2.set("b", "banana");
			// map2.set("c", "carrot");
			// map2.set("d", "dog");

			// map.set("g", map2);

			// return map;
			return new Promise((resolve) =>
				setTimeout(() => resolve("hello"), 100)
			);
		},
	}));

	const query4 = createQuery(() => ({
		queryKey: ["string"],
		queryFn: async () => {
			return "Hello World" + Math.floor(Math.random() * 100);
		},
	}));

	const query5 = createQuery(() => ({
		queryKey: ["array"],
		queryFn: async () => {
			// Fetch users from an API
			await new Promise((resolve) => setTimeout(resolve, 2000));
			const res = await fetch(
				"https://jsonplaceholder.typicode.com/users"
			);
			const obj = await res.json();
			obj.map((user: any) => {
				user.name += Math.floor(Math.random() * 100);
			});
			return obj;
		},

		// select(data) {
		//   const newData = data.map((user: any) => ({
		//     id: user.id,
		//     username: user.username,
		//     email: user.email,
		//     name: user.name,
		//   }));
		//   return newData;
		// },
	}));

	// createEffect(() => {
	//   console.log(query5.data?.[0]?.name);
	// });

	const query6 = createQuery(() => ({
		queryKey: ["array_flat"],
		queryFn: async () => {
			return ["a", "b", "c", "d", "e", "f"];
		},
	}));

	const query7 = createQuery(() => ({
		queryKey: ["array_big"],
		queryFn: async () => {
			return Array.from(Array(1000).keys()).map((i) => ({
				id: i,
				name: companies[i % companies.length],
			}));
		},
	}));

	return (
		<>
			<button onClick={() => setShowMore(!showMore())}>Show More</button>

			<ErrorBoundary fallback={<div>Error</div>}>
				<Show when={showMore()}>
					<MoreQueries />
				</Show>
				<Show when={query5.isError}>
					<div>Error</div>
				</Show>
				<Show when={query5.data}>
					<pre></pre>
				</Show>
			</ErrorBoundary>
			<SolidQueryDevtools />
		</>
	);
};

const MoreQueries = () => {
	for (let i = 0; i < 10; i++) {
		const query = createQuery(() => ({
			queryKey: ["pokemons", i + 1],
			queryFn: async () => {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				return {
					count: 1,
				};
			},
			throwErrors: true,
		}));
	}

	return (
		<div>
			<h1>More Queries</h1>
		</div>
	);
};

export default App;
