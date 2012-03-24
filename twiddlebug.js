var twitter = require('ntwitter');
var util = require('util');
var events = require('events');

var Twiddlebug = function() {
  events.EventEmitter.call(this);

  // Get twitter keys from the environment.  
  // You would set these in env.sh and source that before running this.
  this.twitter = new twitter({
    consumer_key: process.env['TBUG_CONSUMER_KEY'],
    consumer_secret: process.env['TBUG_CONSUMER_SECRET'],
    access_token_key: process.env['TBUG_ACCESS_TOKEN'],
    access_token_secret: process.env['TBUG_ACCESS_TOKEN_SECRET']
  });

  // verify credentials or die
  this.twitter.verifyCredentials(function (err, data) {
    if (err) {
      util.inspect(err);
      throw(new Error("Dag, yo.  Twitter authentication failed."));
    }
  });

  return this;
};
util.inherits(Twiddlebug, events.EventEmitter);

Twiddlebug.prototype.stream = function(topics) {
  var self = this;
  this.twitter.stream('user', {track:topics.join(',')}, function(stream) {
    stream.on('data', function (data) {
      self.emit('data', data); 
    });
    stream.on('end', function (response) {
      // Handle a disconnection
      self.emit('end');
    });
    stream.on('destroy', function (response) {
      // Handle a 'silent' disconnection from Twitter, no end/error event fired
      self.emit('end');
    });
    stream.on('error', function(err) {
      self.emit('error', err);
    });
  });
};

if (!module.parent) {
  var cols = process.stdout.getWindowSize()[0];
  var wrap = require('wordwrap')(20, cols-20);
  var argv = require('optimist')
              .alias('t', 'topic')
              .argv;

  // get things to track
  track = [];
  if (typeof argv.topic === 'string') {
    track.push(argv.topic);
  } else {
    argv.topic.forEach(function(topic) { track.push(topic) });
  }

  // Follow the named topics and stream the results to the console
  var twiddlebug = new Twiddlebug();
  twiddlebug.on('data', function(data) {
    // format and print a tweet
    var text = wrap(data.text);
    var screen_name = '@' + data.user.screen_name;
    text = screen_name + text.slice(screen_name.length) + '\n';
    console.log(text);
  });

  twiddlebug.on('error', function(err) {
    // uh oh ...
    util.inspect(err);
  });

  twiddlebug.on('end', function() { console.log("disconnected") });

  twiddlebug.stream(track);
}
