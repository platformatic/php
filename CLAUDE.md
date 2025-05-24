# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `@platformatic/php` - a PHP stackable for Watt that integrates PHP applications with the Platformatic framework. It enables serving PHP files through a Fastify server with proper request/response handling.

## Development Commands

- `npm test` - Run tests using Node.js built-in test runner
- `npm run build` - Generate schema.json and config.d.ts from schema definitions  
- `npm run ci` - Run linting and tests (assumes lint script exists)
- `npm run dl-wordpress` - Download WordPress for testing/development

## Architecture

The project follows Platformatic's stackable pattern:

### Core Components

- **lib/index.js** - Main stackable export with configuration and plugin registration
- **lib/plugin.js** - Fastify plugin that handles PHP request routing and execution
- **lib/generator.js** - Code generator for creating new PHP stackable projects
- **lib/schema.js** - JSON schema definitions for configuration validation

### Key Architecture Patterns

1. **Stackable Integration**: Extends `@platformatic/service` with PHP-specific functionality
2. **Request Handling**: All HTTP methods are captured by wildcard routes and forwarded to PHP via `@platformatic/php-node`
3. **Static File Serving**: Non-PHP files in docroot are served statically with `@fastify/static`
4. **Header Processing**: HTTP headers are capitalized for PHP compatibility
5. **Configuration Schema**: Uses JSON schema with automatic TypeScript generation

### Generated Project Structure

When using the generator, projects include:
- `public/` directory as PHP docroot with `index.php`
- `platformatic.json` configuration file
- `.env` and `.env.sample` for environment variables
- Node.js v22.14.0+ requirement

### Testing Approach

- Uses Node.js built-in test runner (`node --test`)
- Tests cover generator functionality, configuration validation, and file generation
- Test fixtures in `test/fixtures/` for integration testing