"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useGuards = exports.useToken = exports.auth = exports.encrypt = exports.UID_KEY = void 0;

var _config = _interopRequireDefault(require("../config"));

var _htr = _interopRequireDefault(require("../lib/htr"));

var _crypto = require("crypto");

var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));

var _util = _interopRequireDefault(require("util"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import { RF } from '../lib/upload'
const UID_KEY = 'X-Response-Uid';
exports.UID_KEY = UID_KEY;

const verify = _util.default.promisify(_jsonwebtoken.default.verify);

const useToken = async ctx => {
  const token = ctx.header.authorization;
  const payload = await verify(token.split(' ')[1], _config.default.jwt_secret);
  return payload;
};

exports.useToken = useToken;

const encrypt = content => {
  let hash = (0, _crypto.createHmac)("md5", _config.default.jwt_secret);
  hash.update(content);
  return hash.digest('hex');
};

exports.encrypt = encrypt;

const useGuards = allRole => {
  return async (ctx, next) => {
    const {
      role
    } = await useToken(ctx);

    if (allRole.includes(role)) {
      await next();
    } else {
      return (0, _htr.default)(ctx, 401, null, '权限不足');
    }
  };
}; // 通用鉴权服务


exports.useGuards = useGuards;

const auth = async (ctx, next) => {
  const {
    id,
    name
  } = await useToken(ctx);

  if (id && name) {
    ctx.set(UID_KEY, id);
    await next();
  } else {
    return (0, _htr.default)(ctx, 401, null, '请先登录');
  }
};

exports.auth = auth;