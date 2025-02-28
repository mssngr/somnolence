import { type AssertError, Value } from '@sinclair/typebox/value'
import queryString from 'query-string'
import type * as T from './types'

function dotNotatePath(path: string): string {
  // Take off leading and trailing slashes and replace remaining slashes with dots
  return path.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '.')
}

export function flattenRoutes(
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

export function generateSchema(routes: Record<string, T.Route>): T.Schema {
  return Object.entries(routes).reduce<T.Schema>(
    (accum, [path, { query, body, response }]) =>
      Object.assign(accum, {
        [path]: { query, body, response },
      }),
    {} as T.Schema,
  )
}

export async function getRouteQueryAndBody({
  routes,
  req,
  url,
}: { routes: T.Routes; req: Request; url: URL }) {
  const route = routes[dotNotatePath(url.pathname)] as T.Route | undefined
  const query = queryString.parse(url.searchParams.toString(), {
    parseBooleans: true,
    parseNumbers: true,
    arrayFormat: 'comma',
  })
  const body = req.body ? await req.json() : {}
  return { route, query, body }
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
