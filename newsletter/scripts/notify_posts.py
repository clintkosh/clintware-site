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
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                if response.status not in (200, 202):
                    raise RuntimeError(f"unexpected status {response.status}")
        except urllib.error.HTTPError as error:
            body = error.read(1200).decode("utf-8", "replace").replace("\n", " ").strip()
            server = error.headers.get("server", "")
            cf_ray = error.headers.get("cf-ray", "")
            content_type = error.headers.get("content-type", "")
            detail = f" server={server!r} cf-ray={cf_ray!r} content-type={content_type!r}"
            if body:
                detail += f" body={body[:1200]!r}"
            raise SystemExit(
                f"Newsletter notification failed for {post['url']} (HTTP {error.code}).{detail}"
            ) from error
        print(f"Newsletter notification accepted for {post['url']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
