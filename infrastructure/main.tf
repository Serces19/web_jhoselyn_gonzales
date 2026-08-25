terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = "us-east-1" # Asumiendo us-east-1 (N. Virginia) que es lo estandar y barato
}

# ---------------------------------------------------------
# COGNITO USER POOL (Para Autenticación sin costo inicial)
# ---------------------------------------------------------
resource "aws_cognito_user_pool" "pool" {
  name = "jhoselyn_web_pool"

  # Nivel gratuito: 50,000 MAU. Sin costo extra.
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  auto_verified_attributes = ["email"]
  username_attributes      = ["email"]
}

resource "aws_cognito_user_pool_client" "client" {
  name         = "jhoselyn_web_app_client"
  user_pool_id = aws_cognito_user_pool.pool.id
  generate_secret = false
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
}

resource "aws_cognito_user_group" "admins" {
  name         = "Admins"
  user_pool_id = aws_cognito_user_pool.pool.id
  description  = "Grupo para administradores del bufete"
}

# ---------------------------------------------------------
# DYNAMODB TABLES (PAY_PER_REQUEST = Nivel Gratuito de AWS)
# ---------------------------------------------------------
resource "aws_dynamodb_table" "appointments" {
  name           = "Appointments"
  billing_mode   = "PAY_PER_REQUEST" # Solo pagas por uso (muy barato/gratis)
  hash_key       = "appointment_id"
  
  attribute {
    name = "appointment_id"
    type = "S"
  }
  
  global_secondary_index {
    name               = "DateIndex"
    hash_key           = "date"
    projection_type    = "ALL"
  }

  attribute {
    name = "date"
    type = "S"
  }
}

resource "aws_dynamodb_table" "availability_blocks" {
  name           = "AvailabilityBlocks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "block_id"
  
  attribute {
    name = "block_id"
    type = "S"
  }
  
  global_secondary_index {
    name               = "DateIndex"
    hash_key           = "date"
    projection_type    = "ALL"
  }

  attribute {
    name = "date"
    type = "S"
  }
}

resource "aws_dynamodb_table" "blog_posts" {
  name         = "BlogPosts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "post_id"

  attribute {
    name = "post_id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "probono_requests" {
  name         = "ProBonoRequests"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "request_id"

  attribute {
    name = "request_id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "chat_leads" {
  name         = "ChatLeads"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "lead_id"

  attribute {
    name = "lead_id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "chat_sessions" {
  name         = "ChatSessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_id"

  attribute {
    name = "session_id"
    type = "S"
  }
}

# ---------------------------------------------------------
# LAMBDA FUNCTION (1M requests gratis/mes)
# ---------------------------------------------------------
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_api"
  output_path = "${path.module}/lambda_function.zip"
}

resource "aws_iam_role" "lambda_exec" {
  name = "serverless_lambda_exec_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "lambda_dynamodb_policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Effect   = "Allow"
        Resource = [
          aws_dynamodb_table.appointments.arn,
          "${aws_dynamodb_table.appointments.arn}/index/*",
          aws_dynamodb_table.availability_blocks.arn,
          "${aws_dynamodb_table.availability_blocks.arn}/index/*",
          aws_dynamodb_table.blog_posts.arn,
          aws_dynamodb_table.probono_requests.arn,
          aws_dynamodb_table.chat_leads.arn,
          aws_dynamodb_table.chat_sessions.arn
        ]
      },
      {
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "sns:Publish"
        ]
        Effect   = "Allow"
        Resource = aws_sns_topic.lead_alerts.arn
      },
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_lambda_function" "api_handler" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "jhoselyn_web_api"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "python3.11" # Updated to 3.11 for better support
  timeout          = 30 # Aumentar timeout para llamadas de inferencia LLM

  environment {
    variables = {
      APPOINTMENTS_TABLE = aws_dynamodb_table.appointments.name
      BLOCKS_TABLE       = aws_dynamodb_table.availability_blocks.name
      BLOG_TABLE         = aws_dynamodb_table.blog_posts.name
      PROBONO_TABLE      = aws_dynamodb_table.probono_requests.name
      LEADS_TABLE        = aws_dynamodb_table.chat_leads.name
      SESSIONS_TABLE     = aws_dynamodb_table.chat_sessions.name
      BEDROCK_MODEL_ID   = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
      MAX_CHAT_TURNS     = "6"
      SNS_TOPIC_ARN      = aws_sns_topic.lead_alerts.arn
    }
  }
}

# ---------------------------------------------------------
# SNS TOPIC PARA NOTIFICACIONES DE LEADS (CANAL POR SUSCRIBIR)
# ---------------------------------------------------------
resource "aws_sns_topic" "lead_alerts" {
  name = "jhoselyn_lead_alerts"
}

# ---------------------------------------------------------
# API GATEWAY (HTTP API)
# ---------------------------------------------------------
resource "aws_apigatewayv2_api" "http_api" {
  name          = "jhoselyn_web_http_api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    allow_headers = ["content-type", "authorization"]
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id             = aws_apigatewayv2_api.http_api.id
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.api_handler.invoke_arn
}

resource "aws_apigatewayv2_route" "any_api" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /api/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

# ---------------------------------------------------------
# OUTPUTS
# ---------------------------------------------------------
output "api_endpoint" {
  value = aws_apigatewayv2_api.http_api.api_endpoint
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.pool.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.client.id
}
