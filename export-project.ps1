param(
    [string]$OutputFile = "project_export.txt"
)

$ErrorActionPreference = "Stop"

# =========================================================
# RWK project export configuration
# =========================================================

# Core files you almost always want included
$coreFiles = @(
    "index.html",
    "style.css",
    "app.js"
)

# Add any extra individual files here later if needed
$extraFiles = @(
    "README.md"
    "env.example"
    ".gitignore"
    "plan.txt"
)

# Add folder patterns here if you want to include more project files
# Example:
# "data\*.geojson"
# "*.sql"
$includePatterns = @(
     "data\*.geojson"
     "docs\*.md"
)

# Optional exclusions for pattern-based matches
$excludeFiles = @(
    $OutputFile,
    "project_export.txt"
)

# =========================================================
# Helper functions
# =========================================================

function Resolve-ProjectFiles {
    param(
        [string[]]$DirectFiles,
        [string[]]$Patterns,
        [string[]]$Exclude
    )

    $resolved = New-Object System.Collections.Generic.List[string]

    foreach ($file in $DirectFiles) {
        if ([string]::IsNullOrWhiteSpace($file)) {
            continue
        }

        if (Test-Path -LiteralPath $file) {
            $fullPath = (Resolve-Path -LiteralPath $file).Path
            if (-not $resolved.Contains($fullPath)) {
                $resolved.Add($fullPath)
            }
        }
        else {
            Write-Host "Skipping missing file: $file" -ForegroundColor Yellow
        }
    }

    foreach ($pattern in $Patterns) {
        if ([string]::IsNullOrWhiteSpace($pattern)) {
            continue
        }

        $matched = Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue | Sort-Object FullName

        foreach ($item in $matched) {
            if ($Exclude -contains $item.Name) {
                continue
            }

            if (-not $resolved.Contains($item.FullName)) {
                $resolved.Add($item.FullName)
            }
        }
    }

    return $resolved
}

function Get-RelativeProjectPath {
    param(
        [string]$BasePath,
        [string]$FullPath
    )

    $baseUri = New-Object System.Uri(($BasePath.TrimEnd('\') + '\'))
    $fileUri = New-Object System.Uri($FullPath)
    $relativeUri = $baseUri.MakeRelativeUri($fileUri)

    return [System.Uri]::UnescapeDataString($relativeUri.ToString()).Replace('/', '\')
}

# =========================================================
# Build export file list
# =========================================================

$projectRoot = (Get-Location).Path
$allRequestedFiles = @($coreFiles + $extraFiles)

$filesToExport = Resolve-ProjectFiles `
    -DirectFiles $allRequestedFiles `
    -Patterns $includePatterns `
    -Exclude $excludeFiles

# =========================================================
# Write output
# =========================================================

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$header = @(
    "RWK Project Export"
    "Generated: $timestamp"
    "Project Root: $projectRoot"
    "File Count: $($filesToExport.Count)"
    ""
    "============================================================"
    ""
)

Set-Content -LiteralPath $OutputFile -Value $header -Encoding UTF8

foreach ($filePath in $filesToExport) {
    $relativePath = Get-RelativeProjectPath -BasePath $projectRoot -FullPath $filePath

    Add-Content -LiteralPath $OutputFile -Value "===== $relativePath =====" -Encoding UTF8
    Add-Content -LiteralPath $OutputFile -Value "" -Encoding UTF8

    Get-Content -LiteralPath $filePath | Add-Content -LiteralPath $OutputFile -Encoding UTF8

    Add-Content -LiteralPath $OutputFile -Value "`r`n" -Encoding UTF8
}

Write-Host "Export complete: $OutputFile" -ForegroundColor Green
Write-Host "Files exported: $($filesToExport.Count)" -ForegroundColor Cyan