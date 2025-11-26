// Tax calculation logic (ported from CORETAX_STANDALONE)

const BASE_TAX_RATES = {
  KAS_BANK: 0,
  PIUTANG_USAHA: 0.1,
  PIUTANG_LAINNYA: 0.1,
  PERSEDIAAN: 0.5,
  DEPOSITO_JANGKA_PENDEK: 0.15,
  INVESTASI_LANCAR: 0.2,

  INVESTASI_JANGKA_MENENGAH: 0.3,
  SERTIFIKAT_DEPOSITO: 0.15,
  PIUTANG_JANGKA_MENENGAH: 0.15,

  TANAH: 0.3,
  BANGUNAN: 0.4,
  KENDARAAN: 1.5,
  MESIN_PERALATAN: 0.8,
  PERABOT_KANTOR: 0.5,
  ASET_TAK_BERWUJUD: 0.3,
  INVESTASI_JANGKA_PANJANG: 0.25,
};

const TAX_MODIFIERS = {
  certificateType: {
    SHM: 0.1,
    SHGB: 0.08,
    SHGU: 0.06,
    SHP: 0.05,
    GIRIK: 0.03,
    AKTA_JUAL_BELI: 0.04,
  },
  landType: {
    PERUMAHAN: 0.05,
    KOMERSIAL: 0.15,
    INDUSTRI: 0.12,
    PERTANIAN: 0.02,
    PERKEBUNAN: 0.03,
    KOSONG: 0.04,
  },
  buildingType: {
    RUMAH_TINGGAL: 0.05,
    RUKO: 0.12,
    KANTOR: 0.1,
    PABRIK: 0.13,
    GUDANG: 0.08,
    APARTEMEN: 0.07,
  },
  structureMaterial: {
    BETON_BERTULANG: 0.05,
    BATA_RINGAN: 0.03,
    KAYU: 0.01,
    SEMI_PERMANEN: 0.02,
  },
  vehicleType: {
    MOBIL_PRIBADI: 0.3,
    MOBIL_PENUMPANG: 0.3,
    MOBIL_NIAGA: 0.4,
    SEPEDA_MOTOR: -0.3,
    TRUCK: 0.5,
    BUS: 0.45,
  },
  fuelType: {
    BENSIN: 0.05,
    DIESEL: 0.07,
    LISTRIK: -0.1,
    HYBRID: -0.05,
  },
  engineType: {
    DIBAWAH_1500CC: -0.1,
    '1500_2000CC': 0,
    '2000_3000CC': 0.1,
    DIATAS_3000CC: 0.2,
  },
  ownershipStatus: {
    MILIK_SENDIRI: 0,
    SEWA: -0.5,
    HIBAH: -0.2,
    WARISAN: -0.1,
    KREDIT: 0.05,
  },
  investmentType: {
    SAHAM: 0.1,
    OBLIGASI: 0.05,
    REKSA_DANA: 0.08,
    DEPOSITO: 0.03,
    PROPERTI: 0.15,
    LOGAM_MULIA: 0.07,
  },
  inventoryCategory: {
    BAHAN_BAKU: 0.1,
    BARANG_DALAM_PROSES: 0.15,
    BARANG_JADI: 0.2,
    BARANG_DAGANGAN: 0.18,
  },
  receivableStatus: {
    LANCAR: 0,
    KURANG_LANCAR: 0.05,
    DIRAGUKAN: 0.1,
    MACET: 0.15,
  },
  intangibleAssetType: {
    HAK_PATEN: 0.1,
    HAK_CIPTA: 0.08,
    MEREK_DAGANG: 0.12,
    FRANCHISE: 0.15,
    GOODWILL: 0.05,
    SOFTWARE: 0.1,
  },
};

