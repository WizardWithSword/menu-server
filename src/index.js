var express = require('express')
var app = express()
var bodyParser = require('body-parser') // 为了解析post请求的参数
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
var redis = require("redis");
var birdPromise = require('bluebird');
birdPromise.promisifyAll(redis);
var redisClient = redis.createClient({
  host: '127.0.0.1',
  port: 6379
});
var Com = require('./utils/index.js')

app.get('/api', function (req, res) {
  res.send('ca')
})
app.all('/api/*', function (req, res) {
  console.log('req', req.headers.token, req.url, req.method, req.query, req.body)
  var realbody = ''
  console.log('typeof body', typeof req.body)
  if (req.body && req.body.s) {
    realbody = decrypt(req.body.s)
    console.log('解密后,req.body', typeof realbody, realbody)
  } else {
    console.log('本次不解密', req.body)
    realbody = req.body
  }
  routerAnalyze(res, req.method, req.url, req.query, realbody)
})


var CryptoJS = require("crypto-js");
var Skey = 'mm'
function decrypt (str) {
  var res = JSON.parse(CryptoJS.AES.decrypt(str, Skey).toString(CryptoJS.enc.Utf8))
  if (typeof res === 'string') {
    res = JSON.parse(res)
  }
  return res
}
function encrypt (obj) {
  var newobj = {}
  newobj.s = CryptoJS.AES.encrypt(JSON.stringify(obj), Skey).toString()
  return newobj
}

