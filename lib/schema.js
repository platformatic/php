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
        docroot: {
          type: 'string',
          description: 'Path to the root of the PHP project',
          resolvePath: true
        },
        rewriter: {
          type: 'array',
          description: 'A sequence of conditional rewrites to apply to PHP requests',
          items: {
            type: 'object',
            description: 'A single conditional rewrite to apply to PHP requests',
            properties: {
              operation: {
                type: 'string',
                enum: ['and', 'or'],
                description: 'Logical operation with which to group conditions'
              },
              conditions: {
                type: 'array',
                description: 'Conditions to match before applying rewrites',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    args: { type: 'array', items: { type: 'string' } }
                  }
                }
              },
              rewriters: {
                type: 'array',
                description: 'Set of rewrites to apply if conditions are met',
                minItems: 1,
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    args: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            },
            // If rewriter config is provided, it must have at least one rewriter
            required: ['rewriters'],
          }
        }
      },
      required: ['docroot'],
    }
  },
  additionalProperties: false,
  $defs: serviceSchema.$defs
}
