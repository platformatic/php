#!/usr/bin/env node

import { printAndExitLoadConfigError } from '@platformatic/config'
import { start } from '@platformatic/service'
import { stackable } from '../lib/index.js'

start(stackable, process.argv.splice(2)).catch(printAndExitLoadConfigError)
