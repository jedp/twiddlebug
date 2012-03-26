var express = require('express');
var socket_io = require('socket.io');
var twiddlebug = new(require('./twiddlebug'));
var util = require('util');
var keys = require('./utils').keys;

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

// A dictionary of socket objects, keyed by socket id
var sockets = {};

// A dictionary of lists of terms each socket is following, keyed by socket id
var following = {};

// Reverse dictionary for 'following' (lists of socket ids, keyed by term)
var gniwollof = {};

io.sockets.on('connection', function(socket) {
  following[socket] = [];

  sockets[socket.id] = socket;

  socket.on('message', function(message) {
    message = JSON.parse(message);

    if (message.subscribe) {
      var term = message.subscribe.trim();
      
      // Maybe initialize index and reverse index
      if (typeof following[socket.id] === 'undefined') following[socket.id] = [];
      if (typeof gniwollof[term] === 'undefined') gniwollof[term] = [];

      // This socket follows this term
      if (following[socket.id].indexOf(term) === -1) {
        following[socket.id].push(term);
        gniwollof[term].push(socket.id);
        // reset the stream
        twiddlebug.updateTopics(keys(gniwollof));
      }
    }
  });

  socket.on('end', function() {
    following[socket.id].forEach(function(term) {
      gniwollof[term].splice(gniwollof[term].indexOf(socket.id), 1);
      if (gniwollof[term].length < 1) {
        delete gniwollof[term];
      }
    });
    delete following[socket.id];
    delete sockets[socket.id];

    // may have unsubscribed to some keys.
    // reset the twitter stream
    twiddlebug.updateTopics(keys(gniwollof));
  });
});

twiddlebug.on('data', function(data) {
  // Each tweet that arrives from twiddlebug must be distributed
  // to the right clients. 
  //
  // Twitter doesn't tell us why a tweet matched our tracking 
  // request, so we go through all the terms we're storing and see
  // which ones match each tweet/user.name.  
  var re;
  var term;
  var recipients = {};
  keys(gniwollof).forEach(function(term) {
    re = new RegExp(term, 'i');
    if (re.test(data.text) || re.test(data.user.name)) {
      gniwollof[term].forEach(function(socket_id) {
        // Add sockets subscribed to this term to the set of recipients
        // for this tweet.
        recipients[socket_id] = 1;
      });
    }
  });

  keys(recipients).forEach(function(socket_id) {
    sockets[socket_id].volatile.emit('tweet', data);
  });
});

twiddlebug.on('error', console.error);

if (!module.parent) {
  app.listen(parseInt(process.env['TBUG_SERVER_PORT'], 10) || 3000);
  console.log("Server listening on port %d in %s mode", 
      app.address().port, app.settings.env);
}
