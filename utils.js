module.exports.keys = function keys(dict) {
  _keys = [];
  for (var key in dict) {
    if (dict.hasOwnProperty(key)) {
      _keys.push(key);
    }
  }
  return _keys;
}
