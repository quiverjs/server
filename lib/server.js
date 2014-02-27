
'use strict'

var urlLib = require('url')
var pathLib = require('path')
var httpLib = require('http')
var optimist = require('optimist')
var configLib = require('quiver-config')
var error = require('quiver-error').error
var moduleLib = require('quiver-module')
var mergeObjects = require('quiver-merge').mergeObjects
var componentLib = require('quiver-component')
var handleableLib = require('quiver-handleable')
var nodeHandlerLib = require('quiver-node-handler')

var getCommandArgs = function() {
  return optimist.argv
}

var startServerCallback = function(err, listenPort) {
  if(err) throw err

  console.log('listening to port ' + listenPort + '...')
}

var simpleHttpHandlerBuilder = function(config, callback) {
  configLib.getStreamHandler(config, 'main stream handler',  function(err, mainHandler) {
    if(err) return callback(err)

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
  })
}

var streamHandlerToHttpHandler = function(streamHandler, callback) {
  var inConfig = {
    quiverStreamHandlers: {
      'main stream handler': streamHandler
    }
  }

  simpleHttpHandlerBuilder(inConfig, callback)
}

var loadHttpHandler = function(config, mainHandlerName, callback) {
  configLib.loadHandleable(config, mainHandlerName, function(err, handleable) {
    if(err) return callback(err)
    
    if(handleable.toHttpHandler) {
      callback(null, handleable.toHttpHandler())
    } else if(handleable.toStreamHandler) {
      streamHandlerToHttpHandler(handleable.toStreamHandler(), callback)
    } else {
      callback(error(400, 
        'handler component is not of type stream/http handler'))
    }
  })
}

var runServerWithConfig = function(config, commandArgs, callback) {
  var mainHandlerName = commandArgs.main || config.main
  if(!mainHandlerName) return callback(error(400,
      'main handler name not specified in command args or config'))

  loadHttpHandler(config, mainHandlerName, function(err, httpHandler) {
    if(err) return callback(err)

    var nodeHandler = nodeHandlerLib.createNodeHttpHandlerAdapter(httpHandler)
    var serverPort = commandArgs['server-port'] || config.serverPort || 8080

    var server = httpLib.createServer(nodeHandler)
    server.listen(serverPort)

    callback(null, serverPort)
  })
}

var runServerWithComponents = function(quiverComponents, commandArgs, basePath, callback) {
  var inputConfig = { }
  var configPath = commandArgs.config

  if(configPath) {
    configPath = pathLib.join(basePath, configPath)
    inputConfig = require(configPath)
  }

  componentLib.installComponents(quiverComponents, function(err, componentConfig) {
    if(err) return callback(err)
    
    var config = mergeObjects([inputConfig, componentConfig])

    runServerWithConfig(config, commandArgs, callback)
  })
}

var runComponentsAsServer = function(quiverComponents, callback) {
  if(!callback) callback = startServerCallback

  var commandArgs = getCommandArgs()
  runServerWithComponents(quiverComponents, commandArgs, process.cwd(), callback)
}

var runModuleAsServer = function(quiverModule, callback) {
  if(!callback) callback = startServerCallback

  var quiverComponents = moduleLib.loadComponentsFromQuiverModule(quiverModule)
  runComponentsAsServer(quiverComponents, callback)
}

var runAsServerCommand = function(commandArgs, callback) {
  if(!callback) callback = startServerCallback

  var basePath = process.cwd()
  var modulePath = commandArgs._[0]

  if(!modulePath) throw new Error(
    'module path is not provided as first argument')

  modulePath = pathLib.join(basePath, modulePath)
  var quiverComponents = moduleLib.loadComponentsFromPathSync(modulePath)

  runServerWithComponents(quiverComponents, commandArgs, basePath, callback)
}

module.exports = {
  getCommandArgs: getCommandArgs,
  runServerWithConfig: runServerWithConfig,
  runServerWithComponents: runServerWithComponents,
  runComponentsAsServer: runComponentsAsServer,
  runModuleAsServer: runModuleAsServer,
  runAsServerCommand: runAsServerCommand,
}