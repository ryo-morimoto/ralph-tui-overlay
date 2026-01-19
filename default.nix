{
  lib,
  bun,
  bun2nix,
  fetchFromGitHub,
}:
let
  sources = lib.importJSON ./sources.json;
  src = fetchFromGitHub {
    owner = "subsy";
    repo = "ralph-tui";
    inherit (sources) rev hash;
  };
in
bun2nix.mkDerivation {
  pname = "ralph-tui";
  inherit (sources) version;
  inherit src;

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
