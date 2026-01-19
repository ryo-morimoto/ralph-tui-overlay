{
  lib,
  bun,
  bun2nix,
  fetchFromGitHub,
}:
let
  version = "0.2.1";
  src = fetchFromGitHub {
    owner = "subsy";
    repo = "ralph-tui";
    rev = "ec485ffcd82f3b8f95d2e6530ba8d6903f4963ef";
    hash = "sha256-XdeCx6etQqHqwPXRauD19WzB4yfjKVErtCBWDaKW9YU=";
  };
in
bun2nix.mkDerivation {
  pname = "ralph-tui";
  inherit version src;

  bunDeps = bun2nix.fetchBunDeps {
    inherit src;
    bunNix = ./bun.nix;
  };

  buildPhase = ''
    runHook preBuild
    bun run build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p $out/bin $out/lib/ralph-tui
    cp -r dist/* $out/lib/ralph-tui/
    cat > $out/bin/ralph-tui << EOF
    #!${lib.getExe bun}
    import("$out/lib/ralph-tui/cli.js");
    EOF
    chmod +x $out/bin/ralph-tui
    runHook postInstall
  '';

  meta = {
    description = "Ralph TUI - AI Agent Loop Orchestrator";
    homepage = "https://github.com/subsy/ralph-tui";
    license = lib.licenses.mit;
    mainProgram = "ralph-tui";
  };
}
