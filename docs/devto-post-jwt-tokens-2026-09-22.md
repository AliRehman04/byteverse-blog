# Understanding JWT Tokens: Structure, Claims, and How to Decode One Yourself

If you've worked with modern authentication, you've seen a JWT — that long, dot-separated string starting with `eyJ...`. Most tutorials tell you to "just decode it" without explaining what you're actually looking at. Here's the structure, the claims that matter, and a live way to inspect any token yourself.

## The Three Parts

A JWT is three Base64URL-encoded segments joined by dots:

```
header.payload.signature
```

**Header** — usually just the algorithm and token type:

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload** — the actual claims. Some are registered (standardized), most apps add their own:

```json
{
  "sub": "user_12345",
  "iat": 1758500000,
  "exp": 1758503600,
  "role": "editor"
}
```

- `sub` — subject, usually the user ID
- `iat` — issued-at timestamp (Unix seconds)
- `exp` — expiration timestamp — **always check this before trusting a token**
- Anything else (`role`, `email`, `scope`...) is app-specific

**Signature** — HMAC or RSA output over the header+payload, signed with a secret/private key only the server holds. This is what makes the token tamper-proof, not the encoding.

## The Part People Get Wrong

Base64URL is **encoding, not encryption**. Anyone can decode the header and payload without any key — try it on any JWT you have lying around. That's fine and by design; JWTs aren't meant to hide data, they're meant to prove it hasn't been altered.

What you should never do:
- Put secrets (passwords, keys, full card numbers) in the payload — it's readable by anyone who has the token
- Trust a token's claims without verifying the signature server-side — decoding ≠ validating
- Skip the `exp` check — an unexpired-looking token can still be expired if you're not actually comparing timestamps

## Decode One Right Now

Paste any JWT into [ByteVerse's JWT Decoder](https://www.byteverse.fyi/tools/jwt-decoder) to see the header, payload, expiration status, and registered claims broken out instantly. It runs entirely in the browser — nothing gets sent anywhere, which matters since tokens can contain user identifiers you don't want leaving your machine.

That's the whole model: two readable JSON blobs plus a signature that only the issuer can produce. Once that clicks, most JWT-related auth bugs stop being mysterious.
