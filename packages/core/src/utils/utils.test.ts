import { describe, expect, test } from 'bun:test'
import t from '../t'
import type * as T from '../types'
import * as U from './utils'

describe('formatPath', () => {
  test('should format path', () => {
    expect(U.formatPath('/hello/world')).toBe('hello/world')
    expect(U.formatPath('hello/world/')).toBe('hello/world')
    expect(U.formatPath('/hello/world/')).toBe('hello/world')
    expect(U.formatPath('hello/world')).toBe('hello/world')
  })
})

describe('organizeRoutes', () => {
  test('should organize hello route', () => {
    const routes = {
      '/hello': {
        GET: {
          query: t.Object({
            name: t.String(),
          }),
          response: t.String(),
          handler: ({ query }: { query: { name: string } }) =>
            `Hello, ${query.name}!`,
        },
      },
    }
    const organizedRoutes = U.organizeRoutes(routes as T.Routes)
    expect(organizedRoutes.flattenedRoutes).toMatchObject({
      hello___GET: {
        response: t.String(),
        handler: ({ query }: { query: { name: string } }) =>
          `Hello, ${query.name}!`,
      },
    })
    expect(organizedRoutes.routesRegExp.source).toBe(
      '^$|^$|(?<hello___GET>hello\\/GET)',
    )
    expect('hello/GET').toMatch(organizedRoutes.routesRegExp)
  })

  test('should organize hello world route with params and body', () => {
    const routes = {
      '/hello/:name': {
        POST: {
          body: t.Object({
            message: t.String(),
          }),
          response: t.String(),
          handler: ({
            params,
            body,
          }: { params: { name: string }; body: { message: string } }) =>
            `${body.message}, ${params.name}!`,
        },
      },
    }
    const organizedRoutes = U.organizeRoutes(routes as T.Routes)
    expect(organizedRoutes.flattenedRoutes).toMatchObject({
      hello____COLON_name___POST: {
        body: t.Object({
          message: t.String(),
        }),
        response: t.String(),
        handler: ({
          params,
          body,
        }: { params: { name: string }; body: { message: string } }) =>
          `${body.message}, ${params.name}!`,
      },
    })
    expect(organizedRoutes.routesRegExp.source).toBe(
      '^$|^$|(?<hello____COLON_name___POST>hello\\/[^/]+\\/POST)',
    )
    expect('hello/John/POST').toMatch(organizedRoutes.routesRegExp)
  })

  test('should organize nested routes', () => {
    const routes = {
      '/hello': {
        GET: {
          response: t.String(),
          handler: () => 'Hello!',
        },
        '/world': {
          GET: {
            response: t.String(),
            handler: () => 'Hello, World!',
          },
        },
      },
    }
    const organizedRoutes = U.organizeRoutes(routes)
    expect(organizedRoutes.flattenedRoutes).toMatchObject({
      hello___world___GET: {
        response: t.String(),
        handler: () => 'Hello, World!',
      },
    })
    expect(organizedRoutes.routesRegExp.source).toBe(
      '^$|^$|(?<hello___GET>hello\\/GET)|^$|(?<hello___world___GET>hello\\/world\\/GET)',
    )
    expect('hello/world/GET').toMatch(organizedRoutes.routesRegExp)
  })
})

describe('generateSchema', () => {
  test('should generate a schema with query params, route params, and body', () => {
    const flattenedRoutes = {
      hello___GET: {
        response: t.String(),
        handler: () => 'Hello, World!',
      },
    }
    const schema = U.generateSchema(flattenedRoutes)
    expect(schema).toMatchObject({
      hello___GET: {
        response: t.String(),
      },
    })
  })
})

describe('getRouteParamsQueryAndBody', () => {
  test('should get route params, query, and body', async () => {
    const routesRegExp = new RegExp(
      /^$|^$|(?<hello____COLON_name___POST>hello\/[^/]+\/POST)/,
    )
    const flattenedRoutes = {
      hello____COLON_name___POST: {
        query: t.Object({
          otherName: t.String(),
        }),
        body: t.Object({
          message: t.String(),
        }),
        response: t.String(),
        handler: ({
          params,
          query,
          body,
        }: {
          params: { name: string }
          query: { otherName: string }
          body: { message: string }
        }) =>
          `${body.message}, ${params.name}${query.otherName && `and ${query.otherName}`}!`,
      },
    } as unknown as T.FlattenedRoutes
    const req = new Request(
      'http://localhost:3000/hello/Gabriel?otherName=Daelrin',
      {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello' }),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
    const url = new URL(req.url)
    const { route, params, query, body } = await U.getRouteParamsQueryAndBody({
      routesRegExp,
      flattenedRoutes,
      req,
      url,
    })
    expect(route).toBe(flattenedRoutes.hello____COLON_name___POST)
    expect(params).toMatchObject({ name: 'Gabriel' })
    expect(query).toMatchObject({ otherName: 'Daelrin' })
    expect(body).toMatchObject({ message: 'Hello' })
  })
})

describe('validateSchema', () => {
  test('should validate schema', () => {
    const route = {
      query: t.Object({
        name: t.String(),
      }),
      body: t.Object({
        message: t.String(),
      }),
      response: t.String(),
    } as unknown as T.Route
    const query = { name: 'Gabriel' }
    const body = { message: 'Hello' }
    expect(() => U.validateSchema({ route, query, body })).not.toThrow()
  })

  test('should throw error for invalid query', () => {
    const route = {
      query: t.Object({
        name: t.String(),
      }),
      body: t.Object({
        message: t.String(),
      }),
      response: t.String(),
    } as unknown as T.Route
    const query = { name: 123 }
    const body = { message: 'Hello' }
    expect(() => U.validateSchema({ route, query, body })).toThrow(
      'Invalid query: Expected string',
    )
  })

  test('should throw error for invalid body', () => {
    const route = {
      query: t.Object({
        name: t.String(),
      }),
      body: t.Object({
        message: t.String(),
      }),
      response: t.String(),
    } as unknown as T.Route
    const query = { name: 'Gabriel' }
    const body = { message: 123 }
    expect(() => U.validateSchema({ route, query, body })).toThrow(
      'Invalid body: Expected string',
    )
  })
})
