import { render } from "solid-js/web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import "./styles.css";
import App from "./App";

const queryClient = new QueryClient();

render(
	() => (
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	),
	document.getElementById("root")!
);
