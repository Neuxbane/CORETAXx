// Tax sync helpers to keep tax records aligned with asset data
function syncTaxRecordsWithAssets() {
  const assets = storage.getAssets();
  const taxes = storage.getTaxes();
  let updated = false;

  taxes.forEach((tax) => {
    const asset = assets.find((a) => a.id === tax.assetId);
    if (asset && asset.taxAmount) {
      if (tax.amount !== asset.taxAmount) {
        tax.amount = Math.round(asset.taxAmount);
        tax.taxRate = asset.taxRate || 0;
        updated = true;
      }
    }
  });

  if (updated) {
    storage.setTaxes(taxes);
    console.log('Tax records synchronized with asset data');
  }

  return updated;
}

function getTaxRecordsWithAssetData() {
  const assets = storage.getAssets();
  const taxes = storage.getTaxes();

  return taxes.map((tax) => {
    const asset = assets.find((a) => a.id === tax.assetId);
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

window.taxSync = {
  syncTaxRecordsWithAssets,
  getTaxRecordsWithAssetData,
};
