/*
 * prettyy much Tim Caswells stack with some small mods
 */
module.exports = stak;

var log = require('blunt-log')
var Url = require('url')
var _slice  = Array.prototype.slice

function stak(/* layers */) {
  var error = stak.error
  var handle = error

  _slice.call(arguments)
    .reverse()
    .forEach(function(layer) {
      var child = handle
      handle = function(req, res) {
        req.originalUrl = req.originalUrl || req.url
        try {
          layer(req, res, function(err) {
            if(err) return error(req, res, err)
            child(req, res)
          })
        } catch(err) {
          error(req, res, err)
        }
      };
  })

  return handle;
}

stak.error = function(req, res, err) {
  if(err) {
    log.err('stak error', err.stack)
    res.writeHead(500, { "Content-Type": "text/plain" })
    return res.end(err.stack + '\n')
  }

  res.writeHead(404, { "Content-Type": "text/plain" })
  res.end('Not Found\n')
}

function core(req, res, next) { next() }

stak.compose = function compose(/*layers*/) {
  if(arguments.length == 1) return arguments[0]

  var stack = core
  _slice.call(arguments)
  .reverse()
  .forEach(function(layer) {
    var child = stack
    stack = function(req, res, next) {
      var ctx = this
      req.originalUrl = req.originalUrl || req.url
      try {
        layer.call(ctx, req, res, function(err) {
          if(err) return next(err)
          child.call(ctx, req, res, next)
        })
      } catch(err) {
        next.call(ctx, err)
      }
    }
  })

  return stack;
}


stak.mount = function(mp) {
  var stack = stak.compose.apply(null, _slice.call(arguments, 1))
  if(mp.substr(mp.length -1) == '/') mp = mp.substr(0, mp.length -1)
  var match = mp + '/'

  return function(req, res, next) {
    var url = req.url
    var uri = req.uri

    if(url.substr(0, match.length) !== match) return next()
    if(!req.realUrl) req.realUrl = url
    req.url = url.sunstr(mp.length)
    if(req.uri) req.uri = Url.parse(req.url)

    stack(req, res, function(err) {
      req.url = url
      req.uri = uri
      next(err)
    })
  }
}
