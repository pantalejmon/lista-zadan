module.exports = {
  apps: [
    {
      name: 'lista-zadan',
      script: 'server/dist/main.js',
      cwd: '/home/jjakubik/lista-zadan',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
