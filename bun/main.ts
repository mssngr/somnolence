import { notate } from "notate";
import queryString from "query-string";
import tsj from "ts-json-schema-generator";

export type Handler<Input, Output> = (input: Input) => Output;
export type HandlerProp = { _handler: Handler<unknown, unknown> };
export type Route = HandlerProp & { [subroute: string]: Route };
export type Routes = Record<string, Route>;

function formatPath(path: string): string {
	// Take off leading and trailing slashes and replace remaining slashes with dots
	return path.replace(/^\//, "").replace(/\/$/, "").replace(/\//g, ".");
}

function findRoute({
	routes,
	path,
}: { routes: Routes; path: string }): Route | undefined {
	const formattedPath = formatPath(path);
	return notate(routes, formattedPath);
}

export function createSomnolenceServer<T extends Routes>({
	port = 3000,
	routes,
}: { port: number; routes: T }) {
	const formattedRoutes = Object.entries(routes).reduce<Routes>(
		(accum, [path, route]) => {
			const newAccum = Object.assign(accum, { [formatPath(path)]: route });
			return newAccum;
		},
		{} as Routes,
	);
	return {
		start() {
			console.info(`💤 Somnolence is running at http://localhost:${port}`);
			Bun.serve({
				port,
				async fetch(req) {
					try {
						const url = new URL(req.url);
						if (url.pathname === "/__types") {
							const jsonSchema = tsj
								.createGenerator({
									path: "./main",
									tsconfig: "./tsconfig.json",
									type: "*",
								})
								.createSchema("Routes");
							return Response.json(jsonSchema);
						}
						const route = findRoute({
							routes: formattedRoutes,
							path: url.pathname,
						});
						if (route?._handler) {
							const queryParams = queryString.parse(
								url.searchParams.toString(),
								{
									parseBooleans: true,
									parseNumbers: true,
									arrayFormat: "comma",
								},
							);
							const body = req.body && (await req.json());
							const input = { ...queryParams, ...(body || {}) };
							const output = route._handler(input);
							return Response.json({ output });
						}
						return new Response("Not Found", { status: 404 });
					} catch (err) {
						const error = err as Error;
						console.error(error);
						return new Response(error.message, { status: 500 });
					}
				},
			});
		},
	};
}
