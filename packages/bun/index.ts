// import type { TSchema, Static } from '@sinclair/typebox'
import { notate } from 'notate'
import queryString from 'query-string'

export type Handler<Input, Output> = (input: Input) => Output
export type Route = Handler<unknown, unknown> | { [subroute: string]: Route }
export type Routes = Record<string, Route>
// export type DefinedRoute = { _input?: TSchema; _output?: TSchema } & {
//   [subroute: string]: DefinedRoute
// }
// export type DefinedRoutes = Record<string, DefinedRoute>

// function mapRouteSchema(route: DefinedRoute, parentPath?: string): Route {
//   type DefinedHandler = (
//     input: Static<typeof route._input>,
//   ) => Static<typeof route.output>
//   return Object.keys(route).reduce((accum, key) => {
//     if (key !== '_input' && key !== '_output') {
//     }
//   })
// }

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

export function createSomnolenceServer({
  port = 3000,
  routes,
}: {
  port?: number
  routes: Routes
}) {
  const formattedRoutes = Object.entries(routes).reduce<Routes>(
    (accum, [path, route]) => {
      const newAccum = Object.assign(accum, { [dotNotatePath(path)]: route })
      return newAccum
    },
    {} as Routes,
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
              // const jsonSchema = tsj
              //   .createGenerator({
              //     path: routesType.path,
              //     tsconfig: routesType.configPath,
              //     type: '*',
              //   })
              //   .createSchema(routesType.name ?? 'Routes')
              // return Response.json(jsonSchema)
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

export { default as t } from './t'
