require! path

module.exports =
  mode: \development
  devtool: 'cheap-source-map'
  output:
    filename: 'app.js'

  module:
    rules:
      * test: /\.js$/

      ...
