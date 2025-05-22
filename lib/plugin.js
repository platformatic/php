import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'TRACE']

const capitalizeHeaders = header => header.replace(/(^|-)([a-z])/g, (_, dash, letter) => dash + letter.toUpperCase());

export async function plugin (server, opts) {
  // We import this dynically to provide better error reporting in case
  // this module fails to load one of the native bindings
  const { Php, Request } = await import('@platformatic/php-node')

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

        // Php needs capitalized headers
        const headers = {}
        for (const key of Object.keys(req.headers)) {
          if (key === 'host') {
            continue
          }
          const actual = capitalizeHeaders(key)

          if (Array.isArray(headers[actual])) {
            headers[actual].push(req.headers[key])
          } else {
            headers[actual] = [req.headers[key]]
          }
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
          if (error.message === 'Path canonicalization error: No such file or directory (os error 2)') {
            reply.callNotFound()
            return
          }
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
