"""S3-compatible object storage wrapper (Phase 2.2).

Used for images, PDFs, model artifacts - never for relational data.
Reads endpoint/credentials from settings; boto3 only imported on use
so unit tests don't need network or the dependency.
"""

from dataclasses import dataclass
from typing import Any, BinaryIO

from app.core.config import settings


@dataclass
class StorageConfig:
    endpoint: str = ""
    access_key: str = ""
    secret_key: str = ""
    bucket: str = "estim-ai-artifacts"
    region: str = "us-east-1"

    @classmethod
    def from_settings(cls) -> "StorageConfig":
        return cls(
            endpoint=settings.s3_endpoint,
            access_key=settings.s3_access_key,
            secret_key=settings.s3_secret_key,
            bucket=settings.s3_bucket,
            region=settings.s3_region,
        )

    @property
    def configured(self) -> bool:
        return bool(self.endpoint and self.access_key and self.secret_key)


class StorageClient:
    """Thin wrapper around a boto3 S3 client (MinIO-compatible)."""

    def __init__(self, config: StorageConfig | None = None) -> None:
        self.config = config or StorageConfig.from_settings()
        self._client = None

    def _get_client(self) -> Any:
        if self._client is None:
            import boto3  # local import: optional dep for unit tests

            self._client = boto3.client(
                "s3",
                endpoint_url=self.config.endpoint or None,
                aws_access_key_id=self.config.access_key or None,
                aws_secret_access_key=self.config.secret_key or None,
                region_name=self.config.region,
            )
        return self._client

    def upload_file(self, file_obj: BinaryIO, key: str) -> str:
        """Upload bytes; returns the object key."""
        self._get_client().upload_fileobj(file_obj, self.config.bucket, key)
        return key

    def download_file(self, key: str) -> bytes:
        from io import BytesIO

        buf = BytesIO()
        self._get_client().download_fileobj(self.config.bucket, key, buf)
        return buf.getvalue()

    def presigned_url(self, key: str, expires_seconds: int = 3600) -> str:
        url: str = self._get_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": self.config.bucket, "Key": key},
            ExpiresIn=expires_seconds,
        )
        return url
