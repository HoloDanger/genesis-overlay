{
  description = "Genesis Overlay - Sovereign Desktop AI Command Center (Tauri + Rust + TS)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" ];
        };

        nativeBuildInputs = with pkgs; [
          pkg-config
          rustToolchain
        ] ++ pkgs.lib.optionals pkgs.stdenv.isDarwin (with pkgs.darwin.apple_sdk.frameworks; [
          AppKit
          CoreServices
          WebKit
          Security
          Foundation
        ]) ++ pkgs.lib.optionals pkgs.stdenv.isLinux [
          gobject-introspection
          cargo-tauri
        ];

        buildInputs = with pkgs; [
          openssl
          ollama
        ] ++ pkgs.lib.optionals pkgs.stdenv.isLinux [
          glib
          gtk3
          webkitgtk
          libsoup
        ];
      in
      {
        packages.default = pkgs.rustPlatform.buildRustPackage {
          pname = "genesis-overlay";
          version = "1.0.0";
          src = ./.;

          cargoRoot = "src-tauri";
          buildAndCheckSubdir = "src-tauri";

          cargoLock = {
            lockFile = ./src-tauri/Cargo.lock;
          };

          inherit nativeBuildInputs buildInputs;

          meta = with pkgs.lib; {
            description = "Sovereign Desktop AI Command Center (Tauri + Rust + TS)";
            homepage = "https://github.com/genesis/genesis-overlay";
            license = licenses.mit;
            platforms = platforms.unix;
          };
        };

        apps.default = flake-utils.lib.mkApp {
          drv = self.packages.${system}.default;
        };

        devShells.default = pkgs.mkShell {
          inherit nativeBuildInputs buildInputs;
          packages = with pkgs; [
            nodejs
            cargo-tauri
            ollama
          ];
        };
      }
    );
}
