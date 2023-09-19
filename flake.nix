{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = (import nixpkgs) { inherit system; };
        python-pkgs = (ps: with ps; [
          livereload
        ]);
      in
      {
        devShells.default = pkgs.mkShell
          {
            packages = with pkgs; [
              (python311.withPackages python-pkgs)
            ];

            shellHook = ''
              livereload -p 8080 &> /dev/null &
              echo $! > /tmp/livereload.pid
              PS1=$PS1:$(echo -e "\x1b[38;5;75m (http://127.0.0.1:8080)\x1b[0m ")
              trap "
              kill $(cat /tmp/livereload.pid)
              rm /tmp/livereload.pid
              " EXIT
            '';
          };
      });
}
