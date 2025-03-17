import http, { type IncomingMessage } from 'node:http'
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

type RouteNode = Omit<Route, 'authorizer' | 'onStart' | 'onFinish'> & {
  authorizer?: (_: {
    req: IncomingMessage
    query: Static<TSchema>
    body: Static<TSchema>
  }) => boolean
  onStart?: (_: {
    req: IncomingMessage
    query: Static<TSchema>
    body: Static<TSchema>
  }) => void
  onFinish?: (_: {
    req: IncomingMessage
    query: Static<TSchema>
    body: Static<TSchema>
    response: Static<TSchema>
  }) => void
}

type UserDefinedRouteNode<
  Q extends TSchema,
  B extends TSchema,
  R extends TSchema,
> = Omit<UserDefinedRoute<Q, B, R>, 'authorizer' | 'onStart' | 'onFinish'> & {
  authorizer?: (_: {
    req: IncomingMessage
    query: Static<Q>
    body: Static<B>
  }) => boolean
  onStart?: (_: {
    req: IncomingMessage
    query: Static<Q>
    body: Static<B>
  }) => void
  onFinish?: (_: {
    req: IncomingMessage
    query: Static<Q>
    body: Static<B>
    response: Static<R>
  }) => void
}

type RouteObjNode = Partial<Record<Method, RouteNode>>

type RoutesNode =
  | {
      [route: string]: RoutesNode | RouteObjNode
    }
  | RouteObjNode

export function createSomnolenceServer({
  port = 3000,
  routes,
}: {
  port?: number
  routes: RoutesNode
}) {
  const { routesRegExp, flattenedRoutes } = organizeRoutes(routes as Routes)
  const schema = generateSchema(flattenedRoutes)
  const server = http.createServer((req, res) => {
    handleRequest(req, {
      schema,
      routesRegExp,
      flattenedRoutes,
      handleResponse(response) {
        if (typeof response === 'object' && response !== null) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(response))
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end(response)
        }
        return null as unknown as Response
      },
      handleError(errorMsg, status) {
        res.writeHead(status, { 'Content-Type': 'text/plain' })
        res.end(errorMsg)
        return null as unknown as Response
      },
      url: new URL(req.url || '', `http://${req.headers.host}`),
    })
  })
  return {
    start() {
      server.listen(port, () => {
        console.info(`💤 Somnolence is running at http://localhost:${port}`)
      })
    },
  }
}

export function createRouter<R extends RoutesNode>(routes: R): R {
  return routes
}

export function createRoute<
  Q extends TSchema,
  B extends TSchema,
  R extends TSchema,
>(route: UserDefinedRouteNode<Q, B, R>): RouteNode {
  return route
}
