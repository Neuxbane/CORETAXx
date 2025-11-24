<?php
/**
 * Tax Calculation Utility
 * Based on Indonesian Regional Tax Structure
 */

/**
 * Base tax rates by asset type (in percentage)
 */
function getBaseTaxRate($assetType) {
    $rates = [
        // Current Assets
        'KAS_BANK' => 0,
        'PIUTANG_USAHA' => 0.1,
        'PIUTANG_LAINNYA' => 0.1,
        'PERSEDIAAN' => 0.5,
        'DEPOSITO_JANGKA_PENDEK' => 0.15,
        'INVESTASI_LANCAR' => 0.2,
        
        // Medium-term Assets
        'INVESTASI_JANGKA_MENENGAH' => 0.3,
        'SERTIFIKAT_DEPOSITO' => 0.15,
        'PIUTANG_JANGKA_MENENGAH' => 0.15,
        
        // Non-current Assets
        'TANAH' => 0.3,
        'BANGUNAN' => 0.4,
        'KENDARAAN' => 1.5,
        'MESIN_PERALATAN' => 0.8,
        'PERABOT_KANTOR' => 0.5,
        'ASET_TAK_BERWUJUD' => 0.3,
        'INVESTASI_JANGKA_PANJANG' => 0.25,
    ];
    
    return $rates[$assetType] ?? 0;
}

/**
 * Calculate tax for an asset
 */
function calculateAssetTax($asset) {
    $baseRate = getBaseTaxRate($asset['type'] ?? 'KENDARAAN');
    $value = $asset['value'] ?? $asset['acquisitionValue'] ?? 0;
    
    $modifiers = 0;
    
    // Apply modifiers based on asset specifics
    if ($asset['type'] === 'KENDARAAN') {
        // Vehicle tax modifiers
        if (isset($asset['fuelType'])) {
            $fuelModifiers = [
                'BENSIN' => 0.05,
                'DIESEL' => 0.07,
                'LISTRIK' => -0.1,
                'HYBRID' => -0.05,
            ];
            $modifiers += $fuelModifiers[$asset['fuelType']] ?? 0;
        }
    } elseif ($asset['type'] === 'BANGUNAN' || $asset['type'] === 'TANAH') {
        // Real estate tax modifiers
        if (isset($asset['certificateType'])) {
            $certModifiers = [
                'SHM' => 0.1,
                'SHGB' => 0.08,
                'SHGU' => 0.06,
                'SHP' => 0.05,
                'GIRIK' => 0.03,
                'AKTA_JUAL_BELI' => 0.04,
            ];
            $modifiers += $certModifiers[$asset['certificateType']] ?? 0;
        }
    }
    
    $totalRate = max(0, $baseRate + $modifiers);
    $taxAmount = ($value * $totalRate) / 100;
    
    return [
        'baseRate' => $baseRate,
        'totalRate' => $totalRate,
        'taxAmount' => $taxAmount,
        'modifiers' => $modifiers
    ];
}

/**
 * Sync tax records with assets
 */
function syncTaxRecordsWithAssets() {
    $assets = readJson(ASSETS_FILE);
    $taxes = readJson(TAXES_FILE);
    
    // Create tax records for assets without one
    foreach ($assets as $asset) {
        $hasTax = false;
        foreach ($taxes as $tax) {
            if ($tax['assetId'] === $asset['id']) {
                $hasTax = true;
                break;
            }
        }
        
        if (!$hasTax) {
            $taxCalculation = calculateAssetTax($asset);
            $dueDate = date('Y-m-d', strtotime('+1 year'));
            
            $tax = [
                'id' => 'tax-' . substr(bin2hex(random_bytes(8)), 0, 12),
                'userId' => $asset['userId'],
                'assetId' => $asset['id'],
                'assetName' => $asset['name'],
                'amount' => $taxCalculation['taxAmount'],
                'rate' => $taxCalculation['totalRate'],
                'dueDate' => $dueDate,
                'status' => 'unpaid',
                'createdAt' => date(DATE_ATOM),
            ];
            
            $taxes[] = $tax;
        }
    }
    
    writeJson(TAXES_FILE, $taxes);
}
