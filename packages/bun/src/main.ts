import type { Static, TSchema } from '@sinclair/typebox'
import {
  type Route,
  type Routes,
  type UserDefinedRoute,
  flattenRoutes,
  generateSchema,
  handleRequest,
} from '@somnolence/core'

type RouteBun = Omit<Route, 'authorizer' | 'onStart' | 'onFinish'> & {
  authorizer?: (_: {
    req: Request
    query: Static<TSchema>
    body: Static<TSchema>
  }) => boolean
  onStart?: (_: {
    req: Request
    query: Static<TSchema>
    body: Static<TSchema>
  }) => void
  onFinish?: (_: {
    req: Request
    query: Static<TSchema>
    body: Static<TSchema>
    response: Static<TSchema>
  }) => void
}

type UserDefinedRouteBun<
  Q extends TSchema,
  B extends TSchema,
  R extends TSchema,
> = Omit<UserDefinedRoute<Q, B, R>, 'authorizer' | 'onStart' | 'onFinish'> & {
  authorizer?: (_: {
    req: Request
    query: Static<Q>
    body: Static<B>
  }) => boolean
  onStart?: (_: {
    req: Request
    query: Static<Q>
    body: Static<B>
  }) => void
  onFinish?: (_: {
    req: Request
    query: Static<Q>
    body: Static<B>
    response: Static<R>
  }) => void
}

type RoutesBun = {
  [route: string]: RouteBun | RoutesBun
}

export function createSomnolenceServer({
  port = 3000,
  routes,
}: {
  port?: number
  routes: RoutesBun
}) {
  const flattenedRoutes = flattenRoutes(routes as Routes)
  const schema = generateSchema(flattenedRoutes)
  return {
    start() {
      console.info(`💤 Somnolence is running at http://localhost:${port}`)
      Bun.serve({
        port,
        async fetch(req) {
          return handleRequest(req, {
            flattenedRoutes,
            schema,
            handleResponse(response) {
              if (typeof response === 'object' && response !== null) {
                return Response.json(response)
              }
              return new Response(response as BodyInit)
            },
            handleError(errorMsg, status) {
              return new Response(errorMsg, { status })
            },
            url: new URL(req.url),
          })
        },
      })
    },
  }
}

export function createRoute<
  Q extends TSchema,
  B extends TSchema,
  R extends TSchema,
>(route: UserDefinedRouteBun<Q, B, R>): RouteBun {
  return route
}
