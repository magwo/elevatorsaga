require! path

module.exports =
  mode: \development
  devtool: 'cheap-source-map'
  output:
    filename: '[name].js'

  entry:
    app: './src/ts/app.ts'
    documentation: './src/ts/documentation.ts'

  module:
    rules:
      * test: /\.js$/

      * test: /\.ts$/
        use: 'ts-loader'
        exclude: /node_modules/

  resolve:
    extensions: <[ .ts .js ]>
