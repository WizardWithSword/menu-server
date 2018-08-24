const ut = {}
var MD5 = require("crypto-js/md5")
ut.randomMD5Str = function () {
  var length = 32
  var allchars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  var str = ''
  for (var i = 0; i < length; i++) {
    str += allchars.charAt(Math.floor(Math.random() * allchars.length))
  }
  return MD5(str).toString().toUpperCase()
}
module.exports = ut