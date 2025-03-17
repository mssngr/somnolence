import type { IncomingMessage } from 'node:http'
import { type AssertError, Value } from '@sinclair/typebox/value'
import queryString from 'query-string'
import type * as T from '../types'
import { METHODS } from '../types'

export function formatPath(path: string): string {
  // Take off leading and trailing slashes
  return path.replace(/^\//, '').replace(/\/$/, '')
}

export function organizeRoutes<R extends T.Routes>(
  routes: R,
  parentPath?: string,
): { flattenedRoutes: T.FlattenedRoutes; routesRegExp: RegExp } {
  const formattedParentPath = parentPath ? formatPath(parentPath) : ''
  return Object.entries(routes).reduce<{
    flattenedRoutes: T.FlattenedRoutes
    routesRegExp: RegExp
  }>(
    (accum, [path, route]) => {
      if (METHODS.includes(path as T.Method)) {
        const flattenedPath = `${formattedParentPath}/${path}`
        const groupName = flattenedPath
          .replace(/\//g, '___')
          .replace(/:/g, '_COLON_')
        accum.flattenedRoutes[groupName] = route as T.Route
        const pathWithParamsReplaced = flattenedPath.replace(/:[^/]+/g, '[^/]+')
        accum.routesRegExp = new RegExp(
          `${accum.routesRegExp.source}|(?<${groupName}>${pathWithParamsReplaced})`,
        )
        return accum
      }
      const formattedPath = formatPath(path)
      const fullPath =
        formattedParentPath && formattedPath
          ? `${formattedParentPath}/${formattedPath}`
          : `${formattedParentPath}${formattedPath}`
      const nestedRoutes = organizeRoutes(route as T.Routes, fullPath)
      accum.flattenedRoutes = {
        ...accum.flattenedRoutes,
        ...nestedRoutes.flattenedRoutes,
      }
      accum.routesRegExp = new RegExp(
        `${accum.routesRegExp.source}|${nestedRoutes.routesRegExp.source}`,
      )
      return accum
    },
    {
      flattenedRoutes: {},
      routesRegExp: new RegExp(/^$/), // Start with an empty RegExp
    },
  )
}

export function generateSchema(routes: T.FlattenedRoutes): T.Schema {
  return Object.entries(routes).reduce<T.Schema>((accum, [path, route]) => {
    accum[path] = {
      query: route.query,
      body: route.body,
      response: route.response,
    }
    return accum
  }, {} as T.Schema)
}

export async function getRouteParamsQueryAndBody({
  routesRegExp,
  flattenedRoutes,
  req,
  url,
}: {
  routesRegExp: RegExp
  flattenedRoutes: T.FlattenedRoutes
  req: Request | IncomingMessage
  url: URL
}): Promise<{
  route: T.Route
  params?: Record<string, string>
  body?: unknown
  query: queryString.ParsedQuery<string | number | boolean>
}> {
  const method = req.method as T.Method
  const pathAndMethod = `${url.pathname}/${method}`
  const routeMatches = routesRegExp.exec(pathAndMethod)?.groups
  const routePath =
    Object.entries(routeMatches || {}).find(([_, val]) => !!val)?.[0] || ''
  const paramsRegExp = new RegExp(
    routePath.replace(/___/g, '/').replace(/_COLON_([^/]+)/g, '(?<$1>[^/]+)'),
  )
  const params = paramsRegExp.exec(pathAndMethod)?.groups
  const query = url.search
    ? queryString.parse(url.search, {
        parseBooleans: true,
        parseNumbers: true,
        arrayFormat: 'comma',
      })
    : {}
  const route = flattenedRoutes[routePath]

  // If bun is used, parse the body as JSON
  if ((process.versions as { bun?: string }).bun) {
    const request = req as Request
    const body: unknown = request.body ? await request.json() : undefined
    return { route, params, query, body }
  }

  // If node is used, chunk the body and try to parse as JSON
  const incomingMsg = req as IncomingMessage
  let body = ''
  incomingMsg.on('data', chunk => {
    body += chunk
  })
  const parsedBody = await new Promise<string | undefined>((res, rej) => {
    incomingMsg.on('end', () => {
      if (body) {
        try {
          const json = JSON.parse(body)
          body = json
        } catch (err) {
          const error = err as Error
          console.error(error.message)
          rej(error.message)
        }
        res(body)
      }
      res(undefined)
    })
  })
  return { route, params, query, body: parsedBody }
}

export function validateSchema({
  route,
  query,
  body,
}: { route: T.Route; query: unknown; body: unknown }) {
  try {
    route.query && Value.Assert(route.query, query)
  } catch (err) {
    const error = err as AssertError
    throw new Error(`Invalid query: ${error.message}`)
  }
  try {
    route.body && Value.Assert(route.body, body)
  } catch (err) {
    const error = err as AssertError
    throw new Error(`Invalid body: ${error.message}`)
  }
}
