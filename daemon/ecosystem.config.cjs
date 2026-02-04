module.exports = {
  apps: [
    {
      name: "notif-dispatcher",
      script: "./notification-dispatcher.mjs",
      cwd: __dirname,
      interpreter: "node",
      env: {
        OPENCLAW_GATEWAY_URL: "http://localhost:4440",
        // OPENCLAW_GATEWAY_TOKEN: "", // Add if needed
      },
      // Restart on failure
      max_restarts: 10,
      min_uptime: "10s",
      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      merge_logs: true,
      // Resource limits
      max_memory_restart: "100M",
    },
  ],
};
