
'use strict'

var moduleLib = require('quiver-module')
var serverLib = require('quiver-server')

var quiverModule = moduleLib.exportFromManifestSync(require, './package.json')

module.exports = {
  quiverModule: quiverModule
}

if(require.main == module) {
  serverLib.runModuleAsServer(quiverModule)
}