"""Minimal console entry point for the Mitra prototype."""

from __future__ import annotations

import sys

BANNER = r"""
  __  __ _ _            _
 |  \\/  (_) |_ _ __ __ _| |
 | |\\/| | | __| '__/ _` | |
 | |  | | | |_| | | (_| | |
 |_|  |_|_|\\__|_|  \\__,_|_|
 Portable personal AI assistant — early prototype
"""


def main() -> int:
    print(BANNER)
    print("Mitra is running in prototype mode.")
    print("No AI model, private memory, or computer-control tools are active yet.")
    print("Never enter passwords, API keys, or confidential information here.")
    print()
    print("Planned next step: implement authentication and encrypted local storage.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
