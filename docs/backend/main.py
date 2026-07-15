from fastapi import FastAPI

app = FastAPI(
    title="ImoleWrites Research Platform",
    description="AI-powered research platform for academic writing and scientific publishing",
    version="1.0.0"
)


@app.get("/")
def home():
    return {
        "platform": "ImoleWrites Research Platform",
        "status": "Running",
        "version": "1.0.0"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
