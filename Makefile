serve:
	bundle exec jekyll serve -t -l

build:
	bundle exec jekyll build
	cp _site/404/index.html _site/404.html
