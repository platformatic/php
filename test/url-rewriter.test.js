import { describe, test, beforeEach, afterEach } from 'node:test'
import { strict as assert } from 'node:assert'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import UrlRewriteFactory from '../lib/url-rewriter.js'

// Set up temporary test directory structure
async function setupTestFiles () {
  const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-php-'))

  try {
    // Create test files
    await fs.writeFile(path.join(testDir, 'index.php'), '<?php echo "Index"; ?>')
    await fs.writeFile(path.join(testDir, 'about.php'), '<?php echo "About"; ?>')
    await fs.writeFile(path.join(testDir, 'style.css'), 'body { color: blue; }')

    // Create a subdirectory
    await fs.mkdir(path.join(testDir, 'blog'), { recursive: true })
    await fs.writeFile(path.join(testDir, 'blog', 'index.php'), '<?php echo "Blog"; ?>')

    return testDir
  } catch (err) {
    console.error('Error setting up test files:', err)
    throw err
  }
}

// Clean up test directory
async function cleanupTestFiles (testDir) {
  try {
    await fs.rm(testDir, { recursive: true, force: true })
  } catch (err) {
    console.error('Error cleaning up test files:', err)
  }
}

// Main test suite
describe('UrlRewriteFactory', async () => {
  let testDir

  beforeEach(async () => {
    testDir = await setupTestFiles()
  })

  afterEach(async function () {
    await cleanupTestFiles(testDir)
  })

  // Test helper methods
  test('checkPath should detect files and directories', async () => {
    const filePath = path.join(testDir, 'index.php')
    const dirPath = path.join(testDir, 'blog')
    const nonExistentPath = path.join(testDir, 'nonexistent')

    const fileResult = await UrlRewriteFactory.checkPath(filePath)
    assert.strictEqual(fileResult.exists, true)
    assert.strictEqual(fileResult.isFile, true)
    assert.strictEqual(fileResult.isDirectory, false)

    const dirResult = await UrlRewriteFactory.checkPath(dirPath)
    assert.strictEqual(dirResult.exists, true)
    assert.strictEqual(dirResult.isFile, false)
    assert.strictEqual(dirResult.isDirectory, true)

    const nonExistentResult = await UrlRewriteFactory.checkPath(nonExistentPath)
    assert.strictEqual(nonExistentResult.exists, false)
    assert.strictEqual(nonExistentResult.isFile, false)
    assert.strictEqual(nonExistentResult.isDirectory, false)
  })

  test('fileExists should detect files correctly', async () => {
    const existingFile = path.join(testDir, 'index.php')
    const nonExistentFile = path.join(testDir, 'nonexistent.php')

    assert.strictEqual(await UrlRewriteFactory.fileExists(existingFile), true)
    assert.strictEqual(await UrlRewriteFactory.fileExists(nonExistentFile), false)
  })

  // Test extension hiding
  test('extension-hiding should add extension to URLs', async () => {
    const handler = UrlRewriteFactory.create('extension-hiding', {
      baseDir: testDir
    })

    // Should add .php extension when file exists
    assert.deepStrictEqual(await handler('/about'), {
      php: path.join(testDir, 'about.php'),
      url: '/about.php'
    })

    // Should not modify URL when file with extension doesn't exist
    assert.deepEqual(await handler('/contact'), {
      url: '/contact'
    })

    // Should not modify URL that already has extension
    assert.deepEqual(await handler('/about.php'), {
      php: path.join(testDir, 'about.php'),
      url: '/about.php'
    })

    // Should not modify URL for existing non-PHP files
    assert.deepEqual(await handler('/style.css'), {
      url: '/style.css'
    })
  })

  // Test pretty URLs
  test('pretty-urls should identify URLs for redirection', async () => {
    const handler = UrlRewriteFactory.create('pretty-urls', {
      baseDir: testDir
    })

    // Should flag .php URLs for redirection
    const result = await handler('/about.php')
    assert.deepStrictEqual(result, { redirect: true, url: '/about' })

    // Should not modify URLs without .php
    assert.strictEqual(await handler('/about'), '/about')

    // Should handle URLs with query strings (these would be preserved by the adapter)
    assert.deepStrictEqual(await handler('/contact.php'), { redirect: true, url: '/contact' })
  })

  // Test WordPress rewriting
  test('wordpress rewriting should redirect to index.php', async () => {
    const handler = UrlRewriteFactory.create('wordpress', {
      baseDir: testDir
    })

    // Should not modify direct requests to index.php
    assert.deepStrictEqual(await handler('/index.php'), {
      php: path.join(testDir, 'index.php'),
      url: '/index.php'
    })

    // Should not modify requests to existing files
    assert.deepStrictEqual(await handler('/style.css'), {
      url: '/style.css'
    })

    // Should rewrite non-existent URLs to index.php
    assert.deepEqual(await handler('/nonexistent'), {
      php: path.join(testDir, 'index.php'),
      url: '/index.php/nonexistent'
    })
    assert.deepEqual(await handler('/blog/post/123'), {
      php: path.join(testDir, 'index.php'),
      url: '/index.php/blog/post/123'
    })
  })

  // Test Laravel rewriting
  test('laravel rewriting should use path parameter style', async () => {
    const handler = UrlRewriteFactory.create('laravel', {
      baseDir: testDir
    })

    // Should rewrite non-existent URLs to index.php with path
    assert.deepEqual(await handler('/users/profile'), {
      php: path.join(testDir, 'index.php'),
      url: '/index.php/users/profile'
    })

    // Should not modify requests to existing files
    assert.deepEqual(await handler('/style.css'), {
      url: '/style.css'
    })
  })

  // Test CodeIgniter rewriting
  test('codeigniter rewriting should use query parameter style', async () => {
    const handler = UrlRewriteFactory.create('codeigniter', {
      baseDir: testDir
    })

    // Should rewrite non-existent URLs to index.php with query params
    assert.deepEqual(await handler('/users/profile'), {
      php: path.join(testDir, 'index.php'),
      url: '/index.php?url=users%2Fprofile'
    })

    // Should not modify requests to existing files
    assert.deepEqual(await handler('/style.css'), {
      url: '/style.css'
    })

    // Should use custom query parameter if specified
    const customHandler = UrlRewriteFactory.create('codeigniter', {
      baseDir: testDir,
      queryParam: 'route'
    })

    assert.deepEqual(await customHandler('/users/profile'), {
      php: path.join(testDir, 'index.php'),
      url: '/index.php?route=users%2Fprofile'
    })
  })

  // Test Symfony rewriting
  test('symfony rewriting should use path parameter style', async () => {
    const handler = UrlRewriteFactory.create('symfony', {
      baseDir: testDir
    })

    // Should rewrite non-existent URLs to index.php with path
    assert.deepEqual(await handler('/api/users'), {
      php: path.join(testDir, 'index.php'),
      url: '/index.php/api/users'
    })

    // Should not modify requests to existing files
    assert.deepEqual(await handler('/style.css'), {
      url: '/style.css'
    })
  })

  // Test front controller with PATH_INFO
  test('front controller with pathinfo should return object with pathInfo', async () => {
    const handler = UrlRewriteFactory.create('front-controller', {
      baseDir: testDir,
      rewriteMethod: 'pathinfo'
    })

    // Should return object with url and pathInfo properties
    const result = await handler('/api/users')
    assert.deepStrictEqual(result, {
      url: '/index.php',
      pathInfo: '/api/users',
      php: path.join(testDir, 'index.php')
    })
  })

  // Test custom rewriting
  test('custom rewriting should combine multiple strategies', async () => {
    const handler = UrlRewriteFactory.create('custom', {
      baseDir: testDir,
      extensionHiding: true,
      prettyUrls: true,
      rewriteMethod: 'path'
    })

    // Should handle pretty URLs redirection
    assert.deepStrictEqual(await handler('/about.php'), { redirect: true, url: '/about' })

    // Should handle extension hiding
    assert.deepStrictEqual(await handler('/about'), {
      php: path.join(testDir, 'about.php'),
      url: '/about.php'
    })

    // Should fall back to front controller for non-existent URLs
    assert.deepStrictEqual(await handler('/nonexistent'), {
      php: path.join(testDir, 'index.php'),
      url: '/index.php/nonexistent',
    })

    // Should not modify requests to existing files
    assert.deepStrictEqual(await handler('/style.css'), {
      url: '/style.css'
    })
  })

  // Test factory method with invalid pattern
  test('create should throw error for invalid pattern', () => {
    assert.throws(() => {
      UrlRewriteFactory.create('invalid-pattern')
    }, /Unknown rewrite pattern/)
  })
})
