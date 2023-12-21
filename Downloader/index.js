/**
 * 
 * @class
 * @classdesc Downloader 文件下载器
 * @tutorial {@link http://127.0.0.1:5500/downloader/demo.html Downloader Demo} 具体用法
 * @author Mino <yxd99324@qq.com>
 */
export class Downloader {
  /* 标识状态的`promise` */
  #promise = null;

  /**
   * 文件流缓存
   * @access private
   */
  #blobPart = null;

  /**
   * 执行前回调
   * @private
   * @type {Function[]}
   */
  #beforeHandler = [];

  /* 执行前回调 */
  #afterHandler = null;

  /* error回调 */
  #errorHandler = null;

  /**
   * 对象克隆
   * @constructor
   * @param {Downloader=} downloader - `Downloader`实例
   */
  constructor(downloader) {
    if (downloader instanceof Downloader) {
      this.#beforeHandler = [...downloader.#beforeHandler];
      this.#afterHandler = downloader.#afterHandler;
      this.#errorHandler = downloader.#errorHandler;
    }
    return this;
  }

  /**
   * 设置执行前回调
   * @param {Function} handler - `before`回调函数
   */
  before(handler) {
    this.#beforeHandler.push(handler);
    return this;
  }

  /**
   * 设置执行后回调
   * @param {(function():void)?} [handler] - `after`回调函数
   */
  after(handler) {
    this.#afterHandler = handler;
    return this;
  }

  /**
   * 设置error回调
   * @param {(err: string=)=>void} handler - `error`回调函数
   * @param {(err?: string)=>void} handler - `error`回调函数
   * @param {ErrorCallback} handler - `error`回调函数
   */
  error(handler) {
    this.#errorHandler = handler;
    return this;
  }

  /**
   * 执行下载请求
   * @param {() => Promise<Response>} request - 文件请求函数
   * @return {this}
   */
  request(request) {
    if (this.#promise) return this;

    let resolver = null;
    this.#blobPart = null;
    this.#promise = new Promise((resolve) => (resolver = resolve));

    const next = (index = 0) => {
      if (index === this.#beforeHandler.length) {
        request()
          .then(async (response) => {
            if (response.data?.type === "application/json") {
              const dataStr = await response.data.text();
              const data = JSON.parse(dataStr);
              if (data.code == 500) throw new Error(data.msg);
            }
            return (this.#blobPart = response.data);
          })
          .then(resolver)
          .catch(this.#errorHandler)
          .finally(() => {
            this.#afterHandler?.();
            this.#promise = null;
          });
      } else {
        // 使用 Promise 保证 return 和 next并发执行, 避免 downloader.request().[method]() 获取不到回调
        Promise.resolve().then(() => this.#beforeHandler[index++](() => next(index)));
      }
    };
    next();

    return this;
  }

  /**
   * 将下载器的文件流转换为文件并下载至本地
   * @param {String} fileName - 文件名称
   * @param {String} MIME - 文件`MIME`类型
   */
  download(fileName, MIME) {
    // 保证异步调用 doanloader.download() 时，仍然可以使用缓存下载文件
    const promise = this.#blobPart ? Promise.resolve(this.#blobPart) : this.#promise;
    promise?.then((blobPart) => {
      Downloader.transform(blobPart, fileName, MIME);
    });
  }
  /**
   * 文件流转换为文件并下载至本地
   * @param {BlobPart[]} blobPart - 文件流
   * @param {String} fileName - 文件名称
   * @param {String} MIME - 文件[MIME](https://www.runoob.com/http/mime-types.html)类型
   * @see {@link https://www.runoob.com/http/mime-types.html MIME} for MIME types.
   */
  static transform(blobPart, fileName, MIME) {
    const link = document.createElement("a");
    link.download = `${fileName}`;
    link.style.display = "none";
    link.href = window.URL.createObjectURL(new Blob([blobPart]), MIME);
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(link.href); // 释放url
    document.body.removeChild(link); // 释放标签
  }
}

/**
 * error callback.
 * @callback ErrorCallback
 * @param {string} [err] - err message
 * @return {void}
 */

/**
 * Download data from the specified URL.
 * `@ async` 标记表示函数是异步的，这意味着它是使用语法 async function foo () {} 声明的。
 *
 * @async
 * @function downloadData
 * @param {string} url - The URL to download from.
 * @return {Promise<string>} The data from the URL.
 */