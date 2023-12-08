/**
 * @class Downloader 文件下载器
 * @author Mino
 */
export class Downloader {
  /* 标识状态的`promise` */
  #promise = null;

  /* 文件流缓存 */
  #blobPart = null;

  /* 执行前回调 */
  #beforeHandler = [];

  /* 执行前回调 */
  #afterHandler = null;

  /* error回调 */
  #errorHandler = null;

  /**
   * 对象克隆
   * @constructor
   * @param {Downloader|undefined} downloader - `Downloader`实例
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
   * @param {Function} handler - after`回调函数
   */
  after(handler) {
    this.#afterHandler = handler;
    return this;
  }

  /**
   * 设置error回调
   * @param {(err: string|undefined)=>{}} handler - `error`回调函数
   */
  error(handler) {
    this.#errorHandler = handler;
    return this;
  }

  /**
   * 执行下载请求
   * @param {() => Promise<Response>} request - 文件请求函数
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
   * @param {String} MIME - 文件`MIME`类型
   * @description [常见MIME类型](https://www.runoob.com/http/mime-types.html)
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
