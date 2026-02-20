import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from jose import jwt, JWTError

security = HTTPBearer()

# Store JWKS locally to avoid fetching it on every single request
_jwks = None

async def get_jwks():
    global _jwks
    if _jwks is None:
        # Clerk publisher domain (e.g. https://clerk.yourdomain.com) should be specified in the env
        clerk_frontend_api = os.getenv("CLERK_FRONTEND_API")
        if not clerk_frontend_api:
             # Fallback to secret key usage or raise error if totally absent
            raise HTTPException(status_code=500, detail="Server misconfiguration: CLERK_FRONTEND_API missing")

        if not clerk_frontend_api.startswith("http"):
            clerk_frontend_api = f"https://{clerk_frontend_api}"
            
        jwks_url = f"{clerk_frontend_api}/.well-known/jwks.json"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(jwks_url)
                response.raise_for_status()
                _jwks = response.json()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to fetch JWKS: {str(e)}")
    return _jwks

async def get_current_merchant(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """
    FastAPI dependency that validates the Clerk JWT token and extracts the merchant_id (user ID).
    """
    token = credentials.credentials
    try:
        jwks = await get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        
        rsa_key = {}
        for key in jwks.get("keys", []):
            if key["kid"] == unverified_header.get("kid"):
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
                break

        if not rsa_key:
             raise HTTPException(status_code=401, detail="Invalid token: Unable to find appropriate key")

        # In a real prod environment you might want to strictly verify 'audience' and 'issuer'
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            options={"verify_aud": False, "verify_iss": False} # Simplified for dev, enable in prod if specified
        )
        
        merchant_id = payload.get("sub")
        if not merchant_id:
             raise HTTPException(status_code=401, detail="Invalid token: No sub (user ID) present")
             
        return merchant_id

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Could not validate credentials: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
