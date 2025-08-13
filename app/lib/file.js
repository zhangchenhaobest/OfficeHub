"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deleteFolder = deleteFolder;
exports.rmEmptyDir = rmEmptyDir;
exports.WF = WF;
exports.WPF = WPF;
exports.RF = RF;
exports.delById = delById;
exports.delByIds = delByIds;
exports.addRowToArr = addRowToArr;
exports.modRowToArr = modRowToArr;
exports.getDataFromArr = getDataFromArr;
exports.getMutiDataFromArr = getMutiDataFromArr;
exports.getRowById = getRowById;
exports.wfPromise = wfPromise;
exports.wfsPromise = wfsPromise;
exports.delFile = exports.uploadSingleCatchError = exports.upload = void 0;

var _multer = _interopRequireDefault(require("@koa/multer"));

var _path = require("path");

var _fs = _interopRequireDefault(require("fs"));

var _promises = require("fs/promises");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const rootImages = space => space ? (0, _path.resolve)(__dirname, `../../public/uploads/${space}`) : (0, _path.resolve)(__dirname, `../../public/uploads`); //上传文件存放路径、及文件命名


const storage = _multer.default.diskStorage({
  destination: function (req, file, cb) {
    const udb = req.headers['x-requested-with'].replace('XMLHttpRequest, ', '');
    cb(null, rootImages(udb));
  },
  filename: function (req, file, cb) {
    let [name, type] = file.originalname.split('.');
    cb(null, `${name}_${Date.now().toString(16)}.${type}`);
  }
}); //文件上传限制


const limits = {
  fields: 30,
  //非文件字段的数量
  fileSize: 1024 * 1024 * 50,
  //文件大小 单位 b
  files: 1 //文件数量

};
const upload = (0, _multer.default)({
  storage,
  limits
}); // 为了捕获multer的错误

exports.upload = upload;

const uploadSingleCatchError = async (ctx, next) => {
  let err = await upload.single('file')(ctx, next).then(res => res).catch(err => err);

  if (err) {
    ctx.status = 500;
    ctx.body = {
      state: 500,
      msg: err.message
    };
  }
}; // 删除文件


exports.uploadSingleCatchError = uploadSingleCatchError;

const delFile = path => {
  return new Promise((resolve, reject) => {
    _fs.default.unlink(path, err => {
      if (err) {
        reject(err);
      } else {
        resolve(null);
      }
    });
  });
}; // 删除文件夹


exports.delFile = delFile;

function deleteFolder(path, clearOwn = true) {
  let files = [];

  if (_fs.default.existsSync(path)) {
    files = _fs.default.readdirSync(path);
    files.forEach(function (file, index) {
      let curPath = path + "/" + file;

      if (_fs.default.statSync(curPath).isDirectory()) {
        // recurse
        deleteFolder(curPath);
      } else {
        // delete file
        _fs.default.unlinkSync(curPath);
      }
    });
    clearOwn && _fs.default.rmdirSync(path);
  }
}
/**
* 删除指定路径下的所有空文件夹
* @param {*} path 
*/


function rmEmptyDir(path, level = 0) {
  const files = _fs.default.readdirSync(path);

  if (files.length > 0) {
    let tempFile = 0;
    files.forEach(file => {
      tempFile++;
      rmEmptyDir(`${path}/${file}`, 1);
    });

    if (tempFile === files.length && level !== 0) {
      _fs.default.rmdirSync(path);
    }
  } else {
    level !== 0 && _fs.default.rmdirSync(path);
  }
}
/**
 * 写入文件,如果路径不存在则创建
 * path 文件路径
 * data 要写入的数据
 * mode 写入模式 0 覆盖 1 追加
 * ignoreJson 是否忽略json化
 */


function WF(path, data, mode, isArr = true, ignoreJson = false) {
  if (_fs.default.existsSync(path)) {
    let source = _fs.default.readFileSync(path);

    let sourceData = source.toString() && !ignoreJson ? JSON.parse(source) : "";

    if (sourceData && mode) {
      if (Array.isArray(sourceData)) {
        sourceData.push(data);
      } else {
        sourceData = Object.assign(sourceData, data);
      }
    } else {
      sourceData = data;
    }

    try {
      _fs.default.writeFileSync(path, JSON.stringify(sourceData));

      return true;
    } catch (err) {
      return false;
    }
  } else {
    const pathArr = path.split('/'); // 删除尾部文件

    pathArr.pop(); // 创建目录

    const file = _fs.default.mkdirSync(pathArr.join('/'), {
      recursive: true
    });

    try {
      const newData = isArr ? [data] : data;

      _fs.default.writeFileSync(path, ignoreJson ? newData : JSON.stringify(newData));

      return true;
    } catch (err) {
      return false;
    }
  }
}
/**
 * 流式写入文件,如果路径不存在则创建
 * path 文件路径
 * data 要写入的流数据
 */


async function WPF(path, data) {
  if (_fs.default.existsSync(path)) {
    try {
      return await (0, _promises.writeFile)(path, data);
    } catch (err) {
      return false;
    }
  } else {
    const pathArr = path.split('/'); // 删除尾部文件

    pathArr.pop(); // 创建目录

    const file = _fs.default.mkdirSync(pathArr.join('/'), {
      recursive: true
    });

    try {
      return await (0, _promises.writeFile)(path, data);
    } catch (err) {
      return false;
    }
  }
} // 读取文件, 如果路径不存在则创建对应的路径


