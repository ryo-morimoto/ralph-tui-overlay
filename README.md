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

When ralph-tui releases a new version:

1. Update the `rev` and `hash` in `default.nix`
2. Regenerate `bun.nix`:
   ```bash
   cd /tmp && git clone --depth 1 https://github.com/subsy/ralph-tui.git
   cd ralph-tui && nix run github:nix-community/bun2nix -- -o bun.nix
   cp bun.nix /path/to/ralph-tui-overlay/
   ```
