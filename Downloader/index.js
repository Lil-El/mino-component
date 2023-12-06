/**
 * @class Downloader 文件下载器
 * @author Mino
 */
export class Downloader {
  /* 标识状态的`promise` */
  #promise = null;

  /* 执行前回调 */
  #beforeHandler = [];

  /* 执行前回调 */
  #afterHandler = null;

  /* error回调 */
  #errorHandler = null;

  /** @constructor */
  constructor(downloader) {
    if (downloader instanceof Downloader) {
      this.#beforeHandler = [...downloader.#beforeHandler];
      this.#afterHandler = downloader.#afterHandler;
      this.#errorHandler = downloader.#errorHandler;
    }
    return this;
  }

  /** 设置执行前回调 */
  before(handler) {
    this.#beforeHandler.push(handler);
    return this;
  }

  /** 设置执行后回调 */
  after(handler) {
    this.#afterHandler = handler;
    return this;
  }

  /** 设置error回调 */
  error(handler) {
    this.#errorHandler = handler;
    return this;
  }

  /**
   * 执行下载请求
   * @param {() => Promise<Response>} request
   */
  request(request) {
    if (this.#promise) return this;

    let resolver = null;
    this.#promise = new Promise((resolve) => (resolver = resolve));

    const next = (index = 0) => {
      if (index === this.#beforeHandler.length) {
        request()
          .then(resolver)
          .catch(this.#errorHandler)
          .finally(() => {
            this.#afterHandler?.();
            this.#promise = null;
          });
      } else {
        this.#beforeHandler[index++](() => next(index));
      }
    };
    next();

    return this;
  }

  /**
   * 将下载器的文件流转换为文件并下载至本地
   * @param {String} fileName - 文件名称
   * @param {String} MIME - 文件`MIME`类型
   * @description [常见MIME类型](https://www.runoob.com/http/mime-types.html)
   */
  download(fileName, MIME) {
    this.#promise?.then((response) => {
      if (response.data?.type === "application/json") {
        response.data
          .text()
          .then((data) => JSON.parse(data))
          .then((data) => {
            if (data.code == 500) return void this.#errorHandler?.(data);
          });
      } else {
        Downloader.transform(response.data, fileName, MIME);
      }
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
