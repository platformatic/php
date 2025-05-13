import { Generator as ServiceGenerator } from '@platformatic/service'
import { readFile } from 'node:fs/promises'
import { basename, resolve, join } from 'node:path'

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

    template.name = basename(this.config.targetDirectory)
    template.devDependencies = undefined
    template.scripts.test = 'echo "No tests defined".'
    template.engines.node = '>= 22.14.0'

    return template
  }

  async _getConfigFileContents () {
    const packageJson = await this._getStackablePackageJson()
    const { server, watch } = await super._getConfigFileContents()

    return {
      $schema: `https://schemas.platformatic.dev/@platformatic/php/${packageJson.version}.json`,
      module: `${packageJson.name}@${packageJson.version}`,
      php: {
        main: this.config.main || 'index.php',
      },
      server,
      watch
    }
  }

  async _beforePrepare () {
    super._beforePrepare()

    delete this.config.env.PLT_TYPESCRIPT
    delete this.config.defaultEnv.PLT_TYPESCRIPT

    const packageJson = await this._getStackablePackageJson()

    this.config.dependencies = {
      [packageJson.name]: `^${packageJson.version}`
    }
  }

  async _afterPrepare () {
    delete this.files['global.d.ts']
    delete this.files['.gitignore']

    if (!this.config.isUpdating) {
      this.addFile({ path: '', file: 'index.php', contents: await readFile(join(import.meta.dirname, 'index.php'), 'utf-8') })
    }
  }

  async _getStackablePackageJson () {
    if (!this._packageJson) {
      this._packageJson = JSON.parse(await readFile(resolve(import.meta.dirname, '../package.json'), 'utf-8'))
    }

    return this._packageJson
  }
}
