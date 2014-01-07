
'use strict'

var helloStreamHandlerBuilder = function(config, callback) {
  var greet = config.greet || 'hello'

  var handler = function(args, callback) {
    var name = args.path.slice(1)
    var greeting = greet + ', ' +  name

    if(args.repeat) greeting = greeting + greeting
    callback(null, greeting)
  }

  callback(null, handler)
}

var quiverComponents = [
  {
    name: 'test hello stream handler',
    type: 'simple handler',
    inputType: 'void',
    outputType: 'text',
    handlerBuilder: helloStreamHandlerBuilder
  }
]

module.exports = {
  quiverComponents: quiverComponents
}