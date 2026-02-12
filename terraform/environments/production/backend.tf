terraform {
  backend "s3" {
    bucket = "open-inspect-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"

    # R2-specific settings
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    use_path_style              = true

    # These will be provided via -backend-config flags
    # access_key = ""
    # secret_key = ""
    # endpoints = { s3 = "..." }
  }
}
