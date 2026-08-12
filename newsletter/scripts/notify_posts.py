#!/usr/bin/env python3
"""Call the protected newsletter publish endpoint for each changed post."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--posts", required=True)
    parser.add_argument("--endpoint", required=True)
    args = parser.parse_args()

    secret = os.environ.get("NEWSLETTER_PUBLISH_SECRET", "")
    if not secret:
        raise SystemExit("NEWSLETTER_PUBLISH_SECRET is not configured for this repository.")

    posts = json.loads(open(args.posts, encoding="utf-8").read())
    for post in posts:
        request = urllib.request.Request(
            f"{args.endpoint.rstrip('/')}/publish",
            data=json.dumps(post).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {secret}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                if response.status not in (200, 202):
                    raise RuntimeError(f"unexpected status {response.status}")
        except urllib.error.HTTPError as error:
            raise SystemExit(f"Newsletter notification failed for {post['url']} (HTTP {error.code}).") from error
        print(f"Newsletter notification accepted for {post['url']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
