import type { TSchema } from '@sinclair/typebox'
import type * as T from './types'
import * as U from './utils'

export function createSomnolenceServer({
  port = 3000,
  routes,
}: {
  port?: number
  routes: T.Routes
}) {
  const flattenedRoutes = U.flattenRoutes(routes)
  const schema = U.generateSchema(flattenedRoutes)
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

            // Otherwise, find the route and related input data
            const { route, query, body } = await U.getRouteQueryAndBody({
              routes: flattenedRoutes,
              req,
              url,
            })

            // If the route has an onStart function, run it
            route?.onStart?.({ req, query, body })

            // If the route doesn't have a handler, return a 404
            if (!route || !route?.handler) {
              const errorMsg = `Route not found: ${url.pathname}`
              console.error(errorMsg)
              route?.onFinish?.({ req, query, body, response: errorMsg })
              return new Response(errorMsg, { status: 404 })
            }

            // If the request is not authorized, return a 401
            if (route.authorizer && !route.authorizer?.({ req, query, body })) {
              const errorMsg = 'Not Authorized'
              console.error(errorMsg)
              route.onFinish?.({ req, query, body, response: errorMsg })
              return new Response(errorMsg, { status: 401 })
            }

            // Validate the input against the schema
            try {
              U.validateSchema({
                route,
                query,
                body,
              })
            } catch (err) {
              const error = err as Error
              route.onFinish?.({ req, query, body, response: error.message })
              return new Response(error.message, { status: 400 })
            }

            // Get the response
            const response = route.handler({ query, body })

            // If the route has an onFinish function, run it
            route.onFinish?.({ req, query, body, response })

            // Return the handled response
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
