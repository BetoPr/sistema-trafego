$vars = [ordered]@{
  "NEXT_PUBLIC_SUPABASE_URL"      = "https://nnswiakwjvoqwcjscbqq.supabase.co"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uc3dpYWt3anZvcXdjanNjYnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMzUzOTYsImV4cCI6MjA5NDgxMTM5Nn0.6tGaarDq-HnE0UZjWQ-WhBR314yIXosYdi2T8-EpSzk"
  "SUPABASE_SERVICE_ROLE_KEY"     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uc3dpYWt3anZvcXdjanNjYnFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNTM5NiwiZXhwIjoyMDk0ODExMzk2fQ.in9VoDr91O0XZdGdMseqxzHulkNHRSjyGzjwh9Y8LMU"
  "ENCRYPTION_KEY"                = "bb466465ded7ed6f51998f49fd53fef6bc6e1f0e4d01af50274ef695142e1c39"
  "OAUTH_STATE_SECRET"            = "bf886813bb014cc73301ffa5a17082631eba91a64f06a98e45fdb35912c15cf4"
  "NEXT_PUBLIC_APP_URL"           = "https://sistema-trafego.vercel.app"
  "META_API_VERSION"              = "v21.0"
}
foreach ($name in $vars.Keys) {
  $val = $vars[$name]
  & vercel env rm $name production --yes *>&1 | Out-Null
  & vercel env add $name production --value $val --force --yes *>&1 | Out-Null
  Write-Host "set $name (len $($val.Length))"
}
Write-Host ""
Write-Host "=== Validando ==="
$pull = [System.IO.Path]::GetTempFileName()
& vercel env pull --environment=production $pull *>&1 | Out-Null
foreach ($name in $vars.Keys) {
  $line = (Get-Content $pull | Where-Object { $_ -match "^$name=" })
  if ($line) {
    $v = $line.Substring($name.Length + 1).Replace([string][char]34, "")
    if ([string]::IsNullOrEmpty($v)) {
      Write-Host "$name : VAZIO (FAIL)"
    } else {
      Write-Host "$name : OK (len $($v.Length))"
    }
  } else {
    Write-Host "$name : AUSENTE"
  }
}
Remove-Item $pull -Force
