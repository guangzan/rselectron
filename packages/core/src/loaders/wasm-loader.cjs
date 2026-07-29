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
 * Resolve a runtime-relative path for a Node Role asset without bundling bytes.
 * Files under Application `resources/` stay on disk; others are emitted.
 *
 * @param {Buffer} content
 * @param {import('@rspack/core').LoaderContext<{ appRoot: string; resourcesDir?: string }>} loader
 * @returns {string}
 */
function resolveRuntimeRelativePath(content, loader) {
  const options = loader.getOptions?.() ?? {};
  const appRoot = options.appRoot;
  const resourcesDir = options.resourcesDir ?? 'resources';
  const resourcesRoot = isAbsolute(resourcesDir)
    ? resourcesDir
    : join(appRoot, resourcesDir);

  const resourcePath = resolveReal(loader.resourcePath);
  const outputPath = loader._compiler?.options?.output?.path;

  if (typeof appRoot !== 'string' || appRoot.length === 0) {
    throw new Error('rselectron native/wasm loader requires options.appRoot');
  }
  if (typeof outputPath !== 'string' || outputPath.length === 0) {
    throw new Error(
      'rselectron native/wasm loader requires compiler output.path',
    );
  }

  const normalizedResource = resourcePath.split(sep).join('/');
  const normalizedResourcesRoot = resolveReal(resourcesRoot)
    .split(sep)
    .join('/');
  const underResources =
    normalizedResource === normalizedResourcesRoot ||
    normalizedResource.startsWith(`${normalizedResourcesRoot}/`);

  if (underResources) {
    return relative(resolveReal(outputPath), resourcePath).split(sep).join('/');
  }

  const hash = createHash('sha256').update(content).digest('hex').slice(0, 8);
  const extension = extname(resourcePath);
  const name = basename(resourcePath, extension);
  const filename = join('assets', `${name}.${hash}${extension}`);
  loader.emitFile(filename, content);
  return filename.split(sep).join('/');
}

/**
 * @param {Buffer} content
 * @this {import('@rspack/core').LoaderContext<{ appRoot: string; resourcesDir?: string }>}
 */
module.exports = function rselectronWasmLoader(content) {
  const relativeFromOutput = resolveRuntimeRelativePath(content, this);
  const pathLiteral = JSON.stringify(relativeFromOutput);

  return `module.exports = function loadWasm(importObject) {
  const { readFile } = require("node:fs/promises");
  const { join } = require("node:path");
  return readFile(join(__dirname, ${pathLiteral})).then((wasmBuffer) =>
    WebAssembly.instantiate(wasmBuffer, importObject ?? {}).then(
      (result) => result.instance,
    ),
  );
};
`;
};

module.exports.raw = true;
