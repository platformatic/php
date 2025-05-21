import { safeRemove } from '@platformatic/utils'
import { deepStrictEqual, strictEqual } from 'node:assert'
import { mkdtemp, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import test from 'node:test'
import { Generator } from '../lib/generator.js'

test('should return a default Generator config', async () => {
  const generator = new Generator()
  const defaultConfig = generator.getDefaultConfig()

  strictEqual(defaultConfig.hostname, '0.0.0.0')
  strictEqual(defaultConfig.port, 3042)
  strictEqual(defaultConfig.plugin, false)
  strictEqual(defaultConfig.tests, false)
  strictEqual(defaultConfig.typescript, false)
  deepStrictEqual(defaultConfig.env, {})
  deepStrictEqual(defaultConfig.dependencies, {})
  deepStrictEqual(defaultConfig.devDependencies, {})
})

test('should return Generator config fields definitions', async () => {
  const generator = new Generator()
  const configFieldsDefs = generator.getConfigFieldsDefinitions()

  deepStrictEqual(configFieldsDefs, [
    {
      var: 'PLT_SERVER_HOSTNAME',
      label: 'What is the hostname?',
      default: '0.0.0.0',
      type: 'string',
      configValue: 'hostname'
    },
    {
      var: 'PLT_SERVER_LOGGER_LEVEL',
      label: 'What is the logger level?',
      default: 'info',
      type: 'string',
      configValue: ''
    },
    {
      label: 'Which port do you want to use?',
      var: 'PORT',
      default: 3042,
      type: 'number',
      configValue: 'port'
    }
  ])
})

test('should generate a stackable app', async t => {
  const testDir = await mkdtemp(resolve(tmpdir(), 'stackable-'))
  t.after(() => safeRemove(testDir))

  const generator = new Generator()

  generator.setConfig({
    serviceName: 'stackable-app',
    targetDirectory: testDir,
    hostname: 'server.example.com',
    broker: 'kafka.example.com:9092',
    topic: 'topic',
    url: 'http://api.example.com',
    consumerGroup: 'group'
  })

  await generator.prepare()
  await generator.writeFiles()

  {
    const files = await readdir(testDir)
    deepStrictEqual(files.sort(), ['.env', '.env.sample', '.gitignore', 'package.json', 'platformatic.json', 'public'])
  }

  {
    const files = await readdir(join(testDir, 'public')) 
    deepStrictEqual(files.sort(), ['index.php'])
  }

  const phpPackageJson = JSON.parse(await readFile(resolve(import.meta.dirname, '../package.json'), 'utf8'))
  const stackablePackageJson = JSON.parse(await readFile(resolve(testDir, 'package.json'), 'utf8'))
  deepStrictEqual(stackablePackageJson, {
    dependencies: {
      '@platformatic/php': `^${phpPackageJson.version}`
    },
    engines: {
      node: '>= 22.14.0'
    },
    name: 'stackable-app',
    scripts: {
      start: 'platformatic start',
      test: 'echo "No tests defined".'
    }
  })

  const stackableConfig = JSON.parse(await readFile(resolve(testDir, 'platformatic.json'), 'utf8'))

  deepStrictEqual(stackableConfig, {
    $schema: `https://schemas.platformatic.dev/@platformatic/php/${phpPackageJson.version}.json`,
    module: '@platformatic/php',
    php: {
      docroot: 'public'
    },
    server: {
      hostname: '{PLT_SERVER_HOSTNAME}',
      port: '{PORT}',
      logger: { level: '{PLT_SERVER_LOGGER_LEVEL}' }
    },
    watch: true
  })
})
