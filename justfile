# build static page, stores in ./docs
@build:
  mkdir -p docs
  @# copying static files
  cp -r src/res docs/
  cp -r src/index.html docs/
  @# building tailwind css
  tailwindcss -i src/style.css -o docs/style.css -m
  @# done!

# clean ./docs directory
@clean:
  @# deleting `docs` directory.
  rm -rf docs

@serve:
  just build
  @# serving http://127.0.0.1:8080
  NODE_NO_WARNINGS=1 http-server docs -s -a 127.0.0.1 -p 8080

# automatically rebuild on file change
@watch:
  nodemon --watch src --watch tailwind.config.js -e css,html --exec just serve
