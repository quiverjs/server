
'use strict'

var urlLib = require('url')
var pathLib = require('path')
var httpLib = require('http')
var optimist = require('optimist')
var error = require('quiver-error').error
var moduleLib = require('quiver-module')
var mergeObjects = require('quiver-merge').mergeObjects
var componentLib = require('quiver-component')
var handleableLib = require('quiver-handleable')
var nodeHandlerLib = require('quiver-node-handler')

var moduleCtx = moduleLib.enterContext(require)

var simpleHttpHandlerBuilder = function(config, callback) {
  var mainHandler = config.quiverStreamHandlers['main stream handler']

  var httpHandler = function(requestHead, requestStreamable, callback) {
    var path = urlLib.parse(requestHead.url, true).pathname
    var args = {
      path: path,
      rootPath: path,
      requestHead: requestHead
    }

    mainHandler(args, requestStreamable, function(err, resultStreamable) {
      if(err) return callback(err)

      var responseHead = {
        statusCode: 200,
        headers: { }
      }

      if(resultStreamable.contentType) {
        responseHead.headers['content-type'] = resultStreamable.contentType
      }

      callback(null, responseHead, resultStreamable)
    })
  }

  callback(null, httpHandler)
}

var loadComponentAndConfig = function(quiverModule, configPath, callback) {
  moduleLib.loadComponentsFromQuiverModule(quiverModule, function(err, quiverComponents) {
    if(err) return callback(err)

    componentLib.installComponents(quiverComponents, function(err, componentConfig) {
      if(err) return callback(err)

      if(!configPath) return callback(null, componentConfig)

      moduleCtx.requireAsync(configPath, function(err, config) {
        if(err) return callback(err)

        var mergedConfig = mergeObjects([config, componentConfig])
        callback(null, mergedConfig)
      })
    })
  })
}

var loadHandlerFromConfig = function(config, handlerName, handlerConvert, callback) {
  if(!handlerName) return callback(error(400, 'handler name not specified'))

  var handleableBuilder = config.quiverHandleableBuilders[handlerName]

  if(!handleableBuilder) return callback(error(500,
    'handleable builder not found: ' + handlerName))

  handleableBuilder(config, function(err, handleable) {
    if(err) return callback(err)

    var handler = handlerConvert.handleableToHandler(handleable)

    if(!handler) return callback(error(500,
      'handler ' + handlerName + ' is not of type ' + handlerConvert.handlerType))

    callback(null, handler)
  })
}

var loadHttpHandlerFromStreamHandler = function(config, commandArgs, callback) {
  var mainHandlerName = commandArgs.main || config.main

  if(!mainHandlerName) return callback(error(500, 
    'No main quiver component specified'))

  loadHandlerFromConfig(config, mainHandlerName, handleableLib.streamHandlerConvert, 
    function(err, handler) {
      if(er) return callback(err)

      var inConfig = {
        quiverStreamHandlers: {
          'main stream handler': handler
        }
      }

      simpleHttpHandlerBuilder(inConfig, callback)
    })
}

var loadHttpHandler = function(config, commandArgs, callback) {
  var mainHttpHandlerName = commandArgs.mainHttp || config.mainHttp

  if(mainHttpHandlerName) {
    loadHandlerFromConfig(config, mainHttpHandlerName, handleableLib.httpHandlerConvert, callback)
  } else {
    loadHttpHandlerFromStreamHandler(config, commandArgs, callback)
  }
}

var runServer = function(quiverModule, commandArgs, basePath, callback) {
  var configPath = commandArgs.config
  if(configPath) configPath = pathLib.join(basePath, configPath)

  loadComponentAndConfig(quiverModule, configPath, function(err, config) {
    if(err) return callback(err)

    loadHttpHandler(config, commandArgs, function(err, httpHandler) {
      if(err) return callback(err)

      var nodeHandler = nodeHandlerLib.createNodeHttpHandlerAdapter(httpHandler)
      var serverPort = commandArgs['server-port'] || config.serverPort || 8080

      var server = httpLib.createServer(nodeHandler)
      server.listen(serverPort)

      callback(null, serverPort)
    })
  })
}

var runModuleAsServer = function(quiverModule) {
  runServer(quiverModule, optimist.argv, process.cwd(), function(err, listenPort) {
    if(err) throw err

    console.log('listening to port ' + listenPort + '...')
  })
}

var runQuiverServer = function(commandArgs, basePath, callback) {
  var modulePath = commandArgs._[0]

  if(!modulePath) return callback(error(400, 
    'module path is not specified as first argument'))

  modulePath = pathLib.join(basePath, modulePath)

  moduleCtx.requireAsync(modulePath, function(err, module) {
    if(err) return callback(err)

    var quiverModule = module.quiverModule
    if(!quiverModule) return callback(error(500, 
      'module ' + modulePath + ' is not a quiver module!'))

    runServer(quiverModule, commandArgs, basePath, callback)
  })
}

module.exports = {
  runModuleAsServer: runModuleAsServer,
  runQuiverServer: runQuiverServer
}