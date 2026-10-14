variable "allowed_origins" {
  type    = list(string)
  default = ["https://main.d2caobufsyec5z.amplifyapp.com"]
  validation {
    condition     = length(var.allowed_origins) > 0 && !contains(var.allowed_origins, "*")
    error_message = "Define dominios HTTPS reales; no se permite wildcard."
  }
}
variable "resource_prefix" {
  type    = string
  default = ""
  validation {
    condition     = var.resource_prefix == "" || can(regex("^staging-[a-z0-9-]+-$", var.resource_prefix))
    error_message = "Producción usa prefijo vacío; staging usa staging-<nombre>-."
  }
}
variable "admin_mfa_mode" {
  type    = string
  default = "OPTIONAL"
  validation {
    condition     = contains(["OPTIONAL", "ON"], var.admin_mfa_mode)
    error_message = "Usa OPTIONAL durante enrollment y ON tras prueba de recuperación."
  }
}
variable "booking_ready" {
  type    = bool
  default = false
}
variable "chat_ai_enabled" {
  type    = bool
  default = false
}
variable "ai_monthly_budget_microusd" {
  type    = number
  default = 0
  validation {
    condition = var.ai_monthly_budget_microusd >= 0 && floor(var.ai_monthly_budget_microusd) == var.ai_monthly_budget_microusd
    error_message = "La cuota usa microUSD enteros no negativos."
  }
}
variable "ai_daily_budget_microusd" {
  type    = number
  default = 0
  validation {
    condition = var.ai_daily_budget_microusd >= 0 && floor(var.ai_daily_budget_microusd) == var.ai_daily_budget_microusd
    error_message = "La cuota usa microUSD enteros no negativos."
  }
}
variable "ai_input_usd_per_million" {
  type    = number
  default = 0
}
variable "ai_output_usd_per_million" {
  type    = number
  default = 0
}
variable "alerts_email" {
  type    = string
  default = null
}

locals {
  public_routes = toset(["GET /api/availability", "GET /api/schedule", "GET /api/blog", "GET /api/blog/{slug}", "POST /api/appointments", "POST /api/chat", "POST /api/probono"])
}
