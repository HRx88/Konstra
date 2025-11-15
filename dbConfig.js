module.exports = {
  user: process.env.DatabaseUser,
  password: process.env.DatabasePassword,
  server: process.env.DatabaseServerName,
  database: process.env.DatabaseName,
  trustServerCertificate: true,
  options: {
    port: 1433,
    connectionTimeout: 60000,
  },
};
