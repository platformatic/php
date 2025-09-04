import formAutoContet from 'form-auto-content'
import { join } from 'node:path'
import { test } from 'node:test'
import { create } from '../lib/index.js'

async function createApplication (t, docroot = join(import.meta.dirname, './fixtures/hello'), opts = {}) {
  const config = {
    php: {
      docroot,
      rewriter: opts.rewriter
    },
    server: {
      port: 0,
      logger: {
        level: 'fatal'
      }
    }
  }

  const server = await create(import.meta.dirname, config)
  t.after(async () => {
    await server.close()
  })

  await server.init()
  return server
}

test('PHP hello world', async t => {
  const server = await createApplication(t)
  const res = await server.inject('/')

  t.assert.deepStrictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(res.body, 'Hello World!')
})

test('post data', async t => {
  const server = await createApplication(t)
  const res = await server.inject({
    url: '/post.php',
    method: 'POST',
    ...formAutoContet({
      foo: 'bar'
    })
  })

  t.assert.deepStrictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(JSON.parse(res.body), {
    foo: 'bar'
  })
})

test('get all headers', async t => {
  const server = await createApplication(t)
  const res = await server.inject('/headers.php')

  t.assert.deepStrictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(JSON.parse(res.body), {
    HTTP_USER_AGENT: 'lightMyRequest',
    HTTP_HOST: 'localhost:80'
  })
})

test('serve static files in docroot', async t => {
  const server = await createApplication(t)
  const res = await server.inject('/something.txt')

  t.assert.deepStrictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(res.body, 'a txt file\n')
})

test('404', async t => {
  const server = await createApplication(t)
  const res = await server.inject('/path/to/nowhere')

  t.assert.deepStrictEqual(res.statusCode, 404)
})

test('support rewriter', async t => {
  const server = await createApplication(t, undefined, {
    rewriter: [
      {
        rewriters: [
          {
            type: 'href',
            args: ['^/(.*)$', '/index.php']
          }
        ]
      }
    ]
  })
  const res = await server.inject('/rewrite_me')

  t.assert.deepStrictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(res.body, 'Hello World!')
})

test('post JSON', async t => {
  const server = await createApplication(t)
  const res = await server.inject({
    url: '/post-json.php',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ foo: 'bar' })
  })

  t.assert.deepStrictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(JSON.parse(res.body), {
    foo: 'bar'
  })
})
