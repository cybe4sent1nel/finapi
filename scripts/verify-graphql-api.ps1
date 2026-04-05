$ErrorActionPreference = 'Stop'

function Q($endpoint, $query, $headers = $null) {
  return Invoke-RestMethod -Uri $endpoint -Method Post -ContentType 'application/json' -Headers $headers -Body (@{ query = $query } | ConvertTo-Json -Depth 12)
}

$endpoint = 'http://localhost:4000/graphql'
$checks = @()

try {
  $adminLogin = (Q $endpoint 'mutation { login(email: "fahad.khan@demo.local", password: "Admin@123") { token user { role } } }').data.login
  $viewerLogin = (Q $endpoint 'mutation { login(email: "viewer@demo.local", password: "Viewer@123") { token user { role } } }').data.login

  $adminHeaders = @{ Authorization = "Bearer $($adminLogin.token)" }
  $viewerHeaders = @{ Authorization = "Bearer $($viewerLogin.token)" }

  $me = (Q $endpoint 'query { me { id name role status } }' $adminHeaders).data.me
  $users = (Q $endpoint 'query { users { id } }' $adminHeaders).data.users
  $records = (Q $endpoint 'query { records(filter: { limit: 10, offset: 0 }) { id } }' $adminHeaders).data.records
  $dash = (Q $endpoint 'query { dashboardSummary(startDate: "2026-03-01", endDate: "2026-12-31") { totalIncome totalExpense netBalance } }' $adminHeaders).data.dashboardSummary

  $createRecord = (Q $endpoint 'mutation { createRecord(input: { amount: 11.5, type: EXPENSE, category: "Verify", date: "2026-04-05", notes: "tmp" }) { id } }' $adminHeaders).data.createRecord
  $recordId = $createRecord.id

  $updateRecordQuery = 'mutation { updateRecord(id: "__ID__", input: { category: "Verify2" }) { id category } }'.Replace('__ID__', $recordId)
  $updateRecord = (Q $endpoint $updateRecordQuery $adminHeaders).data.updateRecord

  $deleteRecordQuery = 'mutation { deleteRecord(id: "__ID__") }'.Replace('__ID__', $recordId)
  $deleteRecord = (Q $endpoint $deleteRecordQuery $adminHeaders).data.deleteRecord

  $tempEmail = 'verify.' + [Guid]::NewGuid().ToString('N').Substring(0, 8) + '@demo.local'
  $createUserQuery = 'mutation { createUser(input: { name: "Temp", email: "__EMAIL__", password: "StrongPass@123", role: VIEWER, status: ACTIVE }) { id role } }'.Replace('__EMAIL__', $tempEmail)
  $createUser = (Q $endpoint $createUserQuery $adminHeaders).data.createUser
  $userId = $createUser.id

  $updateUserQuery = 'mutation { updateUser(id: "__ID__", input: { role: ANALYST }) { id role } }'.Replace('__ID__', $userId)
  $updateUser = (Q $endpoint $updateUserQuery $adminHeaders).data.updateUser

  $setStatusQuery = 'mutation { setUserStatus(id: "__ID__", status: INACTIVE) { id status } }'.Replace('__ID__', $userId)
  $setStatus = (Q $endpoint $setStatusQuery $adminHeaders).data.setUserStatus

  $forbidden = (Q $endpoint 'mutation { createRecord(input: { amount: 9, type: EXPENSE, category: "Denied", date: "2026-04-05", notes: "x" }) { id } }' $viewerHeaders)

  $checks += [PSCustomObject]@{ check = 'login admin'; pass = ($adminLogin.user.role -eq 'ADMIN') }
  $checks += [PSCustomObject]@{ check = 'login viewer'; pass = ($viewerLogin.user.role -eq 'VIEWER') }
  $checks += [PSCustomObject]@{ check = 'query me'; pass = ($me.role -eq 'ADMIN') }
  $checks += [PSCustomObject]@{ check = 'query users'; pass = ($users.Count -ge 1) }
  $checks += [PSCustomObject]@{ check = 'query records'; pass = ($records.Count -ge 1) }
  $checks += [PSCustomObject]@{ check = 'query dashboardSummary'; pass = ($null -ne $dash.totalIncome) }
  $checks += [PSCustomObject]@{ check = 'mutation createRecord'; pass = ($null -ne $recordId) }
  $checks += [PSCustomObject]@{ check = 'mutation updateRecord'; pass = ($updateRecord.category -eq 'Verify2') }
  $checks += [PSCustomObject]@{ check = 'mutation deleteRecord'; pass = ($deleteRecord -eq $true) }
  $checks += [PSCustomObject]@{ check = 'mutation createUser'; pass = ($createUser.role -eq 'VIEWER') }
  $checks += [PSCustomObject]@{ check = 'mutation updateUser'; pass = ($updateUser.role -eq 'ANALYST') }
  $checks += [PSCustomObject]@{ check = 'mutation setUserStatus'; pass = ($setStatus.status -eq 'INACTIVE') }
  $checks += [PSCustomObject]@{ check = 'rbac viewer blocked'; pass = ($forbidden.errors[0].code -eq 'FORBIDDEN') }

  $checks | Format-Table -AutoSize | Out-String

  if ($checks.pass -contains $false) {
    exit 1
  }
}
catch {
  Write-Host "Verification failed: $($_.Exception.Message)"
  exit 1
}
