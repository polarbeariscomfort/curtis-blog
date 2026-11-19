# Curtis Jones' Blog – setup guide

A simple, fast blog for Netlify with:
- falling maple and slim leaves in the background that drift with your cursor and scatter when you sweep through them
- your FIBE3 CDT and University of Cambridge logos (linked) at the top
- an open letter banner for academics, and a resources section
- a posts feed with photo galleries, tags, and buttons linking to your socials
- a private editor at `/admin` where **only you** can add or change posts

## How it works

All the content lives in two files: `content/posts.json` (your posts) and `content/site.json` (title, logos, social links).
You never need to edit those by hand. The `/admin` page gives you a proper editor with photo uploads.

When you press **Publish** in the editor, it saves your changes to your GitHub repository. Netlify notices and updates the live site in about 30 seconds.

**Why only you can edit:** to sign in to `/admin` you log in with GitHub, and saving only works for accounts with write access to your repository. Visitors can see the editor's login screen, but they can't get past it or change anything.

## One-time setup (about 20 minutes)

### 1. Put the files on GitHub
1. Create a free account at github.com if you don't have one.
2. Click **New repository**, name it `curtis-blog`, and keep it **Public** or **Private** (both work).
3. On the new repository's page, click **uploading an existing file** and drag in everything from this folder (keep the folder structure).
4. Click **Commit changes**.

### 2. Connect it to Netlify
1. In Netlify, go to **Add new project → Import an existing project → GitHub**, and pick `curtis-blog`.
2. Leave the build command **empty** and the publish directory as `.` (the included `netlify.toml` sets this).
3. Click **Deploy**. Your site is live at a `something.netlify.app` address. You can rename it under **Project configuration → Change project name**.

### 3. Let the editor log in with GitHub
1. On GitHub, go to **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - Application name: `Curtis blog editor`
   - Homepage URL: your Netlify address, e.g. `https://curtis-blog.netlify.app`
   - Authorization callback URL: `https://api.netlify.com/auth/done`
2. Click **Register**, then **Generate a new client secret**. Keep this page open.
3. In Netlify, open your project → **Project configuration → Access & security → OAuth** → **Install provider** → **GitHub**, and paste the Client ID and Client Secret.

### 4. Point the editor at your repository
Already done: `admin/config.yml` points to `polarbeariscomfort/curtis-blog`. If you give your repository a different name, change that line to match.

### 5. Start posting
Go to `https://your-site.netlify.app/admin`, sign in with GitHub, and you'll see:
- **Posts**: add a post (it goes to the top), upload a main photo and more photos, write your update, add tags and links to the matching social posts.
- **Site settings**: change the title, intro, social links, and **upload your two logos** here.

Tick **Hide this post (draft)** to save something without showing it yet.

## Logos
Your FIBE3 CDT and University of Cambridge logos are already in `images/logos/`. You can swap them in **Site settings → Logos**.

## Open letter and resources
The open letter section (your email, the pre-filled email message and the letter text) and the "Make the change yourself" cards are both edited in **Site settings**. Leave the open letter heading empty to hide that section.

## If /admin isn't working
Find the line below that matches what you see:

| What you see | What it means | Fix |
|---|---|---|
| "Page not found" at `/admin` | The `admin` folder didn't get uploaded | Upload the `admin` folder to your GitHub repo (step 1) |
| The editor loads but shows an error about the config or `repo` | The repo line still says `YOUR-GITHUB-USERNAME` | Do step 4 |
| You click "Sign in with GitHub" and get an error or an empty popup | Netlify doesn't have your GitHub OAuth app details | Do step 3, and check the callback URL is exactly `https://api.netlify.com/auth/done` |
| You signed in, but saving fails | The repo name in `config.yml` doesn't match your real repo, or the branch isn't `main` | Check the repo's name and branch on GitHub and match them in `config.yml` |
| You saved, but the live site hasn't changed | The site was deployed by drag-and-drop, so it isn't linked to GitHub | Do step 2: create the Netlify project by importing from GitHub |

**Important:** the editor saves to GitHub, so the site must be **imported from GitHub** in Netlify (step 2). A site made by dragging the folder onto Netlify can show the blog, but `/admin` can never save to it.

## Tips
- **Photos:** resize to about 1600px wide before uploading. Pages load faster and use less energy, and you'll stay well inside Netlify's free allowance.
- **Leaves:** density, colours and how strongly the cursor pushes them are at the top of `js/leaves.js`. People who've turned on "reduce motion" on their device see still leaves instead.
- **Your own domain:** add it in Netlify under **Domain management**, then update the Homepage URL in your GitHub OAuth app.
