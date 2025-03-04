import type { IncomingMessage } from 'node:http'
import { type TSchema, Type } from '@sinclair/typebox'
import { type AssertError, Value } from '@sinclair/typebox/value'
import queryString from 'query-string'
import type * as T from './types'
import { METHODS } from './types'

function dotNotatePath(path: string): string {
  // Take off leading and trailing slashes and replace remaining slashes with dots
  return path.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '.')
}

export function flattenRoutes(
  routes: T.Routes,
  parentPath?: string,
): T.FlattenedRoutes {
  const dotNotationParentPath = parentPath ? dotNotatePath(parentPath) : ''
  return Object.entries(routes).reduce<T.FlattenedRoutes>(
    (accum, [path, route]) => {
      if (METHODS.includes(path as T.Method)) {
        if (!accum[dotNotationParentPath]) {
          accum[dotNotationParentPath] = {}
        }
        accum[dotNotationParentPath][path as T.Method] = route as T.Route
        return accum
      }
      const dotNotationPath = dotNotatePath(path)
      const fullPath =
        dotNotationParentPath && dotNotationPath
          ? `${dotNotationParentPath}.${dotNotationPath}`
          : `${dotNotationParentPath}${dotNotationPath}`
      return Object.assign(flattenRoutes(route as T.Routes, fullPath), accum)
    },
    {},
  )
}

export function generateSchema(routes: T.FlattenedRoutes): T.Schema {
  return Object.entries(routes).reduce<T.Schema>((accum, [path, routeObj]) => {
    Object.entries(routeObj).forEach(([method, { query, body, response }]) => {
      const queryObj: { query: TSchema } | Record<string, never> = query
        ? { query }
        : {}
      const bodyObj: { body: TSchema } | Record<string, never> = body
        ? { body }
        : {}
      if (!accum[path || '__root']) {
        accum[path || '__root'] = {}
      }
      accum[path || '__root'][method as T.Method] = Type.Object({
        path: Type.Literal(path.replace(/\./g, '/')),
        ...queryObj,
        ...bodyObj,
        response,
      })
    })
    return accum
  }, {} as T.Schema)
}

export async function getRouteQueryAndBody({
  flattenedRoutes,
  req,
  url,
}: {
  flattenedRoutes: T.FlattenedRoutes
  req: Request | IncomingMessage
  url: URL
}) {
  const method = req.method as T.Method
  const route = flattenedRoutes[dotNotatePath(url.pathname)]?.[method]
  const query = queryString.parse(url.searchParams.toString(), {
    parseBooleans: true,
    parseNumbers: true,
    arrayFormat: 'comma',
  })

  if ((process.versions as { bun?: string }).bun) {
    const request = req as Request
    const body = request.body ? await request.json() : {}
    return { route, query, body }
  }

  // Parse the body if it exists
  const incomingMsg = req as IncomingMessage
  let body = ''
  incomingMsg.on('data', chunk => {
    body += chunk
  })
  const parsedBody = await new Promise<string | undefined>((res, rej) => {
    incomingMsg.on('end', () => {
      try {
        if (body) {
          body = JSON.parse(body)
          res(body)
        }
      } catch (err) {
        const error = err as Error
        console.error(error.message)
        rej(error.message)
      }
      res(undefined)
    })
  })
  return { route, query, body: parsedBody }
}

export function validateSchema({
  route,
  query,
  body,
}: { route: T.Route; query: unknown; body: unknown }) {
  try {
    route.query && Value.Assert(route.query, query)
    route.body && Value.Assert(route.body, body)
  } catch (err) {
    const error = err as AssertError
    throw new Error(error.message)
  }
}
