"""Legacy Python scaffold entry point.

The Python console scaffold is retained for reference and lightweight checks.
It is not the Mitra AI runtime and cannot control the device.
"""

from __future__ import annotations

import sys

BANNER = r"""
  __  __ _ _            _
 |  \/  (_) |_ _ __ __ _| |
 | |\/| | | __| '__/ _` | |
 | |  | | | |_| | | (_| | |
 |_|  |_|_|\__|_|  \__,_|_|
 Offline-first personal AI assistant — development scaffold
"""


def main() -> int:
    print(BANNER)
    print("Mitra development scaffold — no assistant runtime is active.")
    print("No AI model, voice service, private memory, or device-control tools are connected.")
    print("The native Android implementation and offline engine are not available yet.")
    print("See docs/ARCHITECTURE.md for the current implementation sequence.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