function calculateAssetTax(formData) {
  const acquisitionValue = parseFloat(formData.acquisitionValue) || 0;

  if (acquisitionValue === 0) {
    return {
      baseRate: 0,
      modifiers: [],
      totalRate: 0,
      taxAmount: 0,
      breakdown: ['Nilai perolehan belum diisi'],
    };
  }

  let baseRate = 0;
  const modifiers = [];
  const breakdown = [];

  if (formData.assetType === 'LANCAR' && formData.currentAssetType) {
    baseRate = BASE_TAX_RATES[formData.currentAssetType] || 0;
    breakdown.push('Tarif dasar ' + formData.currentAssetType.replace(/_/g, ' ') + ': ' + baseRate + '%');
  } else if (formData.assetType === 'SEMI_LANCAR' && formData.semiCurrentAssetType) {
    baseRate = BASE_TAX_RATES[formData.semiCurrentAssetType] || 0;
    breakdown.push('Tarif dasar ' + formData.semiCurrentAssetType.replace(/_/g, ' ') + ': ' + baseRate + '%');
  } else if (formData.assetType === 'TIDAK_LANCAR' && formData.nonCurrentAssetType) {
    baseRate = BASE_TAX_RATES[formData.nonCurrentAssetType] || 0;
    breakdown.push('Tarif dasar ' + formData.nonCurrentAssetType.replace(/_/g, ' ') + ': ' + baseRate + '%');
  }

  if (formData.nonCurrentAssetType === 'TANAH') {
    if (formData.certificateType && TAX_MODIFIERS.certificateType[formData.certificateType]) {
      const modifier = TAX_MODIFIERS.certificateType[formData.certificateType];
      modifiers.push({ name: 'Jenis Sertifikat (' + formData.certificateType + ')', rate: modifier });
      breakdown.push('+ Jenis Sertifikat: ' + modifier + '%');
    }
    if (formData.landType && TAX_MODIFIERS.landType[formData.landType]) {
      const modifier = TAX_MODIFIERS.landType[formData.landType];
      modifiers.push({ name: 'Tipe Tanah (' + formData.landType + ')', rate: modifier });
      breakdown.push('+ Tipe Tanah: ' + modifier + '%');
    }
  }

  if (formData.nonCurrentAssetType === 'BANGUNAN') {
    if (formData.buildingType && TAX_MODIFIERS.buildingType[formData.buildingType]) {
      const modifier = TAX_MODIFIERS.buildingType[formData.buildingType];
      modifiers.push({ name: 'Tipe Bangunan (' + formData.buildingType + ')', rate: modifier });
      breakdown.push('+ Tipe Bangunan: ' + modifier + '%');
    }
    if (formData.structureMaterial && TAX_MODIFIERS.structureMaterial[formData.structureMaterial]) {
      const modifier = TAX_MODIFIERS.structureMaterial[formData.structureMaterial];
      modifiers.push({ name: 'Material Struktur (' + formData.structureMaterial + ')', rate: modifier });
      breakdown.push('+ Material Struktur: ' + modifier + '%');
    }
  }

  if (formData.nonCurrentAssetType === 'KENDARAAN') {
    if (formData.vehicleType && TAX_MODIFIERS.vehicleType[formData.vehicleType]) {
      const modifier = TAX_MODIFIERS.vehicleType[formData.vehicleType];
      modifiers.push({ name: 'Jenis Kendaraan (' + formData.vehicleType + ')', rate: modifier });
      breakdown.push('+ Jenis Kendaraan: ' + modifier + '%');
    }
    if (formData.fuelType && TAX_MODIFIERS.fuelType[formData.fuelType]) {
      const modifier = TAX_MODIFIERS.fuelType[formData.fuelType];
      modifiers.push({ name: 'Jenis BBM (' + formData.fuelType + ')', rate: modifier });
      breakdown.push('+ Jenis BBM: ' + modifier + '%');
    }
    if (formData.engineType && TAX_MODIFIERS.engineType[formData.engineType]) {
      const modifier = TAX_MODIFIERS.engineType[formData.engineType];
      modifiers.push({ name: 'Kapasitas Mesin (' + formData.engineType + ')', rate: modifier });
      breakdown.push('+ Kapasitas Mesin: ' + modifier + '%');
    }
  }

  if (formData.investmentType && TAX_MODIFIERS.investmentType[formData.investmentType]) {
    const modifier = TAX_MODIFIERS.investmentType[formData.investmentType];
    modifiers.push({ name: 'Jenis Investasi (' + formData.investmentType + ')', rate: modifier });
    breakdown.push('+ Jenis Investasi: ' + modifier + '%');
  }

  if (formData.inventoryCategory && TAX_MODIFIERS.inventoryCategory[formData.inventoryCategory]) {
    const modifier = TAX_MODIFIERS.inventoryCategory[formData.inventoryCategory];
    modifiers.push({ name: 'Kategori Persediaan (' + formData.inventoryCategory + ')', rate: modifier });
    breakdown.push('+ Kategori Persediaan: ' + modifier + '%');
  }

  if (formData.receivableStatus && TAX_MODIFIERS.receivableStatus[formData.receivableStatus]) {
    const modifier = TAX_MODIFIERS.receivableStatus[formData.receivableStatus];
    modifiers.push({ name: 'Status Piutang (' + formData.receivableStatus + ')', rate: modifier });
    breakdown.push('+ Status Piutang: ' + modifier + '%');
  }

  if (formData.intangibleAssetType && TAX_MODIFIERS.intangibleAssetType[formData.intangibleAssetType]) {
    const modifier = TAX_MODIFIERS.intangibleAssetType[formData.intangibleAssetType];
    modifiers.push({ name: 'Jenis Aset Tak Berwujud (' + formData.intangibleAssetType + ')', rate: modifier });
    breakdown.push('+ Jenis Aset Tak Berwujud: ' + modifier + '%');
  }

  if (formData.ownershipStatus && TAX_MODIFIERS.ownershipStatus[formData.ownershipStatus]) {
    const modifier = TAX_MODIFIERS.ownershipStatus[formData.ownershipStatus];
    modifiers.push({ name: 'Status Kepemilikan (' + formData.ownershipStatus + ')', rate: modifier });
    breakdown.push('+ Status Kepemilikan: ' + modifier + '%');
  }

  const modifierSum = modifiers.reduce((sum, mod) => sum + mod.rate, 0);
  const totalRate = Math.max(0, baseRate + modifierSum);
  const taxAmount = (acquisitionValue * totalRate) / 100;

  breakdown.push(' ');
  breakdown.push('Total Tarif Pajak: ' + totalRate.toFixed(2) + '%');
  breakdown.push('Nilai Perolehan: Rp ' + acquisitionValue.toLocaleString('id-ID'));
  breakdown.push('Pajak Terutang: Rp ' + taxAmount.toLocaleString('id-ID'));

  return {
    baseRate,
    modifiers,
    totalRate,
    taxAmount,
    breakdown,
  };
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

window.taxCalc = {
  calculateAssetTax,
  formatCurrency,
};
