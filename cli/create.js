#!/usr/bin/env node

import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { Generator } from '../lib/generator.js'

async function execute () {
  const args = parseArgs({
    args: process.argv.slice(2),
    options: {
      dir: {
        type: 'string',
        default: join(process.cwd(), 'plt-php')
      },
      port: { type: 'string', default: '3042' },
      hostname: { type: 'string', default: '0.0.0.0' },
      main: { type: 'string', default: 'index.php' },
    }
  })

  const generator = new Generator()

  generator.setConfig({
    targetDirectory: args.values.dir,
    port: parseInt(args.values.port),
    hostname: args.values.hostname,
    main: args.values.main,
  })

  await generator.run()

  console.log('Application created successfully! Run `npm run start` to start an application.')
}

execute()
