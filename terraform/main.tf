data "aws_caller_identity" "current" {}

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ---- DynamoDB tables ----

# Farms table: (user_id HASH, farm_id RANGE)
resource "aws_dynamodb_table" "farms" {
  name         = "${local.name_prefix}-farms"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"
  range_key    = "farm_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "farm_id"
    type = "S"
  }

  tags = local.common_tags
}

# Chat table: (farm_id HASH, sort_key RANGE).
resource "aws_dynamodb_table" "chat" {
  name         = "${local.name_prefix}-chat"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "farm_id"
  range_key    = "sort_key"

  attribute {
    name = "farm_id"
    type = "S"
  }

  attribute {
    name = "sort_key"
    type = "S"
  }

  tags = local.common_tags
}

# ---- S3 bucket for Lambda deployment artifacts ----

resource "aws_s3_bucket" "lambda_artifacts" {
  bucket = "${local.name_prefix}-lambda-artifacts-${data.aws_caller_identity.current.account_id}"
  tags   = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "lambda_artifacts" {
  bucket = aws_s3_bucket.lambda_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}


resource "aws_s3_object" "lambda_zip" {
  bucket      = aws_s3_bucket.lambda_artifacts.id
  key         = "lambda-deployment-${filebase64sha256("${path.module}/../backend/lambda-deployment.zip")}.zip"
  source      = "${path.module}/../backend/lambda-deployment.zip"
  source_hash = filebase64sha256("${path.module}/../backend/lambda-deployment.zip")
  tags        = local.common_tags
}

# ---- IAM role for Lambda ----

resource "aws_iam_role" "lambda_role" {
  name = "${local.name_prefix}-lambda-role"
  tags = local.common_tags

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })
}

# Baseline: CloudWatch Logs write access.
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

# DynamoDB access, scoped to the two Farm Assistant tables only.
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${local.name_prefix}-lambda-dynamodb"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:BatchWriteItem",
          "dynamodb:BatchGetItem",
        ]
        Resource = [
          aws_dynamodb_table.farms.arn,
          aws_dynamodb_table.chat.arn,
        ]
      },
    ]
  })
}

# ---- Lambda function ----

resource "aws_lambda_function" "api" {
  s3_bucket        = aws_s3_bucket.lambda_artifacts.id
  s3_key           = aws_s3_object.lambda_zip.key
  function_name    = "${local.name_prefix}-api"
  role             = aws_iam_role.lambda_role.arn
  handler          = "lambda_handler.handler"
  source_code_hash = filebase64sha256("${path.module}/../backend/lambda-deployment.zip")
  runtime          = "python3.12"
  architectures    = ["x86_64"]
  timeout          = var.lambda_timeout
  memory_size      = 1024
  tags             = local.common_tags

  environment {
    variables = {
      # Runtime config
      ENVIRONMENT = var.environment
      LOG_LEVEL   = "INFO"

      # OpenAI
      OPENAI_API_KEY = var.openai_api_key

      CLERK_SECRET_KEY = var.clerk_secret_key
      CLERK_JWKS_URL   = var.clerk_jwks_url

      FARMS_TABLE_NAME = aws_dynamodb_table.farms.name
      CHAT_TABLE_NAME  = aws_dynamodb_table.chat.name

      DYNAMODB_ENDPOINT_URL = ""

      DEFAULT_AWS_REGION = "us-east-1"

      CORS_ORIGINS = "https://${aws_cloudfront_distribution.main.domain_name},http://localhost:3000"
    }
  }

  depends_on = [
    aws_s3_object.lambda_zip,
  ]
}


resource "aws_s3_bucket" "frontend" {
  bucket = "${local.name_prefix}-frontend-${data.aws_caller_identity.current.account_id}"
  tags   = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}



resource "aws_apigatewayv2_api" "main" {
  name          = "${local.name_prefix}-api-gateway"
  protocol_type = "HTTP"
  tags          = local.common_tags

  # CORS is handled by FastAPI's CORSMiddleware inside the Lambda.
  # Declaring it here would produce duplicate Access-Control-* headers
  # and break the browser preflight.
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true
  tags        = local.common_tags

  default_route_settings {
    throttling_burst_limit = var.api_throttle_burst_limit
    throttling_rate_limit  = var.api_throttle_rate_limit
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "root" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}


resource "aws_cloudfront_function" "strip_api_prefix" {
  name    = "${local.name_prefix}-strip-api-prefix"
  runtime = "cloudfront-js-2.0"
  comment = "Strip /api prefix from requests before forwarding to API Gateway"
  publish = true
  code    = <<-EOT
    function handler(event) {
        var request = event.request;
        if (request.uri.startsWith('/api/')) {
            request.uri = request.uri.substring(4);
        } else if (request.uri === '/api') {
            request.uri = '/';
        }
        return request;
    }
  EOT
}


resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  tags                = local.common_tags

  # Origin 1: S3 static site (Next.js export)
  origin {
    domain_name = aws_s3_bucket_website_configuration.frontend.website_endpoint
    origin_id   = "S3-${aws_s3_bucket.frontend.id}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Origin 2: API Gateway (regional HTTP API)
  origin {
    domain_name = replace(aws_apigatewayv2_api.main.api_endpoint, "https://", "")
    origin_id   = "APIGW-${aws_apigatewayv2_api.main.id}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default behavior: S3 (static frontend)
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  # /api/* behavior: API Gateway, no caching, strip /api prefix, forward auth header
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "APIGW-${aws_apigatewayv2_api.main.id}"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type"]
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.strip_api_prefix.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SPA routing: S3 404s become index.html so Next.js client-side routing works.
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }
}