#!/usr/bin/env bun

import { $ } from "bun";

const REPO_OWNER = "subsy";
const REPO_NAME = "ralph-tui";

interface GitHubRelease {
  tag_name: string;
  target_commitish: string;
}

interface Sources {
  version: string;
  rev: string;
  hash: string;
}

async function getLatestRelease(): Promise<GitHubRelease> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch latest release: ${res.statusText}`);
  }
  return res.json();
}

async function getCommitForTag(tag: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/tags/${tag}`
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch tag ref: ${res.statusText}`);
  }
  const data = await res.json();

  // Handle annotated tags
  if (data.object.type === "tag") {
    const tagRes = await fetch(data.object.url);
    const tagData = await tagRes.json();
    return tagData.object.sha;
  }

  return data.object.sha;
}

async function getNixHash(rev: string): Promise<string> {
  const result =
    await $`nix-prefetch-url --unpack https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/${rev}.tar.gz 2>&1`.text();

  // Run nix hash to-sri to convert to SRI format
  const hash = result.trim().split("\n").pop()!;
  const sriResult = await $`nix hash convert --hash-algo sha256 ${hash}`.text();
  return sriResult.trim();
}

async function generateBunNix(rev: string): Promise<void> {
  const tmpDir = `/tmp/ralph-tui-update-${Date.now()}`;

  console.log("Cloning repository...");
  await $`git clone --depth 1 --branch ${rev} https://github.com/${REPO_OWNER}/${REPO_NAME}.git ${tmpDir}`;

  console.log("Generating bun.nix...");
  await $`cd ${tmpDir} && nix run github:nix-community/bun2nix -- -o bun.nix`;

  console.log("Copying bun.nix...");
  const scriptDir = import.meta.dir;
  await $`cp ${tmpDir}/bun.nix ${scriptDir}/bun.nix`;

  // Fix unused imports in bun.nix for deadnix
  const bunNixPath = `${scriptDir}/bun.nix`;
  let bunNixContent = await Bun.file(bunNixPath).text();
  bunNixContent = bunNixContent.replace(
    /\{\s*copyPathToStore,\s*fetchFromGitHub,\s*fetchgit,\s*fetchurl,/,
    "{\n  fetchurl,"
  );
  await Bun.write(bunNixPath, bunNixContent);

  // Format with nixfmt
  await $`nixfmt ${bunNixPath}`.nothrow();

  console.log("Cleaning up...");
  await $`rm -rf ${tmpDir}`;
}

async function readCurrentSources(): Promise<Sources> {
  const scriptDir = import.meta.dir;
  const file = Bun.file(`${scriptDir}/sources.json`);
  return file.json();
}

async function writeSources(sources: Sources): Promise<void> {
  const scriptDir = import.meta.dir;
  await Bun.write(
    `${scriptDir}/sources.json`,
    JSON.stringify(sources, null, 2) + "\n"
  );
}

async function main() {
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

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
