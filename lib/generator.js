import { Generator as ServiceGenerator } from '@platformatic/service'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { packageJson } from '../lib/schema.js'

export class Generator extends ServiceGenerator {
  constructor (opts = {}) {
    super({
      ...opts,
      module: '@platformatic/php'
    })
  }

  getDefaultConfig () {
    const res = {
      ...super.getDefaultConfig(),
      plugin: false,
      tests: false
    }

    return res
  }

  async generatePackageJson () {
    const template = await super.generatePackageJson()

    template.devDependencies = undefined
    template.scripts.test = 'echo "No tests defined".'
    template.engines.node = '>= 22.14.0'

    return template
  }

  async _getConfigFileContents () {
    const { server, watch } = await super._getConfigFileContents()

    return {
      $schema: `https://schemas.platformatic.dev/@platformatic/php/${packageJson.version}.json`,
      module: `${packageJson.name}`,
      php: {
        docroot: 'public'
      },
      server,
      watch
    }
  }

  async _beforePrepare () {
    super._beforePrepare()

    delete this.config.env.PLT_TYPESCRIPT
    delete this.config.defaultEnv.PLT_TYPESCRIPT

    this.config.dependencies = {
      [packageJson.name]: `^${packageJson.version}`
    }
  }

  async _afterPrepare () {
    delete this.files['global.d.ts']
    delete this.files['.gitignore']

    if (!this.config.isUpdating) {
      this.addFile({
        path: 'public',
        file: 'index.php',
        contents: await readFile(join(import.meta.dirname, 'index.php'), 'utf-8')
      })
    }
  }
}
