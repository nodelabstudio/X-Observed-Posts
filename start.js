// Bootstrapper: polyfill `File` if missing, then load the main module.
if (typeof File === 'undefined') {
  // Node 18 has Blob but not File; undici expects `File` to exist.
  globalThis.File = class File extends Blob {
    constructor(bits = [], name = '', options) {
      super(bits, options);
      this.name = name;
    }
  };
}

import('./index.js').catch(err => {
  console.error(err);
  process.exit(1);
});
