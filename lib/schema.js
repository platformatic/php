import { schema as serviceSchema } from '@platformatic/service'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const packageJson = JSON.parse(readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf-8'))

export const schema = {
  $id: `https://schemas.platformatic.dev/@platformatic/php/${packageJson.version}.json`,
  title: 'Platformatic PHP configuration',
  version: packageJson.version,
  type: 'object',
  properties: {
    ...serviceSchema.properties,
    php: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the root of the PHP project',
          resolvePath: true
        },
        // TODO(mcollina): fill this in
        rewriteRules: {
          anyOf: [{
            type: 'string',
            description: 'URL rewriting strategy to use. Supported values: "extension-hiding", "pretty-urls", "wordpress", "laravel", "codeigniter", "symfony", "front-controller", "custom".',
          }, {
            type: 'object',
            description: 'Custom URL rewriting rules. Must be a valid JSON object.',
            properties: {
              base: {
                type: 'string',
                description: 'Custom URL rewriting pattern.',
                default: 'custom'
              },
              options: {
                type: 'object',
                description: 'Options for the custom URL rewriting pattern.'
              }
            },
          }]
        }
      },
      required: ['path'],
    }
  },
  additionalProperties: false,
  $defs: serviceSchema.$defs
}
