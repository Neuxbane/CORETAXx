// Tax Calculation Utility for PWD System
// Based on Indonesian Regional Tax Structure (simplified for demonstration)

interface TaxCalculationResult {
  baseRate: number;
  modifiers: { name: string; rate: number }[];
  totalRate: number;
  taxAmount: number;
  breakdown: string[];
}

// Base tax rates by asset type (in percentage)
const BASE_TAX_RATES = {
  // Aset Lancar (Current Assets)
  KAS_BANK: 0,
  PIUTANG_USAHA: 0.1,
  PIUTANG_LAINNYA: 0.1,
  PERSEDIAAN: 0.5,
  DEPOSITO_JANGKA_PENDEK: 0.15,
  INVESTASI_LANCAR: 0.2,

  // Aset Semi Lancar
  INVESTASI_JANGKA_MENENGAH: 0.3,
  SERTIFIKAT_DEPOSITO: 0.15,
  PIUTANG_JANGKA_MENENGAH: 0.15,

  // Aset Tidak Lancar
  TANAH: 0.3,
  BANGUNAN: 0.4,
  KENDARAAN: 1.5,
  MESIN_PERALATAN: 0.8,
  PERABOT_KANTOR: 0.5,
  ASET_TAK_BERWUJUD: 0.3,
  INVESTASI_JANGKA_PANJANG: 0.25,
};

// Modifiers based on specific conditions
const TAX_MODIFIERS = {
  // Land certificate types
  certificateType: {
    SHM: 0.1, // Sertifikat Hak Milik
    SHGB: 0.08, // Sertifikat Hak Guna Bangunan
    SHGU: 0.06, // Sertifikat Hak Guna Usaha
    SHP: 0.05, // Sertifikat Hak Pakai
    GIRIK: 0.03, // Girik/Letter C
    AKTA_JUAL_BELI: 0.04,
  },

  // Land types
  landType: {
    PERUMAHAN: 0.05,
    KOMERSIAL: 0.15,
    INDUSTRI: 0.12,
    PERTANIAN: 0.02,
    PERKEBUNAN: 0.03,
    KOSONG: 0.04,
  },

  // Building types
  buildingType: {
    RUMAH_TINGGAL: 0.05,
    RUKO: 0.12,
    KANTOR: 0.1,
    PABRIK: 0.13,
    GUDANG: 0.08,
    APARTEMEN: 0.07,
  },

  // Building structure material
  structureMaterial: {
    BETON_BERTULANG: 0.05,
    BATA_RINGAN: 0.03,
    KAYU: 0.01,
    SEMI_PERMANEN: 0.02,
  },

  // Vehicle types
  vehicleType: {
    MOBIL_PRIBADI: 0.3,
    MOBIL_PENUMPANG: 0.3,
    MOBIL_NIAGA: 0.4,
    SEPEDA_MOTOR: -0.3, // Lower tax for motorcycles
    TRUCK: 0.5,
    BUS: 0.45,
  },

  // Vehicle fuel type
  fuelType: {
    BENSIN: 0.05,
    DIESEL: 0.07,
    LISTRIK: -0.1, // Incentive for electric vehicles
    HYBRID: -0.05,
  },

  // Vehicle engine type
  engineType: {
    'DIBAWAH_1500CC': -0.1,
    '1500_2000CC': 0,
    '2000_3000CC': 0.1,
    'DIATAS_3000CC': 0.2,
  },

  // Ownership status
  ownershipStatus: {
    MILIK_SENDIRI: 0,
    SEWA: -0.5, // Lower tax for leased assets
    HIBAH: -0.2,
    WARISAN: -0.1,
    KREDIT: 0.05,
  },

  // Investment types
  investmentType: {
    SAHAM: 0.1,
    OBLIGASI: 0.05,
    REKSA_DANA: 0.08,
    DEPOSITO: 0.03,
    PROPERTI: 0.15,
    LOGAM_MULIA: 0.07,
  },

  // Inventory categories
  inventoryCategory: {
    BAHAN_BAKU: 0.1,
    BARANG_DALAM_PROSES: 0.15,
    BARANG_JADI: 0.2,
    BARANG_DAGANGAN: 0.18,
  },

  // Receivable status
  receivableStatus: {
    LANCAR: 0,
    KURANG_LANCAR: 0.05,
    DIRAGUKAN: 0.1,
    MACET: 0.15,
  },

  // Intangible asset types
  intangibleAssetType: {
    HAK_PATEN: 0.1,
    HAK_CIPTA: 0.08,
    MEREK_DAGANG: 0.12,
    FRANCHISE: 0.15,
    GOODWILL: 0.05,
    SOFTWARE: 0.1,
  },
};

