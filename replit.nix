{pkgs}: {
  deps = [
    pkgs.perl536Packages.ConfigGitLike
    pkgs.perl538Packages.ConfigGitLike
    pkgs.perlPackages.ConfigMerge
    pkgs.autokey
    pkgs.autorestic
    pkgs.automaticcomponenttoolkit
    pkgs.git-autofixup
    pkgs.css-html-js-minify
    pkgs.nodePackages.typescript-language-server
    pkgs.typescript
    pkgs.nodePackages_latest.ts-node
    pkgs.postgresql12JitPackages.tsearch_extras
    pkgs.reactphysics3d
    pkgs.react-native-debugger
    pkgs.react-static
    pkgs.vite
    pkgs.nodePackages.json
  ];
}
