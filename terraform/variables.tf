variable "project_name" {
  description = "Name prefix for all resources"
  type        = string
  default     = "farm"
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  description = "Environment name (dev, test, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Environment must be one of: dev, test, prod."
  }
}

variable "openai_api_key" {
  description = "OpenAI API key for the agent and recommender"
  type        = string
  sensitive   = true
}

variable "clerk_secret_key" {
  description = "Clerk backend secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "clerk_jwks_url" {
  description = "Clerk JWKS URL used to verify JWTs server-side"
  type        = string
  default     = ""
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 60
}

variable "api_throttle_burst_limit" {
  description = "API Gateway throttle burst limit"
  type        = number
  default     = 10
}

variable "api_throttle_rate_limit" {
  description = "API Gateway throttle rate limit"
  type        = number
  default     = 5
}