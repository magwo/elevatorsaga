require! {
  gulp: { src, dest, series, parallel }
  'gulp-plumber': plumber
  'gulp-pug-3': pug
  'gulp-htmlmin': htmlmin
  'webpack-stream': webpack
  'gulp-postcss': postcss
  './webpack.config.ls': webpack-config
}

src-dir = 'src'
dest-dir = 'public'

build-html = (done) ->
  src "#src-dir/*.pug"
    .pipe plumber!
    .pipe pug do
      filters:
        'html-escape': (text, options) ->
          do
            c <- text.replace /[&'"<>]/g
            match c
            case '&' then '&amp;'
            case "'" then '&apos;'
            case '"' then '&quot;'
            case '<' then '&lt;'
            case '>' then '&gt;'

    .pipe htmlmin!
    .pipe dest dest-dir

build-css = (done) ->
  src "#src-dir/style.css"
    .pipe plumber!
    .pipe postcss!
    .pipe dest dest-dir

build-webpack = (done) ->
  src ["#src-dir/ts/app.ts" "#src-dir/ts/documentation.ts"]
    .pipe plumber!
    .pipe webpack config: webpack-config
    .pipe dest dest-dir

exports <<<
  default: series do
    parallel build-html, build-webpack, build-css