function routerAnalyze (res, method, url, query, body) {
  console.log('analyze')
  var obj = {
    code: 200,
    chinese: '中文字',
    Deutsch: 'Im Restaurant zu Essen, in der Sich keine: Getränke - menü',
    message: 'success'
  }
  var path = url.split('?')[0]
  var pArr = path.replace(/^\/api\//, '').split('/')
  console.log('本次路由：', path, pArr)

  var result = findFuncFromObj(apiDeal, pArr, 0)
  if (result) {
    console.log('开始处理:', body)
    var p = method === 'POST' ? body : query
    result(method, p).then(function (obj) {
      console.log('处理结束了：', obj)
      res.json(encrypt(obj))
    })
  } else {
    obj.code = 404
    obj.message = 'illegal request!'
    res.json(encrypt(obj))
  }
}

/**
 * 从对象里面遍历找到最终节点。
 * @param  {[type]} obj [description]
 * @param  {[type]} arr [路径]
 * @param  {[type]} idx [description]
 * @return {[function null ]}     [返回函数或空]
 */
function findFuncFromObj (obj, arr, idx) {
  // console.log('循环次数：', idx, '所查找的数组：', arr[idx], '数组长度：', arr.length, '本次type', typeof obj[arr[idx]])
  if (idx < arr.length) {
    if (typeof obj[arr[idx]] === 'object') {
      return findFuncFromObj(obj[arr[idx]], arr, idx + 1)
    } else if (typeof obj[arr[idx]] === 'function') {
      return obj[arr[idx]]
    } else {
      console.log('其他格式的数据：', typeof obj[arr[idx]])
      return obj[arr[idx]]
    }
  } else {
    console.log('查无此处理方法')
    return null
  }
}
/**
 * [iskvExistInArrobj: is there a object witch has a key valued val in the array?]
 * @param  {[type]} arr [array like [{a:'1', b:'2'}, {a:'2'}] ]
 * @param  {[type]} key [要查询的key]
 * @param  {[type]} val [要查询的value]
 * @return {[type]}     [查询结果: true  false]
 */
function iskvExistInArrobj (arr, key, val) {
  var res = false
  for (var i = 0; i < arr.length; i++) {
    if(arr[i][key] && arr[i][key] === val) {
      res = true
    }
  }
  return res
}
var apiDeal = {
  shop: {
    user: {
      login: function (method,req) {
        return RedisDB.get(req)
      },
      // 用户注册
      reg: function (method, req) {
        console.log('本次要注册的用户的信息是:', method, req)
        console.log('本次要注册的用户的信息是:', typeof method, typeof req)
        if (!req.username || !req.password || method !== 'POST') {
          return RedisDB.null({code: 10003, message: 'Wrong params'})
        }
        if (req.username.length < 3 || req.password.length < 5) {
          return RedisDB.null({code: 10003, message: 'Wrong params length'})
        }
        return RedisDB.get('restaurant_user').then(function (res) {
          var iscanregist = true // 默认此请求可以注册
          // 检查是否已存在相关用户
          if (res && res.length > 0) {
            iscanregist = !iskvExistInArrobj(res, 'uname', req.username)
          }
          if (iscanregist) {
            var newAll = res || []
            var obj = {}
            obj.id = Com.randomMD5Str()
            obj.uname = req.username
            obj.pwd = req.password
            obj.rids = []
            obj.regT = (new Date()).getTime()
            newAll.push(obj)
            return RedisDB.set('restaurant_user', newAll).then(function (saveres) {
              console.log('redis set的结果:', saveres)
              if (saveres) {
                return {code: 200 , message: 'Regeist success!Try login Now~'}
              } else {
                return {code: 10002, message: 'There is some error. Please connect the tech! error code:10002'}                
              }
            })
          } else {
            return {code: 10001, message: 'There is a same name user already. Please change another name and retry again!'}
          }
        })
      },
      detail: function () {return RedisDB.null()},
      edit: function () {return RedisDB.null()}
    },
    restaurants: {
      list: function () {return RedisDB.null()},
      edit: function () {return RedisDB.null()}
    },
    menu: {
      list: function () {return RedisDB.null()},
      edit: function () {return RedisDB.null()}
    },
    desk: {
      list: function () {return RedisDB.null()},
      edit: function () {return RedisDB.null()}
    },
    order: {
      list: {
        end: function () {return RedisDB.null()},
        ing: function () {return RedisDB.null()}
      },
      edit: {
        status: function () {return RedisDB.null()}
      }
    },
  },
  guest: {
    menu: {
      list: function (method, params) {
        console.log('apiDeal:guest.menu.list:req params->', params)
        var name = 'restaurant_' + params.rid + '_menu'
        return RedisDB.get(name).then(function (res) {
          console.log('apiDeal:guest.menu.list:then res->', res)
          var obj = {code: 200, message: 'success'}
          if (res) {
            obj.result = JSON.parse(res)
          } else {
            obj.result = []
          }
          return obj
        })
      }
    },
    order: {
      add: function () {
        console.log('guest.order.add')
        return RedisDB.get("{code: 200, message: 'success'}")
      },
      detail: function () {
        var obj = {code: 200, message: 'success'}
        return RedisDB.get('detail')
        console.log('guest.order.detail')
      }
    }
  }
}

RedisDB = {
  null: function (obj) {
    return new birdPromise(function (resolve, reject) {
      setTimeout(function () {
        if (obj && obj.code) {
          resolve(obj)
        } else {
          resolve({code: 1000, message: '接口未开发'})
        }
      }, 300)
    })
  },
  get: function (key) {
    return redisClient.getAsync(key).then(function (res) {
      return JSON.parse(res)
    })
  },
  set: function (key, value) {
    var str = JSON.stringify(value)
    return redisClient.setAsync(key, str)
  }
}


// var options = {
//   dotfiles: 'ignore',
//   etag: false,
//   extensions: ['htm', 'html'],
//   index: 'index.html',
//   maxAge: '1d',
//   redirect: false,
//   setHeaders: function (res, path, stat) {
//     res.set('x-timestamp', Date.now())
//   }
// }
// // 新增静态模板目录
// app.use(express.static(__dirname + '/shop', options))

var options = {
  dotfiles: 'ignore',
  etag: false,
  extensions: ['htm', 'html'],
  index: 'index.html',
  maxAge: '1d',
  redirect: false,
  setHeaders: function (res, path, stat) {
    res.set('x-timestamp', Date.now())
  }
}
console.log('__dirname:', __dirname)
// 新增静态模板目录。调试api
app.use('/guest', express.static(__dirname + '/views', options))
app.use('/shop', express.static(__dirname + '/shop', options))

app.listen(3000)