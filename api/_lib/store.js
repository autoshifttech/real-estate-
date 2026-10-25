/*
 * Where the admin panel saves things.
 *
 * GitHub (default): every save is a commit to the repository, and Vercel republishes the site.
 *   GITHUB_TOKEN     fine-grained token with "Contents: Read and write" on this repository
 *   GITHUB_REPO      optional, "owner/repo"   (defaults to the repo Vercel deployed from)
 *   GITHUB_BRANCH    optional, site branch     (defaults to the branch Vercel deployed from)
 * Enquiries are stored encrypted on a separate branch, "admin-data", which Vercel does not deploy.
 *
 * Local files (TLP_STORAGE=fs): used by tools/dev-server.js for local testing.
 */
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DATA_BRANCH = "admin-data";

function repo() {
  return process.env.GITHUB_REPO ||
    (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG ? process.env.VERCEL_GIT_REPO_OWNER + "/" + process.env.VERCEL_GIT_REPO_SLUG : "");
}
function siteBranch() {
  return process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";
}

function configError() {
  if (process.env.TLP_STORAGE === "fs") return null;
  if (!process.env.GITHUB_TOKEN) return "Missing setting in Vercel: GITHUB_TOKEN";
  if (!repo()) return "Missing setting in Vercel: GITHUB_REPO (owner/repo)";
  return null;
}

/* ---------- GitHub ---------- */

async function gh(method, url, body) {
  const res = await fetch("https://api.github.com/repos/" + repo() + url, {
    method,
    headers: {
      Authorization: "Bearer " + process.env.GITHUB_TOKEN,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "tenkasi-admin",
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 404) return null;
  const data = res.status === 204 ? {} : await res.json();
  if (!res.ok) {
    const err = new Error("GitHub: " + (data && data.message ? data.message : res.status));
    err.status = res.status === 401 || res.status === 403 ? 502 : res.status;
    err.ghStatus = res.status;
    throw err;
  }
  return data;
}

const github = {
  async read(file, branch) {
    const d = await gh("GET", "/contents/" + encodeURI(file) + "?ref=" + encodeURIComponent(branch || siteBranch()));
    if (!d || Array.isArray(d)) return null;
    let content;
    if (d.content) content = Buffer.from(d.content, "base64");
    else {
      const blob = await gh("GET", "/git/blobs/" + d.sha);
      content = Buffer.from(blob.content, "base64");
    }
    return { text: content.toString("utf8"), sha: d.sha };
  },

  async list(dir, branch) {
    const d = await gh("GET", "/contents/" + encodeURI(dir) + "?ref=" + encodeURIComponent(branch || siteBranch()));
    return Array.isArray(d) ? d.filter((f) => f.type === "file").map((f) => f.name) : [];
  },

  async ensureBranch(branch) {
    if (await gh("GET", "/git/ref/heads/" + encodeURIComponent(branch))) return;
    const blob = await gh("POST", "/git/blobs", { content: "Encrypted admin data for the website. Not deployed.\n", encoding: "utf-8" });
    const tree = await gh("POST", "/git/trees", { tree: [{ path: "README.md", mode: "100644", type: "blob", sha: blob.sha }] });
    const commit = await gh("POST", "/git/commits", { message: "Start admin data branch", tree: tree.sha, parents: [] });
    await gh("POST", "/git/refs", { ref: "refs/heads/" + branch, sha: commit.sha });
  },

  /* files: [{ path, content: Buffer|string } | { path, delete: true }]; expect: { path: sha|null } */
  async commit(files, message, opts) {
    opts = opts || {};
    const branch = opts.branch || siteBranch();
    for (let attempt = 0; attempt < 3; attempt++) {
      const ref = await gh("GET", "/git/ref/heads/" + encodeURIComponent(branch));
      if (!ref) throw Object.assign(new Error("Branch not found: " + branch), { status: 500 });
      const head = ref.object.sha;
      if (opts.expect) {
        for (const p of Object.keys(opts.expect)) {
          const cur = await gh("GET", "/contents/" + encodeURI(p) + "?ref=" + head);
          const sha = cur && !Array.isArray(cur) ? cur.sha : null;
          if (sha !== opts.expect[p]) throw Object.assign(new Error("Someone else changed " + p + " since you opened it. Reload to get the latest version."), { status: 409 });
        }
      }
      const base = await gh("GET", "/git/commits/" + head);
      const tree = [];
      for (const f of files) {
        if (f.delete) { tree.push({ path: f.path, mode: "100644", type: "blob", sha: null }); continue; }
        const buf = Buffer.isBuffer(f.content) ? f.content : Buffer.from(String(f.content), "utf8");
        const blob = await gh("POST", "/git/blobs", { content: buf.toString("base64"), encoding: "base64" });
        tree.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
      }
      const newTree = await gh("POST", "/git/trees", { base_tree: base.tree.sha, tree });
      const commit = await gh("POST", "/git/commits", { message, tree: newTree.sha, parents: [head] });
      try {
        await gh("PATCH", "/git/refs/heads/" + encodeURIComponent(branch), { sha: commit.sha, force: false });
        return commit.sha;
      } catch (e) {
        if (e.ghStatus !== 422 || attempt === 2) throw e;   // branch moved meanwhile: retry on the new head
      }
    }
  }
};

/* ---------- local files (development) ---------- */

const ROOT = path.resolve(__dirname, "../..");
function fsPath(file, branch) {
  const base = branch && branch !== siteBranch() ? path.join(ROOT, ".data", branch) : ROOT;
  const p = path.resolve(base, file);
  if (!p.startsWith(base)) throw new Error("Bad path");
  return p;
}
const sha1 = (buf) => crypto.createHash("sha1").update(buf).digest("hex");
const local = {
  async read(file, branch) {
    const p = fsPath(file, branch);
    if (!fs.existsSync(p)) return null;
    const buf = fs.readFileSync(p);
    return { text: buf.toString("utf8"), sha: sha1(buf) };
  },
  async list(dir, branch) {
    const p = fsPath(dir, branch);
    return fs.existsSync(p) ? fs.readdirSync(p).filter((n) => fs.statSync(path.join(p, n)).isFile()) : [];
  },
  async ensureBranch() {},
  async commit(files, message, opts) {
    opts = opts || {};
    if (opts.expect) {
      for (const f of Object.keys(opts.expect)) {
        const cur = await local.read(f, opts.branch);
        if ((cur ? cur.sha : null) !== opts.expect[f]) throw Object.assign(new Error("Someone else changed " + f + " since you opened it. Reload to get the latest version."), { status: 409 });
      }
    }
    for (const f of files) {
      const p = fsPath(f.path, opts.branch);
      if (f.delete) { if (fs.existsSync(p)) fs.unlinkSync(p); continue; }
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, f.content);
    }
    return "local-" + Date.now();
  }
};

function store() { return process.env.TLP_STORAGE === "fs" ? local : github; }

module.exports = { store, configError, siteBranch, DATA_BRANCH };
