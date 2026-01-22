#!/usr/bin/env bun

import { $ } from "bun";

const REPO_OWNER = "subsy";
const REPO_NAME = "ralph-tui";
const SCRIPT_DIR = import.meta.dir;

interface GitHubRelease {
  tag_name: string;
}

interface Sources {
  version: string;
  rev: string;
  hash: string;
}

async function fetchGitHubApi<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${path}`,
    { headers }
  );
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }
  return response.json();
}

async function getLatestRelease(): Promise<GitHubRelease> {
  return fetchGitHubApi("/releases/latest");
}

async function getCommitForTag(tag: string): Promise<string> {
  const data = await fetchGitHubApi<{ object: { type: string; url: string; sha: string } }>(
    `/git/ref/tags/${tag}`
  );

  if (data.object.type === "tag") {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const tagData = await fetch(data.object.url, { headers }).then((r) => r.json());
    return tagData.object.sha;
  }

  return data.object.sha;
}

async function getNixHash(rev: string): Promise<string> {
  const prefetchOutput =
    await $`nix-prefetch-url --unpack https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/${rev}.tar.gz 2>&1`.text();

  const hash = prefetchOutput.trim().split("\n").pop()!;
  const sriHash = await $`nix hash convert --hash-algo sha256 ${hash}`.text();
  return sriHash.trim();
}

async function generateBunNix(tag: string): Promise<void> {
  const tmpDir = `/tmp/ralph-tui-update-${Date.now()}`;
  const bunNixPath = `${SCRIPT_DIR}/bun.nix`;

  console.log("Cloning repository...");
  await $`git clone --depth 1 --branch ${tag} https://github.com/${REPO_OWNER}/${REPO_NAME}.git ${tmpDir}`;

  console.log("Generating bun.nix...");
  await $`cd ${tmpDir} && nix run github:nix-community/bun2nix -- -o bun.nix`;

  console.log("Copying bun.nix...");
  await $`cp ${tmpDir}/bun.nix ${bunNixPath}`;

  const bunNixContent = await Bun.file(bunNixPath).text();
  const fixedContent = bunNixContent.replace(
    /\{\s*copyPathToStore,\s*fetchFromGitHub,\s*fetchgit,\s*fetchurl,/,
    "{\n  fetchurl,"
  );
  await Bun.write(bunNixPath, fixedContent);

  await $`nixfmt ${bunNixPath}`.nothrow();

  console.log("Cleaning up...");
  await $`rm -rf ${tmpDir}`;
}

async function readCurrentSources(): Promise<Sources> {
  return Bun.file(`${SCRIPT_DIR}/sources.json`).json();
}

async function writeSources(sources: Sources): Promise<void> {
  await Bun.write(
    `${SCRIPT_DIR}/sources.json`,
    JSON.stringify(sources, null, 2) + "\n"
  );
}

async function main(): Promise<void> {
  console.log("Fetching latest release...");
  const release = await getLatestRelease();
  const version = release.tag_name.replace(/^v/, "");

  const currentSources = await readCurrentSources();

  if (currentSources.version === version) {
    console.log(`Already up to date: ${version}`);
    return;
  }

  console.log(`Updating from ${currentSources.version} to ${version}`);

  console.log("Getting commit SHA...");
  const rev = await getCommitForTag(release.tag_name);

  console.log("Calculating hash...");
  const hash = await getNixHash(rev);

  console.log("Generating bun.nix...");
  await generateBunNix(release.tag_name);

  const newSources: Sources = { version, rev, hash };
  await writeSources(newSources);

  console.log("\nUpdate complete!");
  console.log(JSON.stringify(newSources, null, 2));
  console.log("\nNext steps:");
  console.log("1. Test build: nix build .#ralph-tui");
  console.log("2. Commit and push changes");
}

main().catch(function (err) {
  console.error("Error:", err);
  process.exit(1);
});
