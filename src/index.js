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

app.get('/api', function (req, res) {
  res.send('ca')
})
app.all('/api/*', function (req, res) {
  console.log('req', req.headers.token, req.url, req.method, req.query, req.body)
  routerAnalyze(res, req.method, req.url, req.query, req.body)
})

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
    switch (method) {
      case 'POST':
        result(body).then(function (str) {
          console.log('处理结束了：', str)
          res.json(str)
        })
      break
      case 'GET':
        result(query).then(function (str) {
          console.log('处理结束了：', str)
          res.json(str)
        })
      break
    }
  } else {
    obj.code = 404
    obj.message = 'illegal request!'
    res.json(obj)
  }
}

/**
 * 从对象里面遍历找到最终节点。
 * @param  {[type]} obj [description]
 * @param  {[type]} arr [description]
 * @param  {[type]} idx [description]
 * @return {[type]}     [description]
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
var apiDeal = {
  shop: {
    user: {
      login: function (req) {
        return RedisDB.get(req)
      },
      reg: function (req) {
        return RedisDB.null()
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
      list: function (params) {
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
  null: function () {
    return new birdPromise(function (resolve, reject) {
      setTimeout(function () {
        resolve({code: 1000, message: '接口未开发'})
      }, 300)
    })
  },
  get: function (key) {
    return redisClient.getAsync(key)
  },
  set: function (key, value) {
    var str = JSON.stringify(value)
    return redisClient.setAsync(key, value)
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