from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "development"
    log_level: str = "INFO"

    openai_api_key: str

    clerk_secret_key: str = ""
    clerk_jwks_url: str = ""

    # AWS / DynamoDB
    aws_account_id: str = ""
    default_aws_region: str = "us-east-1"
    farms_table_name: str = "farm-assistant-dev-farms"
    dynamodb_endpoint_url: str = ""
    aws_access_key_id: str = ""    
    aws_secret_access_key: str = ""

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()