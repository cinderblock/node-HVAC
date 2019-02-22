const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const ErrorOverlayPlugin = require('error-overlay-webpack-plugin');

module.exports = {
  entry: {
    main: './main.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'bundle'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  devtool: 'source-map',
  mode: 'development',
  devServer: {
    port: 9001,
    host: '0.0.0.0',
    disableHostCheck: true,
    stats: 'minimal',
    overlay: {
      warnings: true,
      errors: true,
    },
    proxy: {
      '/socket.io': {
        target: 'http://localhost:8000',
        ws: true,
        // changeOrigin: true,
        xfwd: true,
      },
    },
    setup(app, server) {
      setImmediate(() => {
        const qrcode = require('qrcode-terminal');
        const chalk = require('chalk');

        const hostname = require('os').hostname();

        const port = server.listeningApp.address().port;

        const localURL = `http://localhost:${port}`;
        const remoteURL = `http://${hostname}:${port}`;

        console.log();
        console.log(chalk.yellow('Ctrl + click here:'), chalk.underline.blue(localURL));
        console.log();
        console.log(chalk.yellow('On your phone:'), chalk.underline.blue(remoteURL));
        console.log();
        qrcode.generate(remoteURL);
        console.log();
      });
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'My Webpacked App',
      meta: { viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no' },
    }),
    new FaviconsWebpackPlugin('./assets/icons8-confetti-96.png'),
    new ErrorOverlayPlugin(),
    // new webpack.HotModuleReplacementPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.less$/,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }, { loader: 'less-loader' }],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        // exclude: /node_modules/,
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        loader: 'url-loader?limit=100000',
        // Need file-loader?
      },
    ],
  },
};
