# @platformatic/php

A PHP stackable for [Platformatic](https://platformatic.dev/) that enables running PHP applications within the Platformatic ecosystem. This package integrates PHP execution with Fastify servers, allowing you to serve PHP files alongside Node.js applications.

## Features

- 🚀 Run PHP applications within Platformatic services
- 🔄 Automatic request/response handling between Node.js and PHP
- 📁 Static file serving for non-PHP assets
- ⚡ Hot reloading during development
- 🛠️ Code generation for new PHP projects
- 🔧 Environment-based configuration

## Requirements

- Node.js >= 22.14.0
- The PHP runtime is built thanks to [`@platformatic/php-node`](https://github.com/platformatic/php-node).

## Installation

```bash
npm install @platformatic/php
```

## Quick Start

### Create a New PHP Project

```bash
npx --package=@platformatic/php create-platformatic-php --dir my-php-app --port 3042
cd my-php-app
npm install
npm start
```

### CLI Options

- `--dir` - Target directory (default: `plt-php`)
- `--port` - Server port (default: `3042`)
- `--hostname` - Server hostname (default: `0.0.0.0`)
- `--main` - Main PHP file (default: `index.php`)

## Configuration

The stackable uses a `platformatic.json` configuration file:

```json
{
  "$schema": "https://schemas.platformatic.dev/@platformatic/php/0.4.3.json",
  "module": "@platformatic/php",
  "php": {
    "docroot": "public"
  },
  "server": {
    "hostname": "{PLT_SERVER_HOSTNAME}",
    "port": "{PORT}",
    "logger": { "level": "{PLT_SERVER_LOGGER_LEVEL}" }
  },
  "watch": true
}
```

### Configuration Options

#### php
- `docroot` (string, required) - Path to the root directory containing PHP files

#### server
Standard Platformatic server configuration options are supported.

## Project Structure

A generated PHP project includes:

```
my-php-app/
├── public/
│   └── index.php          # Main PHP file
├── .env                   # Environment variables
├── .env.sample           # Environment template
├── .gitignore
├── package.json
└── platformatic.json     # Platformatic configuration
```

## Development

### Available Scripts

- `npm start` - Start the development server
- `npm test` - Run tests
- `npm run build` - Build schema and types

### Environment Variables

- `PLT_SERVER_HOSTNAME` - Server hostname (default: `0.0.0.0`)
- `PORT` - Server port (default: `3042`)
- `PLT_SERVER_LOGGER_LEVEL` - Log level (default: `info`)

## How It Works

1. **Request Routing**: All HTTP requests are captured by wildcard routes
2. **PHP Execution**: Requests are forwarded to PHP via `@platformatic/php-node`
3. **Static Files**: Non-PHP files in the docroot are served statically
4. **Response Handling**: PHP responses are processed and returned through Fastify

## API

### Stackable Export

```javascript
import { stackable } from '@platformatic/php'
// or
import php from '@platformatic/php'
```

### Generator

```javascript
import { Generator } from '@platformatic/php'

const generator = new Generator()
generator.setConfig({
  targetDirectory: './my-app',
  port: 3042,
  hostname: '0.0.0.0'
})
await generator.run()
```

## Examples

### Basic PHP Application

```php
<?php
// public/index.php
header("Content-Type: application/json");
echo json_encode([
    "message" => "Hello from PHP!",
    "timestamp" => date('c')
]);
?>
```

### Handling POST Requests

```php
<?php
// public/api.php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    header("Content-Type: application/json");
    echo json_encode([
        "received" => $input,
        "method" => $_SERVER['REQUEST_METHOD']
    ]);
}
?>
```

## Contributing

This project is part of the [Platformatic](https://github.com/platformatic) ecosystem. Please refer to the main repository for contribution guidelines.

## License

Apache-2.0

## Support

- [GitHub Issues](https://github.com/platformatic/php/issues)
- [Platformatic Documentation](https://docs.platformatic.dev/)
- [Community Discord](https://discord.gg/platformatic)
