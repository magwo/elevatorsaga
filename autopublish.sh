git checkout gh-pages;
git pull --rebase origin gh-pages;
git merge master;
git push origin gh-pages;
git checkout master;