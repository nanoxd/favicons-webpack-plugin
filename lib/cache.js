/**
 * @file this file is responsible for the persitance disk caching
 * it offers helpers to prevent recompilation of the favicons on
 * every build
 */
'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const pluginVersion = require('../package.json').version

/**
 * Stores the given iconResult together with the control hashes as JSON file
 */
function emitCacheInformationFile (loader, query, cacheFile, fileHash, iconResult) {
  if (!query.persistentCache) {
    return
  }

  loader.emitFile(cacheFile, JSON.stringify({
    hash: fileHash,
    version: pluginVersion,
    optionHash: generateHashForOptions(query),
    result: iconResult
  }))
}

/**
 * Checks if the given cache object is still valid
 */
function isCacheValid (cache, fileHash, query) {
  // Verify that the source file is the same
  return cache.hash === fileHash &&
    // Verify that the options are the same
    cache.optionHash === generateHashForOptions(query) &&
    // Verify that the favicons version of the cache maches this version
    cache.version === pluginVersion
}

/**
 * Try to load the file from the disc cache
 */
function loadIconsFromDiskCache (loader, query, cacheFile, fileHash, callback) {
  // Stop if cache is disabled
  if (!query.persistentCache) return callback(null)
  const resolvedCacheFile = path.resolve(loader._compiler.parentCompilation.compiler.outputPath, cacheFile)

  fs.open(resolvedCacheFile, 'r', (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        callback(null)
      }

      callback(err)
    }

    let cache

    try {
      cache = JSON.parse(content)
      // Bail out if the file or the option changed
      if (!isCacheValid(cache, fileHash, query)) {
        callback(null)
      }
    } catch (e) {
      callback(e)
    }

    callback(null, cache.result)
  })
}

/**
 * Generates a md5 hash for the given options
 */
const generateHashForOptions = options =>
  crypto.createHash('md5')
    .update(JSON.stringify(options))
    .digest('hex')

module.exports = {
  loadIconsFromDiskCache,
  emitCacheInformationFile
}
