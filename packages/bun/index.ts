import type { Static, TSchema } from '@sinclair/typebox'
import { type AssertError, Value } from '@sinclair/typebox/value'
import queryString from 'query-string'

export type Route = {
  input: TSchema
  output: TSchema
  handler: (input: Static<TSchema>) => Static<TSchema>
  authorizer?: (req: Request, input: Static<TSchema>) => boolean
  onStart?: (req: Request, input?: Static<TSchema>) => void
  onFinish?: (
    req: Request,
    input?: Static<TSchema>,
    output?: Static<TSchema>,
  ) => void
}
export type Routes = {
  [route: string]: Route | Routes
}
export type Schema = Record<string, { input: TSchema; output: TSchema }>

function dotNotatePath(path: string): string {
  // Take off leading and trailing slashes and replace remaining slashes with dots
  return path.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '.')
}

function flattenRoutes(
  routes: Routes,
  parentPath?: string,
): Record<string, Route> {
  const dotNotationParentPath = parentPath ? dotNotatePath(parentPath) : ''
  return Object.entries(routes).reduce<Record<string, Route>>(
    (accum, [path, route]) => {
      const dotNotationPath = dotNotatePath(path)
      if (route.input && route.output && route.handler) {
        return Object.assign(accum, {
          [`${dotNotationParentPath}${dotNotationParentPath && dotNotationPath && '.'}${dotNotationPath}`]:
            route,
        })
      }
      return Object.assign(
        accum,
        flattenRoutes(
          route as Routes,
          `${dotNotationParentPath}${dotNotatePath(path)}`,
        ),
      )
    },
    {} as Record<string, Route>,
  )
}

export function createSomnolenceServer({
  port = 3000,
  routes,
}: {
  port?: number
  routes: Routes
}) {
  const flattenedRoutes = flattenRoutes(routes)
  const schema = Object.entries(flattenedRoutes).reduce<Schema>(
    (accum, [path, { input, output }]) =>
      Object.assign(accum, {
        [path]: { input, output },
      }),
    {} as Schema,
  )
  return {
    start() {
      console.info(`💤 Somnolence is running at http://localhost:${port}`)
      Bun.serve({
        port,
        async fetch(req) {
          try {
            const url = new URL(req.url)
            // If it's the schema route, return the JSON Schema
            if (url.pathname === '/__schema') {
              return Response.json(schema)
            }
            const route: Route | undefined =
              flattenedRoutes[dotNotatePath(url.pathname)]

            // If the route has an onStart function, run it
            route.onStart?.(req)

            // If the route doesn't have a handler, return a 404
            if (!route?.handler) {
              route.onFinish?.(req)
              return new Response('Not Found', { status: 404 })
            }

            const queryParams = queryString.parse(url.searchParams.toString(), {
              parseBooleans: true,
              parseNumbers: true,
              arrayFormat: 'comma',
            })
            const body = req.body && (await req.json())
            const input = { ...queryParams, ...(body || {}) }

            // If the request is not authorized, return a 401
            if (route.authorizer && !route.authorizer(req, input)) {
              route.onFinish?.(req, input)
              return new Response('Not Authorized', { status: 401 })
            }

            // Validate the input against the schema
            try {
              Value.Assert(route.input, input)
            } catch (err) {
              const error = err as AssertError
              route.onFinish?.(req, input)
              return new Response(error.message, { status: 400 })
            }

            const output = route.handler(input)

            // If the route has an onFinish function, run it
            route.onFinish?.(req, input, output)

            // Respond with the output
            return Response.json({ output })
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

export function createRoute<
  Input extends TSchema,
  Output extends TSchema,
>(args: {
  input: Input
  output: Output
  handler: (input: Static<Input>) => Static<Output>
  authorizer?: (req: Request, input: Static<Input>) => boolean
  onStart?: (req: Request, input: Static<Input>) => void
  onFinish?: (
    req: Request,
    input: Static<Input>,
    output: Static<Output>,
  ) => void
}): Route {
  return args
}

export { default as t } from './t'
