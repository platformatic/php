import { Php, Request } from '@platformatic/php-node'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { glob } from 'glob'
import UrlRewriteFactory from './url-rewriter.js'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'TRACE']

export async function plugin (server, opts) {
  /* c8 ignore next */
  const configuration = server.platformatic?.config ?? opts.context?.stackable.configManager.current
  const root = configuration.php.path
  const rewriteRules = configuration.php.rewriteRules || 'front-controller'

  console.log(rewriteRules)

  let urlRewriter

  if (typeof rewriteRules === 'string') {
    urlRewriter = UrlRewriteFactory.create(rewriteRules, {
      baseDir: root
    })
  } else if (typeof rewriteRules === 'object') {
    if (rewriteRules.base) {
      urlRewriter = UrlRewriteFactory.create(rewriteRules.base, {
        ...rewriteRules.options,
        baseDir: root
      })
    } else {
      throw new Error('Invalid URL rewriting rules')
    }
  }

  console.log(urlRewriter)

  await server.register(import('@fastify/static'), {
    root,
    serve: false
  })

  const phps = new Map()

  async function getPhp (file) {
    console.log(`Getting PHP for ${file}`)
    if (phps.has(file)) {
      return phps.get(file)
    }

    // Construct a PHP environment for handling requests.
    // This corresponds to a single entrypoint file.
    // Presently the file contents must be passed in as a string,
    // but it could be made to take only a filename and read the file
    // contents itself.
    const php = new Php({
      file: basename(file),
      code: await readFile(file, 'utf8')
    })

    phps.set(file, php)
    return php
  }

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
        const meta = await urlRewriter(req.url)

        if (meta.php) {
          const php = await getPhp(meta.php)

          const reqInput = {
            method: req.method,
            url: urlForRequest(meta.url, req).href,
            headers: fixHeaders(req.headers),
            body: req.body,
          }

          const phpReq = new Request(reqInput)

          try {
            const phpRes = await php.handleRequest(phpReq)

            if (phpRes.log.length) {
              req.log.info(phpRes.log.toString())
            }

            if (phpRes.exception) {
              throw new Error(phpRes.exception)
            }
            console.log(phpRes.headers)
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
        } else if (meta.redirect) {
          reply.redirect(meta.redirect)
        } else {
          reply.sendFile(meta.url)
        }
      }
    })
  }
}

// A full URL string is needed for PHP, but Node.js splits that across a bunch of places.
function urlForRequest(url, req) {
  const proto = req.raw.protocol ?? 'http:'
  const host = req.headers.host ?? 'localhost'
  return new URL(url, `${proto}//${host}`)
}

// Currently header values must be arrays. Need to make it support single values too.
function fixHeaders (headers) {
  return Object.fromEntries(
    Object.entries(headers)
      .map(([key, value]) => [key, [value]])
  )
}
