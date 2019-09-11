all: js html
	@echo "All done"

js:
	grep "^    " metro.js.md | sed 's/^    //' > metro.js

html:
	docco metro.js.md

gh-page: html
	git checkout gh-pages
	echo "<script src='metro.js'></script>" > ./demo.html
	cp ./metro.js ./docs
	rm -f metro.js.md LICENSE README.md Makefile
	cp -r ./docs/* . && rm -R ./docs/*
	rmdir docs
	mv metro.js.html index.html
