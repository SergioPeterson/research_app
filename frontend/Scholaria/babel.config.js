module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // enable import.meta polyfill for Hermes
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: ['nativewind/babel'],
  };
};