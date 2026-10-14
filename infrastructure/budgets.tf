resource "aws_sns_topic_policy" "alerts" {
  arn = aws_sns_topic.lead_alerts.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AccountOwner"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = ["SNS:GetTopicAttributes", "SNS:SetTopicAttributes", "SNS:AddPermission", "SNS:RemovePermission", "SNS:DeleteTopic", "SNS:Subscribe", "SNS:ListSubscriptionsByTopic", "SNS:Publish"]
        Resource  = aws_sns_topic.lead_alerts.arn
      },
      {
        Sid       = "ProjectBudgetNotifications"
        Effect    = "Allow"
        Principal = { Service = "budgets.amazonaws.com" }
        Action    = "SNS:Publish"
        Resource  = aws_sns_topic.lead_alerts.arn
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
          ArnLike      = { "aws:SourceArn" = "arn:aws:budgets::${data.aws_caller_identity.current.account_id}:budget/*" }
        }
      },
      {
        Sid       = "ProjectLambdaAlarm"
        Effect    = "Allow"
        Principal = { Service = "cloudwatch.amazonaws.com" }
        Action    = "SNS:Publish"
        Resource  = aws_sns_topic.lead_alerts.arn
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
          ArnEquals    = { "aws:SourceArn" = aws_cloudwatch_metric_alarm.api_errors.arn }
        }
      }
    ]
  })
}

resource "aws_budgets_budget" "project" {
  count        = var.monthly_budget_usd == null ? 0 : 1
  name         = "${var.resource_prefix}jhoselyn-despacho-mensual"
  budget_type  = "COST"
  time_unit    = "MONTHLY"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  cost_filter {
    name   = "TagKeyValue"
    values = ["Project$jhoselyn-despacho"]
  }
  cost_types {
    include_credit = false
    include_refund = false
    use_blended    = false
    use_amortized  = false
  }
  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.lead_alerts.arn]
  }
  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.lead_alerts.arn]
  }
  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_sns_topic_arns = [aws_sns_topic.lead_alerts.arn]
  }
  depends_on = [aws_sns_topic_policy.alerts]
  lifecycle {
    precondition {
      condition     = length(local.alert_recipients) > 0
      error_message = "Configura destinatarios reales en zz-alerts.private.auto.tfvars antes de planificar el presupuesto; no publicar sus direcciones en Git."
    }
  }
}
