"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const _cache = {
  data: {},
  prefix: '|-|',
  defaultExpire: 1000 * 60 * 60,
  maxLen: 300,

  get(key, path) {
    const {
      data,
      prefix
    } = this;

    if (data[key]) {
      const pathkeys = Object.keys(data[key]);
      const curPath = pathkeys.filter(v => v.indexOf(path) >= 0)[0];

      if (curPath) {
        const expire = curPath.split(prefix)[1];

        if (expire < Date.now()) {
          delete data[key][curPath];
        }

        return data[key][curPath];
      }
    }

    return null;
  },

  set(key, path, value, expire) {
    const {
      data,
      prefix,
      maxLen,
      defaultExpire
    } = this;

    if (!data[key]) {
      data[key] = {};
    }

    const pathkeys = Object.keys(data[key]); // 如果path数超过maxLen, 禁止写入内存

    if (pathkeys.length > maxLen) {
      return;
    }

    const curPath = pathkeys.filter(v => v.indexOf(path) >= 0)[0]; // 如果当前path已存在, 则执行修改命令

    if (curPath) {
      data[key][curPath] = value;
      return;
    } // 默认缓存一小时


    const time = Date.now() + (expire || defaultExpire); // 将缓存存入key-path中

    data[key][path + prefix + time] = value;
  },

  clear(key) {
    delete this.data[key];
  }

};
var _default = _cache;
exports.default = _default;