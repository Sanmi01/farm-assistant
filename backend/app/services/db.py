from functools import lru_cache

import boto3

from ..config import Settings, get_settings


@lru_cache
def get_dynamodb_resource():
    settings = get_settings()
    kwargs = {"region_name": settings.default_aws_region}

    if settings.dynamodb_endpoint_url:
        kwargs["endpoint_url"] = settings.dynamodb_endpoint_url
        kwargs["aws_access_key_id"] = settings.aws_access_key_id or "local"
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key or "local"

    return boto3.resource("dynamodb", **kwargs)


def get_farms_table():
    settings = get_settings()
    return get_dynamodb_resource().Table(settings.farms_table_name)