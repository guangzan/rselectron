'use strict';

const { basename, extname } = require('node:path');

/**
 * Bundle a child entry via a child compiler and export either a runtime path
 * (`?modulePath`) or a `worker_threads.Worker` factory (`?nodeWorker`).
 *
 * @this {import('@rspack/core').LoaderContext}
 */
module.exports = function rselectronModulePathLoader() {
  const callback = this.async();
  const compiler = this._compiler;
  const compilation = this._compilation;

  if (
    compiler === undefined ||
    compilation === undefined ||
    typeof callback !== 'function'
  ) {
    throw new Error('rselectron module-path loader requires a bundler context');
  }

  const isNodeWorker = /(?:\?|&)nodeWorker(?:&|$)/.test(
    this.resourceQuery ?? '',
  );
  const resourcePath = this.resourcePath;
  const entryName = basename(resourcePath, extname(resourcePath)).replace(
    /[^a-zA-Z0-9_-]/g,
    '_',
  );
  const EntryPlugin = compiler.webpack.EntryPlugin;
  const outputOptions = {
    chunkFilename: `workers/${entryName}.[contenthash:8].cjs`,
    filename: `workers/${entryName}.[contenthash:8].cjs`,
    library: { type: 'commonjs2' },
  };

  const childCompiler = compilation.createChildCompiler(
    `rselectron-module-path|${resourcePath}`,
    outputOptions,
  );

  childCompiler.options.target = 'node';
  childCompiler.options.devtool = false;
  childCompiler.options.externalsPresets = {
    ...(childCompiler.options.externalsPresets ?? {}),
    node: true,
  };
  if (childCompiler.options.output !== undefined) {
    childCompiler.options.output.library = { type: 'commonjs2' };
  }

  const NodeTargetPlugin = compiler.webpack.node?.NodeTargetPlugin;
  if (typeof NodeTargetPlugin === 'function') {
    new NodeTargetPlugin().apply(childCompiler);
  }

  // Rewrite `node:` builtins to bare specifiers for the child Node target.
  childCompiler.hooks.normalModuleFactory.tap(
    'rselectron-module-path',
    (factory) => {
      factory.hooks.beforeResolve.tap('rselectron-module-path', (data) => {
        if (
          data !== false &&
          typeof data.request === 'string' &&
          data.request.startsWith('node:')
        ) {
          data.request = data.request.slice('node:'.length);
        }
      });
    },
  );

  new EntryPlugin(this.context, resourcePath, {
    filename: outputOptions.filename,
    name: entryName,
  }).apply(childCompiler);

  this.addDependency(resourcePath);

  childCompiler.runAsChild((error, entries, childCompilation) => {
    if (error) {
      callback(error);
      return;
    }
    if (childCompilation !== undefined && childCompilation.errors.length > 0) {
      callback(childCompilation.errors[0]);
      return;
    }
    if (entries === undefined || entries.length === 0) {
      callback(new Error(`No child entry emitted for ${resourcePath}`));
      return;
    }

    const files = entries[0]?.files;
    const file =
      files instanceof Set
        ? [...files][0]
        : Array.isArray(files)
          ? files[0]
          : undefined;
    if (typeof file !== 'string' || file.length === 0) {
      callback(new Error(`Child entry produced no file for ${resourcePath}`));
      return;
    }

    const pathLiteral = JSON.stringify(file.split('\\').join('/'));
    if (isNodeWorker) {
      callback(
        null,
        [
          'const { Worker } = require("node:worker_threads");',
          'const { join } = require("node:path");',
          'module.exports = function createWorker(options) {',
          `  return new Worker(join(__dirname, ${pathLiteral}), options);`,
          '};',
          '',
        ].join('\n'),
      );
      return;
    }

    callback(
      null,
      `module.exports = require("node:path").join(__dirname, ${pathLiteral});\n`,
    );
  });
};
