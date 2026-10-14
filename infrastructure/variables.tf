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
    condition     = var.ai_monthly_budget_microusd >= 0 && floor(var.ai_monthly_budget_microusd) == var.ai_monthly_budget_microusd
    error_message = "La cuota usa microUSD enteros no negativos."
  }
}
variable "ai_daily_budget_microusd" {
  type    = number
  default = 0
  validation {
    condition     = var.ai_daily_budget_microusd >= 0 && floor(var.ai_daily_budget_microusd) == var.ai_daily_budget_microusd
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
variable "despacho_enabled" {
  description = "E1 privado: habilitar primero en staging; producción permanece apagada hasta release revisado."
  type        = bool
  default     = false
}
variable "alerts_emails" {
  description = "Destinatarios confirmados. Cada nuevo correo debe aceptar la suscripción SNS."
  type        = set(string)
  default     = []
  validation {
    condition     = alltrue([for email in var.alerts_emails : can(regex("^[^ @]+@[^ @]+\\.[^ @]+$", email))])
    error_message = "Usa direcciones completas de correo."
  }
}
variable "monthly_budget_usd" {
  description = "Umbral de aviso mensual del proyecto; no es un límite de factura."
  type        = number
  default     = null
  validation {
    condition     = var.monthly_budget_usd == null ? true : var.monthly_budget_usd > 0
    error_message = "El presupuesto debe ser positivo."
  }
}

locals {
  alert_recipients = setunion(var.alerts_emails, var.alerts_email == null ? toset([]) : toset([var.alerts_email]))
  public_routes    = toset(["GET /api/availability", "GET /api/schedule", "GET /api/blog", "GET /api/blog/{slug}", "POST /api/appointments", "POST /api/chat", "POST /api/probono"])
}
