// Empty shim for puppeteer and puppeteer-extra
// The actual puppeteer will be provided by Almostnode at runtime

function puppeteer() {
  return {
    launch: async () => ({
      newPage: async () => ({
        goto: async () => {},
        evaluate: async () => {},
        screenshot: async () => Buffer.from(''),
        pdf: async () => Buffer.from(''),
        close: async () => {},
        setViewport: async () => {},
        waitForSelector: async () => {},
        click: async () => {},
        type: async () => {},
      }),
      close: async () => {},
      pages: async () => [],
    }),
  };
}

puppeteer.launch = async () => ({
  newPage: async () => ({
    goto: async () => {},
    evaluate: async () => {},
    screenshot: async () => Buffer.from(''),
    pdf: async () => Buffer.from(''),
    close: async () => {},
    setViewport: async () => {},
    waitForSelector: async () => {},
    click: async () => {},
    type: async () => {},
  }),
  close: async () => {},
  pages: async () => [],
});

module.exports = puppeteer;
module.exports.default = puppeteer;