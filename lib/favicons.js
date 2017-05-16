'use strict'
const loaderUtils = require('loader-utils')
const favicons = require('favicons/es5')
const faviconPersitenceCache = require('./cache')

module.exports = function (content) {
  const self = this
  self.cacheable && this.cacheable()

  if (!self.emitFile) throw new Error('emitFile is required from module system')
  if (!self.async) throw new Error('async is required')

  const callback = self.async()
  const query = loaderUtils.parseQuery(self.query)

  const pathPrefix = loaderUtils.interpolateName(self, query.outputFilePrefix, {
    content,
    context: query.context || this.options.context,
    regExp: query.regExp
  })

  const fileHash = loaderUtils.interpolateName(self, '[hash]', {
    content,
    context: query.context || this.options.context,
    regExp: query.regExp
  })

  const cacheFile = pathPrefix + '.cache'

  faviconPersitenceCache.loadIconsFromDiskCache(self, query, cacheFile, fileHash, (err, cachedResult) => {
    if (err) return callback(err)
    if (cachedResult) {
      return callback(null, 'module.exports = ' + JSON.stringify(cachedResult))
    }
    // Generate icons
    generateIcons(self, content, pathPrefix, query, (err, iconResult) => {
      if (err) return callback(err)
      faviconPersitenceCache.emitCacheInformationFile(self, query, cacheFile, fileHash, iconResult)
      callback(null, 'module.exports = ' + JSON.stringify(iconResult))
    })
  })
}

function getPublicPath (compilation) {
  var publicPath = compilation.outputOptions.publicPath || ''

  if (publicPath.length && publicPath.substr(-1) !== '/') {
    publicPath += '/'
  }

  return publicPath
}

function generateIcons (loader, imageFileStream, pathPrefix, query, callback) {
  var publicPath = getPublicPath(loader._compilation)
  query = JSON.parse(JSON.stringify(query))

  favicons(imageFileStream, {
    path: '',
    url: '',
    icons: query.icons,
    background: query.background,
    appName: query.appName
  }, (err, result) => {
    if (err) return callback(err)

    var html = result.html
      .filter(entry => entry.indexOf('manifest') === -1)
      .map(entry => entry.replace(/(href=[""])/g, '$1' + publicPath + pathPrefix))

    if (query.disableWebApp) {
      html = html.filter(entry => entry.indexOf('mobile-web-app-capable') === -1)
    }

    var loaderResult = {
      outputFilePrefix: pathPrefix,
      html,
      files: []
    }

    result.images.forEach(image => {
      loaderResult.files.push(pathPrefix + image.name)
      loader.emitFile(pathPrefix + image.name, image.contents)
    })

    result.files.forEach(file => {
      loaderResult.files.push(pathPrefix + file.name)
      loader.emitFile(pathPrefix + file.name, file.contents)
    })

    callback(null, loaderResult)
  })
}

module.exports.raw = true
