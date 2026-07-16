from fastapi import FastAPI

app = FastAPI(
    title="ImoleWrites Research Platform",
    version="2.0.0",
    description="AI-powered research platform for researchers worldwide."
)


@app.get("/")
def home():
    return {
        "message": "Welcome to ImoleWrites Research Platform",
        "status": "running",
        "version": "2.0.0"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
