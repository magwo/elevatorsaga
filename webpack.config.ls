require! path

module.exports =
  mode: \development
  output:
    filename: 'app.js'

  module:
    rules:
      * test: /\.js$/

      ...
