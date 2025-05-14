import path from 'node:path'
import fs from 'node:fs/promises'

/**
 * Generic URL Rewriting Factory
 *
 * A framework-agnostic class for creating URL rewriting strategies
 * commonly used with PHP applications.
 */
class UrlRewriteFactory {
  /**
   * Create a rewrite handler based on the specified pattern
   * @param {string} pattern - The rewriting pattern to use
   * @param {object} options - Configuration options
   * @returns {Function} Rewrite handler function: async (url) => result
   */
  static create (pattern, options = {}) {
    const patterns = {
      'extension-hiding': UrlRewriteFactory.createExtensionHiding,
      'pretty-urls': UrlRewriteFactory.createPrettyUrls,
      wordpress: UrlRewriteFactory.createWordPress,
      laravel: UrlRewriteFactory.createLaravel,
      codeigniter: UrlRewriteFactory.createCodeIgniter,
      symfony: UrlRewriteFactory.createSymfony,
      'front-controller': UrlRewriteFactory.createFrontController,
      custom: UrlRewriteFactory.createCustom
    }

    if (!patterns[pattern]) {
      throw new Error(`Unknown rewrite pattern: ${pattern}`)
    }

    return patterns[pattern](options)
  }

  /**
   * Check if a path exists as a file or directory
   * @param {string} pathToCheck - Path to check
   * @returns {Promise<{exists: boolean, isFile: boolean, isDirectory: boolean}>}
   */
  static async checkPath (pathToCheck) {
    try {
      const stats = await fs.stat(pathToCheck)
      return {
        exists: true,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      }
    } catch (err) {
      return { exists: false, isFile: false, isDirectory: false }
    }
  }

  /**
   * Check if a file exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>}
   */
  static async fileExists (filePath) {
    try {
      await fs.access(filePath, fs.constants.F_OK)
      return true
    } catch (err) {
      return false
    }
  }

  /**
   * Create handler that hides file extensions
   */
  static createExtensionHiding (options = {}) {
    return UrlRewriteFactory.createCustom({
      extensionHiding: true,
      rewriteMethod: 'nothing',
      ...options
    })
  }

  /**
   * Create handler that identifies URLs with extensions for redirection
   */
  static createPrettyUrls (options = {}) {
    const { extension = '.php' } = options

    return async (url) => {
      // Identify URLs with extension for redirection
      if (url.endsWith(extension)) {
        const cleanUrl = url.slice(0, -extension.length)
        // Return special redirect signal with new URL
        return { redirect: true, url: cleanUrl }
      } else {
        // No change needed
        return url
      }
    }
  }

  /**
   * Generic front controller handler
   */
  static createFrontController (options = {}) {
    return UrlRewriteFactory.createCustom({
      frontController: 'index.php',
      rewriteMethod: 'path',
      ...options
    })
  }

  /**
   * Create WordPress-style rewriting handler
   */
  static createWordPress (options = {}) {
    return UrlRewriteFactory.createCustom({
      frontController: 'index.php',
      rewriteMethod: 'path',
      ...options
    })
  }

  /**
   * Create Laravel-style rewriting handler
   */
  static createLaravel (options = {}) {
    return UrlRewriteFactory.createCustom({
      frontController: 'index.php',
      rewriteMethod: 'path',
      ...options
    })
  }

  /**
   * Create CodeIgniter-style rewriting handler
   */
  static createCodeIgniter (options = {}) {
    return UrlRewriteFactory.createCustom({
      frontController: 'index.php',
      rewriteMethod: 'query',
      queryParam: options.queryParam || 'url',
      ...options,
    })
  }

  /**
   * Create Symfony-style rewriting handler
   */
  static createSymfony (options = {}) {
    return UrlRewriteFactory.createCustom({
      frontController: 'index.php',
      rewriteMethod: 'path',
      ...options,
    })
  }

  /**
   * Create custom rewriting handler based on provided options
   */
  static createCustom (options = {}) {
    const {
      baseDir,
      frontController = 'index.php',
      extension = '.php',
      extensionHiding = false,
      prettyUrls = false,
      rewriteMethod = 'path',
      queryParam = 'url'
    } = options

    return async (url) => {

      if (url.endsWith(extension)) {
        const cleanUrl = url.slice(0, -extension.length)
        if (prettyUrls) {
          return { redirect: true, url: cleanUrl }
        } else {
          const filePath = path.join(baseDir, url)
          // TODO protect against directory traversal attacks
          const exists = await UrlRewriteFactory.fileExists(filePath)

          if (exists) {
            return { php: filePath, url }
          }
        }
      }

      // Handle pretty URLs (redirect from .php extension)
      if (prettyUrls && url.endsWith(extension)) {
        const cleanUrl = url.slice(0, -extension.length)
        return { redirect: true, url: cleanUrl }
      }

      const frontControllerPath = path.join(baseDir, frontController)

      // Skip direct requests to front controller
      if (url === `/${frontController}`) {
        return { url, php: frontControllerPath }
      }

      // Extension hiding: Check if a file with extension exists
      if (extensionHiding) {
        const filePath = path.join(baseDir, url + extension)
        // TODO protect against directory traversal attacks
        const exists = await UrlRewriteFactory.fileExists(filePath)

        if (exists) {
          return { php: filePath, url: url + extension }
        }
      }

      // Check if request is for existing file or directory
      const requestedPath = path.join(baseDir, url)
      // TODO protect against directory traversal attacks
      const { exists, isFile } = await UrlRewriteFactory.checkPath(requestedPath)

      if (exists && isFile) {
        return { url }
      }

      // Rewrite to front controller using specified method
      if (rewriteMethod === 'path') {
        // Path parameter style (Laravel, Symfony)
        return { php: frontControllerPath, url: `/${frontController}${url}` }
      } else if (rewriteMethod === 'pathinfo') {
        // PATH_INFO style
        return { php: frontControllerPath, url: `/${frontController}`, pathInfo: url }
      } else if (rewriteMethod === 'nothing') {
        // No rewriting, just return the URL
        return { url }
      } else {
        // Query parameter style (CodeIgniter)
        const cleanPath = url.substring(1) // Remove leading slash
        return { php: frontControllerPath, url: `/${frontController}?${queryParam}=${encodeURIComponent(cleanPath)}` }
      }
    }
  }
}

export default UrlRewriteFactory
