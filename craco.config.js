const path = require('path');
const fs = require('fs');

const remotionSrcPath = path.resolve(
  __dirname,
  '../_biong_backend/resources/views/plugins/vn4-e-learning/services/remotion-short-video/src'
);
const feNodeModules = path.resolve(__dirname, 'node_modules');
const hyperframesPromptsPath = path.resolve(__dirname, 'hyperframes/prompts');

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

function includeRemotionInBabel(webpackConfig) {
  const oneOfRule = webpackConfig.module.rules.find((rule) => rule.oneOf);
  if (!oneOfRule || !Array.isArray(oneOfRule.oneOf)) {
    return;
  }

  oneOfRule.oneOf.forEach((rule) => {
    if (
      rule.loader
      && typeof rule.loader === 'string'
      && rule.loader.includes('babel-loader')
      && rule.include
    ) {
      const existingInclude = rule.include;
      rule.include = Array.isArray(existingInclude)
        ? [...existingInclude, remotionSrcPath]
        : [existingInclude, remotionSrcPath];
    }
  });
}

function enableRemotionWatch(webpackConfig) {
  webpackConfig.watchOptions = {
    ...(webpackConfig.watchOptions || {}),
    followSymlinks: true,
    ignored: /node_modules/,
  };
}

function syncHyperframesPromptsToPublic() {
  const publicPromptsDir = path.join(__dirname, 'public/hyperframes-prompts');
  fs.mkdirSync(publicPromptsDir, { recursive: true });

  fs.readdirSync(hyperframesPromptsPath)
    .filter((fileName) => fileName.endsWith('.md'))
    .forEach((fileName) => {
      fs.copyFileSync(
        path.join(hyperframesPromptsPath, fileName),
        path.join(publicPromptsDir, fileName),
      );
    });
}

function includeHyperframesPromptsRule(webpackConfig) {
  const oneOfRule = webpackConfig.module.rules.find((rule) => rule.oneOf);
  if (!oneOfRule || !Array.isArray(oneOfRule.oneOf)) {
    return;
  }

  oneOfRule.oneOf.unshift({
    test: /\.md$/,
    include: hyperframesPromptsPath,
    type: 'asset/source',
  });
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
      overlay: {
        ...(devServerConfig.client?.overlay || {}),
        errors: true,
        warnings: false,
      },
    };

    // File Remotion nằm ngoài src/ FE — bắt buộc watch để HMR/reload khi sửa composition.
    devServerConfig.watchFiles = [
      ...(Array.isArray(devServerConfig.watchFiles) ? devServerConfig.watchFiles : []),
      {
        paths: [path.join(remotionSrcPath, '**/*')],
        options: {
          usePolling: process.env.REMOTION_WATCH_POLLING === '1',
          interval: 300,
        },
      },
      {
        paths: [path.join(hyperframesPromptsPath, '**/*')],
        options: {
          usePolling: process.env.REMOTION_WATCH_POLLING === '1',
          interval: 300,
        },
      },
    ];

    devServerConfig.static = [
      ...(Array.isArray(devServerConfig.static)
        ? devServerConfig.static
        : devServerConfig.static
          ? [devServerConfig.static]
          : []),
      {
        directory: hyperframesPromptsPath,
        publicPath: '/hyperframes-prompts',
        watch: true,
      },
    ];

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
      '@spacedev/remotion-short-video/visualBackgroundGradient': path.join(
        remotionSrcPath,
        'visualBackgroundGradient.ts'
      ),
      '@spacedev/remotion-short-video': remotionSrcPath,
    },
    configure: (webpackConfig) => {
      webpackConfig.resolve.plugins = (webpackConfig.resolve.plugins || []).filter(
        (plugin) => plugin.constructor.name !== 'ModuleScopePlugin'
      );

      applyRemotionWebpackAliases(webpackConfig);
      includeRemotionInBabel(webpackConfig);
      enableRemotionWatch(webpackConfig);

      webpackConfig.resolve.modules = [
        feNodeModules,
        ...(webpackConfig.resolve.modules || ['node_modules']),
      ];

      webpackConfig.resolve.extensions = [
        ...(webpackConfig.resolve.extensions || []),
        '.ts',
        '.tsx',
      ];

      webpackConfig.resolve.alias = {
        ...(webpackConfig.resolve.alias || {}),
        '@hyperframes-prompts': hyperframesPromptsPath,
      };

      includeHyperframesPromptsRule(webpackConfig);
      syncHyperframesPromptsToPublic();

      return webpackConfig;
    },
  },
};
