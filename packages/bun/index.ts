import { notate } from 'notate'
import queryString from 'query-string'
import tsj from 'ts-json-schema-generator'

export type Handler<Input, Output> = (input: Input) => Output
export type Route = Handler<unknown, unknown> | { [subroute: string]: Route }
export type Routes = Record<string, Route>

function dotNotatePath(path: string): string {
  // Take off leading and trailing slashes and replace remaining slashes with dots
  return path.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '.')
}

function findRoute({
  routes,
  path,
}: { routes: Routes; path: string }): Route | undefined {
  const dotNotationPath = dotNotatePath(path)
  // Find the route by its dot notation path
  return notate(routes, dotNotationPath)
}

export function createSomnolenceServer<UserDefinedRoutes extends Routes>({
  port = 3000,
  routes,
  routesType,
}: {
  port?: number
  routes: UserDefinedRoutes
  routesType?: { name?: string; path?: string }
}) {
  const formattedRoutes = Object.entries(routes).reduce<UserDefinedRoutes>(
    (accum, [path, route]) => {
      const newAccum = Object.assign(accum, { [dotNotatePath(path)]: route })
      return newAccum
    },
    {} as UserDefinedRoutes,
  )
  return {
    start() {
      console.info(`💤 Somnolence is running at http://localhost:${port}`)
      Bun.serve({
        port,
        async fetch(req) {
          try {
            const url = new URL(req.url)
            if (url.pathname === '/__types') {
              const jsonSchema = tsj
                .createGenerator({
                  path: routesType?.path ?? './',
                  // tsconfig: './tsconfig.json',
                  type: '*',
                })
                .createSchema(routesType?.name ?? 'Routes')
              return Response.json(jsonSchema)
            }
            const route = findRoute({
              routes: formattedRoutes,
              path: url.pathname,
            })
            const handler =
              typeof route === 'function'
                ? route
                : (route?.['/'] as Handler<unknown, unknown> | undefined)
            if (handler) {
              const queryParams = queryString.parse(
                url.searchParams.toString(),
                {
                  parseBooleans: true,
                  parseNumbers: true,
                  arrayFormat: 'comma',
                },
              )
              const body = req.body && (await req.json())
              const input = { ...queryParams, ...(body || {}) }
              const output = handler(input)
              return Response.json({ output })
            }
            return new Response('Not Found', { status: 404 })
          } catch (err) {
            const error = err as Error
            console.error(error)
            return new Response(error.message, { status: 500 })
          }
        },
      })
    },
  }
}
