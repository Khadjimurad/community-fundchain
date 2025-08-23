from fastapi import FastAPI
from .routes import router

app = FastAPI(title="fundqueue-mvp API")
app.include_router(router)
