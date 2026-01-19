{
  description = "Nix overlay for ralph-tui - AI Agent Loop Orchestrator";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    bun2nix = {
      url = "github:nix-community/bun2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      bun2nix,
    }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
      pkgsFor =
        system:
        import nixpkgs {
          inherit system;
          overlays = [ bun2nix.overlays.default ];
        };
    in
    {
      overlays.default = final: _: {
        ralph-tui = final.callPackage ./default.nix { };
      };

      packages = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
        in
        {
          ralph-tui = pkgs.callPackage ./default.nix { };
          default = self.packages.${system}.ralph-tui;
        }
      );
    };
}
