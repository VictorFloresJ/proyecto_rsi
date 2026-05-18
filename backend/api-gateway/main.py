from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os

app = FastAPI(title="API Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USER_SERVICE_URL = os.environ.get("USER_SERVICE_URL", "http://127.0.0.1:8001")
CATALOG_SERVICE_URL = os.environ.get("CATALOG_SERVICE_URL", "http://127.0.0.1:8002")
REC_ENGINE_URL = os.environ.get("REC_ENGINE_URL", "http://127.0.0.1:8003")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "api-gateway"}

# --- Proxies ---
async def proxy_request(method: str, url: str, request: Request):
    async with httpx.AsyncClient() as client:
        body = await request.body()
        headers = dict(request.headers)
        # Remove host header to avoid conflicts
        headers.pop("host", None)
        
        try:
            response = await client.request(
                method=method,
                url=url,
                content=body,
                headers=headers,
                params=request.query_params
            )
            return JSONResponse(status_code=response.status_code, content=response.json())
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

@app.api_route("/users/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_users(path: str, request: Request):
    url = f"{USER_SERVICE_URL}/users/{path}"
    if not path:
        url = f"{USER_SERVICE_URL}/users"
    return await proxy_request(request.method, url, request)

@app.api_route("/games/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_games(path: str, request: Request):
    url = f"{CATALOG_SERVICE_URL}/games/{path}"
    if not path:
        url = f"{CATALOG_SERVICE_URL}/games"
    return await proxy_request(request.method, url, request)

@app.api_route("/recommend", methods=["POST"])
async def proxy_recommend(request: Request):
    url = f"{REC_ENGINE_URL}/recommend"
    return await proxy_request(request.method, url, request)

@app.api_route("/recommend/refresh", methods=["POST"])
async def proxy_recommend_refresh(request: Request):
    url = f"{REC_ENGINE_URL}/refresh"
    return await proxy_request(request.method, url, request)

@app.api_route("/ratings", methods=["GET", "POST"])
async def proxy_ratings(request: Request):
    url = f"{USER_SERVICE_URL}/ratings"
    return await proxy_request(request.method, url, request)
