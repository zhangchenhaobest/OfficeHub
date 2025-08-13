"use strict";

var _koa = _interopRequireDefault(require("koa"));

var _koaStatic = _interopRequireDefault(require("koa-static"));

var _fs = _interopRequireDefault(require("fs"));

var _koaBody = _interopRequireDefault(require("koa-body"));

var _glob = _interopRequireDefault(require("glob"));

var _config = _interopRequireDefault(require("./config"));

var _koa2Cors = _interopRequireDefault(require("koa2-cors"));

var _router = _interopRequireDefault(require("@koa/router"));

var _http = _interopRequireDefault(require("http"));

var _path = _interopRequireDefault(require("path"));

var _koaCompress = _interopRequireDefault(require("koa-compress"));

var _koaJwt = _interopRequireDefault(require("koa-jwt"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import https from 'https';
// import wx_api from 'wechat-api';
// const api = new wx_api(config.appId, config.appSecret)
const router = new _router.default(); // https 相关
// 你的ssl存放路径, 建议直接放在server目录下
// const filePath = path.join(__dirname, '../')
// 启动逻辑

async function start() {
  const app = new _koa.default(); // https配置
  // const httpsOptions = {
  //     key: fs.readFileSync(path.join(filePath, 'orange.turntip.cn.key')),  //ssl文件路径
  //     cert: fs.readFileSync(path.join(filePath, 'orange.turntip.cn_bundle.pem'))  //ssl文件路径
  // };
  // https服务
  // const httpsServer = https.createServer(httpsOptions, app.callback());

  const server = _http.default.createServer(app.callback());

  const io = require('socket.io')(server); // 开启gzip


  const options = {
    threshold: 2048
  };
  app.use((0, _koaCompress.default)(options)); //  禁止访问

  app.use(async (ctx, next) => {
    if (/^\/db\/user/g.test(ctx.path)) {
      ctx.status = 500;
      ctx.redirect('/cxzk');
      return;
    }

    await next();
  }); // 设置静态目录

  app.use((0, _koaStatic.default)(_config.default.publicPath, {
    maxage: 60 * 60 * 1000
  }));
  app.use((0, _koaStatic.default)(_config.default.appStaticPath, {
    maxage: 60 * 60 * 1000
  })); // 设置跨域

  app.use((0, _koa2Cors.default)({
    origin: function (ctx) {
      // const whiteList = [
      //     'http://192.168.31.105:8001',
      //     'http://192.168.10.4:8000'
      //   ]; //可跨域白名单
      // if (whiteList.includes(ctx.request.header.origin) && ctx.url.indexOf(config.API_VERSION_PATH) > -1) {
      //     return ctx.request.header.origin //注意允许来自指定域名请求, 如果设置为*，前端将获取不到错误的响应头
      // }
      return '*';
    },
    exposeHeaders: ['WWW-Authenticate', 'Server-Authorization', 'x-show-msg'],
    maxAge: 5,
    //  该字段可选，用来指定本次预检请求的有效期，单位为秒
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
  }));
  app.use((0, _koaBody.default)()); // 渲染页面

  app.use(async (ctx, next) => {
    if (/^\/fm-busy-admin/g.test(ctx.path)) {
      ctx.type = 'html';
      ctx.body = _fs.default.createReadStream(`${_config.default.appStaticPath}/fm-busy-admin/index.html`);
      return;
    }

    if (/^\/drawio/g.test(ctx.path)) {
      ctx.type = 'html';
      ctx.body = _fs.default.createReadStream(`${_config.default.appStaticPath}/drawio/index.html`);
      return;
    }

    if (/^\/files/g.test(ctx.path)) {
      ctx.type = 'html';
      ctx.body = _fs.default.createReadStream(`${_config.default.appStaticPath}/files/index.html`);
      return;
    }

    if (/^\/office/g.test(ctx.path)) {
      ctx.type = 'html';
      ctx.body = _fs.default.createReadStream(`${_config.default.appStaticPath}/office/index.html`);
      return;
    }

    if (/^\/doc/g.test(ctx.path)) {
      ctx.type = 'html';
      ctx.body = _fs.default.createReadStream(`${_config.default.appStaticPath}/doc/index.html`);
      return;
    }

    if (ctx.path === '/') {
      ctx.type = 'html';
      ctx.redirect('/doc');
      return;
    }

    await next();
  }); // jwt验证白名单

  app.use((0, _koaJwt.default)({
    secret: _config.default.jwt_secret
  }).unless({
    path: [/^\/favicon.ico/, // 网站图标
    /^\/api\/v0\/user\/login/, // 登陆接口
    /^\/api\/v0\/user\/register/, // 注册
    /^\/api\/v0\/email\/send/, // 邮箱发送
    /^\/api\/v0\/user\/register\/email/, // 邮箱注册
    /^\/api\/v0\/user\/code/, // 获取激活码
    /^\/api\/v0\/doc\/detail\/pub/, // 开放的文档详情数据
    /^\/api\/v0\/doc\/detail\/mark/, // 获取划词评论接口
    /^\/api\/v0\/doc\/detail\/mind/, // 获取思维导图
    /^\/api\/v0\/doc\/detail\/board/, // 获取白板数据
    /^\/api\/v0\/doc\/detail\/excel/, // 获取表格数据
    /^\/api\/v0\/doc\/wiki\/.*$/, // 知识库详情
    /^\/api\/v0\/fetchUrl/ // 爬取链接信息
    //   '/api/v0/doc/wiki/:id/detail', // 知识库详情列表
    ]
  })); // 挂载路由

  _glob.default.sync(`${_config.default.routerPath}/*.js`).forEach(item => {
    require(item).default(router, _config.default.API_VERSION_PATH);
  });

  app.use(router.routes()).use(router.allowedMethods()); // io

  io.on('connection', socket => {
    console.log('a user connected');
    socket.on('doc load', msg => {
      console.log('doc load', msg);
      io.emit('getData', msg);
    });
  });
  server.listen(_config.default.serverPort, () => {
    console.log(`服务器地址:${_config.default.staticPath}`);
  }); // httpsServer.listen(443, () => {
  //     console.log('https://orange.turntip.cn');
  // });
}

start();