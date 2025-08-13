"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));

var _file = require("../lib/file");

var _config = _interopRequireDefault(require("../config"));

var _htr = _interopRequireDefault(require("../lib/htr"));

var _uuid = _interopRequireDefault(require("uuid"));

var _tool = require("../lib/tool");

var _service = require("../service");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const SPACE_NAME = 'user';
const roleMap = {
  '10': 100,
  '11': 300,
  '12': 500
};

const userRouter = (router, apiPath, io) => {
  const apiFn = path => `${apiPath}/${SPACE_NAME}/${path}`; // _________________________________ 会员管理 _______________________________
  // 用户登录


  router.post(apiFn('login'), async ctx => {
    const {
      name,
      pwd
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([name, pwd])) {
      return (0, _htr.default)(ctx, 400, null, '用户名/密码不能为空');
    }

    const udb = ctx.request.header['x-requested-with'];
    const filePath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'user');
    const data = (0, _file.RF)(filePath) || [];

    const _pwd = (0, _service.encrypt)(pwd);

    console.log(_pwd);
    const user = data.find(item => (item.name === name || item.email === name) && item.pwd === _pwd);

    if (user) {
      const {
        id,
        name,
        role,
        email,
        avatar,
        phone,
        cmb
      } = user; // 存储用户信息

      let info = {
        id,
        name,
        email,
        role,
        cmb,
        avatar,
        udb
      };
      let data = {
        name,
        role,
        id,
        email,
        avatar,
        phone,
        cmb,
        // 签发 token，30天
        token: _jsonwebtoken.default.sign(info, _config.default.jwt_secret, {
          expiresIn: '30d'
        })
      };
      return (0, _htr.default)(ctx, 200, data, '登录成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '用户名/密码错误');
    }
  }); // 用户登出

  router.get(apiFn('logout'), _service.auth, async ctx => {
    const obj = await (0, _service.useToken)(ctx);

    if (obj) {
      return (0, _htr.default)(ctx, 200, null, '已退出');
    } else {
      return (0, _htr.default)(ctx, 500, null, '用户信息不存在');
    }
  }); // 添加管理员

  router.post(apiFn('add'), (0, _service.useGuards)(['0']), async ctx => {
    const {
      name,
      pwd,
      role
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([name, pwd])) {
      return (0, _htr.default)(ctx, 500, '必须填写用户名和密码');
    }

    const udb = ctx.request.header['x-requested-with'];
    const filePath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'user');

    const _pwd = (0, _service.encrypt)(pwd);

    const time = Date.now();
    const res = (0, _file.WF)(filePath, {
      id: (0, _uuid.default)(),
      name,
      pwd: _pwd,
      role,
      ct: time
    }, 1);

    if (res) {
      return (0, _htr.default)(ctx, 200, null, '创建成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 用户信息设置

  router.put(apiFn('mod'), _service.auth, async ctx => {
    const {
      name,
      email,
      avatar,
      phone
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([name])) {
      return (0, _htr.default)(ctx, 400, '用户名不能为空');
    }

    const udb = ctx.request.header['x-requested-with'];
    const filePath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'user');
    const time = Date.now();
    const users = (0, _file.RF)(filePath);
    const {
      id
    } = await (0, _service.useToken)(ctx);
    const newUsers = users.map(v => {
      if (v.id === id) {
        return { ...v,
          name,
          phone,
          avatar,
          email,
          ut: time
        };
      }

      return v;
    });
    const res = (0, _file.WF)(filePath, newUsers);

    if (res) {
      return (0, _htr.default)(ctx, 200, null, '修改成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 获取用户信息

  router.get(apiFn('one'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const filePath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'user');
    const users = (0, _file.RF)(filePath);
    const {
      id
    } = await (0, _service.useToken)(ctx);
    const user = users.find(v => v.id === id);

    if (user) {
      delete user.pwd; // 统计用户的资产

      const listPath = `${_config.default.publicPath}/db/${udb}/${id}/list.json`;
      const list = (0, _file.RF)(listPath);
      const docs = list.filter(v => v.type === 'doc');
      const excels = list.filter(v => v.type === 'excel');
      return (0, _htr.default)(ctx, 200, { ...user,
        docs: docs.length,
        excels: excels.length
      });
    } else {
      return (0, _htr.default)(ctx, 500, null, '用户不存在');
    }
  }); // 会员权益提交

  router.post(apiFn('mod/role'), _service.auth, async ctx => {
    const {
      id,
      name,
      role
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([id, role])) {
      return (0, _htr.default)(ctx, 400);
    }

    const udb = ctx.request.header['x-requested-with'];
    const filePath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'user_review_list');
    const res = (0, _file.addRowToArr)(filePath, {
      id,
      role,
      name
    }, ['id', 'role']);

    if (res) {
      return (0, _htr.default)(ctx, 200, null, '提交成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '操作失败');
    }
  }); // 会员权益审批

  router.put(apiFn('mod/role'), (0, _service.useGuards)(['0', '1']), async ctx => {
    const {
      id,
      role
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([id, role])) {
      return (0, _htr.default)(ctx, 400);
    }

    const udb = ctx.request.header['x-requested-with'];
    const filePath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'user');
    const reviewPath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'user_review_list');
    const res = (0, _file.modRowToArr)(filePath, {
      id,
      role,
      cmb: roleMap[role]
    });
    const reviewRes = (0, _file.modRowToArr)(reviewPath, {
      id,
      role,
      status: '1'
    });

    if (res && reviewRes) {
      return (0, _htr.default)(ctx, 200, null, '已审批');
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 会员审批列表

  router.get(apiFn('mod/role'), (0, _service.useGuards)(['0', '1']), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const filePath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'user_review_list');
    const users = (0, _file.RF)(filePath, false, []);
    return (0, _htr.default)(ctx, 200, users);
  }); // 删除会员

  router.delete(apiFn('del'), (0, _service.useGuards)(['0', '1']), async ctx => {
    const {
      id
    } = ctx.query;

    if ((0, _tool.isAllEmpty)([id])) {
      return (0, _htr.default)(ctx, 400, '用户ID不能为空');
    }

    const udb = ctx.request.header['x-requested-with'];
    const filePath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'user');
    const data = (0, _file.RF)(filePath);
    const user = data.filter(item => item.id !== id);
    const res = (0, _file.WF)(filePath, user);

    if (res) {
      return (0, _htr.default)(ctx, 200, null, '删除成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 获取会员列表

  router.get(apiFn('list'), (0, _service.useGuards)(['0', '1']), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const filePath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'user');
    const data = (0, _file.RF)(filePath);

    if (data) {
      return (0, _htr.default)(ctx, 200, data);
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // // 生成邀请码服务

  router.get(apiFn('code'), // useGuards(['0', '1']),
  async ctx => {
    const code = (0, _tool.rand)(1000, 9999) + '';
    const udb = ctx.request.header['x-requested-with'];
    const filePath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'code');
    const time = Date.now(); // const obj = await useToken(ctx);

    const res = (0, _file.WF)(filePath, {
      code,
      ct: time // operater: obj.name

    }, 1);

    if (res) {
      return (0, _htr.default)(ctx, 200, {
        code
      }, '邀请码生成成功');
    } else {
      return (0, _htr.default)(ctx, 500, '生成失败');
    }
  }); // 获取操作记录

  router.get(apiFn('code/logs'), (0, _service.useGuards)(['0', '1']), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      page = 1,
      pagesize = 10
    } = ctx.query;
    const filePath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'code');
    const data = (0, _file.RF)(filePath);

    if (data) {
      const curData = data.reverse().slice((+page - 1) * +pagesize, +page * +pagesize);
      return (0, _htr.default)(ctx, 200, {
        list: curData,
        total: data.length
      });
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 会员注册

  router.post(apiFn('register'), async ctx => {
    const {
      code,
      name,
      pwd
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([code, name, pwd])) {
      return (0, _htr.default)(ctx, 500, '缺少参数');
    }

    const udb = ctx.request.header['x-requested-with'];
    const codeListPath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'code');
    const codeList = (0, _file.RF)(codeListPath);
    const curCode = codeList.find(v => v.code === code);

    if (!curCode || curCode.status === 'done') {
      return (0, _htr.default)(ctx, 500, '邀请码不存在');
    }

    const filePath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'user');

    const _pwd = (0, _service.encrypt)(pwd);

    const time = Date.now();
    const uid = (0, _uuid.default)();
    const res = (0, _file.WF)(filePath, {
      id: uid,
      name,
      pwd: _pwd,
      cmb: 100,
      role: '10',
      ct: time
    }, 1);

    if (res) {
      (0, _file.WF)(codeListPath, codeList.map(v => {
        if (v.code === code) {
          return { ...v,
            status: 'done'
          };
        }

        return v;
      }));
      return (0, _htr.default)(ctx, 200, {
        id: uid,
        name,
        role: '10'
      }, '注册成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 邮箱注册

  router.post(apiFn('register/email'), async ctx => {
    const {
      code,
      email,
      pwd
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([code, email, pwd])) {
      return (0, _htr.default)(ctx, 500, '缺少参数');
    }

    const udb = ctx.request.header['x-requested-with'];
    const emailPath = (0, _tool.getDbPath)('user', udb, 'email_code');
    const emails = (0, _file.RF)(emailPath, false, {});

    if (emails[email] !== code) {
      return (0, _htr.default)(ctx, 500, '邮箱验证码错误');
    }

    const filePath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'user');

    const _pwd = (0, _service.encrypt)(pwd);

    const time = Date.now();
    const uid = (0, _uuid.default)();
    const res = (0, _file.WF)(filePath, {
      id: uid,
      email,
      name: 'flowmix_' + time,
      pwd: _pwd,
      cmb: 100,
      role: '10',
      ct: time
    }, 1);

    if (res) {
      return (0, _htr.default)(ctx, 200, {
        id: uid,
        email,
        role: '10'
      }, '注册成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  });
};

var _default = userRouter;
exports.default = _default;