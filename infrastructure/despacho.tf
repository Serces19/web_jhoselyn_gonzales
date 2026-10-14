resource "aws_dynamodb_table" "despacho" {
  count        = var.despacho_enabled ? 1 : 0
  name         = "${var.resource_prefix}DespachoCore"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"
  attribute {
    name = "pk"
    type = "S"
  }
  attribute {
    name = "sk"
    type = "S"
  }
  attribute {
    name = "gsi1pk"
    type = "S"
  }
  attribute {
    name = "gsi1sk"
    type = "S"
  }
  attribute {
    name = "gsi2pk"
    type = "S"
  }
  attribute {
    name = "gsi2sk"
    type = "S"
  }
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "KEYS_ONLY"
  }
  global_secondary_index {
    name            = "GSI2"
    hash_key        = "gsi2pk"
    range_key       = "gsi2sk"
    projection_type = "KEYS_ONLY"
  }
  stream_enabled   = true
  stream_view_type = "NEW_IMAGE"
  point_in_time_recovery { enabled = true }
  deletion_protection_enabled = true
}

data "archive_file" "despacho" {
  count       = var.despacho_enabled ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/despacho_function.zip"
  source {
    content  = file("${path.module}/lambda_api/security.py")
    filename = "security.py"
  }
  source {
    content  = file("${path.module}/lambda_api/contracts.py")
    filename = "contracts.py"
  }
  dynamic "source" {
    for_each = fileset("${path.module}/lambda_despacho", "*.py")
    content {
      content  = file("${path.module}/lambda_despacho/${source.value}")
      filename = source.value
    }
  }
}

