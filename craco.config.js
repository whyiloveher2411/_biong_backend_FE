const path = require('path');

const remotionSrcPath = path.resolve(
  __dirname,
  '../_biong_backend/resources/views/plugins/vn4-e-learning/services/remotion-short-video/src'
);
const feNodeModules = path.resolve(__dirname, 'node_modules');

/** Alias Remotion về FE — tránh kéo bản từ backend node_modules. */
function applyRemotionWebpackAliases(webpackConfig) {
  const alias = { ...(webpackConfig.resolve.alias || {}) };

  alias.remotion = path.join(feNodeModules, 'remotion');
  alias['@remotion/player'] = path.join(feNodeModules, '@remotion/player');
  alias['@remotion/transitions'] = path.join(feNodeModules, '@remotion/transitions');
  alias.react = path.join(feNodeModules, 'react');
  alias['react-dom'] = path.join(feNodeModules, 'react-dom');

  webpackConfig.resolve.alias = alias;
}

module.exports = {
  devServer: (devServerConfig) => {
    devServerConfig.headers = {
      ...(devServerConfig.headers || {}),
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    };

    const socketHost = process.env.WDS_SOCKET_HOST || 'local-cms.spacedev.vn';
    const socketPath = process.env.WDS_SOCKET_PATH || '/ws';
    const socketPort = Number(process.env.WDS_SOCKET_PORT || 443);

    devServerConfig.client = {
      ...(devServerConfig.client || {}),
      webSocketURL: {
        protocol: 'wss',
        hostname: socketHost,
        pathname: socketPath,
        port: socketPort,
      },
    };

    return devServerConfig;
  },
  webpack: {
    alias: {
      '@spacedev/remotion-short-video/compositionTimeline': path.join(
        remotionSrcPath,
        'compositionTimeline.ts'
      ),
      '@spacedev/remotion-short-video/ShortVideoComposition': path.join(
        remotionSrcPath,
        'ShortVideoComposition.tsx'
      ),
      '@spacedev/remotion-short-video/types': path.join(remotionSrcPath, 'types.ts'),
      '@spacedev/remotion-short-video': remotionSrcPath,
    },
    configure: (webpackConfig) => {
      webpackConfig.resolve.plugins = (webpackConfig.resolve.plugins || []).filter(
        (plugin) => plugin.constructor.name !== 'ModuleScopePlugin'
      );

      applyRemotionWebpackAliases(webpackConfig);

      webpackConfig.resolve.modules = [
        feNodeModules,
        ...(webpackConfig.resolve.modules || ['node_modules']),
      ];

      const oneOfRule = webpackConfig.module.rules.find((rule) => rule.oneOf);
      if (oneOfRule && Array.isArray(oneOfRule.oneOf)) {
        const babelRule = oneOfRule.oneOf.find(
          (rule) =>
            rule.loader &&
            typeof rule.loader === 'string' &&
            rule.loader.includes('babel-loader') &&
            rule.include
        );
        if (babelRule) {
          const existingInclude = babelRule.include;
          babelRule.include = Array.isArray(existingInclude)
            ? [...existingInclude, remotionSrcPath]
            : [existingInclude, remotionSrcPath];
        }
      }
      return webpackConfig;
    },
  },
};
