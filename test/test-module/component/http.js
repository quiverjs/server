
'use strict'

var streamConvert = require('quiver-stream-convert')

var helloHttpHandlerBuilder = function(config, callback) {
  var httpHandler = function(requestHead, requestStreamable, callback) {
    var responseHead = {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html'
      }
    }

    var responseStreamable = streamConvert.textToStreamable('hello world')
    callback(null, responseHead, responseStreamable)
  }

  callback(null, httpHandler)
}

var quiverComponents = [
  {
    name: 'test hello http handler',
    type: 'http handler',
    handlerBuilder: helloHttpHandlerBuilder
  }
]

module.exports = {
  quiverComponents: quiverComponents
}