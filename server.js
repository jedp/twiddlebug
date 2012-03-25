var express = require('express');
var socket_io = require('socket.io');
var twiddlebug = new(require('./twiddlebug'));

var app = module.exports = express.createServer();
var io = socket_io.listen(app);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// HTTP Server routes

app.get('/', function(req, res)  {
  res.render('index', {
  });
});

// Socket.IO connections

io.sockets.on('connection', function(socket) {
  console.log("connected");
});

// Twiddlebug connection
twiddlebug.on('data', function(data) {
  io.sockets.json.send(data);
});

twiddlebug.on('error', console.error);
twiddlebug.stream(['nodejs', '#mozilla', '#twitter']);


if (!module.parent) {
  app.listen(parseInt(process.env['TBUG_SERVER_PORT'], 10) || 3000);
  console.log("Server listening on port %d in %s mode", 
      app.address().port, app.settings.env);
}
