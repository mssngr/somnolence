import type { Static, TSchema } from '@sinclair/typebox'
import {
  type Method,
  type Route,
  type Routes,
  type UserDefinedRoute,
  generateSchema,
  handleRequest,
  organizeRoutes,
} from '@somnolence/core'

type RouteBun = Omit<Route, 'authorizer' | 'onStart' | 'onFinish'> & {
  authorizer?: (_: {
    req: Request
    params?: Record<string, string>
    query: Static<TSchema>
    body: Static<TSchema>
  }) => boolean
  onStart?: (_: {
    req: Request
    params?: Record<string, string>
    query: Static<TSchema>
    body: Static<TSchema>
  }) => void
  onFinish?: (_: {
    req: Request
    params?: Record<string, string>
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
    params?: Record<string, string>
    query: Static<Q>
    body: Static<B>
  }) => boolean
  onStart?: (_: {
    req: Request
    params?: Record<string, string>
    query: Static<Q>
    body: Static<B>
  }) => void
  onFinish?: (_: {
    req: Request
    params?: Record<string, string>
    query: Static<Q>
    body: Static<B>
    response: Static<R>
  }) => void
}

type RouteObjBun = Partial<Record<Method, RouteBun>>

type RoutesBun =
  | {
      [route: string]: RoutesBun | RouteObjBun
    }
  | RouteObjBun

export function createSomnolenceServer({
  port = 3000,
  routes,
}: {
  port?: number
  routes: RoutesBun
}) {
  const { routesRegExp, flattenedRoutes } = organizeRoutes(routes as Routes)
  const schema = generateSchema(flattenedRoutes)
  return {
    start() {
      console.info(`💤 Somnolence is running at http://localhost:${port}`)
      Bun.serve({
        port,
        async fetch(req) {
          return handleRequest(req, {
            schema,
            routesRegExp,
            flattenedRoutes,
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

export function createRouter<R extends RoutesBun>(routes: R): R {
  return routes
}

export function createRoute<
  Q extends TSchema,
  B extends TSchema,
  R extends TSchema,
>(route: UserDefinedRouteBun<Q, B, R>): RouteBun {
  return route
}
