$path = "c:\Users\MI\OneDrive\Desktop\koduvellisahitholsv\design-studio.html"
$content = [System.IO.File]::ReadAllText($path)

$target = @"
                btn.innerHTML = originalTitle;
                btn.disabled = false;
            }

            // Copy (Ctrl+C)
"@

$replacement = @"
                btn.innerHTML = originalTitle;
                btn.disabled = false;

                if (failCount === 0) {
                    alert(`Poster successfully sent to all ${successCount} WhatsApp targets!`);
                } else {
                    alert(`Poster sending complete. Sent successfully: ${successCount}. Failed: ${failCount}.`);
                }
            });
        }

        // Load targets when the admin panel loads
        setTimeout(loadWhatsAppTargets, 2000);

        // --- Copy & Paste Logic ---
        let clipboardText = null;

        document.addEventListener('keydown', function (e) {
            // Ignore if user is typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            // Copy (Ctrl+C)
"@

# We need to handle CRLF vs LF differences
$targetLF = $target -replace "`r`n", "`n"
$targetCRLF = $target -replace "`r`n", "`r`n" -replace "`n", "`r`n" -replace "`r`r`n", "`r`n"

$replacementLF = $replacement -replace "`r`n", "`n"
$replacementCRLF = $replacement -replace "`r`n", "`r`n" -replace "`n", "`r`n" -replace "`r`r`n", "`r`n"

if ($content.Contains($targetLF)) {
    $content = $content.Replace($targetLF, $replacementLF)
    [System.IO.File]::WriteAllText($path, $content)
    Write-Host "SUCCESS: Replaced LF version."
} elseif ($content.Contains($targetCRLF)) {
    $content = $content.Replace($targetCRLF, $replacementCRLF)
    [System.IO.File]::WriteAllText($path, $content)
    Write-Host "SUCCESS: Replaced CRLF version."
} else {
    Write-Host "ERROR: Target not found."
    # Let's print the line containing Copy (Ctrl+C) to inspect it
    $lines = Get-Content -Path $path
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -like "*// Copy (Ctrl+C)*") {
            Write-Host "Line $i : '$($lines[$i])'"
            Write-Host "Line $($i-1) : '$($lines[$i-1])'"
            Write-Host "Line $($i-2) : '$($lines[$i-2])'"
            Write-Host "Line $($i-3) : '$($lines[$i-3])'"
        }
    }
}
