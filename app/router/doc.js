"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _file = require("../lib/file");

var _config = _interopRequireDefault(require("../config"));

var _htr = _interopRequireDefault(require("../lib/htr"));

var _tool = require("../lib/tool");

var _uuid = _interopRequireDefault(require("uuid"));

var _service = require("../service");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const SPACE_NAME = 'doc';

function sortByVtDesc(list) {
  return list.sort((a, b) => b.vt - a.vt);
}

const docRouter = (router, apiPath, io) => {
  const apiFn = path => `${apiPath}/${SPACE_NAME}/${path}`; // GET 个人文档列表


  router.get(apiFn('list'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      keyword = '',
      space = 'root',
      type,
      page = 1,
      pagesize = 10
    } = ctx.query;
    const uid = ctx.response.get(_service.UID_KEY);
    const filePath = `${_config.default.publicPath}/db/${udb}/${uid}/list.json`;
    const catePath = `${_config.default.publicPath}/db/${udb}/${uid}/cate.json`;
    const data = (0, _file.RF)(filePath);
    const cates = (0, _file.RF)(catePath, false, {});

    if (data) {
      // 如果space存在
      if (space && space !== 'root') {
        const cate = cates[space];

        if (!cate) {
          return (0, _htr.default)(ctx, 500, null, '分类不存在');
        }

        const list = data.filter(v => (v.title || '').includes(keyword) && v.space === space);
        const result = sortByVtDesc(list);
        const curData = result.slice((+page - 1) * +pagesize, +page * +pagesize);
        return (0, _htr.default)(ctx, 200, {
          list: curData,
          total: list.length
        });
      } // 如果type存在


      if (type) {
        const list = data.filter(v => (v.title || '').includes(keyword) && v.type === type);
        const result = sortByVtDesc(list);
        const curData = result.slice((+page - 1) * +pagesize, +page * +pagesize);
        return (0, _htr.default)(ctx, 200, {
          list: curData,
          total: list.length
        });
      } // 最近列表(综合)


      const newData = [];
      const list = data.filter(v => (v.title || '').includes(keyword));
      const descList = sortByVtDesc(list);

      if (descList) {
        const catesCache = {};
        descList.forEach(v => {
          if (v.space === 'root' || !v.space) {
            newData.push(v);
            return;
          }

          if (cates[v.space] && !catesCache[v.space]) {
            newData.push(cates[v.space]);
            catesCache[v.space] = true;
          }
        }); // 将没有的分类加入

        Object.values(cates).forEach(v => {
          if (!catesCache[v.tid]) {
            newData.push(v);
          }
        });
      }

      return (0, _htr.default)(ctx, 200, {
        list: sortByVtDesc(newData),
        total: newData.length
      });
    } else {
      return (0, _htr.default)(ctx, 500, null, '数据错误');
    }
  }); // POST  保存文档

  router.post(apiFn('save'), _service.auth, async ctx => {
    const {
      tid,
      title = '未命名',
      data,
      uid,
      space = 'root',
      type = 'doc'
    } = ctx.request.body;
    const udb = ctx.request.header['x-requested-with'];
    const {
      id
    } = await (0, _service.useToken)(ctx);
    const allPath = `${_config.default.publicPath}/db/${udb}/list.json`;
    const userId = uid || id;
    const vt = Date.now();
    const myPath = `${_config.default.publicPath}/db/${udb}/${userId}/list.json`; // 计算文档体积

    const docSize = (0, _tool.calculateObjectSize)({
      title,
      data
    });

    if (tid) {
      // 更新
      // 写入文档
      const docPath = `${_config.default.publicPath}/db/${udb}/${userId}/${tid}.json`;
      const row = (0, _file.RF)(docPath);
      const docRes = (0, _file.WF)(docPath, { ...row,
        title,
        data,
        vt
      }, 0, false); // 更新个人列表

      const list = (0, _file.RF)(myPath);
      const newList = list.map(v => {
        return v.tid === tid ? { ...v,
          title,
          type,
          size: docSize,
          vt
        } : v;
      });
      const myListRes = (0, _file.WF)(myPath, newList); // 更新公共列表

      const allRes = (0, _file.modRowToArr)(allPath, {
        tid: tid,
        title,
        uid: userId,
        type,
        vt
      }, 'tid');
      return (0, _htr.default)(ctx, 200, {
        tid
      });
    } else {
      // 新增
      // 写入文档
      const tid = (0, _uuid.default)();
      const docPath = `${_config.default.publicPath}/db/${udb}/${userId}/${tid}.json`;
      const docRes = (0, _file.WF)(docPath, {
        tid,
        data,
        title,
        uid: userId,
        ct: vt,
        vt
      }, 0, false); // 更新个人列表

      const newList = (0, _file.addRowToArr)(myPath, {
        tid,
        title,
        type,
        size: docSize,
        uid: userId,
        vt,
        space
      }); // 更新公共列表

      const allRes = (0, _file.addRowToArr)(allPath, {
        tid,
        title,
        type,
        uid: userId,
        vt
      });
      return (0, _htr.default)(ctx, 200, {
        tid
      });
    }
  }); // POST  复制文档

  router.post(apiFn('copy'), _service.auth, async ctx => {
    const {
      tid,
      uid,
      space = 'root',
      type = 'doc'
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([tid])) {
      return (0, _htr.default)(ctx, 400, null, '缺少参数');
    }

    const udb = ctx.request.header['x-requested-with'];
    const {
      id
    } = await (0, _service.useToken)(ctx);
    const allPath = `${_config.default.publicPath}/db/${udb}/list.json`;
    const userId = uid || id;
    const vt = Date.now();
    const newTid = (0, _uuid.default)();
    const docPath = `${_config.default.publicPath}/db/${udb}/${userId}/${tid}.json`;
    const myPath = `${_config.default.publicPath}/db/${udb}/${userId}/list.json`;
    const newDocPath = `${_config.default.publicPath}/db/${udb}/${userId}/${newTid}.json`;
    const row = (0, _file.RF)(docPath);
    const docRes = (0, _file.WF)(newDocPath, { ...row,
      tid: newTid,
      title: (row.title || '未命名') + '(副本)',
      uid: userId,
      vt
    }, 0, false); // 更新个人列表

    const myListRes = (0, _file.addRowToArr)(myPath, {
      tid: newTid,
      title: (row.title || '未命名') + '(副本)',
      type,
      uid: userId,
      vt,
      space
    }); // 更新公共列表

    const allRes = (0, _file.addRowToArr)(allPath, {
      tid: newTid,
      title: (row.title || '未命名') + '(副本)',
      type,
      uid: userId,
      vt
    });
    return (0, _htr.default)(ctx, 200);
  }); // POST  移动文档

  router.put(apiFn('move'), _service.auth, async ctx => {
    const {
      tid,
      uid,
      space
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([tid, space])) {
      return (0, _htr.default)(ctx, 400, null, '缺少参数');
    }

    const udb = ctx.request.header['x-requested-with'];
    const {
      id
    } = await (0, _service.useToken)(ctx);
    const allPath = `${_config.default.publicPath}/db/${udb}/list.json`;
    const userId = uid || id;
    const vt = Date.now();
    const myPath = `${_config.default.publicPath}/db/${udb}/${userId}/list.json`; // 更新个人列表

    const list = (0, _file.RF)(myPath);
    const newList = list.map(v => {
      return v.tid === tid ? { ...v,
        space,
        vt
      } : v;
    });
    const myListRes = (0, _file.WF)(myPath, newList); // 更新公共列表

    const allList = (0, _file.RF)(allPath);
    const newAllList = allList.map(v => {
      return v.tid === tid ? { ...v,
        space,
        vt
      } : v;
    });
    const allRes = (0, _file.WF)(allPath, newAllList);

    if (myListRes) {
      return (0, _htr.default)(ctx, 200);
    } else {
      return (0, _htr.default)(ctx, 500, null, '操作失败');
    }
  }); // PUT 个人页面发布

  router.put(apiFn('pub'), _service.auth, async ctx => {
    const {
      tid,
      uid,
      title,
      desc,
      data,
      icon,
      status
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([tid])) {
      return (0, _htr.default)(ctx, 500, null, '缺少参数');
    }

    const udb = ctx.request.header['x-requested-with'];
    const {
      id
    } = await (0, _service.useToken)(ctx);
    const userId = uid || id;
    const vt = Date.now();
    const allPath = `${_config.default.publicPath}/db/${udb}/list.json`;
    const myPath = `${_config.default.publicPath}/db/${udb}/${userId}/list.json`;
    const docPath = `${_config.default.publicPath}/db/${udb}/${userId}/${tid}.json`; // 更新页面数据

    const doc = (0, _file.RF)(docPath);
    const docRes = (0, _file.WF)(docPath, { ...doc,
      data,
      icon,
      status,
      title,
      desc,
      vt
    }, 0, false); // 更新个人列表状态

    const list = (0, _file.RF)(myPath);
    const newList = list.map(v => {
      return v.tid === tid ? { ...v,
        status
      } : v;
    });
    const myRes = (0, _file.WF)(myPath, newList); // 更新公共列表状态

    const allList = (0, _file.RF)(allPath);
    const newAllList = allList.map(v => {
      return v.tid === tid ? { ...v,
        status
      } : v;
    });
    const allRes = (0, _file.WF)(allPath, newAllList);
    return (0, _htr.default)(ctx, 200);
  }); // GET 获取文档详情(私有)

  router.get(apiFn('detail'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      tid,
      uid
    } = ctx.query;
    const id = ctx.response.get(_service.UID_KEY);
    const userId = uid || id;
    const filePath = `${_config.default.publicPath}/db/${udb}/${userId}/${tid}.json`;
    const data = (0, _file.RF)(filePath, false, {});
    const vt = Date.now();
    data.vt = vt;
    const res = (0, _file.WF)(filePath, data, 0, false); // 判断文档是否已收藏

    const favPath = `${_config.default.publicPath}/db/${udb}/${id}/favorite.json`;
    const list = (0, _file.RF)(favPath) || [];

    if (list.find(v => v.tid === tid)) {
      data.hasFav = true;
    }

    return (0, _htr.default)(ctx, 200, data);
  }); // GET 获取文档详情(公开)

  router.get(apiFn('detail/pub'), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      tid,
      uid
    } = ctx.query;
    const filePath = `${_config.default.publicPath}/db/${udb}/${uid}/${tid}.json`;
    const data = (0, _file.RF)(filePath);
    return (0, _htr.default)(ctx, 200, data);
  }); // POST 文档表单数据提交

  router.post(apiFn('detail/form'), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      uid,
      tid,
      form,
      fid
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([uid, tid, form, fid])) {
      return (0, _htr.default)(ctx, 500, null, '缺少参数');
    }

    const formPath = `${_config.default.publicPath}/db/${udb}/${uid}/${tid}/${fid}_form.json`;
    const res = (0, _file.addRowToArr)(formPath, {
      id: fid,
      ct: Date.now(),
      form
    });

    if (res) {
      return (0, _htr.default)(ctx, 200, null, '提交成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '数据错误');
    }
  }); // GET 获取表单数据

  router.get(apiFn('detail/form'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      uid,
      tid,
      fid
    } = ctx.query;
    const formPath = `${_config.default.publicPath}/db/${udb}/${uid}/${tid}/${fid}_form.json`;
    const data = (0, _file.RF)(formPath);

    if (data) {
      return (0, _htr.default)(ctx, 200, data.reverse());
    } else {
      return (0, _htr.default)(ctx, 500);
    }
  }); // POST 文档白板数据保存

  router.post(apiFn('detail/board'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      uid,
      tid,
      data,
      bid
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([bid])) {
      return (0, _htr.default)(ctx, 500, null, '缺少参数');
    }

    const boardPath = `${_config.default.publicPath}/db/${udb}/board/${bid}.json`;
    const res = (0, _file.WF)(boardPath, {
      id: bid,
      vt: Date.now(),
      data
    }, 0, false);

    if (res) {
      return (0, _htr.default)(ctx, 200, {
        id: bid
      });
    } else {
      return (0, _htr.default)(ctx, 500);
    }
  }); // GET 获取白板数据

  router.get(apiFn('detail/board'), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      uid,
      tid,
      bid
    } = ctx.query;
    const boardPath = `${_config.default.publicPath}/db/${udb}/board/${bid}.json`;
    const data = (0, _file.RF)(boardPath, false, {});

    if (data) {
      return (0, _htr.default)(ctx, 200, data);
    } else {
      return (0, _htr.default)(ctx, 500);
    }
  }); // POST 高级思维导图数据保存

  router.post(apiFn('detail/mind'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      uid,
      tid,
      data,
      mid
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([mid])) {
      return (0, _htr.default)(ctx, 500, null, '缺少参数');
    }

    const mindPath = `${_config.default.publicPath}/db/${udb}/mind/${mid}.json`;
    const res = (0, _file.WF)(mindPath, {
      id: mid,
      uid,
      tid,
      vt: Date.now(),
      data
    }, 0, false);

    if (res) {
      return (0, _htr.default)(ctx, 200, {
        id: mid
      });
    } else {
      return (0, _htr.default)(ctx, 500);
    }
  }); // GET 获取高级思维导图数据

  router.get(apiFn('detail/mind'), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      uid,
      tid,
      mid
    } = ctx.query;
    const mindPath = `${_config.default.publicPath}/db/${udb}/mind/${mid}.json`;
    const data = (0, _file.RF)(mindPath, false, {});

    if (data) {
      return (0, _htr.default)(ctx, 200, data);
    } else {
      return (0, _htr.default)(ctx, 500);
    }
  }); // POST 划词评论数据保存

  router.post(apiFn('detail/mark'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      tid,
      mid,
      text,
      refText
    } = ctx.request.body;
    const {
      name,
      id: uid,
      avatar
    } = await (0, _service.useToken)(ctx);

    if ((0, _tool.isAllEmpty)([tid, mid, text, refText])) {
      return (0, _htr.default)(ctx, 400, null, '缺少参数');
    }

    const markPath = `${_config.default.publicPath}/db/${udb}/${tid}/word_review.json`;
    const id = (0, _uuid.default)();
    const res = (0, _file.addRowToArr)(markPath, {
      mid,
      id,
      name,
      uid,
      avatar,
      ct: Date.now(),
      text,
      refText
    });

    if (res) {
      return (0, _htr.default)(ctx, 200, {
        id
      });
    } else {
      return (0, _htr.default)(ctx, 500);
    }
  }); // GET 获取划词评论数据

  router.get(apiFn('detail/mark'), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      tid,
      mid
    } = ctx.query;

    if ((0, _tool.isAllEmpty)([tid])) {
      return (0, _htr.default)(ctx, 400, null, '缺少参数');
    }

    const markPath = `${_config.default.publicPath}/db/${udb}/${tid}/word_review.json`;
    const data = (0, _file.RF)(markPath);

    if (data) {
      const list = mid ? data.filter(item => item.mid === mid).reverse() : data;
      return (0, _htr.default)(ctx, 200, {
        list,
        total: list.length
      });
    } else {
      return (0, _htr.default)(ctx, '数据不存在');
    }
  }); // POST 文档评论保存

  router.post(apiFn('detail/review'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      tid,
      text
    } = ctx.request.body;
    const {
      name,
      id: uid,
      avatar
    } = await (0, _service.useToken)(ctx);

    if ((0, _tool.isAllEmpty)([tid, text])) {
      return (0, _htr.default)(ctx, 400, null, '缺少参数');
    }

    const markPath = `${_config.default.publicPath}/db/${udb}/${tid}/review.json`;
    const id = (0, _uuid.default)();
    const res = (0, _file.addRowToArr)(markPath, {
      id,
      uid,
      name,
      avatar,
      ct: Date.now(),
      text
    });

    if (res) {
      return (0, _htr.default)(ctx, 200, {
        id
      });
    } else {
      return (0, _htr.default)(ctx, 500);
    }
  }); // GET 获取评论数据

  router.get(apiFn('detail/review'), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      tid
    } = ctx.query;

    if ((0, _tool.isAllEmpty)([tid])) {
      return (0, _htr.default)(ctx, 400, null, '缺少参数');
    }

    const markPath = `${_config.default.publicPath}/db/${udb}/${tid}/review.json`;
    const data = (0, _file.RF)(markPath);

    if (data) {
      const list = data.reverse();
      return (0, _htr.default)(ctx, 200, {
        list,
        total: list.length
      });
    } else {
      return (0, _htr.default)(ctx, 400, '数据不存在');
    }
  }); // POST 文档点赞

  router.post(apiFn('detail/flover'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      tid,
      avatar
    } = ctx.request.body;
    const {
      id,
      name,
      email
    } = await (0, _service.useToken)(ctx);

    if ((0, _tool.isAllEmpty)([tid])) {
      return (0, _htr.default)(ctx, 400, null, '缺少参数');
    }

    const floverPath = `${_config.default.publicPath}/db/${udb}/${tid}/flover.json`;
    const res = (0, _file.addRowToArr)(floverPath, {
      id,
      name: name || email,
      avatar,
      ct: Date.now()
    }, ['id']);

    if (res) {
      return (0, _htr.default)(ctx, 200);
    } else {
      return (0, _htr.default)(ctx, 500);
    }
  }); // GET 获取点赞数据

  router.get(apiFn('detail/flover'), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      tid
    } = ctx.query;

    if ((0, _tool.isAllEmpty)([tid])) {
      return (0, _htr.default)(ctx, 400, null, '缺少参数');
    }

    const floverPath = `${_config.default.publicPath}/db/${udb}/${tid}/flover.json`;
    const data = (0, _file.RF)(floverPath);

    if (data) {
      const list = data.reverse();
      return (0, _htr.default)(ctx, 200, {
        list,
        total: list.length
      });
    } else {
      return (0, _htr.default)(ctx, '数据不存在');
    }
  }); // POST 文档表格数据保存

  router.post(apiFn('detail/excel'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      uid,
      tid,
      data,
      sid
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([sid])) {
      return (0, _htr.default)(ctx, 500, null, '缺少参数');
    }

    const excelPath = `${_config.default.publicPath}/db/${udb}/excel/${sid}.json`;
    const res = (0, _file.WF)(excelPath, {
      id: sid,
      vt: Date.now(),
      data
    }, 0, false);

    if (res) {
      return (0, _htr.default)(ctx, 200, {
        id: sid
      });
    } else {
      return (0, _htr.default)(ctx, 500);
    }
  }); // GET 获取表格数据

  router.get(apiFn('detail/excel'), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      uid,
      tid,
      sid
    } = ctx.query;
    const excelPath = `${_config.default.publicPath}/db/${udb}/excel/${sid}.json`;
    const data = (0, _file.RF)(excelPath);

    if (data) {
      return (0, _htr.default)(ctx, 200, data);
    } else {
      return (0, _htr.default)(ctx, 500);
    }
  }); // DELETE 删除文档

  router.delete(apiFn('del'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      tid,
      uid
    } = ctx.query;

    if ((0, _tool.isAllEmpty)([tid])) {
      return (0, _htr.default)(ctx, 500, null, '缺少参数');
    }

    const userId = uid || ctx.response.get(_service.UID_KEY);
    const filePath = `${_config.default.publicPath}/db/${udb}/${userId}/${tid}.json`;
    const allPath = `${_config.default.publicPath}/db/${udb}/list.json`;
    const myPath = `${_config.default.publicPath}/db/${udb}/${userId}/list.json`; // 删除页面数据

    (0, _file.delFile)(filePath);
    const res1 = (0, _file.delById)(allPath, tid, 'tid');
    const res2 = (0, _file.delById)(myPath, tid, 'tid');

    if (res1 && res2) {
      return (0, _htr.default)(ctx, 200, null, '删除成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // POST 收藏文档

  router.post(apiFn('favorite'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      uid,
      tid,
      title,
      type
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([uid, tid])) {
      return (0, _htr.default)(ctx, 400, null, '缺少参数');
    }

    const {
      id
    } = await (0, _service.useToken)(ctx);
    const favPath = `${_config.default.publicPath}/db/${udb}/${id}/favorite.json`;
    const list = (0, _file.RF)(favPath) || [];

    if (list.find(v => v.tid === tid && v.uid === uid)) {
      return (0, _htr.default)(ctx, 200, null, '已收藏');
    }

    const res = (0, _file.addRowToArr)(favPath, {
      uid,
      tid,
      title,
      type,
      ct: Date.now()
    });

    if (res) {
      return (0, _htr.default)(ctx, 200);
    } else {
      return (0, _htr.default)(ctx, 500, null, '数据错误');
    }
  }); // GET 收藏列表

  router.get(apiFn('favorite'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      id
    } = await (0, _service.useToken)(ctx);
    const {
      keyword,
      page = 1,
      pagesize = 10
    } = ctx.query;
    const favPath = `${_config.default.publicPath}/db/${udb}/${id}/favorite.json`;
    const list = (0, _file.getDataFromArr)(favPath, {
      keyword,
      search_key: 'title',
      page,
      pagesize
    });
    return (0, _htr.default)(ctx, 200, list);
  }); // DELETE 取消收藏

  router.delete(apiFn('favorite'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      uid,
      tid
    } = ctx.query;
    const {
      id
    } = await (0, _service.useToken)(ctx);
    const favPath = `${_config.default.publicPath}/db/${udb}/${id}/favorite.json`;
    const res = (0, _file.delById)(favPath, tid, 'tid');

    if (res) {
      return (0, _htr.default)(ctx, 200);
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 创建空间/分类

  router.post(apiFn('space'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      space_name
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([space_name])) {
      return (0, _htr.default)(ctx, 400);
    }

    const uid = ctx.response.get(_service.UID_KEY);
    const catePath = `${_config.default.publicPath}/db/${udb}/${uid}/cate.json`;
    const cates = (0, _file.RF)(catePath, false, {}); // 如果名称已存在, 则不创建

    if (cates && Object.values(cates).find(v => v.title === space_name)) {
      return (0, _htr.default)(ctx, 400, null, '名称已存在');
    }

    const cid = (0, _uuid.default)();
    cates[cid] = {
      tid: cid,
      title: space_name,
      type: 'dir',
      vt: Date.now()
    };
    const res = (0, _file.WF)(catePath, cates);

    if (res) {
      return (0, _htr.default)(ctx, 200, null, '创建成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 修改空间/分类

  router.put(apiFn('space'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      space_name,
      space
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([space_name, space])) {
      return (0, _htr.default)(ctx, 500);
    }

    const uid = ctx.response.get(_service.UID_KEY);
    const catePath = `${_config.default.publicPath}/db/${udb}/${uid}/cate.json`;
    const cates = (0, _file.RF)(catePath);
    cates[space] = { ...cates[space],
      title: space_name
    };
    const res = (0, _file.WF)(catePath, cates);

    if (res) {
      return (0, _htr.default)(ctx, 200, null, '修改成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 获取空间/分类列表

  router.get(apiFn('space'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const uid = ctx.response.get(_service.UID_KEY);
    const catePath = `${_config.default.publicPath}/db/${udb}/${uid}/cate.json`;
    const cates = (0, _file.RF)(catePath, false, {});

    if (cates) {
      return (0, _htr.default)(ctx, 200, Object.values(cates));
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 删除空间/分类

  router.delete(apiFn('space'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const uid = ctx.response.get(_service.UID_KEY);
    const catePath = `${_config.default.publicPath}/db/${udb}/${uid}/cate.json`;
    const myPath = `${_config.default.publicPath}/db/${udb}/${uid}/list.json`;
    const {
      space
    } = ctx.query;
    const obj = (0, _file.RF)(catePath);
    delete obj[space];
    const res = (0, _file.WF)(catePath, obj); // 删除空间对应的文件列表

    (0, _file.delById)(myPath, space, 'space');

    if (res) {
      return (0, _htr.default)(ctx, 200);
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 模版管理
  // 创建分类

  router.post(apiFn('tpl/cate'), (0, _service.useGuards)(['0']), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      title
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([title])) {
      return (0, _htr.default)(ctx, 400);
    }

    const catePath = `${_config.default.publicPath}/db/${udb}/tpl/cate.json`;
    const cates = (0, _file.RF)(catePath, false, {});
    const cid = (0, _uuid.default)();
    cates[cid] = {
      tid: cid,
      title,
      vt: Date.now()
    };
    const res = (0, _file.WF)(catePath, cates);

    if (res) {
      return (0, _htr.default)(ctx, 200);
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 修改分类

  router.put(apiFn('tpl/cate'), (0, _service.useGuards)(['0']), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      tid,
      title
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([tid, title])) {
      return (0, _htr.default)(ctx, 400);
    }

    const catePath = `${_config.default.publicPath}/db/${udb}/tpl/cate.json`;
    const cates = (0, _file.RF)(catePath);
    cates[tid] = { ...cates[tid],
      title
    };
    const res = (0, _file.WF)(catePath, cates);

    if (res) {
      return (0, _htr.default)(ctx, 200, null, '修改成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 获取分类

  router.get(apiFn('tpl/cate'), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const catePath = `${_config.default.publicPath}/db/${udb}/tpl/cate.json`;
    const cates = (0, _file.RF)(catePath, false, {});
    return (0, _htr.default)(ctx, 200, Object.values(cates));
  }); // 删除分类

  router.delete(apiFn('tpl/cate'), (0, _service.useGuards)(['0']), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const catePath = `${_config.default.publicPath}/db/${udb}/tpl/cate.json`;
    const cates = (0, _file.RF)(catePath);
    const {
      tid
    } = ctx.query;
    delete cates[tid];
    const res = (0, _file.WF)(catePath, cates);

    if (res) {
      return (0, _htr.default)(ctx, 200);
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // GET 模版列表

  router.get(apiFn('tpl/list'), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      keyword = '',
      cate = 'all',
      page = 1,
      pagesize = 10
    } = ctx.query;
    const filePath = `${_config.default.publicPath}/db/${udb}/tpl/list.json`;
    const data = (0, _file.RF)(filePath, false, []);

    if (data) {
      const list = data.filter(v => (v.title || '').includes(keyword) && (v.cate === cate || cate === 'all' || !cate)).reverse();
      const curData = list.slice((+page - 1) * +pagesize, +page * +pagesize);
      return (0, _htr.default)(ctx, 200, {
        list: curData,
        total: list.length
      });
    } else {
      return (0, _htr.default)(ctx, 500, null, '数据错误');
    }
  }); // GET 精选模版列表(入口展示)

  router.get(apiFn('tpl/list/spec/top'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const filePath = `${_config.default.publicPath}/db/${udb}/tpl/list.json`;
    const catePath = `${_config.default.publicPath}/db/${udb}/tpl/cate.json`;
    const data = (0, _file.RF)(filePath);
    const cates = (0, _file.RF)(catePath);

    if (data && cates) {
      const tplObj = [];
      const specData = data.filter(v => v.status === '1');
      Object.values(cates).forEach(v => {
        const list = specData.filter(vv => vv.cate === v.tid).reverse();
        tplObj.push({
          id: v.tid,
          title: v.title,
          list: list.slice(0, 6)
        });
      });
      return (0, _htr.default)(ctx, 200, {
        list: tplObj,
        total: specData.length
      });
    } else {
      return (0, _htr.default)(ctx, 500, null, '数据错误');
    }
  }); // GET 精选模版列表

  router.get(apiFn('tpl/list/spec'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      keyword = '',
      cate = 'all',
      page = 1,
      pagesize = 10
    } = ctx.query;
    const filePath = `${_config.default.publicPath}/db/${udb}/tpl/list.json`;
    const data = (0, _file.RF)(filePath);

    if (data) {
      const list = data.filter(v => (v.title || '').includes(keyword) && (v.cate === cate || cate === '' || cate === 'all') && v.status === '1').reverse();
      const curData = list.slice((+page - 1) * +pagesize, +page * +pagesize);
      return (0, _htr.default)(ctx, 200, {
        list: curData,
        total: list.length
      });
    } else {
      return (0, _htr.default)(ctx, 500, null, '数据错误');
    }
  }); // POST 创建模版

  router.post(apiFn('tpl'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      title,
      url,
      type,
      cate,
      data
    } = ctx.request.body;
    const tplListPath = `${_config.default.publicPath}/db/${udb}/tpl/list.json`;
    const {
      id,
      name
    } = await (0, _service.useToken)(ctx);
    const tid = (0, _uuid.default)();
    const tplPath = `${_config.default.publicPath}/db/${udb}/tpl/${tid}.json`; // 对模版中可能存在的白板, 高级思维导图, 表格, 进行数据备份

    if (data && data.schema) {
      const schema = data.schema;
      schema.forEach(v => {
        if (v.type === 'board') {
          const boardPath = `${_config.default.publicPath}/db/${udb}/board/${v.data.id}.json`;
          const boardData = (0, _file.RF)(boardPath);
          const newBoardId = (0, _uuid.default)();
          const newBoardPath = `${_config.default.publicPath}/db/${udb}/board/${newBoardId}.json`;
          (0, _file.WF)(newBoardPath, {
            id: newBoardId,
            vt: Date.now(),
            data: boardData.data
          }, 0, false);
          v.data.id = newBoardId;
        } else if (v.type === 'proMind') {
          const mindPath = `${_config.default.publicPath}/db/${udb}/mind/${v.data.id}.json`;
          const mindData = (0, _file.RF)(mindPath);
          const newMindId = (0, _uuid.default)();
          const newMindPath = `${_config.default.publicPath}/db/${udb}/mind/${newMindId}.json`;
          (0, _file.WF)(newMindPath, {
            id: newMindId,
            vt: Date.now(),
            data: mindData.data
          }, 0, false);
          v.data.id = newMindId;
        } else if (v.type === 'sheet') {
          const tablePath = `${_config.default.publicPath}/db/${udb}/excel/${v.data.id}.json`;
          const tableData = (0, _file.RF)(tablePath);
          const newTableId = (0, _uuid.default)();
          const newTablePath = `${_config.default.publicPath}/db/${udb}/excel/${newTableId}.json`;
          (0, _file.WF)(newTablePath, {
            id: newTableId,
            vt: Date.now(),
            data: tableData.data
          }, 0, false);
          v.data.id = newTableId;
        }
      });
    }

    const ct = Date.now();
    const tplData = {
      data,
      tid,
      title,
      url,
      cate,
      author: name
    };
    const res = (0, _file.WF)(tplPath, tplData, 0, false); // 添加到模版列表

    (0, _file.addRowToArr)(tplListPath, {
      tid,
      title,
      url,
      cate,
      type,
      author: name,
      status: '0',
      ct
    });

    if (res) {
      return (0, _htr.default)(ctx, 200, null, '模版提交成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '数据错误');
    }
  }); // GET 获取模版详情

  router.get(apiFn('tpl'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      tid
    } = ctx.query;
    const tplPath = `${_config.default.publicPath}/db/${udb}/tpl/${tid}.json`;
    const data = (0, _file.RF)(tplPath);
    return (0, _htr.default)(ctx, 200, data);
  }); // DELETE 删除模版

  router.delete(apiFn('tpl'), (0, _service.useGuards)(['0', '1']), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      tid
    } = ctx.query;

    if (!tid) {
      return (0, _htr.default)(ctx, 400, '模版ID不能为空');
    }

    const tplPath = `${_config.default.publicPath}/db/${udb}/tpl/${tid}.json`;
    const tplListPath = `${_config.default.publicPath}/db/${udb}/tpl/list.json`; // 删除模版

    (0, _file.delFile)(tplPath); // 删除模版列表中的模版

    const res = (0, _file.delById)(tplListPath, tid, 'tid');

    if (res) {
      return (0, _htr.default)(ctx, 200, null, '删除成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '数据错误');
    }
  }); // POST 模版审批

  router.post(apiFn('tpl/review'), (0, _service.useGuards)(['0', '1']), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      tid,
      title,
      url,
      status
    } = ctx.request.body;
    const tplListPath = `${_config.default.publicPath}/db/${udb}/tpl/list.json`;
    const list = (0, _file.RF)(tplListPath);
    const newList = list.map(v => {
      if (v.tid === tid) {
        return { ...v,
          title,
          url,
          status
        };
      }

      return v;
    });
    const res = (0, _file.WF)(tplListPath, newList);

    if (res) {
      return (0, _htr.default)(ctx, 200, null, '模版审批完成');
    } else {
      return (0, _htr.default)(ctx, 500, null, '数据错误');
    }
  }); // GET 获取所有文档列表

  router.get(apiFn('all'), (0, _service.useGuards)(['0']), async ctx => {
    const {
      keyword = '',
      page = 1,
      pagesize = 10
    } = ctx.query;
    const udb = ctx.request.header['x-requested-with'];
    const allPath = `${_config.default.publicPath}/db/${udb}/list.json`;
    const data = (0, _file.RF)(allPath);

    if (data) {
      // const pubData = data.filter(v => v.status && v.status !== '1');
      // 暂时不过滤
      const pubData = data;
      let list = keyword ? pubData.filter(v => (v.title || '').includes(keyword)) : pubData;
      list = sortByVtDesc(list);
      const curData = list.slice((+page - 1) * +pagesize, +page * +pagesize);
      return (0, _htr.default)(ctx, 200, {
        list: curData,
        total: list.length
      });
    } else {
      return (0, _htr.default)(ctx, 500, null, '数据错误');
    }
  }); // 资源管理
  // 创建分类, role 1 为管理员权限, 2位用户权限

  router.post(apiFn('resource/cate'), (0, _service.useGuards)(['0']), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      title,
      role
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([title])) {
      return (0, _htr.default)(ctx, 400);
    }

    const catePath = `${_config.default.publicPath}/db/${udb}/resource/cate.json`;
    const cates = (0, _file.RF)(catePath, false, {});
    const cid = (0, _uuid.default)();
    cates[cid] = {
      tid: cid,
      title,
      role,
      vt: Date.now()
    };
    const res = (0, _file.WF)(catePath, cates);

    if (res) {
      return (0, _htr.default)(ctx, 200, null, '创建成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 修改分类

  router.put(apiFn('resource/cate'), (0, _service.useGuards)(['0']), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      tid,
      title,
      role
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([title, tid])) {
      return (0, _htr.default)(ctx, 400);
    }

    const catePath = `${_config.default.publicPath}/db/${udb}/resource/cate.json`;
    const cates = (0, _file.RF)(catePath);
    cates[tid] = { ...cates[tid],
      title,
      role
    };
    const res = (0, _file.WF)(catePath, cates);

    if (res) {
      return (0, _htr.default)(ctx, 200, null, '修改成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 获取分类

  router.get(apiFn('resource/cate'), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const catePath = `${_config.default.publicPath}/db/${udb}/resource/cate.json`;
    const cates = (0, _file.RF)(catePath, false, {});
    return (0, _htr.default)(ctx, 200, Object.values(cates));
  }); // 删除分类

  router.delete(apiFn('resource/cate'), (0, _service.useGuards)(['0']), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const catePath = `${_config.default.publicPath}/db/${udb}/resource/cate.json`;
    const cates = (0, _file.RF)(catePath);
    const {
      tid
    } = ctx.query;
    delete cates[tid];
    const res = (0, _file.WF)(catePath, cates);

    if (res) {
      return (0, _htr.default)(ctx, 200);
    } else {
      return (0, _htr.default)(ctx, 500, null, '服务器错误');
    }
  }); // 添加资源

  router.post(apiFn('resource'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      cate,
      title,
      url,
      fid
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([cate, url])) {
      return (0, _htr.default)(ctx, 400);
    }

    const listPath = `${_config.default.publicPath}/db/${udb}/resource/cate_${cate}.json`;
    const list = (0, _file.RF)(listPath);
    const tid = (0, _uuid.default)();
    list.push({
      tid,
      title,
      fid,
      url,
      vt: Date.now()
    });
    const res = (0, _file.WF)(listPath, list);

    if (res) {
      return (0, _htr.default)(ctx, 200);
    } else {
      return (0, _htr.default)(ctx, 500);
    }
  }); // 修改资源

  router.put(apiFn('resource'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      cate,
      title,
      url,
      tid
    } = ctx.request.body;

    if ((0, _tool.isAllEmpty)([tid, cate, url])) {
      return (0, _htr.default)(ctx, 400);
    }

    const listPath = `${_config.default.publicPath}/db/${udb}/resource/cate_${cate}.json`;
    const list = (0, _file.RF)(listPath);
    const res = (0, _file.WF)(listPath, list.map(v => v.tid === tid ? { ...v,
      title,
      url
    } : v));

    if (res) {
      return (0, _htr.default)(ctx, 200);
    } else {
      return (0, _htr.default)(ctx, 500);
    }
  }); // 获取资源

  router.get(apiFn('resource'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      cate,
      title,
      page = 1,
      pagesize = 10
    } = ctx.query;

    if ((0, _tool.isAllEmpty)([cate])) {
      return (0, _htr.default)(ctx, 400);
    }

    const listPath = `${_config.default.publicPath}/db/${udb}/resource/cate_${cate}.json`;
    const list = (0, _file.RF)(listPath);
    const result = list.filter(v => (v.title || '').includes(title));
    const descResult = sortByVtDesc(result);
    const curData = descResult.slice((+page - 1) * +pagesize, +page * +pagesize);
    return (0, _htr.default)(ctx, 200, {
      list: curData,
      total: list.length
    });
  }); // 删除资源

  router.delete(apiFn('resource'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      cate,
      tid,
      fid
    } = ctx.query;

    if ((0, _tool.isAllEmpty)([cate, tid, tid])) {
      return (0, _htr.default)(ctx, 400);
    }

    const listPath = `${_config.default.publicPath}/db/${udb}/resource/cate_${cate}.json`;
    const list = (0, _file.RF)(listPath);
    const res = (0, _file.WF)(listPath, list.filter(v => v.tid !== tid));
    (0, _file.delFile)(`${_config.default.publicPath}/uploads/${udb}/${fid}`);

    if (res) {
      return (0, _htr.default)(ctx, 200);
    } else {
      return (0, _htr.default)(ctx, 500);
    }
  });
  /* 知识库相关 */
  // GET 知识库列表

  router.get(apiFn('wiki/list'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      keyword = '',
      page = 1,
      pagesize = 10
    } = ctx.query;
    const uid = ctx.response.get(_service.UID_KEY);

    if (uid) {
      const filePath = `${_config.default.publicPath}/db/${udb}/${uid}/wiki.json`;
      const data = (0, _file.RF)(filePath) || [];
      const list = data.filter(v => (v.title || '').includes(keyword)).reverse();
      const curData = list.slice((+page - 1) * +pagesize, +page * +pagesize);
      return (0, _htr.default)(ctx, 200, {
        list: curData,
        total: list.length
      });
    } else {
      return (0, _htr.default)(ctx, 500, null, '用户信息不存在');
    }
  }); // POST 创建/更新知识库

  router.post(apiFn('wiki/one'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      title,
      icon,
      role,
      space,
      list = [],
      id
    } = ctx.request.body;
    const uid = ctx.response.get(_service.UID_KEY);
    const vt = Date.now();
    const wikiListPath = `${_config.default.publicPath}/db/${udb}/${uid}/wiki.json`;
    let wikiPath = '';
    let res = null;

    if (id) {
      wikiPath = `${_config.default.publicPath}/db/${udb}/wiki/${id}.json`;
      const wikiData = {
        title,
        icon,
        role,
        list,
        space,
        id,
        uid,
        vt,
        num: list.length
      };
      res = (0, _file.WF)(wikiPath, wikiData, 0, false); // 更新知识库列表

      (0, _file.modRowToArr)(wikiListPath, {
        id,
        uid,
        title,
        icon,
        role,
        vt,
        num: list.length
      });
    } else {
      // 如果是创建
      const id = (0, _uuid.default)();
      wikiPath = `${_config.default.publicPath}/db/${udb}/wiki/${id}.json`;
      const wikiData = {
        title,
        icon,
        role,
        list,
        space,
        id,
        uid,
        vt,
        num: list.length
      };
      res = (0, _file.WF)(wikiPath, wikiData, 0, false); // 添加到知识库列表

      (0, _file.addRowToArr)(wikiListPath, {
        id,
        uid,
        title,
        icon,
        role,
        vt,
        num: list.length
      });
    }

    if (res) {
      return (0, _htr.default)(ctx, 200, null, ' 保存成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '数据错误');
    }
  }); // GET 获取知识库详情

  router.get(apiFn('wiki/:id'), async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      id
    } = ctx.params;
    const {
      pwd
    } = ctx.query;

    if (!id) {
      return (0, _htr.default)(ctx, 400, '知识库ID不能为空');
    }

    const wikiPath = `${_config.default.publicPath}/db/${udb}/wiki/${id}.json`;
    const data = (0, _file.RF)(wikiPath);

    if (data && data.role) {
      if (data.role.key === '1') {
        const {
          id: uid
        } = await (0, _service.useToken)(ctx);

        if (data.uid !== uid) {
          return (0, _htr.default)(ctx, 501, null, '您没有权限访问此知识库');
        }
      } else if (data.role.key === '2') {
        if (data.role.pwd !== pwd) {
          return (0, _htr.default)(ctx, 503, null, '密码错误');
        }
      }

      return (0, _htr.default)(ctx, 200, data);
    } else {
      return (0, _htr.default)(ctx, 404, null, '知识库不存在');
    }
  }); // GET 获取指定知识库列表

  router.get(apiFn('wiki/:id/detail'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      id
    } = ctx.params;

    if (!id) {
      return (0, _htr.default)(ctx, 400, '知识库ID不能为空');
    }

    const wikiPath = `${_config.default.publicPath}/db/${udb}/wiki/${id}.json`;
    const data = (0, _file.RF)(wikiPath);

    if (data) {
      const {
        list,
        space
      } = data;
      return (0, _htr.default)(ctx, 200, {
        list,
        space
      });
    } else {
      return (0, _htr.default)(ctx, 500, null, '数据不存在');
    }
  }); // DELETE 删除知识库

  router.delete(apiFn('wiki/:id'), _service.auth, async ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const {
      id
    } = ctx.params;

    if (!id) {
      return (0, _htr.default)(ctx, 400, '知识库ID不能为空');
    }

    const wikiPath = `${_config.default.publicPath}/db/${udb}/wiki/${id}.json`; // 删除知识库

    (0, _file.delFile)(wikiPath); // 删除知识库列表中的知识库

    const uid = ctx.response.get(_service.UID_KEY);
    const wikiListPath = `${_config.default.publicPath}/db/${udb}/${uid}/wiki.json`;
    const res = (0, _file.delById)(wikiListPath, id, 'id');

    if (res) {
      return (0, _htr.default)(ctx, 200, null, '删除成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '数据错误');
    }
  });
};

var _default = docRouter;
exports.default = _default;