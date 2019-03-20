'use strict';

const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const ThreeWebpackPlugin = require('@wildpeaks/three-webpack-plugin');

const rootDir = path.resolve(__dirname, '..');

module.exports = {
    mode: 'development',
    devServer: {
        contentBase: path.resolve(rootDir, 'build')
    },
    devtool: 'source-map',
    entry: {
        main: [ path.resolve(rootDir, 'demo', 'index') ]
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(rootDir, 'build')
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                loader: 'ts-loader'
            },
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                enforce: 'pre',
                loader: 'tslint-loader'
            },
            {
                test: /\.glsl$/,
                loader: 'raw-loader'
            },
            {
                test: /\.(?:jpg|png|obj|mtl|dds)$/,
                exclude: /node_modules/,
                loader: 'url-loader?limit=8192'
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'index.html',
            inject: 'body',
            template: path.resolve(rootDir, 'demo', 'index.html'),
            chunks: [ 'main' ]
        }),
        new ThreeWebpackPlugin()
    ],
    resolve: {
        extensions: [ '.ts', '.glsl', '.js', '.jpg', '.png' ]
    }
};
