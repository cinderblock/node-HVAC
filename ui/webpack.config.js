const path = require('path');

// Even though `webpack` is not "used" in this file, it is required...
const webpack = require('webpack');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const ErrorOverlayPlugin = require('error-overlay-webpack-plugin');

module.exports = {
  entry: [
    // 'webpack-hot-middleware/client',
    './main.jsx',
  ],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
  },
  mode: 'development',
  plugins: [
    new HtmlWebpackPlugin({
      title: 'My Webpacked App',
      meta: { viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no' },
    }),
    new FaviconsWebpackPlugin('./assets/icons8-confetti-64.png'),
    new ErrorOverlayPlugin(),
    // new webpack.HotModuleReplacementPlugin(),
  ],
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
  devtool: 'cheap-module-source-map',
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: ['@babel/env', '@babel/react'],
        },
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
      },
    ],
  },
};
