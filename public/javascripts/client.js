_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

/*
 * tweets are as they come from twitter: a huge json structure of which in this
 * app, we only need a few fields.  But in the interest of not messing with the
 * message, we let it flow unadultered from twitter to this model
 */

var Tweet = Backbone.Model.extend({});

var TweetView = Backbone.View.extend({
  model: Tweet,

  tagName: 'div', 

  template: _.template( $('#tweet-template').html() ),

  initialize: function() {
    _.bindAll(this, 'render');
    return this;
  },

  render: function() {
    $(this.el).html(this.template(this.model));
    return this;
  }
});

/*
 * A TweetCollection is just a convenience for handling a bunch of tweets.
 */

var TweetCollection = Backbone.Collection.extend({
  model: Tweet
});

var Feed = Backbone.Model.extend({});

var FeedView = Backbone.Model.extend({
  model: Feed,

  tagName: 'div',

  el: $('#feed'),

  events: {
    'receiveTweet': 'addTweet'
  },

  initialize: function() {
    this.tweets = new TweetCollection();

    _.bindAll(this, 'render');
    return this;
  },

  render: function() {
    this.tweets.each(this.addTweets);
  },

  addTweet: function(tweet) {
    this.tweets.add(tweet);
    this.displayTweet(tweet);
  },

  displayTweet: function(tweet) {
    var view = new TweetView({model: tweet});
    var el = view.render().el;
    $(el).find('time').timeago();
    $(this.el).prepend(el);
  },
});

/*
 * The Application and ApplicationView are the interface between the client and
 * the server.  The ApplicationView recieves tweet (via socket.io) from the
 * server and passes them off to the FeedView.
 */

var Application = Backbone.Model.extend({});

var ApplicationView = Backbone.View.extend({
  model: Application,

  el: $('#content'),

  events: {
    "keypress #search": "updateStream"
  },

  initialize: function() {
    this.feedView = new FeedView();

    this.socket = io.connect();

    this.search = $('#search');

    var self = this;
    this.socket.on('tweet', function(data) {
      // change timestamp to ISO 8601 for timeago
      data.created_at = (new Date(data.created_at)).toISOString();
      self.feedView.addTweet(data);
    });

    return this;
  },

  updateStream: function(evt) {
    if (evt.keyCode != 13) return;
    if (!this.search.val()) return;

    this.socket.send(JSON.stringify({subscribe: this.search.val().trim()}));
    this.search.val('');
  }
});


