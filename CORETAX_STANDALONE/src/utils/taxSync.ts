// Utility to sync tax records with asset data
// This fixes any old tax records that have incorrect amounts

export function syncTaxRecordsWithAssets() {
  const assets = JSON.parse(localStorage.getItem('assets') || '[]');
  const taxes = JSON.parse(localStorage.getItem('taxes') || '[]');
  
  let updated = false;
  
  taxes.forEach((tax: any) => {
    // Find the corresponding asset
    const asset = assets.find((a: any) => a.id === tax.assetId);
    
    if (asset && asset.taxAmount) {
      // Update tax amount from asset if it's different
      if (tax.amount !== asset.taxAmount) {
        tax.amount = Math.round(asset.taxAmount);
        tax.taxRate = asset.taxRate || 0;
        updated = true;
      }
    }
  });
  
  if (updated) {
    localStorage.setItem('taxes', JSON.stringify(taxes));
    console.log('Tax records synchronized with asset data');
  }
  
  return updated;
}

// Get accurate tax data for display
export function getTaxRecordsWithAssetData() {
  const assets = JSON.parse(localStorage.getItem('assets') || '[]');
  const taxes = JSON.parse(localStorage.getItem('taxes') || '[]');
  
  return taxes.map((tax: any) => {
    const asset = assets.find((a: any) => a.id === tax.assetId);
    
    if (asset && asset.taxAmount) {
      return {
        ...tax,
        amount: Math.round(asset.taxAmount),
        taxRate: asset.taxRate || 0,
      };
    }
    
    return tax;
  });
}
