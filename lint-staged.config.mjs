import path from 'node:path';

const toCommandPath = (value) => value.replaceAll('\\', '/');
const quote = (value) => JSON.stringify(toCommandPath(value));

function runNodeBin(binPath, args, files) {
  return [
    quote(process.execPath),
    quote(path.resolve(binPath)),
    ...args,
    ...files.map(quote),
  ].join(' ');
}

export default {
  '*.{ts,tsx,js,jsx}': (files) => [
    runNodeBin('node_modules/eslint/bin/eslint.js', ['--fix'], files),
    runNodeBin('node_modules/prettier/bin/prettier.cjs', ['--write'], files),
  ],
  '*.{md,json,css,scss}': (files) =>
    runNodeBin('node_modules/prettier/bin/prettier.cjs', ['--write'], files),
};
