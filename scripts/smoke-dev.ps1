param(
  [string]$API_BASE_URL = $env:API_BASE_URL,
  [string]$PUBLIC_RAFFLE_SLUG = $env:PUBLIC_RAFFLE_SLUG
)

if ([string]::IsNullOrWhiteSpace($API_BASE_URL)) { throw 'API_BASE_URL is required, for example https://api-raffle-dev.example.com' }
$base = $API_BASE_URL.TrimEnd('/')
foreach ($path in @('/health', '/ready')) {
  $response = Invoke-WebRequest -Uri "$base$path" -UseBasicParsing
  if ($response.StatusCode -ne 200) { throw "$path returned $($response.StatusCode)" }
  Write-Host "OK $path"
}
Write-Host 'Health/readiness smoke checks passed.'
if ([string]::IsNullOrWhiteSpace($PUBLIC_RAFFLE_SLUG)) { Write-Warning 'PUBLIC_RAFFLE_SLUG was not provided; public live-state check was skipped.'; exit 0 }
$live = Invoke-WebRequest -Uri "$base/api/v1/public/raffles/$PUBLIC_RAFFLE_SLUG/live-state" -UseBasicParsing
if ($live.StatusCode -ne 200) { throw "/api/v1/public/raffles/$PUBLIC_RAFFLE_SLUG/live-state returned $($live.StatusCode)" }
Write-Host "OK /api/v1/public/raffles/$PUBLIC_RAFFLE_SLUG/live-state"
