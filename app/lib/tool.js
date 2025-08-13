"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateRandomStr = generateRandomStr;
exports.isAllEmpty = isAllEmpty;
exports.rand = rand;
exports.getIPAdress = getIPAdress;
exports.calculateObjectSize = calculateObjectSize;
exports.getDbPath = void 0;

var _path = require("path");

const dbPath = (0, _path.resolve)(process.cwd(), './public/db');

const getDbPath = (namespace, appname, filename) => `${dbPath}/${namespace}/${appname}_${filename}.json`; //获取本机ip地址


exports.getDbPath = getDbPath;

function getIPAdress() {
  var interfaces = require('os').networkInterfaces();

  for (var devName in interfaces) {
    var iface = interfaces[devName];

    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];

      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
}
/**
 * 计算对象的大小
 * @param {*} obj
 * @returns
 */


function calculateObjectSize(obj) {
  const str = JSON.stringify(obj);
  const sizeInBytes = new Blob([str]).size;

  if (sizeInBytes < 1024) {
    return `${sizeInBytes}B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)}KB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)}MB`;
  }
}
/**
 * 生成指定个数的随机字符转串
 * n 随机字符串的个数
 */


function generateRandomStr(n) {
  let str = 'abcdefghigklmnopqrstuvexyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_-+%$';
  let res = '';
  let len = str.length;

  for (let i = 0; i < n; i++) {
    res += str[Math.floor(Math.random() * len)];
  }

  return res;
}

function isAllEmpty(arr) {
  return arr.some(v => v === '' || v === null || v === undefined);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}