resource "aws_iam_role" "despacho" {
  for_each           = var.despacho_enabled ? toset(["api", "worker"]) : toset([])
  name               = "${var.resource_prefix}jhoselyn-despacho-${each.key}"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "lambda.amazonaws.com" } }] })
}
resource "aws_iam_role_policy" "despacho" {
  for_each = aws_iam_role.despacho
  name     = "private-core"
  role     = each.value.id
  policy = jsonencode({ Version = "2012-10-17", Statement = concat([
    { Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:ConditionCheckItem"], Resource = [aws_dynamodb_table.despacho[0].arn, "${aws_dynamodb_table.despacho[0].arn}/index/*"] },
    { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "arn:aws:logs:us-east-1:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.resource_prefix}jhoselyn-despacho-*:log-stream:*" }
    ], [for statement in [
      { Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:ConditionCheckItem"], Resource = aws_dynamodb_table.appointments.arn }
      ] : statement if each.key == "api"], [for statement in [
      { Effect = "Allow", Action = ["dynamodb:DescribeStream", "dynamodb:GetRecords", "dynamodb:GetShardIterator", "dynamodb:ListStreams"], Resource = aws_dynamodb_table.despacho[0].stream_arn },
      { Effect = "Allow", Action = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"], Resource = [aws_sqs_queue.despacho_jobs[0].arn, aws_sqs_queue.despacho_dlq[0].arn, aws_sqs_queue.despacho_stream_failures[0].arn] }
  ] : statement if each.key == "worker"]) })
}
resource "aws_sqs_queue" "despacho_dlq" {
  count                     = var.despacho_enabled ? 1 : 0
  name                      = "${var.resource_prefix}jhoselyn-despacho-dlq.fifo"
  fifo_queue                = true
  sqs_managed_sse_enabled   = true
  message_retention_seconds = 1209600
}
resource "aws_sqs_queue" "despacho_jobs" {
  count                      = var.despacho_enabled ? 1 : 0
  name                       = "${var.resource_prefix}jhoselyn-despacho-jobs.fifo"
  fifo_queue                 = true
  sqs_managed_sse_enabled    = true
  visibility_timeout_seconds = 180
  redrive_policy             = jsonencode({ deadLetterTargetArn = aws_sqs_queue.despacho_dlq[0].arn, maxReceiveCount = 5 })
}
resource "aws_sqs_queue" "despacho_stream_failures" {
  count                     = var.despacho_enabled ? 1 : 0
  name                      = "${var.resource_prefix}jhoselyn-despacho-stream-failures"
  sqs_managed_sse_enabled   = true
  message_retention_seconds = 1209600
}
locals {
  despacho_handlers      = { api = "despacho_handler.lambda_handler", relay = "worker.relay", worker = "worker.consume", reconcile = "worker.reconcile" }
  despacho_pilot_enabled = false
  despacho_environment   = var.resource_prefix == "" ? "production" : "staging"
}
output "despacho_review_mode" {
  value = var.despacho_enabled ? { environment = local.despacho_environment, pilot_enabled = local.despacho_pilot_enabled } : null
}
resource "aws_cloudwatch_log_group" "despacho" {
  for_each          = var.despacho_enabled ? local.despacho_handlers : {}
  name              = "/aws/lambda/${var.resource_prefix}jhoselyn-despacho-${each.key}"
  retention_in_days = 30
}
resource "aws_lambda_function" "despacho" {
  for_each         = var.despacho_enabled ? local.despacho_handlers : {}
  function_name    = "${var.resource_prefix}jhoselyn-despacho-${each.key}"
  role             = aws_iam_role.despacho[each.key == "api" ? "api" : "worker"].arn
  filename         = data.archive_file.despacho[0].output_path
  source_code_hash = data.archive_file.despacho[0].output_base64sha256
  handler          = each.value
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256
  environment {
    variables = {
      CORE_TABLE         = aws_dynamodb_table.despacho[0].name
      APPOINTMENTS_TABLE = aws_dynamodb_table.appointments.name
      JOBS_QUEUE_URL     = aws_sqs_queue.despacho_jobs[0].url
      COGNITO_ISSUER     = "https://cognito-idp.us-east-1.amazonaws.com/${aws_cognito_user_pool.pool.id}"
      COGNITO_CLIENT_ID  = aws_cognito_user_pool_client.client.id
      ENVIRONMENT        = local.despacho_environment
      PILOT_ENABLED      = tostring(local.despacho_pilot_enabled)
    }
  }
  depends_on = [aws_cloudwatch_log_group.despacho, aws_iam_role_policy.despacho]
}
resource "aws_apigatewayv2_integration" "despacho" {
  count                  = var.despacho_enabled ? 1 : 0
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.despacho["api"].invoke_arn
  payload_format_version = "2.0"
}
resource "aws_apigatewayv2_route" "despacho" {
  count                = var.despacho_enabled ? 1 : 0
  api_id               = aws_apigatewayv2_api.http_api.id
  route_key            = "ANY /api/admin/despacho/{proxy+}"
  target               = "integrations/${aws_apigatewayv2_integration.despacho[0].id}"
  authorization_type   = "JWT"
  authorizer_id        = aws_apigatewayv2_authorizer.admin.id
  authorization_scopes = ["aws.cognito.signin.user.admin"]
}
resource "aws_apigatewayv2_route" "despacho_options" {
  count              = var.despacho_enabled ? 1 : 0
  api_id             = aws_apigatewayv2_api.http_api.id
  route_key          = "OPTIONS /api/admin/despacho/{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.despacho[0].id}"
  authorization_type = "NONE"
}
resource "aws_lambda_permission" "despacho" {
  count         = var.despacho_enabled ? 1 : 0
  statement_id  = "PrivateGatewayOnly"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.despacho["api"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*/api/admin/despacho/*"
}
resource "aws_lambda_event_source_mapping" "despacho_stream" {
  count                          = var.despacho_enabled ? 1 : 0
  event_source_arn               = aws_dynamodb_table.despacho[0].stream_arn
  function_name                  = aws_lambda_function.despacho["relay"].arn
  starting_position              = "TRIM_HORIZON"
  batch_size                     = 100
  maximum_retry_attempts         = 3
  maximum_record_age_in_seconds  = 3600
  bisect_batch_on_function_error = true
  function_response_types        = ["ReportBatchItemFailures"]
  filter_criteria {
    filter { pattern = jsonencode({ eventName = ["INSERT"], dynamodb = { NewImage = { entity_type = { S = ["OUTBOX"] } } } }) }
  }
  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.despacho_stream_failures[0].arn
    }
  }
}
resource "aws_lambda_event_source_mapping" "despacho_jobs" {
  count                   = var.despacho_enabled ? 1 : 0
  event_source_arn        = aws_sqs_queue.despacho_jobs[0].arn
  function_name           = aws_lambda_function.despacho["worker"].arn
  batch_size              = 10
  function_response_types = ["ReportBatchItemFailures"]
}
resource "aws_cloudwatch_event_rule" "despacho_reconcile" {
  count               = var.despacho_enabled ? 1 : 0
  name                = "${var.resource_prefix}jhoselyn-despacho-reconcile"
  schedule_expression = "rate(1 hour)"
}
resource "aws_cloudwatch_event_target" "despacho_reconcile" {
  count = var.despacho_enabled ? 1 : 0
  rule  = aws_cloudwatch_event_rule.despacho_reconcile[0].name
  arn   = aws_lambda_function.despacho["reconcile"].arn
}
resource "aws_lambda_permission" "despacho_reconcile" {
  count         = var.despacho_enabled ? 1 : 0
  statement_id  = "ReconcileSchedule"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.despacho["reconcile"].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.despacho_reconcile[0].arn
}

resource "aws_cloudwatch_metric_alarm" "despacho_dlq" {
  for_each            = var.despacho_enabled ? toset(["jobs", "stream"]) : toset([])
  alarm_name          = "${var.resource_prefix}jhoselyn-despacho-${each.key}-dlq"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  dimensions          = { QueueName = each.key == "jobs" ? aws_sqs_queue.despacho_dlq[0].name : aws_sqs_queue.despacho_stream_failures[0].name }
  alarm_actions       = [aws_sns_topic.lead_alerts.arn]
}
