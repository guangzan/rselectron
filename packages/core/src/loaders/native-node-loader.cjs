'use strict';

const { createHash } = require('node:crypto');
const { existsSync, realpathSync } = require('node:fs');
const {
  relative,
  sep,
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
} = require('node:path');

/**
 * @param {string} pathValue
 */
function resolveReal(pathValue) {
  const absolute = pathValue;
  const missing = [];
  let probe = absolute;
  while (!existsSync(probe)) {
    const parent = dirname(probe);
    if (parent === probe) {
      return absolute;
    }
    missing.unshift(basename(probe));
    probe = parent;
  }
  return missing.length === 0
    ? realpathSync(probe)
    : join(realpathSync(probe), ...missing);
}

/**
 * @param {Buffer} content
 * @this {import('@rspack/core').LoaderContext<{ appRoot: string; resourcesDir?: string }>}
 */
module.exports = function rselectronNativeNodeLoader(content) {
  const options = this.getOptions?.() ?? {};
  const appRoot = options.appRoot;
  const resourcesDir = options.resourcesDir ?? 'resources';
  const resourcesRoot = isAbsolute(resourcesDir)
    ? resourcesDir
    : join(appRoot, resourcesDir);

  const resourcePath = resolveReal(this.resourcePath);
  const outputPath = this._compiler?.options?.output?.path;

  if (typeof appRoot !== 'string' || appRoot.length === 0) {
    throw new Error('rselectron native .node loader requires options.appRoot');
  }
  if (typeof outputPath !== 'string' || outputPath.length === 0) {
    throw new Error(
      'rselectron native .node loader requires compiler output.path',
    );
  }

  const normalizedResource = resourcePath.split(sep).join('/');
  const normalizedResourcesRoot = resolveReal(resourcesRoot)
    .split(sep)
    .join('/');
  const underResources =
    normalizedResource === normalizedResourcesRoot ||
    normalizedResource.startsWith(`${normalizedResourcesRoot}/`);

  /** @type {string} */
  let relativeFromOutput;
  if (underResources) {
    relativeFromOutput = relative(resolveReal(outputPath), resourcePath);
  } else {
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 8);
    const extension = extname(resourcePath);
    const name = basename(resourcePath, extension);
    const filename = join('assets', `${name}.${hash}${extension}`);
    this.emitFile(filename, content);
    relativeFromOutput = filename;
  }

  const pathLiteral = JSON.stringify(relativeFromOutput.split(sep).join('/'));
  // Require the host-built binary as-is; do not transform or cross-compile.
  // Use __non_webpack_require__ so Rspack does not rewrite .node requires into stubs.
  return `/* rselectron-native-node-loader */\nmodule.exports = __non_webpack_require__(require("node:path").join(__dirname, ${pathLiteral}));
`;
};

module.exports.raw = true;
