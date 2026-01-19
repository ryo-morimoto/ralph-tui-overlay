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

## Binary cache

This flake uses [Cachix](https://cachix.org) for pre-built binaries:

```bash
cachix use ryo-morimoto
```

Or add to your NixOS config:

```nix
nix.settings = {
  substituters = [ "https://ryo-morimoto.cachix.org" ];
  trusted-public-keys = [ "ryo-morimoto.cachix.org-1:K/rvocxm7HuaiYYf/t5RopL/IxgHIak1vWww+AkTFWY=" ];
};
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

## Development

Enter the development shell with formatting tools and git hooks:

```bash
cd dev
nix develop
```

This provides:
- `nixfmt` - Format Nix files
- `deadnix` - Find unused code
- `statix` - Lint for anti-patterns
- Pre-commit hooks for automated checks

Format all Nix files:

```bash
cd dev
nix fmt ..
```

## Acknowledgments

- [@subsy](https://github.com/subsy) - [ralph-tui](https://github.com/subsy/ralph-tui)
- [@ryoppippi](https://github.com/ryoppippi) - [claude-code-overlay](https://github.com/ryoppippi/claude-code-overlay)
