import { buildServer } from '@platformatic/service'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { resolve, join } from 'node:path'
import { test } from 'node:test'
import { stackable } from '../lib/index.js'

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

  const server = await buildServer(config, stackable)
  t.after(async () => {
    await server.close()
  })

  return server
}

test('PHP hello world', async t => {
  const server = await startStackable(t)
  const res = await server.inject('/')

  t.assert.deepStrictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(res.body, 'Hello World!')
})

test('serve static files in docroot', async t => {
  const server = await startStackable(t)
  const res = await server.inject('/something.txt')

  t.assert.deepStrictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(res.body, 'a txt file\n')
})

test.skip('The index.php is called on any file - URL rewriting works', async t => {
  const server = await startStackable(t)
  const res = await server.inject('/path/to/nowhere')

  t.assert.deepStrictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(res.body, 'Hello World!')
})
