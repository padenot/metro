all: js html
	@echo "All done"

js:
	grep "^    " metro.js.md | sed 's/^    //' > metro.js

html:
	docco metro.js.md

gh-page: html js
	echo "<script src='metro.js'></script>" > ./demo.html
	cp ./metro.js ./docs
	git checkout -b gh-pages
	rm -f metro.js.md LICENSE README.md Makefile
	cp -r ./docs/* . && rm -R ./docs/*
	rmdir docs
	mv metro.js.html index.html
