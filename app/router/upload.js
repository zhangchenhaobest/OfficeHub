"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _glob = _interopRequireDefault(require("glob"));

var _file = require("../lib/file");

var _config = _interopRequireDefault(require("../config"));

var _htr = _interopRequireDefault(require("../lib/htr"));

var _os = _interopRequireDefault(require("os"));

var _tool = require("../lib/tool");

var _service = require("../service");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const os_flag = _os.default.platform().toLowerCase() === 'win32' ? '\\' : '/';
const SPACE_NAME = 'files';

const uploadRouter = (router, apiPath) => {
  const apiFn = path => `${apiPath}/${SPACE_NAME}/${path}`; // 上传文件


  router.post(apiFn('upload'), (0, _service.useGuards)(['0', '1', '10', '11', '12', '13']), _file.uploadSingleCatchError, async ctx => {
    let {
      filename,
      path,
      size
    } = ctx.file;
    let {
      source
    } = ctx.request.body || 'unknow';
    const {
      id,
      name
    } = await (0, _service.useToken)(ctx);
    let url = `${_config.default.staticPath}${path.split(`${os_flag}public`)[1]}`; // 将上传记录保存到资源审核里

    const udb = ctx.request.header['x-requested-with'];
    const reviewPath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'file_review');
    (0, _file.addRowToArr)(reviewPath, {
      name: filename,
      url,
      uid: id,
      user: name,
      size,
      path,
      ct: Date.now()
    });
    return (0, _htr.default)(ctx, 200, {
      filename,
      url,
      source,
      size
    }, '文件上传成功');
  }); // 免费上传文件

  router.post(apiFn('upload/free'), _file.uploadSingleCatchError, ctx => {
    let {
      filename,
      path,
      size
    } = ctx.file;
    let {
      source
    } = ctx.request.body || 'unknow';
    let url = `${_config.default.staticPath}${path.split(`${os_flag}public`)[1]}`;
    return (0, _htr.default)(ctx, 200, {
      filename,
      url,
      source,
      size
    }, '文件上传成功');
  }); // 读取文件

  router.get(apiFn('all'), ctx => {
    const files = _glob.default.sync(`${_config.default.publicPath}/uploads/*`);

    const result = files.map(item => {
      return `${_config.default.staticPath}${item.split(`${os_flag}public`)[1]}`;
    });
    return (0, _htr.default)(ctx, 200, result);
  }); // 删除文件

  router.delete(apiFn('del'), async ctx => {
    const {
      id
    } = ctx.query;

    if (id) {
      const err = await (0, _file.delFile)(`${_config.default.publicPath}/uploads/${id}`);

      if (!err) {
        return (0, _htr.default)(ctx, 200, null, '删除成功');
      } else {
        return (0, _htr.default)(ctx, 500, null, '文件不存在，删除失败');
      }
    } else {
      return (0, _htr.default)(ctx, 500, null, 'id不能为空');
    }
  }); // 获取文件资源列表

  router.get(apiFn('upload/list'), (0, _service.useGuards)(['0', '1']), ctx => {
    const udb = ctx.request.header['x-requested-with'];
    const reviewPath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'file_review');
    const data = (0, _file.RF)(reviewPath, false, []);
    return (0, _htr.default)(ctx, 200, data.reverse());
  }); // 删除文件资源

  router.delete(apiFn('upload'), (0, _service.useGuards)(['0', '1']), async ctx => {
    const {
      id
    } = ctx.query;

    if (!id) {
      return (0, _htr.default)(ctx, 500, null, 'id不能为空');
    }

    const udb = ctx.request.header['x-requested-with'];
    const reviewPath = (0, _tool.getDbPath)(SPACE_NAME, udb, 'file_review');
    const data = (0, _file.RF)(reviewPath);
    const newData = data.filter(item => item.url !== id);
    (0, _file.WF)(reviewPath, newData); // 删除本地文件

    const urlPathName = id.split('uploads/')[1];
    const err = await (0, _file.delFile)(`${_config.default.publicPath}/uploads/${urlPathName}`);

    if (!err) {
      return (0, _htr.default)(ctx, 200, null, '删除成功');
    } else {
      return (0, _htr.default)(ctx, 500, null, '文件不存在，删除失败');
    }
  });
};

var _default = uploadRouter;
exports.default = _default;