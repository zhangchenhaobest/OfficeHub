"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var cheerio = _interopRequireWildcard(require("cheerio"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const crawlRouter = (router, apiPath, io) => {
  const apiFn = path => `${apiPath}/${path}`;
  /** 获取消息列表 */


  router.get(apiFn('fetchUrl'), async ctx => {
    const {
      url
    } = ctx.query;
    const htmlStr = await fetch(url).then(res => res.text());
    const $ = await cheerio.load(htmlStr);
    const title = $('title').first().text();
    const desc = $('meta[name=description]').attr('content');
    const icon = $('link[rel=icon]').attr('href');
    const host = new URL(url).origin;
    ctx.status = 200;
    ctx.body = {
      "success": 1,
      "link": url,
      "meta": {
        title,
        "site_name": title,
        "description": desc,
        "image": {
          "url": icon ? icon.includes('http') ? icon : `${host}/${icon}` : '/favicon.ico'
        }
      }
    };
  });
};

var _default = crawlRouter;
exports.default = _default;