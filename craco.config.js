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

    // Trang CMS chạy HTTPS qua Cloudflare tunnel, bắt buộc dùng wss thay vì ws.
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
};
