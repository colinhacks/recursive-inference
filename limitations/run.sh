#!/usr/bin/env bash
# Compile each fixture with two compilers and print the implicit-any count for each.
# usage: ./run.sh <baseline-tsc> <candidate-tsc>
set -uo pipefail
BASE=${1:?usage: run.sh <baseline-tsc> <candidate-tsc>}
CAND=${2:?usage: run.sh <baseline-tsc> <candidate-tsc>}
cd "$(dirname "$0")"
printf "%-42s %10s %10s\n" fixture baseline candidate
printf "%-42s %10s %10s\n" "------" -------- ---------
for f in [0-9]*.ts; do
  b=$("$BASE" --noEmit --ignoreConfig --strict "$f" 2>&1 | grep -cE 'TS7022|TS7023')
  c=$("$CAND" --noEmit --ignoreConfig --strict "$f" 2>&1 | grep -cE 'TS7022|TS7023')
  printf "%-42s %10s %10s\n" "${f%.ts}" "$b" "$c"
done
echo
echo "counts are 'implicitly has type any' errors; 0 means the recursion resolved."
echo "the 'reveal' line in each fixture errors on purpose - its message prints the resolved type."
