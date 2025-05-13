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
        main: {
          type: 'string',
          description: 'Path to the PHP file to be executed. This file should contain a valid PHP script.'
        },
      },
      required: ['main']
    }
  },
  additionalProperties: false,
  $defs: serviceSchema.$defs
}
