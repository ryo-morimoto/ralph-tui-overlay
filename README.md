# ralph-tui-overlay

Nix flake overlay for [ralph-tui](https://github.com/subsy/ralph-tui) - AI Agent Loop Orchestrator.

## Usage

Add to your flake inputs:

```nix
{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    ralph-tui-overlay = {
      url = "github:ryo-morimoto/ralph-tui-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { nixpkgs, ralph-tui-overlay, ... }: {
    nixosConfigurations.your-host = nixpkgs.lib.nixosSystem {
      modules = [
        {
          nixpkgs.overlays = [ ralph-tui-overlay.overlays.default ];
        }
      ];
    };
  };
}
```

Then add `ralph-tui` to your packages:

```nix
environment.systemPackages = [ pkgs.ralph-tui ];
# or
home.packages = [ pkgs.ralph-tui ];
```

## Direct usage

```bash
nix run github:ryo-morimoto/ralph-tui-overlay
```

## Updating

Run the update script:

```bash
bun run update
```

This will:
1. Fetch the latest release from GitHub
2. Update `sources.json` with new version, rev, and hash
3. Regenerate `bun.nix` with updated dependencies

Then test and commit:

```bash
nix build .#ralph-tui
git add -A && git commit -m "chore: Update ralph-tui to vX.Y.Z"
git push
```
