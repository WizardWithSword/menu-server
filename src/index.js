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
  if (req.headers.token == undefined) {
    res.send('😊')
    return false
  }
  if (req.body && req.body.s) {
    realbody = Com.mydecrypt(req.body.s, req.headers.token)
    console.log('解密后,req.body', typeof realbody, realbody)
  } else {
    console.log('本次不解密', req.body)
    realbody = req.body
  }
  routerAnalyze(res, req.method, req.url, req.query, realbody, req.headers.token, req.headers.auth || '')
})


function routerAnalyze (res, method, url, query, body, token, auth) {
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

  var result = Com.findFuncFromObj(apiDeal, pArr, 0)
  if (result) {
    console.log('开始处理:', body)
    var p = method === 'POST' ? body : query
    result(method, p, token, auth).then(function (obj) {
      console.log('处理结束了：', obj)
      res.json(Com.myencrypt(obj, token))
    })
  } else {
    obj.code = 404
    obj.message = 'illegal request!'
    res.json(Com.myencrypt(obj, token))
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
      res = arr[i]
      break
    }
  }
  return res
}
var apiDeal = {
  shop: {
    user: {
      login: function (method, req) {
        if (!req.username || !req.password || method !== 'POST') {
          return RedisDB.null({code: 10003, message: 'Wrong params'})
        }
        return RedisDB.get('restaurant_user').then(function (res) {
          var loginuser = iskvExistInArrobj(res, 'uname', req.username)
          if (loginuser === false) {
            return {code:10004, message: 'there is not a user named like that, please regesiter it first'}
          } else {
            if (loginuser.pwd !== req.password) {
              return {code: 10005, message: 'your name and your password is not match'}
            }
            // var token = Com.randomMD5Str()
            var loginresult = {
              uid: loginuser.uid,
              rids: loginuser.rids
              // token: token
            }
            return RedisDB.checkToken({uid: loginuser.uid}, 'login').then(function (tokenres) {
              console.log('login check token:', tokenres)
              loginresult.token = tokenres.token
              var obj = {
                code: 200,
                message: 'login success',
                result: loginresult
              }
              return obj
            })
          }
        })
      },
      // 用户注册
      reg: function (method, req) {
        console.log('本次要注册的用户的信息是:', method, typeof req, req)
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
            obj.uid = Com.randomMD5Str()
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
      detail: function (method, req, token) {
        if (method !== 'GET') {
          return RedisDB.null({code: 10003, message: 'Wrong params'})
        }
        return RedisDB.checkToken({uid: req.uid, token: token}, 'detail').then(function (res){
          if (res === 'illegal') {
            return {code: 11000, message: 'you give us a illegal token, are you a hacker?'}
          }
          if (res === 'expired') {
            return {code: 11001, message: 'you have been logined for a long time, please login again.'}
          }
          // get all user and select by uid
          return RedisDB.get('restaurant_user').then(function (res) {
            var loginuser = iskvExistInArrobj(res, 'uid', req.uid)
            if (loginuser === false) {
              return {code:11003, message: 'you give us a illegal userid, are you a hacker?'}
            } else {
              var loginresult = {
                uid: loginuser.uid,
                name: '', // nick
                headerImg: '', // 头像
                rids: loginuser.rids
              }
              var obj = {
                code: 200,
                message: 'login success',
                result: loginresult
              }
              return obj
            }
          })
        })
      },
      edit: function (method, req, token) {return RedisDB.null()}
    },
    restaurants: {
      list: function (method, req, token, uid) {
        if (method !== 'POST') {
          return RedisDB.null({code: 10003, message: 'Wrong params'})
        }
        return RedisDB.checkToken({uid: uid, token: token}, 'restList').then(function (tokenres) {
          if (tokenres === 'illegal') {
            return {code: 11000, message: 'you give us a illegal token, are you a hacker?'}
          }
          if (tokenres === 'expired') {
            return {code: 11001, message: 'you have been logined for a long time, please login again.'}
          }
          return RedisDB.get('restaurant_user').then(function (userres) {
            var loginuser = iskvExistInArrobj(userres, 'uid', uid)
            if (loginuser === false) {
              return {code:10004, message: 'that is a illegal uid'}
            } else {
              var loginresult = {
                rids: loginuser.rids
              }
              var obj = {
                code: 200,
                message: 'get restaurants successed',
                result: loginresult
              }
              return obj
            }
          })
        })
      },
      add: function (method, req, token, uid) {
        if (method !== 'POST' || !req.name) {
          return RedisDB.null({code: 10003, message: 'Wrong params'})
        }
        return RedisDB.checkToken({uid: uid, token: token}, 'restAdd').then(function (tokenres) {
          if (tokenres === 'illegal') {
            return {code: 11000, message: 'you give us a illegal token, are you a hacker?'}
          }
          if (tokenres === 'expired') {
            return {code: 11001, message: 'you have been logined for a long time, please login again.'}
          }
          return RedisDB.get('restaurant_user').then(function (userres) {
            var loginuser = iskvExistInArrobj(userres, 'uid', uid)
            if (loginuser === false) {
              return {code:10004, message: 'that is a illegal uid'}
            } else {
              // var loginresult = {
              //   rids: loginuser.rids
              // }
              var newRest = {}
              newRest.name = req.name
              newRest.rid = Com.randomMD5Str()
              newRest.images = []
              newRest.dec = ''
              newRest.deskids = []
              console.log('修改前, userres', typeof userres, userres)
              if (loginuser.rids !== undefined) {
                loginuser.rids.push(newRest.rid)
              }
              console.log('修改后, userres', typeof userres, userres)
              return RedisDB.set('restaurant_user', userres).then(function (updateres) {
                var obj = {
                  code: 200,
                  message: 'add restaurants successed',
                  result: loginuser.rids
                }
                if (updateres) {
                  var restkey = 'restaurant_{{rid}}_info'.replace('{{rid}}', newRest.rid)
                  return RedisDB.set(restkey, newRest).then(function (setres) {
                    if (setres) {
                      return {code: 200, message: 'success', result: newRest}
                    } else {
                      return {code: 10007, message: 'add a new restaurant info failed'}
                    }
                  })
                } else {
                  obj.code = 10006
                  obj.message = 'add restaurant\'s id to user database error!'
                  return obj
                }
              })
            }
          })
        })
      },
      detail: function (method, req, token, uid) {
        if (method !== 'GET' || !req.rid) {
          return RedisDB.null({code: 10003, message: 'Wrong params'})
        }
        var key = 'restaurant_{{rid}}_info'.replace('{{rid}}', req.rid)
        return RedisDB.get(key).then(function (resdetail) {
          console.log('获取到的餐厅详情:', resdetail)
          if (resdetail) {
            return resdetail
          } else {
            return {code: 10008, message: 'there is something wrong about the restaurant id, please add a new one'}
            // var newRest = {}
            // return RedisDB.set('key', )
          }
        })
      },
      edit: function (method, req, token, uid) {return RedisDB.null()}
    },
    menu: {
      list: function (method, req, token, uid) {
        if (method !== 'GET' || !req.rid) {
          return RedisDB.null({code: 10003, message: 'Wrong params'})
        }
        var key = 'restaurant_{{rid}}_menu'.replace('{{rid}}', req.rid)
        return RedisDB.get(key).then(function (getres) {
          var obj = []
          if (getres) {
            obj = getres
            // return {code: 200, message: 'success', result: obj}
          } else {
            // return RedisDB.set(key, obj).then(function (setres) {
            //   if (setres) {
            //     return {code: 200, message: 'success', result: obj}
            //   } else {
            //     return {code: 10013, message: 'init a menu error, please try again'}
            //   }
            // })
          }
          return {code: 200, message: 'success', result: obj}
        })
      },
      edit: function (method, req, token, uid) {
        if (method !== 'POST' || !req.rid || !req.menu || req.menu.length < 1) {
          return RedisDB.null({code: 10003, message: 'Wrong params'})
        }
        var key = 'restaurant_{{rid}}_menu'.replace('{{rid}}', req.rid)
        // return RedisDB.get(key).then(function (getres) {
        var obj
        obj = req.menu
        return RedisDB.set(key, obj).then(function (setres) {
          if (setres) {
            return {code: 200, message: 'success', result: obj}
          } else {
            return {code: 10013, message: 'update menu error, please try again'}
          }
        })
        // })
      },
      // 修改单个菜品的内容
      put: function (method, req, token, uid) {
        // {
        //   rid: '',
        //   fid: '',
        //   name: ''
        //   desc: ''
        //   status: ''
        // }
        if (method !== 'POST' || !req.rid || !req.fid) {
          return RedisDB.null({code: 10003, message: 'Wrong params'})
        }
        var key = 'restaurant_{{rid}}_menu'.replace('{{rid}}', req.rid)
        return RedisDB.get(key).then(function (getres) {
          var obj = getres
          var editfood
          for (var i = 0; i < obj.length; i++) {
            var tmptype = obj[i]
            if (tmptype.foods) {
              for (var j = 0; j < tmptype.foods.length; j++) {
                if (tmptype.foods[j].fid === req.fid) {
                  editfood = tmptype.foods[j]
                  break
                }
              }
            }
            if (editfood !== undefined) {
              break
            }
          }
          if (editfood !== undefined) {
            var arr = ['name', 'desc', 'status', 'size', 'price', 'imgurl']
            for (var k = 0; k < arr.length; k++) {
              if (req[arr[k]] !== undefined && req[arr[k]] !== '') {
                editfood[arr[k]] = req[arr[k]]
              }
            }
            return RedisDB.set(key, obj).then(function (setres) {
              if (setres) {
                return {code: 200, message: 'success', result: obj}
              } else {
                return {code: 10013, message: 'update menu error, please try again'}
              }
            })
          } else {
            return {code: 10014, message: 'there is no such food id,so you can\'t edit it, refresh this page may help'}
          }
        })
      }
    },
    desk: {
      list: function (method, req, token, uid) {
        if (method !== 'GET' || !req.rid) {
          return RedisDB.null({code: 10003, message: 'Wrong params'})
        }
        var key = 'restaurant_{{rid}}_info'.replace('{{rid}}', req.rid)
        return RedisDB.get(key).then(function (resdetail) {
          if (resdetail) {
            var deskids = resdetail.deskids
            return {code: 200, message: 'success', result: deskids}
          } else {
            return {code:10011, message: 'please connect the tech, it seams that the restaurant id is wrong...' + req.rid}
          }
        })
      },
      edit: function (method, req, token, uid) {
        if (method !== 'POST' || !req.rid || !req.deskids) {
          return RedisDB.null({code: 10003, message: 'Wrong params'})
        }
        var key = 'restaurant_{{rid}}_info'.replace('{{rid}}', req.rid)
        return RedisDB.get(key).then(function (resdetail) {
          if (resdetail) {
            resdetail.deskids = req.deskids
            return RedisDB.set(key, resdetail).then(function (setres){
              if (setres) {
                return {code: 200, message: 'success', result: resdetail.deskids}
              } else {
                return {code: 10012, message: 'update desk info error, try again please', result: req.deskids}
              }
            })            
          } else {
            return {code:10011, message: 'please connect the tech, it seams that the restaurant id is wrong...' + req.rid}
          }
        })
      }
    },
    order: {
      list: {
        end: function (method, req, token, uid) {
          if (method !== 'GET' || !req.rid) {
            return RedisDB.null({code: 10003, message: 'Wrong params'})
          }
          var key = 'restaurant_{{rid}}_order_end'.replace('{{rid}}', req.rid)
          return RedisDB.get(key).then(function (resdetail) {
            if (resdetail) {
              var deskids = resdetail.deskids
              return {code: 200, message: 'success', result: deskids}
            } else {
              return {code:10011, message: 'please connect the tech, it seams that the restaurant id is wrong...' + req.rid}
            }
          })
        },
        ing: function (method, req, token, uid) {
          if (method !== 'GET' || !req.rid) {
            return RedisDB.null({code: 10003, message: 'Wrong params'})
          }
          var key = 'restaurant_{{rid}}_order_ing'.replace('{{rid}}', req.rid)
          return RedisDB.get(key).then(function (resdetail) {
            if (resdetail) {
              return {code: 200, message: 'success', result: resdetail}
            } else {
              return {code:10011, message: 'please connect the tech, it seams that the restaurant id is wrong...' + req.rid}
            }
          })
        }
      },
      edit: {
        status: function (method, req, token, uid) {
          var obj = {
            test: 'sdfsfa',
            wode: 3
          }
          return RedisDB.listadd('order1', obj).then(function (res) {
            console.log('list order push success', typeof res, res)
            if (res) {
              return RedisDB.listget('order1', 1, 5)
            } else {
              return {code: 222, message: 'list push error'}
            }
          })
        }
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
      add: function (method, req, token, uid) {
        console.log('guest.order.add')
        // req = {
        //   rid: '',
        //   did: '',
        //   type: 'add',
        //   order: ['fid', 'fid']
        // }
        return RedisDB.get("{code: 200, message: 'success'}")
      },
      detail: function (method, req, token, uid) {
        // req = {
        //   rid: '',
        //   did: ''
        // }
        // [{fid: ''}, {fid: ''}]
        var obj = {code: 200, message: 'success'}
        return RedisDB.get('detail')
        console.log('guest.order.detail')
      }
    }
  }
}

var RedisDB = {
  null: function (obj) {
    return new birdPromise(function (resolve, reject) {
      setTimeout(function () {
        if (obj && obj.code) {
          resolve(obj)
        } else {
          resolve({code: 10003, message: '接口未开发'})
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
  },
  mset: function (key1, value1, key2, value2, key3, value3, key4, value4) {
    var str1 = JSON.stringify(value1)
    var str2 = JSON.stringify(value2)
    var str3 = JSON.stringify(value3)
    var str4 = JSON.stringify(value4)
    if (value4 !== undefined) {
      return redisClient.msetAsync(key1, str1, key2, str2, key3, str3, key4, str4)
    } else if (value3 !== undefined) {
      return redisClient.msetAsync(key1, str1, key2, str2, key3, str3)
    } else if (value2 !== undefined) {
      return redisClient.msetAsync(key1, str1, key2, str2)
    } else {
      return redisClient.setAsync(key1, str1)
    }
  },
  listadd: function (key, value) {
    var str = JSON.stringify(value)
    return redisClient.lpushAsync(key, str)
  },
  listget: function (key, page, pagesize) {
    var start = (page - 1) * (pagesize - 0)
    var end = start + (pagesize - 0)
    return redisClient.lrangeAsync(key, start, end).then(function (res) {
      console.log('获取到的数据内容：', typeof res, res)
      console.log('res的length', res.length)
      return res
    })
  },
  /**
   * check if token expired, if yes, then update expired. if not, add a new token.
   * @param  {[type]}  obj     [{id:'xx', token:'xx'}]
   * @param  {Boolean} isLogin [in the future,if one's token expired, let him relogin]
   * @return {[object]}          [{expired:00, token:'token'}]
   */
  checkToken: function (obj, isLogin) {
    var key = 'token_' + obj.uid
    if (obj.uid + '' === 'undefined') {
      return this.null({code:12000, message: 'undefined user has no token'})
    }
    var that = this
    var expiredTime = 86400000
    var logincheck = isLogin === 'login' ? true : false
    return this.get(key).then(function (res) {
      var now = (new Date()).getTime()
      if (res) {
        if (res.expired < now) {
          if (logincheck) {
            res.expired = now + expiredTime
            return that.set(key, res).then(function (){
              return res
            })
          } else { // expired token
            return 'expired'
          }
        } else {
          if (logincheck) {
            return res
          } else {
            if (res.token === obj.token) {
              return res
            } else { // illegal token
              return 'illegal'
            }
          }
        }
      } else {
        var newtoken = {
          expired: now + expiredTime,
          token: Com.randomMD5Str()
        }
        return that.set(key, newtoken).then(function (){
          return newtoken
        })
      }
    })
  },
  addToken: function () {}
}


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