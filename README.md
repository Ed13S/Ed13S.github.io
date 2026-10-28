# Eddie13S site

Live at https://ed13s.github.io/

- `posts.json` – all posts. `content.json` – About / Projects / Feedback / Contact text, bio line, footer.
- `site.js` renders every page from those two files (posts open at `post.html?p=<slug>`).
- **Admin:** type `admin` in the home-page search box, then paste a GitHub fine-grained token
  (this repo only, Contents: read and write). Posts and site text can then be created, edited and
  deleted; changes are committed to this repo, so they show for everyone after Pages rebuilds (~1 min).
