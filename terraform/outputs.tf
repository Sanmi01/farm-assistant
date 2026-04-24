output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.api.function_name
}

output "farms_table_name" {
  description = "DynamoDB table for farms"
  value       = aws_dynamodb_table.farms.name
}

output "chat_table_name" {
  description = "DynamoDB table for chat messages"
  value       = aws_dynamodb_table.chat.name
}

output "lambda_artifacts_bucket" {
  description = "S3 bucket holding the Lambda deployment zip"
  value       = aws_s3_bucket.lambda_artifacts.id
}

output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "cloudfront_url" {
  description = "HTTPS URL of the CloudFront distribution"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "cloudfront_domain" {
  description = "Raw CloudFront domain (no scheme)"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "s3_frontend_bucket" {
  description = "S3 bucket serving the frontend"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (used for cache invalidation)"
  value       = aws_cloudfront_distribution.main.id
}