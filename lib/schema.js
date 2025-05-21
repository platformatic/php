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
        }
      },
      required: ['docroot'],
    }
  },
  additionalProperties: false,
  $defs: serviceSchema.$defs
}
