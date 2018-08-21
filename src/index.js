var express = require('express')
var app = express()
var bodyParser = require('body-parser') // 为了解析post请求的参数
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

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
  switch (method) {
    case 'POST':
    break
    case 'GET':
    break
  }
  var path = url.split('?')[0]
  var pArr = path.replace(/^\/api\//, '').split('/')
  console.log('本次路由：', path, pArr)
  // apiDeal[pArr[0]]
  var res = findFuncFromObj(apiDeal, pArr, 0)
  if (res) {
    obj = res()
  } else {
    obj.code = 404
    obj.message = 'illegal request!'
  }
  res.json(obj)
}

function findFuncFromObj (obj, arr, idx) {
  console.log('循环次数：', idx, '所查找的数组：', arr[idx], '数组长度：', arr.length, '本次type', typeof obj[arr[idx]])
  if (idx < arr.length) {
    if (typeof obj[arr[idx]] === 'object') {
      return findFuncFromObj(obj[arr[idx]], arr, idx + 1)
    } else if (typeof obj[arr[idx]] === 'function') {
      return obj[arr[idx]]
    } else {
      console.log('其他格式的内容：', typeof obj[arr[idx]])
      return obj[arr[idx]]
    }
  } else {
    console.log('查无此内容')
    return null
  }
}
var apiDeal = {
  shop: {
    user: {
      login: function () {},
      reg: function () {},
      detail: function () {},
      edit: function () {}
    },
    restaurants: {
      list: function () {},
      edit: function () {}
    },
    menu: {
      list: function () {},
      edit: function () {}
    },
    desk: {
      list: function () {},
      edit: function () {}
    },
    order: {
      list: {
        end: function () {},
        ing: function () {}
      },
      edit: {
        status: function () {}
      }
    },
  },
  guest: {
    menu: {
      list: function (params) {
        console.log('guest.menu.list获取列表', params)
        return [{}]
      }
    },
    order: {
      add: function () {
        console.log('guest.order.add')
      },
      detail: function () {
        console.log('guest.order.detail')
      }
    }
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