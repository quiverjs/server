
'use strict'

var moduleLib = require('quiver-module').enterContext(require)
var commandLib = require('quiver-server')

var quiverModule = moduleLib.exportFromManifest('./package.json')

module.exports = {
  quiverModule: quiverModule
}

if(require.main == module) {
  commandLib.runModuleAsServer(quiverModule)
}