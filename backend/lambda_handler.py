"""AWS Lambda entrypoint for the Farm Assistant API.

Mangum adapts FastAPI's ASGI interface to Lambda's invocation model.
API Gateway sends an HTTP event, Mangum converts it to an ASGI scope,
the FastAPI app handles it, and Mangum converts the response back.
"""

from mangum import Mangum

from app.main import app

handler = Mangum(app)