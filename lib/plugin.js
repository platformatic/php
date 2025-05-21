import { Php, Request } from '@platformatic/php-node'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { glob } from 'glob'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'TRACE']

export async function plugin (server, opts) {
  /* c8 ignore next */
  const configuration = server.platformatic?.config ?? opts.context?.stackable.configManager.current
  const docroot = configuration.php.docroot

  // All files in the docroot that are not PHP files, should be served as static files
  await server.register(import('@fastify/static'), {
    root: docroot,
    wildcard: false,
    // TODO(mcollina): make this configurable
    globIgnore: ['**/*.php', 'node_modules/**']
  })

  // We accept all content-types and parse them as buffer, so that PHP can
  // handle them
  server.addContentTypeParser(/^.*/, { parseAs: 'buffer' }, (request, body, done) => {
    done(null, body)
  })

  for (const method of HTTP_METHODS) {
    server.route({
      method,
      url: '/*',
      handler: async (req, reply) => {
        // TODO(mcollina): this should be cached outside
        const php = new Php({
          argv: process.argv,
          docroot
        })

        const url = urlForRequest(req)

        // TODO(mcollina): this should be simpler and use
        // Fastify headers
        const headers = {}
        let isHeaderKey = true
        let lastKey = null
        for (const value of req.raw.rawHeaders) {
          if (isHeaderKey) {
            headers[value] ??= []
            lastKey = value
          } else {
            headers[lastKey].push(value)
          }
          isHeaderKey = !isHeaderKey
        }

        const reqInput = {
          method: req.method,
          url: url.href,
          headers,
          body: req.body,
        }

        const phpReq = new Request(reqInput)

        try {
          const phpRes = await php.handleRequest(phpReq)

          if (phpRes.log.length) {
            req.log.info(phpRes.log.toString())
          }

          if (phpRes.exception) {
            req.log.warn({ phpError: phpRes.exception.toString() }, 'PHP error')
          }
          reply.status(phpRes.status)
          for (const [key, value] of phpRes.headers.entries()) {
            reply.header(key, value)
          }
          reply.send(phpRes.body)
        } catch (error) {
          reply.status(500)
          reply.send(error.message)
        }

        return reply
      }
    })
  }
}

// A full URL string is needed for PHP, but Node.js splits that across a bunch of places.
function urlForRequest(req) {
  const proto = req.raw.protocol ?? 'http:'
  const host = req.headers.host ?? 'localhost'
  return new URL(req.url, `${proto}//${host}`)
}

// Currently header values must be arrays. Need to make it support single values too.
function fixHeaders (headers) {
  return Object.fromEntries(
    Object.entries(headers)
    .map(([key, value]) => [key, [value]])
  )
}
