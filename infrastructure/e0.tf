resource "aws_dynamodb_table" "operation_control" {
  name         = "${var.resource_prefix}OperationControl"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  attribute {
    name = "pk"
    type = "S"
  }
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }
  point_in_time_recovery { enabled = true }
  deletion_protection_enabled = true
}
resource "aws_dynamodb_table" "booking_slots" {
  name         = "${var.resource_prefix}BookingSlots"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "slot_id"
  attribute {
    name = "slot_id"
    type = "S"
  }
  point_in_time_recovery { enabled = true }
  deletion_protection_enabled = true
}
resource "aws_apigatewayv2_authorizer" "admin" {
  api_id           = aws_apigatewayv2_api.http_api.id
  name             = "${var.resource_prefix}admin-cognito-jwt"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  jwt_configuration {
    issuer   = "https://cognito-idp.us-east-1.amazonaws.com/${aws_cognito_user_pool.pool.id}"
    audience = [aws_cognito_user_pool_client.client.id]
  }
}
resource "aws_apigatewayv2_route" "public" {
  for_each           = local.public_routes
  api_id             = aws_apigatewayv2_api.http_api.id
  route_key          = each.value
  authorization_type = "NONE"
  target             = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}
resource "aws_apigatewayv2_route" "admin" {
  api_id               = aws_apigatewayv2_api.http_api.id
  route_key            = "ANY /api/admin/{proxy+}"
  authorization_type   = "JWT"
  authorizer_id        = aws_apigatewayv2_authorizer.admin.id
  authorization_scopes = ["aws.cognito.signin.user.admin"]
  target               = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${aws_lambda_function.api_handler.function_name}"
  retention_in_days = 30
}
resource "aws_cloudwatch_log_group" "gateway" {
  name              = "/aws/apigateway/${var.resource_prefix}jhoselyn-web"
  retention_in_days = 30
}
resource "aws_sns_topic_subscription" "alerts_email" {
  for_each  = local.alert_recipients
  topic_arn = aws_sns_topic.lead_alerts.arn
  protocol  = "email"
  endpoint  = each.value
}
resource "aws_cloudwatch_metric_alarm" "api_errors" {
  alarm_name          = "${var.resource_prefix}jhoselyn-api-errors"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 3
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  dimensions          = { FunctionName = aws_lambda_function.api_handler.function_name }
  alarm_actions       = [aws_sns_topic.lead_alerts.arn]
}

data "aws_caller_identity" "current" {}