export function calculateAssetTax(formData: any): TaxCalculationResult {
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
  const modifiers: { name: string; rate: number }[] = [];
  const breakdown: string[] = [];

  // Determine base rate based on asset type
  if (formData.assetType === 'LANCAR' && formData.currentAssetType) {
    baseRate = BASE_TAX_RATES[formData.currentAssetType as keyof typeof BASE_TAX_RATES] || 0;
    breakdown.push(`Tarif dasar ${formData.currentAssetType.replace(/_/g, ' ')}: ${baseRate}%`);
  } else if (formData.assetType === 'SEMI_LANCAR' && formData.semiCurrentAssetType) {
    baseRate = BASE_TAX_RATES[formData.semiCurrentAssetType as keyof typeof BASE_TAX_RATES] || 0;
    breakdown.push(`Tarif dasar ${formData.semiCurrentAssetType.replace(/_/g, ' ')}: ${baseRate}%`);
  } else if (formData.assetType === 'TIDAK_LANCAR' && formData.nonCurrentAssetType) {
    baseRate = BASE_TAX_RATES[formData.nonCurrentAssetType as keyof typeof BASE_TAX_RATES] || 0;
    breakdown.push(`Tarif dasar ${formData.nonCurrentAssetType.replace(/_/g, ' ')}: ${baseRate}%`);
  }

  // Apply modifiers based on specific fields
  
  // Land-specific modifiers
  if (formData.nonCurrentAssetType === 'TANAH') {
    if (formData.certificateType && TAX_MODIFIERS.certificateType[formData.certificateType as keyof typeof TAX_MODIFIERS.certificateType]) {
      const modifier = TAX_MODIFIERS.certificateType[formData.certificateType as keyof typeof TAX_MODIFIERS.certificateType];
      modifiers.push({ name: `Jenis Sertifikat (${formData.certificateType})`, rate: modifier });
      breakdown.push(`+ Jenis Sertifikat: ${modifier}%`);
    }
    
    if (formData.landType && TAX_MODIFIERS.landType[formData.landType as keyof typeof TAX_MODIFIERS.landType]) {
      const modifier = TAX_MODIFIERS.landType[formData.landType as keyof typeof TAX_MODIFIERS.landType];
      modifiers.push({ name: `Tipe Tanah (${formData.landType})`, rate: modifier });
      breakdown.push(`+ Tipe Tanah: ${modifier}%`);
    }
  }

  // Building-specific modifiers
  if (formData.nonCurrentAssetType === 'BANGUNAN') {
    if (formData.buildingType && TAX_MODIFIERS.buildingType[formData.buildingType as keyof typeof TAX_MODIFIERS.buildingType]) {
      const modifier = TAX_MODIFIERS.buildingType[formData.buildingType as keyof typeof TAX_MODIFIERS.buildingType];
      modifiers.push({ name: `Tipe Bangunan (${formData.buildingType})`, rate: modifier });
      breakdown.push(`+ Tipe Bangunan: ${modifier}%`);
    }
    
    if (formData.structureMaterial && TAX_MODIFIERS.structureMaterial[formData.structureMaterial as keyof typeof TAX_MODIFIERS.structureMaterial]) {
      const modifier = TAX_MODIFIERS.structureMaterial[formData.structureMaterial as keyof typeof TAX_MODIFIERS.structureMaterial];
      modifiers.push({ name: `Material Struktur (${formData.structureMaterial})`, rate: modifier });
      breakdown.push(`+ Material Struktur: ${modifier}%`);
    }
  }

  // Vehicle-specific modifiers
  if (formData.nonCurrentAssetType === 'KENDARAAN') {
    if (formData.vehicleType && TAX_MODIFIERS.vehicleType[formData.vehicleType as keyof typeof TAX_MODIFIERS.vehicleType]) {
      const modifier = TAX_MODIFIERS.vehicleType[formData.vehicleType as keyof typeof TAX_MODIFIERS.vehicleType];
      modifiers.push({ name: `Jenis Kendaraan (${formData.vehicleType})`, rate: modifier });
      breakdown.push(`+ Jenis Kendaraan: ${modifier}%`);
    }
    
    if (formData.fuelType && TAX_MODIFIERS.fuelType[formData.fuelType as keyof typeof TAX_MODIFIERS.fuelType]) {
      const modifier = TAX_MODIFIERS.fuelType[formData.fuelType as keyof typeof TAX_MODIFIERS.fuelType];
      modifiers.push({ name: `Jenis BBM (${formData.fuelType})`, rate: modifier });
      breakdown.push(`+ Jenis BBM: ${modifier}%`);
    }
    
    if (formData.engineType && TAX_MODIFIERS.engineType[formData.engineType as keyof typeof TAX_MODIFIERS.engineType]) {
      const modifier = TAX_MODIFIERS.engineType[formData.engineType as keyof typeof TAX_MODIFIERS.engineType];
      modifiers.push({ name: `Kapasitas Mesin (${formData.engineType})`, rate: modifier });
      breakdown.push(`+ Kapasitas Mesin: ${modifier}%`);
    }
  }

  // Investment modifiers
  if (formData.investmentType && TAX_MODIFIERS.investmentType[formData.investmentType as keyof typeof TAX_MODIFIERS.investmentType]) {
    const modifier = TAX_MODIFIERS.investmentType[formData.investmentType as keyof typeof TAX_MODIFIERS.investmentType];
    modifiers.push({ name: `Jenis Investasi (${formData.investmentType})`, rate: modifier });
    breakdown.push(`+ Jenis Investasi: ${modifier}%`);
  }

  // Inventory modifiers
  if (formData.inventoryCategory && TAX_MODIFIERS.inventoryCategory[formData.inventoryCategory as keyof typeof TAX_MODIFIERS.inventoryCategory]) {
    const modifier = TAX_MODIFIERS.inventoryCategory[formData.inventoryCategory as keyof typeof TAX_MODIFIERS.inventoryCategory];
    modifiers.push({ name: `Kategori Persediaan (${formData.inventoryCategory})`, rate: modifier });
    breakdown.push(`+ Kategori Persediaan: ${modifier}%`);
  }

  // Receivable status modifiers
  if (formData.receivableStatus && TAX_MODIFIERS.receivableStatus[formData.receivableStatus as keyof typeof TAX_MODIFIERS.receivableStatus]) {
    const modifier = TAX_MODIFIERS.receivableStatus[formData.receivableStatus as keyof typeof TAX_MODIFIERS.receivableStatus];
    modifiers.push({ name: `Status Piutang (${formData.receivableStatus})`, rate: modifier });
    breakdown.push(`+ Status Piutang: ${modifier}%`);
  }

  // Intangible asset modifiers
  if (formData.intangibleAssetType && TAX_MODIFIERS.intangibleAssetType[formData.intangibleAssetType as keyof typeof TAX_MODIFIERS.intangibleAssetType]) {
    const modifier = TAX_MODIFIERS.intangibleAssetType[formData.intangibleAssetType as keyof typeof TAX_MODIFIERS.intangibleAssetType];
    modifiers.push({ name: `Jenis Aset Tak Berwujud (${formData.intangibleAssetType})`, rate: modifier });
    breakdown.push(`+ Jenis Aset Tak Berwujud: ${modifier}%`);
  }

  // Ownership status modifier (applies to all assets)
  if (formData.ownershipStatus && TAX_MODIFIERS.ownershipStatus[formData.ownershipStatus as keyof typeof TAX_MODIFIERS.ownershipStatus]) {
    const modifier = TAX_MODIFIERS.ownershipStatus[formData.ownershipStatus as keyof typeof TAX_MODIFIERS.ownershipStatus];
    modifiers.push({ name: `Status Kepemilikan (${formData.ownershipStatus})`, rate: modifier });
    breakdown.push(`+ Status Kepemilikan: ${modifier}%`);
  }

  // Calculate total rate
  const modifierSum = modifiers.reduce((sum, mod) => sum + mod.rate, 0);
  const totalRate = Math.max(0, baseRate + modifierSum); // Ensure non-negative

  // Calculate tax amount
  const taxAmount = (acquisitionValue * totalRate) / 100;

  breakdown.push(`\nTotal Tarif Pajak: ${totalRate.toFixed(2)}%`);
  breakdown.push(`Nilai Perolehan: Rp ${acquisitionValue.toLocaleString('id-ID')}`);
  breakdown.push(`Pajak Terutang: Rp ${taxAmount.toLocaleString('id-ID')}`);

  return {
    baseRate,
    modifiers,
    totalRate,
    taxAmount,
    breakdown,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}
