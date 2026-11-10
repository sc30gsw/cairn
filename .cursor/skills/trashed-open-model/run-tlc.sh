#!/usr/bin/env bash
# Run TLC 1.7.4 on one config of TrashedOpen.tla. Exits with TLC's status.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: run-tlc.sh CONFIG.cfg" >&2
  exit 2
fi

config=$1
dir=$(cd "$(dirname "$0")" && pwd)
jar=${TLA2TOOLS:-"$HOME/.cache/tlaplus/tla2tools-1.7.4.jar"}
sha=936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88
url=https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar

if [[ ! -f "$jar" ]]; then
  mkdir -p "$(dirname "$jar")"
  tmp=$(mktemp)
  curl -fsSL -o "$tmp" "$url"
  echo "$sha  $tmp" | sha256sum -c -
  mv "$tmp" "$jar"
fi
echo "$sha  $jar" | sha256sum -c - >&2

cd "$dir"
exec java -XX:+UseParallelGC -cp "$jar" tlc2.TLC -workers 1 -config "$config" TrashedOpen.tla
