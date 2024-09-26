# build static page, stores in ./staging
@build:
  just clean
  mkdir -p staging
  @# copying static files
  cp -r src/res staging/
  cp -r src/index.html staging/
  @# building tailwind css
  tailwindcss -i src/style.css -o staging/style.css -m
  @# done!

# clean ./staging directory
@clean:
  @# deleting `staging` directory.
  rm -rf staging

@serve:
  just build
  @# serving http://127.0.0.1:8080
  NODE_NO_WARNINGS=1 http-server staging -s -a 127.0.0.1 -p 8080

# automatically rebuild on file change
@watch:
  nodemon --watch src --watch tailwind.config.js -e css,html --exec just serve
