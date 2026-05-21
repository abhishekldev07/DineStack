from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from jose import JWTError, ExpiredSignatureError, jwt

from auth.jwt_handler import ALGORITHM, SECRET_KEY


class JWTBearer(HTTPBearer):

    async def __call__(self, request: Request):

        credentials: HTTPAuthorizationCredentials = await super().__call__(request)

        if credentials:

            if credentials.scheme != "Bearer":
                raise HTTPException(
                    status_code=401,
                    detail="Invalid authentication scheme"
                )

            payload = self.verify_token(credentials.credentials)

            if not payload:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid or expired token"
                )

            request.state.user = payload

            return credentials.credentials

        raise HTTPException(status_code=401, detail="Invalid authorization code")

    def verify_token(self, token: str):

        try:
            payload = jwt.decode(
                token,
                SECRET_KEY,
                algorithms=[ALGORITHM]
            )

            return payload

        except ExpiredSignatureError:
            return None

        except JWTError:
            return None