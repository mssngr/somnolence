import type { TSchema } from '@sinclair/typebox'
import { type AssertError, Value } from '@sinclair/typebox/value'
import queryString from 'query-string'
import type * as T from './types'

function dotNotatePath(path: string): string {
  // Take off leading and trailing slashes and replace remaining slashes with dots
  return path.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '.')
}

function flattenRoutes(
  routes: T.Routes,
  parentPath?: string,
): Record<string, T.Route> {
  const dotNotationParentPath = parentPath ? dotNotatePath(parentPath) : ''
  return Object.entries(routes).reduce<Record<string, T.Route>>(
    (accum, [path, route]) => {
      const dotNotationPath = dotNotatePath(path)
      if (route.response && route.handler) {
        return Object.assign(accum, {
          [`${dotNotationParentPath}${dotNotationParentPath && dotNotationPath && '.'}${dotNotationPath}`]:
            route,
        })
      }
      return Object.assign(
        accum,
        flattenRoutes(
          route as T.Routes,
          `${dotNotationParentPath}${dotNotatePath(path)}`,
        ),
      )
    },
    {} as Record<string, T.Route>,
  )
}

export function createSomnolenceServer({
  port = 3000,
  routes,
}: {
  port?: number
  routes: T.Routes
}) {
  const flattenedRoutes = flattenRoutes(routes)
  const schema = Object.entries(flattenedRoutes).reduce<T.Schema>(
    (accum, [path, { query, body, response }]) =>
      Object.assign(accum, {
        [path]: { query, body, response },
      }),
    {} as T.Schema,
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
            const route: T.Route | undefined =
              flattenedRoutes[dotNotatePath(url.pathname)]
            const query = queryString.parse(url.searchParams.toString(), {
              parseBooleans: true,
              parseNumbers: true,
              arrayFormat: 'comma',
            })
            const body = req.body ? await req.json() : {}

            // If the route has an onStart function, run it
            route.onStart?.({ req, query, body })

            // If the route doesn't have a handler, return a 404
            if (!route?.handler) {
              const errorMsg = `Route not found: ${url.pathname}`
              console.error(errorMsg)
              route.onFinish?.({ req, query, body, response: errorMsg })
              return new Response(errorMsg, { status: 404 })
            }

            // If the request is not authorized, return a 401
            if (!route.authorizer?.({ req, query, body })) {
              const errorMsg = 'Not Authorized'
              console.error(errorMsg)
              route.onFinish?.({ req, query, body, response: errorMsg })
              return new Response(errorMsg, { status: 401 })
            }

            // Validate the input against the schema
            try {
              route.query && Value.Assert(route.query, query)
              route.body && Value.Assert(route.body, body)
            } catch (err) {
              const error = err as AssertError
              route.onFinish?.({ req, query, body, response: error.message })
              return new Response(error.message, { status: 400 })
            }

            const response = route.handler({ query, body })

            // If the route has an onFinish function, run it
            route.onFinish?.({ req, query, body, response })

            // Respond with the output
            if (typeof response === 'object' && response !== null) {
              return Response.json({ response })
            }
            return new Response(response as BodyInit)
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
  Q extends TSchema,
  B extends TSchema,
  R extends TSchema,
>(route: T.UserDefinedRoute<Q, B, R>): T.Route {
  return route
}

export { default as t } from './t'
export * from './types'
