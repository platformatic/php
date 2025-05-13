import { Php, Request } from '@platformatic/php-node'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'TRACE']

export async function plugin (server, opts) {
  /* c8 ignore next */
  const configuration = server.platformatic?.config ?? opts.context?.stackable.configManager.current
  const main = configuration.php?.main || 'index.php'

  // Construct a PHP environment for handling requests.
  // This corresponds to a single entrypoint file.
  // Presently the file contents must be passed in as a string,
  // but it could be made to take only a filename and read the file
  // contents itself.
  const php = new Php({
    file: basename(main),
    code: await readFile(main, 'utf8')
  })

  // We accept all content-types and parse them as buffer, so that PHP can
  // handle them
  server.addContentTypeParser(/.*/, { parseAs: 'buffer' }, (request, body, done) => {
    done(null, body)
  })

  for (const method of HTTP_METHODS) {
    server.route({
      method,
      url: '/*',
      handler: async (req, reply) => {
        const url = urlForRequest(req)

        const phpReq = new Request({
          method: req.method,
          url: url.href,
          headers: fixHeaders(req.headers),
          body: req.body,
        })

        try {
          const phpRes = await php.handleRequest(phpReq)

          if (phpRes.log.length) {
            req.log.info(phpRes.log)
          }
          
          if (phpRes.exception) {
            throw new Error(phpRes.exception)
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
function fixHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers)
      .map(([key, value]) => [key, [value]])
  )
}
