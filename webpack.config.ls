require! path

module.exports =
  mode: \development
  devtool: 'cheap-source-map'
  output:
    filename: '[name].js'

  entry:
    app: './src/js/app.js'
    documentation: './src/js/documentation.js'

  module:
    rules:
      * test: /\.js$/

      ...
