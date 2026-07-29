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
 * Resolve a path through the nearest existing ancestor so output directories that
 * do not exist yet still share the same realpath prefix as on-disk inputs.
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
module.exports = function rselectronAssetLoader(content) {
  const options = this.getOptions?.() ?? {};
  const appRoot = options.appRoot;
  const resourcesDir = options.resourcesDir ?? 'resources';
  const resourcesRoot = isAbsolute(resourcesDir)
    ? resourcesDir
    : join(appRoot, resourcesDir);

  const query = this.resourceQuery ?? '';
  const asarUnpack = /(?:\?|&)asarUnpack(?:&|$)/.test(query);
  const resourcePath = resolveReal(this.resourcePath);
  const outputPath = this._compiler?.options?.output?.path;

  if (typeof appRoot !== 'string' || appRoot.length === 0) {
    throw new Error('rselectron asset loader requires options.appRoot');
  }
  if (typeof outputPath !== 'string' || outputPath.length === 0) {
    throw new Error('rselectron asset loader requires compiler output.path');
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
  const joinCall = `require("node:path").join(__dirname, ${pathLiteral})`;
  const expression = asarUnpack
    ? `${joinCall}.replace("app.asar", "app.asar.unpacked")`
    : joinCall;

  return `module.exports = ${expression};\n`;
};

module.exports.raw = true;