function RF(path, ignoreJson = false, initValue = []) {
  if (_fs.default.existsSync(path)) {
    const data = _fs.default.readFileSync(path);

    return data.toString() ? ignoreJson ? data.toString() : JSON.parse(data) : initValue;
  } // 如果不存在, 则创建空文件


  const pathArr = path.split('/');
  const filename = pathArr.pop(); // 创建目录

  _fs.default.mkdirSync(pathArr.join('/'), {
    recursive: true
  });

  _fs.default.writeFileSync(path, JSON.stringify(initValue));

  return initValue;
}

function delById(path, id, key = 'id') {
  const data = RF(path);
  const newData = data.filter(v => v[key] !== id);
  const res = WF(path, newData);
  return res;
}

function delByIds(path, ids = [], key = 'id') {
  const data = RF(path); // @ts-ignore

  const newData = data.filter(v => !ids.includes(v[key]));
  const res = WF(path, newData);
  return res;
}

function addRowToArr(path, row, uniqueArr) {
  const list = RF(path) || [];

  if (uniqueArr && uniqueArr.length) {
    const isExist = list.find(v => {
      return uniqueArr.every(item => {
        return v[item] === row[item];
      });
    });

    if (isExist) {
      return true;
    }
  }

  const newList = [...list, row];
  return WF(path, newList);
}

function modRowToArr(path, new_row, key = 'id') {
  const list = RF(path) || [];
  const newList = list.map(v => {
    return v[key] === new_row[key] ? { ...v,
      ...new_row
    } : v;
  });
  return WF(path, newList);
}

function getDataFromArr(path, params = {}, redKey = 'pwd') {
  const data = RF(path) || [];
  const {
    search_key = 'name',
    keyword = '',
    page = 1,
    pagesize = 10
  } = params;
  const result = data.map(v => {
    if (redKey && typeof redKey === 'string') {
      delete v[redKey];
    } else if (redKey && Array.isArray(redKey)) {
      redKey.forEach(k => {
        delete v[k];
      });
    }

    return { ...v
    };
  }).filter(v => {
    if (params.keyword) {
      if (typeof v[search_key] === 'number') {
        return v[search_key] === keyword;
      } else {
        return v[search_key].includes(keyword);
      }
    } else {
      return true;
    }
  });
  const curData = result.slice((+page - 1) * +pagesize, +page * +pagesize);
  return {
    list: curData,
    total: result.length
  };
}

function getMutiDataFromArr(path, params = {
  search_keys: [{
    key: 'name',
    value: ''
  }],
  page: 1,
  pagesize: 10
}, redKey = 'pwd') {
  const data = RF(path) || [];
  const result = data.map(v => {
    if (redKey && typeof redKey === 'string') {
      delete v[redKey];
    } else if (redKey && Array.isArray(redKey)) {
      redKey.forEach(k => {
        delete v[k];
      });
    }

    return { ...v
    };
  }).filter(v => {
    return params.search_keys.every(s => {
      if (s.key) {
        const key = s.key || 'name';

        if (typeof v[key] === 'number') {
          return v[key] === s.value;
        } else {
          return v[key].includes(s.value);
        }
      } else {
        return true;
      }
    });
  });
  const curData = result.slice((+params.page - 1) * +params.pagesize, +params.page * +params.pagesize);
  return {
    list: curData,
    total: result.length
  };
}

function getRowById(path, id, id_key = 'id', redKey = 'pwd') {
  const data = RF(path) || [];
  const row = data.find(item => item[id_key] === id);

  if (row) {
    delete row[redKey];
  }

  return row;
}
/**
 * 异步写入文件, 如果文件不存在则创建文件并写入内容
 * @param {path} 文件路径
 * @param {row} 要添加的数据
 * @param {flag}} 添加的标识符, 0表示数组 1表示对象
 * @param {isCover}} 文件写入模式, false为追加, true为覆盖
 */


function wfPromise(path, row, flag, isCover) {
  return new Promise((resolve, reject) => {
    if (_fs.default.existsSync(path)) {
      _fs.default.readFile(path, (err, data) => {
        if (!err) {
          let prevData = JSON.parse(data);

          if (flag) {
            prevData = !isCover ? Object.assign(prevData, row) : row;
          } else {
            !isCover ? prevData.push(row) : prevData = row;
          }

          _fs.default.writeFile(path, JSON.stringify(prevData), err => {
            if (!err) {
              resolve(true);
            } else {
              reject(err);
            }
          });
        } else {
          reject(err);
        }
      });
    } else {
      let prevData;

      if (flag) {
        prevData = row;
      } else {
        prevData = !isCover ? [row] : row;
      }

      _fs.default.writeFile(path, JSON.stringify(prevData), err => {
        if (!err) {
          resolve(true);
        } else {
          reject(err);
        }
      });
    }
  });
} // 流式写入文件


function wfsPromise(filename, data) {
  return new Promise((reslove, reject) => {
    const ws = _fs.default.createWriteStream(filename); //为流绑定一个close事件，来监听流是否关闭


    ws.once("close", function () {
      reslove(true);
    });
    ws.once("error", function (err) {
      reject(err);
    }); //通过可写流向文件中输出内容

    ws.write(JSON.stringify(data)); //关闭流

    ws.end();
  });
}