"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _path = require("path");

var _var = require("./var");

var _tool = require("../lib/tool");

const isDev = process.env.NODE_ENV === 'development';
const IP = (0, _tool.getIPAdress)();
const serverPort = 3000;
const staticPath = `http://${IP}:${serverPort}`;
const publicPath = (0, _path.resolve)(__dirname, '../../public');
const appStaticPath = (0, _path.resolve)(__dirname, '../../static');
const routerPath = (0, _path.resolve)(__dirname, '../router');
var _default = {
  isDev,
  protocol: 'http:',
  host: 'localhost',
  serverPort,
  staticPath,
  publicPath,
  appStaticPath,
  API_VERSION_PATH: '/api/v0',
  routerPath,
  sourceTypes: _var.sourceTypes,
  imgCates: _var.imgCates,
  // 微信分享配置
  appId: '',
  appSecret: '',
  jwt_secret: 'cxzk_fe',
  // 阿里云AK
  al_ak: "",
  al_sk: "",
  // 阿里通义，用于智能创作
  al_ty_ak: "",
  // 邮箱服务
  ms_email: "",
  ms_token: "",
  // coze智能对话token
  coze_temp_token: ""
};
exports.default = _default;