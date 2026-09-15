import os
import uuid

LOCAL_UPLOAD_DIR = os.getenv("LOCAL_UPLOAD_DIR", "uploads")

S3_BUCKET = os.getenv("S3_BUCKET")
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY")
S3_REGION = os.getenv("S3_REGION", "auto")

USE_S3 = bool(S3_BUCKET and S3_ENDPOINT_URL and S3_ACCESS_KEY and S3_SECRET_KEY)


def _s3_client():
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT_URL,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
        region_name=S3_REGION,
    )


def save_file(user_id: int, filename: str, content: bytes) -> str:
    """Saves the file and returns a storage key to retrieve it later."""
    key = f"{user_id}/{uuid.uuid4().hex}_{filename}"

    if USE_S3:
        _s3_client().put_object(Bucket=S3_BUCKET, Key=key, Body=content, ContentType="application/pdf")
        return key

    os.makedirs(os.path.join(LOCAL_UPLOAD_DIR, str(user_id)), exist_ok=True)
    path = os.path.join(LOCAL_UPLOAD_DIR, key)
    with open(path, "wb") as f:
        f.write(content)
    return key


def read_file(key: str) -> bytes:
    if USE_S3:
        obj = _s3_client().get_object(Bucket=S3_BUCKET, Key=key)
        return obj["Body"].read()

    path = os.path.join(LOCAL_UPLOAD_DIR, key)
    with open(path, "rb") as f:
        return f.read()


def delete_file(key: str):
    if USE_S3:
        _s3_client().delete_object(Bucket=S3_BUCKET, Key=key)
        return
    path = os.path.join(LOCAL_UPLOAD_DIR, key)
    if os.path.exists(path):
        os.remove(path)


def is_using_persistent_storage() -> bool:
    """False means local disk — fine for dev, but many free hosting tiers wipe
    local disks on redeploy/restart. Surfaced so the UI can warn honestly."""
    return USE_S3
