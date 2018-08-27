const ut = {}
var CryptoJS = require("crypto-js")
ut.log = function () {
  console.log.apply(this, arguments)
}
// var MD5 = require("crypto-js/md5")
ut.randomMD5Str = function () {
  var length = 32
  var allchars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  var str = ''
  for (var i = 0; i < length; i++) {
    str += allchars.charAt(Math.floor(Math.random() * allchars.length))
  }
  return CryptoJS.MD5(str).toString().toUpperCase()
}
ut.mydecrypt = function (str, Skey) {
  if (Skey === undefined) {
    Skey = 'myscrect'
  }
  var res = JSON.parse(CryptoJS.AES.decrypt(str, Skey).toString(CryptoJS.enc.Utf8))
  if (typeof res === 'string') {
    res = JSON.parse(res)
  }
  return res
}
/**
 * 使用skey 去加密数据obj，得到字符串
 * @param  {[object、string、bool、array]} obj  []
 * @param  {[string]} Skey [description]
 * @return {[object]}      [return a object with a format{s:"encrypted data"}]
 */
ut.myencrypt = function (obj, Skey) {
  var newobj = {}
  if (Skey === undefined) {
    Skey = 'myscrect'
  }
  newobj.s = CryptoJS.AES.encrypt(JSON.stringify(obj), Skey).toString()
  return newobj
}

/**
 * 从对象里面遍历找到最终节点。
 * @param  {[type]} obj [description]
 * @param  {[type]} arr [路径]
 * @param  {[type]} idx [description]
 * @return {[function null ]}     [返回函数或空]
 */
ut.findFuncFromObj = function (obj, arr, idx) {
  // var that = this
  // ut.log('循环次数：', idx, '所查找的数组：', arr[idx], '数组长度：', arr.length, '本次type', typeof obj[arr[idx]])
  if (idx < arr.length) {
    if (typeof obj[arr[idx]] === 'object') {
      return this.findFuncFromObj(obj[arr[idx]], arr, idx + 1)
    } else if (typeof obj[arr[idx]] === 'function') {
      return obj[arr[idx]]
    } else {
      ut.log('其他格式的数据：', typeof obj[arr[idx]])
      return obj[arr[idx]]
    }
  } else {
    ut.log('查无此处理方法', arr)
    return null
  }
}

module.exports = ut
