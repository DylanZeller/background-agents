"""
GitHub App token generation for git operations.

Generates short-lived installation access tokens for:
- Cloning private repositories during image builds
- Git fetch/sync at sandbox startup
- Git push when creating pull requests

Tokens are valid for ~1 hour.
"""

import time

import httpx
import jwt

from ..log_config import get_logger

log = get_logger("auth.github_app")


def generate_jwt(app_id: str, private_key: str) -> str:
    """
    Generate a JWT for GitHub App authentication.

    Args:
        app_id: The GitHub App's ID
        private_key: The App's private key (PEM format)

    Returns:
        Signed JWT valid for 10 minutes
    """
    now = int(time.time())
    payload = {
        "iat": now - 60,  # Issued 60 seconds ago (clock skew tolerance)
        "exp": now + 600,  # Expires in 10 minutes
        "iss": app_id,
    }
    return jwt.encode(payload, private_key, algorithm="RS256")


def get_installation_token(jwt_token: str, installation_id: str) -> str:
    """
    Exchange a JWT for an installation access token.

    Args:
        jwt_token: The signed JWT
        installation_id: The GitHub App installation ID

    Returns:
        Installation access token (valid for 1 hour)

    Raises:
        httpx.HTTPStatusError: If the GitHub API request fails
    """
    url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    with httpx.Client() as client:
        response = client.post(url, headers=headers)
        response.raise_for_status()
        return response.json()["token"]


def _normalize_pem_key(private_key: str) -> str:
    """
    Normalize a PEM private key that may have literal \\n instead of newlines.

    This handles keys stored in CI secrets or environment variables where
    newlines get replaced with literal backslash-n strings.
    """
    key_header = private_key.split("\n")[0] if "\n" in private_key else private_key[:60]
    was_escaped = "\\n" in private_key

    if was_escaped:
        private_key = private_key.replace("\\n", "\n")
        log.debug("github.key_normalized", was_escaped=True, key_header=key_header)
    else:
        log.debug("github.key_normalized", was_escaped=False, key_header=key_header)

    if not private_key.startswith("-----BEGIN"):
        log.warn(
            "github.key_missing_header",
            key_prefix=private_key[:100],
            key_length=len(private_key),
        )

    return private_key.strip()


def generate_installation_token(
    app_id: str,
    private_key: str,
    installation_id: str,
) -> str:
    """
    Generate a fresh GitHub App installation token.

    This is the main entry point for token generation. It:
    1. Creates a JWT signed with the App's private key
    2. Exchanges it for an installation access token

    Args:
        app_id: The GitHub App's ID
        private_key: The App's private key (PEM format)
        installation_id: The GitHub App installation ID

    Returns:
        Installation access token (valid for 1 hour)

    Raises:
        httpx.HTTPStatusError: If the GitHub API request fails
        jwt.PyJWTError: If JWT encoding fails
    """
    private_key = _normalize_pem_key(private_key)

    key_header = private_key.split("\n")[0] if "\n" in private_key else private_key[:50]
    log.debug(
        "github.jwt_attempt", app_id=app_id, key_header=key_header, key_length=len(private_key)
    )

    try:
        jwt_token = generate_jwt(app_id, private_key)
    except jwt.exceptions.InvalidKeyError as e:
        log.error(
            "github.jwt_invalid_key",
            error=str(e),
            error_type=type(e).__name__,
            key_header=key_header,
            key_has_begin=private_key.startswith("-----BEGIN"),
            key_has_rsa=private_key.__contains__("RSA"),
            key_has_private=private_key.__contains__("PRIVATE"),
        )
        raise

    return get_installation_token(jwt_token, installation_id)
