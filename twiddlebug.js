var twitter = require('ntwitter');
var util = require('util');
var events = require('events');

var Twiddlebug = function() {
  events.EventEmitter.call(this);

  // The topics we're tracking from twitter.
  this.currentTopics = [];
  this.stream = null;

  // A flag indicating that we're already pending a refresh of our twitter
  // stream.  Used by updateTopics().
  this.awaitingTopicUpdate = false;

  // Be nice to twitter and reconnect no more than once every two minutes. Keep
  // track of the last time we reconnected and defer reconnections with updates
  // if necessary.
  this.lastUpdate = 0;

  this.twitter = null;

  return this;
};
util.inherits(Twiddlebug, events.EventEmitter);

Twiddlebug.prototype._getTwitter = function() {
  if (this.twitter) {
    delete this.twitter;
  }
  // I don't immediately see how to close an ntwitter connecton.
  // So this just discards the connection and re-connects

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

  return this.twitter;
};

Twiddlebug.prototype.updateTopics = function(topics) {
  // Update the "topics" we are following.  NB, This will match tweet content
  // and user name, but not user screen_name
  //
  // https://dev.twitter.com/discussions/4988

  if (typeof topics !== 'undefined') { 
    this.currentTopics = topics 
  };

  // Twitter API docs suggest resetting the stram no more than once every two
  // minutes:
  //
  // https://dev.twitter.com/docs/streaming-api/concepts
  //
  //     Upon a change, reconnect immediately if no changes have occurred for
  //     some time. For example, reconnect no more than twice every four
  //     minutes, or three times per six minutes, or some similar metric.
  //     Depending on your requirements and heuristics, many changes can then
  //     be applied with nearly no latency, while only some small proportion
  //     have to wait for an update window.

  var now = (new Date()).getTime();

  // Only update if it's been two mins since the last update
  if (now - this.lastUpdate > 120 * 1000) {
    this.lastUpdate = now;
    this.awaitingTopicUpdate = false;
    this._reconnectStream();

  // Maybe try again in two minutes
  } else if (! this.awaitingTopicUpdate) {
    this.awaitingTopicUpdate = true;
    setTimeout(this.updateTopics, 120 * 1000);
  } 
}

Twiddlebug.prototype._reconnectStream = function() {
  // XXX I think this is broken -
  // When another client connects and asks for some keywords,
  // reconnectStream gets called as it should after some delay,
  // but now the clients get two copies of each tweet.  Which
  // makes me think the old connection listeners are still 
  // sticking around.  I tried to fix this by brutally implementing
  // _getTwitter as above, thinking the connection would be cleaned
  // up, but it's not - presumably because there are still bound
  // event handlers!
 
  var self = this;

  this.stream = this._getTwitter().stream('user', {track:self.currentTopics.join(',')}, function(stream) {
    // remove any existing listeners
    
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

module.exports = Twiddlebug;

if (!module.parent) {
  // a simple command-line interface
  // example
  //
  //     node twiddlebug.js -t #twitter -t music
  //
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

  twiddlebug.updateTopics(track);
}
