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

var _path = _interopRequireWildcard(require("path"));

var _uuid = require("uuid");

var _promises = _interopRequireDefault(require("fs/promises"));

var _mammoth = _interopRequireDefault(require("mammoth"));

var _lruCache = require("lru-cache");

var _service = require("../service");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const os_flag = _os.default.platform().toLowerCase() === 'win32' ? '\\' : '/';
const SPACE_NAME = 'parse'; // ------ 实现docx大文档解析 start --------
// 缓存文档章节

const cache = new _lruCache.LRUCache({
  max: 500,
  maxSize: 5000,
  maxAge: 60000,
  // 缓存项存活时间，单位毫秒
  dispose: function (key, value) {
    if (this.has(key)) {
      // 如果在dispose时缓存项依然存在，手动删除
      this.del(key);
    }
  },
  sizeCalculation: (value, key) => {
    if (typeof value === 'string') {
      return Math.ceil(value.length / (1024 * 1024));
    } else {
      return 4000;
    }
  }
}); // 自定义样式映射

const customStyleMap = `
b => strong
i => em
u => u
strike => s
p[style-name='Heading 1'] => h1
p[style-name='Heading 2'] => h2
p[style-name='Heading 3'] => h3
p[style-name='Heading 4'] => h4
p[style-name='Heading 5'] => h5
p[style-name='Heading 6'] => h6
`;

async function processDocx(filePath) {
  const docId = _path.default.basename(filePath, '.docx');

  try {
    const options = {
      styleMap: customStyleMap,
      includeDefaultStyleMap: true,
      //处理图片
      convertImage: _mammoth.default.images.imgElement(async image => {
        const imageBuffer = await image.read('base64');
        const base64img = "data:" + image.contentType + ";base64," + imageBuffer; // console.log(image)

        const newSrc = await saveBase64Image('demo', base64img); // console.log(newSrc, image);

        return {
          src: newSrc
        };
      }),
      // 遍历文档内容
      transformDocument: element => {
        // 这个函数将被应用到文档中的每个元素
        return element;
      }
    };
    const result = await _mammoth.default.convertToHtml({
      path: filePath
    }, options); // 解析数学公式

    const html = result.value;
    const pages = splitIntoPages(html);
    cache.set(docId, pages);
    return docId;
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}

function splitIntoPages(html, charsPerPage = 4000) {
  const pages = [];
  let currentPage = '';
  const paragraphs = html.split('</p>');

  for (let p of paragraphs) {
    if (currentPage.length + p.length > charsPerPage && currentPage.length > 0) {
      pages.push(currentPage + '</p>');
      currentPage = '';
    }

    currentPage += p + '</p>';
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

async function getPage(docId, pageNumber) {
  const pages = cache.get(docId);

  if (!pages) {
    throw new Error('Document not found in cache');
  }

  if (pageNumber < 1 || pageNumber > pages.length) {
    return null;
  }

  return pages[pageNumber - 1];
}

async function getTotalPages(docId) {
  const pages = cache.get(docId);

  if (!pages) {
    throw new Error('Document not found in cache');
  }

  return pages.length;
} // ------ 实现docx大文档解析 end --------


async function saveBase64Image(space, base64String) {
  // 从base64字符串中提取MIME类型和实际的base64数据
  const matches = base64String.match(/^data:(.+);base64,(.+)$/);

  if (!matches) {
    throw new Error('Invalid base64 string');
  }

  const [, mimeType, base64Data] = matches; // 根据MIME类型确定文件扩展名

  const extension = mimeType.split('/')[1];
  const fileName = `${(0, _uuid.v4)()}.${extension}`;
  const imageDir = `../../public/uploads/${space}`;
  const filePath = (0, _path.resolve)(__dirname, imageDir, fileName); // 将base64数据写入文件

  await _promises.default.writeFile(filePath, base64Data, 'base64'); // 返回新的图片URL

  return `${_config.default.staticPath}/uploads/${space}/${fileName}`;
}

const uploadRouter = (router, apiPath) => {
  const apiFn = path => `${apiPath}/${SPACE_NAME}/${path}`; // 解析docx, 并将其转化为html


  router.post(apiFn('doc2html2'), _service.auth, _file.uploadSingleCatchError, async ctx => {
    let {
      path
    } = ctx.file;
    const docId = await processDocx(path);
    const content = await getPage(docId, 1);
    const total = await getTotalPages(docId);
    return (0, _htr.default)(ctx, 200, {
      docId,
      html: content,
      total
    });
  }); // 获取docx章节

  router.get(apiFn('doc2html2/:docId/:page'), _service.auth, async ctx => {
    const {
      docId,
      page
    } = ctx.params;
    const pageNumber = parseInt(page, 10);

    if (isNaN(pageNumber) || pageNumber < 1) {
      ctx.throw(400, 'Invalid page number');
    }

    try {
      const content = await getPage(docId, pageNumber);

      if (!content) {
        ctx.throw(404, 'Page not found');
      }

      return (0, _htr.default)(ctx, 200, {
        html: content
      });
    } catch (error) {
      ctx.throw(500, 'Error retrieving page: ' + error.message);
    }
  }); // 读取所有文件

  router.get(apiFn('files'), (0, _service.useGuards)(['0', '1']), ctx => {
    const files = _glob.default.sync(`${_config.default.publicPath}/uploads/*`);

    const result = files.map(item => {
      return `${_config.default.staticPath}${item.split(`${os_flag}public`)[1]}`;
    });
    return (0, _htr.default)(ctx, 200, result);
  }); // 删除文件

  router.delete(apiFn('file/del'), (0, _service.useGuards)(['0', '1']), async ctx => {
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
  });
};

var _default = uploadRouter;
exports.default = _default;