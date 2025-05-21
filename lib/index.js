import { buildStackable } from '@platformatic/service'
import { Generator as _Generator } from './generator.js'
import { plugin } from './plugin.js'
import { packageJson, schema } from './schema.js'

export async function stackable (fastify, opts) {
  await fastify.register(plugin, opts)
}

stackable.Generator = _Generator
stackable.configType = 'php'
stackable.schema = schema
stackable.configManagerConfig = {
  schemaOptions: {
    useDefaults: true,
    coerceTypes: true,
    allErrors: true,
    strict: false
  }
}

export const Generator = _Generator

export default {
  configType: 'php',
  configManagerConfig: stackable.configManagerConfig,
  /* c8 ignore next 3 */
  async buildStackable (opts) {
    return buildStackable(opts, stackable)
  },
  schema,
  version: packageJson.version
}
