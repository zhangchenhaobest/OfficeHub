"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _htr = _interopRequireDefault(require("../lib/htr"));

var _service = require("../service");

var _tool = require("../lib/tool");

var _config = _interopRequireDefault(require("../config"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const SPACE_NAME = 'ai';
const ai2textUrl = 'https://dashscope.aliyuncs.com/api/v1/apps/144963f7b8b44d4eabe09d2cf17ff867/completion';
const ai2Mind = 'https://dashscope.aliyuncs.com/api/v1/apps/b6e6c247015b4027801daf1c8df06a15/completion';

const aiReq = async (url, data) => {
  const resopnse = await fetch(url, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${_config.default.al_ty_ak}` //   "X-DashScope-Async": "enable" // 文生图专用

    },
    redirect: "follow",
    // referrerPolicy: "no-referrer", 
    body: JSON.stringify(data)
  });
  return resopnse.json();
};

const aiRouter = (router, apiPath, io) => {
  const apiFn = path => `${apiPath}/${SPACE_NAME}/${path}`;
  /** 通义千问 */


  router.get(apiFn('tyqw/free'), _service.auth, async ctx => {
    // 判断用户是否有用量
    const {
      id,
      cmb = 100
    } = await (0, _service.useToken)(ctx);

    if ((0, _tool.isAllEmpty)([id])) {
      return (0, _htr.default)(ctx, 400, null, '缺少参数');
    }

    const {
      text,
      type
    } = ctx.query;
    let url = '';

    if (type === 'text') {
      url = ai2textUrl;
    } else if (type === 'mind') {
      url = ai2Mind;
    }

    const resopnse = await aiReq(url, {
      "input": {
        "prompt": text
      }
    });
    const time = Date.now();
    const fid = `d${time}`;

    if (resopnse.output) {
      return (0, _htr.default)(ctx, 200, {
        id: fid,
        output: resopnse.output,
        usage: resopnse.usage
      });
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务请求超时');
    }
  });
};

var _default = aiRouter;
exports.default = _default;