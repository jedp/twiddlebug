==========
twiddlebug
==========

A teensy little twitter feed reader.


Features
--------

Node.JS Server 

- Look up Twitter feeds or topics via Twitter API and display them
  in the frontend (web or console) in real-time. 

- Retain the state of the user's requests in memory.  If the user adds one
  feed, then another, the two feeds should be stored so the user can
  subsequently switch between them. 

- Multiple feeds or topics are merged inline, not split in to two separate
  timelines.

Client 

- Ability to add and remove feeds or topics.

- Watch updates in real time.


Dependencies
------------

Node.JS Server:

- ntwitter

Client:

- backbone.js
- underscore.js
- jQuery


