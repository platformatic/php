import { buildServer } from '@platformatic/service'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { resolve, join } from 'node:path'
import { test } from 'node:test'
import { stackable } from '../lib/index.js'
import formAutoContet from 'form-auto-content'
import { setTimeout as sleep } from 'node:timers/promises'

async function startStackable (t, docroot = join(import.meta.dirname, './fixtures/hello'), opts = {}) {
  const config = {
    $schema: '../../schema.json',
    module: '../../lib/index.js',
    php: {
      docroot 
    },
    port: 0,
    server: {
      logger: {
        level: 'fatal'
      }
    }
  }

  let server = await buildServer(config, stackable)
  t.after(async () => {
    await server.close()
    server = null
    await sleep(1000) // wait for the server to close
  })

  return server
}

test('PHP hello world', async t => {
  const server = await startStackable(t)
  const res = await server.inject('/')

  t.assert.deepStrictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(res.body, 'Hello World!')
})

test('post data', async t => {
  const server = await startStackable(t)
  const res = await server.inject({
    url: '/post.php', 
    method: 'POST',
    ...formAutoContet({
      'foo': 'bar'
    })
  })

  t.assert.deepStrictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(res.json(), {
    foo: 'bar'
  })
})

test('get all headers', async t => {
  const server = await startStackable(t)
  const res = await server.inject('/headers.php')

  t.assert.deepStrictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(res.json(), {
    'HTTP_USER_AGENT': 'lightMyRequest',
    'HTTP_HOST': 'localhost:80'
  })
})

test('serve static files in docroot', async t => {
  const server = await startStackable(t)
  const res = await server.inject('/something.txt')

  t.assert.deepStrictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(res.body, 'a txt file\n')
})

test('404', async t => {
  const server = await startStackable(t)
  const res = await server.inject('/path/to/nowhere')

  t.assert.deepStrictEqual(res.statusCode, 404)
})
