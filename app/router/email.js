"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _nodemailer = _interopRequireDefault(require("nodemailer"));

var _file = require("../lib/file");

var _htr = _interopRequireDefault(require("../lib/htr"));

var _config = _interopRequireDefault(require("../config"));

var _service = require("../service");

var _tool = require("../lib/tool");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const SPACE_NAME = 'email';

const transporter = _nodemailer.default.createTransport({
  host: "smtp.exmail.qq.com",
  port: 465,
  secure: true,
  // Use `true` for port 465, `false` for all other ports
  auth: {
    user: _config.default.ms_email,
    pass: _config.default.ms_token
  }
});

const emailRouter = (router, apiPath, io) => {
  const apiFn = path => `${apiPath}/${SPACE_NAME}/${path}`; // 发送邮箱验证码


  router.post(apiFn('send'), async ctx => {
    const {
      email
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([email])) {
      return (0, _htr.default)(ctx, 400);
    }

    const udb = ctx.request.header['x-requested-with']; // 判断用户是否已注册

    const userPath = (0, _tool.getDbPath)('user', udb, 'user');
    const userList = (0, _file.RF)(userPath) || [];
    const hasUser = userList.find(v => v.email === email);

    if (hasUser) {
      return (0, _htr.default)(ctx, 500, null, '邮箱已注册，请直接登录');
    } // 定义transport对象并发送邮件


    const emailCode = (Date.now() + '').slice(-5, -1);

    try {
      let info = await transporter.sendMail({
        from: '"Flowmix Office Solution "<lowcode@turntip.cn>',
        // 发送方邮箱的账号
        to: email,
        // 邮箱接受者的账号
        subject: "flowmix多模态搭建平台邮箱验证服务",
        // Subject line
        text: "打造下一代AI办公解决方案",
        // 文本内容
        html: `欢迎注册flowmix多模态搭建平台（新一代数智化办公营销平台）, 您的邮箱验证码是:<b>${emailCode}</b>， 地址: <a href="http://orange.turntip.cn/doc">立即体验</a>` // html 内容, 如果设置了html内容, 将忽略text内容

      });
      const filePath = (0, _tool.getDbPath)('user', udb, 'email_code');
      const data = (0, _file.RF)(filePath, false, {});
      data[email] = emailCode;
      (0, _file.WF)(filePath, data, 0, false);
      return (0, _htr.default)(ctx, 200, null, '验证码已发送至邮箱');
    } catch (error) {
      return (0, _htr.default)(ctx, 500, null, '邮箱服务异常');
    }
  }); // 一键催单接口

  router.post(apiFn('order/send'), _service.auth, async ctx => {
    const {
      role,
      name
    } = ctx.request.body; // 定义transport对象并发送邮件

    try {
      let info = await transporter.sendMail({
        from: '"Flowmix Office Solution "<lowcode@turntip.cn>',
        // 发送方邮箱的账号
        to: 'xujiang156@qq.com',
        // 邮箱接受者的账号
        subject: "flowmix多模态搭建平台邮箱提醒服务",
        // Subject line
        text: "会员开通提醒",
        // 文本内容
        html: `请及时处理会员${name}开通权限为${role}的请求` // html 内容, 如果设置了html内容, 将忽略text内容

      });
      return (0, _htr.default)(ctx, 200, null, '已通知, 请耐心等待');
    } catch (error) {
      return (0, _htr.default)(ctx, 500, null, '邮箱服务异常');
    }
  });
};

var _default = emailRouter;
exports.default = _default;