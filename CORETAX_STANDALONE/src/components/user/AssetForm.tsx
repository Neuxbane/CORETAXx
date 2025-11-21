import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, MapPin, Loader, Upload, X, FileText, Calculator } from 'lucide-react';
import { calculateAssetTax, formatCurrency } from '../../utils/taxCalculation';
import { getCurrentLocation, saveUserLocation } from '../../utils/geolocation';

interface AssetFormProps {
  user: any;
  asset?: any;
  onClose: () => void;
}

// Asset Type Enums
const ASSET_TYPES = {
  LANCAR: 'LANCAR',
  SEMI_LANCAR: 'SEMI_LANCAR',
  TIDAK_LANCAR: 'TIDAK_LANCAR',
} as const;

const CURRENT_ASSET_TYPES = {
  KAS_BANK: 'KAS_BANK',
  PIUTANG_USAHA: 'PIUTANG_USAHA',
  PIUTANG_LAINNYA: 'PIUTANG_LAINNYA',
  PERSEDIAAN: 'PERSEDIAAN',
  DEPOSITO_JANGKA_PENDEK: 'DEPOSITO_JANGKA_PENDEK',
  INVESTASI_LANCAR: 'INVESTASI_LANCAR',
} as const;

const SEMI_CURRENT_ASSET_TYPES = {
  INVESTASI_JANGKA_MENENGAH: 'INVESTASI_JANGKA_MENENGAH',
  SERTIFIKAT_DEPOSITO: 'SERTIFIKAT_DEPOSITO',
  PIUTANG_JANGKA_MENENGAH: 'PIUTANG_JANGKA_MENENGAH',
} as const;

const NON_CURRENT_ASSET_TYPES = {
  TANAH: 'TANAH',
  BANGUNAN: 'BANGUNAN',
  KENDARAAN: 'KENDARAAN',
  MESIN_PERALATAN: 'MESIN_PERALATAN',
  PERABOT_KANTOR: 'PERABOT_KANTOR',
  ASET_TAK_BERWUJUD: 'ASET_TAK_BERWUJUD',
  INVESTASI_JANGKA_PANJANG: 'INVESTASI_JANGKA_PANJANG',
} as const;

export function AssetForm({ user, asset, onClose }: AssetFormProps) {
  const [formData, setFormData] = useState({
    // Basic Fields
    assetType: asset?.assetType || '',
    assetName: asset?.assetName || '',
    registrationNumber: asset?.registrationNumber || '',
    acquisitionValue: asset?.acquisitionValue || '',
    acquisitionDate: asset?.acquisitionDate || '',
    description: asset?.description || '',
    
    // Documents and Photos
    attachments: asset?.attachments || [], // PDF documents
    photos: asset?.photos || [], // Image files
    
    // Specific Asset Type
    currentAssetType: asset?.currentAssetType || '',
    semiCurrentAssetType: asset?.semiCurrentAssetType || '',
    nonCurrentAssetType: asset?.nonCurrentAssetType || '',
    
    // Kas & Bank
    cashBankType: asset?.cashBankType || '',
    bankName: asset?.bankName || '',
    accountNumber: asset?.accountNumber || '',
    currency: asset?.currency || 'IDR',
    
    // Piutang Usaha
    debtorName: asset?.debtorName || '',
    invoiceNumber: asset?.invoiceNumber || '',
    dueDate: asset?.dueDate || '',
    receivableStatus: asset?.receivableStatus || '',
    
    // Persediaan
    inventoryCategory: asset?.inventoryCategory || '',
    itemCode: asset?.itemCode || '',
    quantity: asset?.quantity || '',
    unit: asset?.unit || '',
    
    // Investasi
    investmentType: asset?.investmentType || '',
    issuer: asset?.issuer || '',
    contractNumber: asset?.contractNumber || '',
    maturityDate: asset?.maturityDate || '',
    couponOrExpectedReturn: asset?.couponOrExpectedReturn || '',
    interestRate: asset?.interestRate || '',
    earlyRedemptionPenalty: asset?.earlyRedemptionPenalty || false,
    
    // Tanah
    landType: asset?.landType || '',
    fullAddress: asset?.fullAddress || '',
    landArea: asset?.landArea || '',
    ownershipStatus: asset?.ownershipStatus || '',
    certificateType: asset?.certificateType || '',
    certificateNumber: asset?.certificateNumber || '',
    latitude: asset?.latitude || null,
    longitude: asset?.longitude || null,
    
    // Bangunan
    buildingType: asset?.buildingType || '',
    buildingArea: asset?.buildingArea || '',
    floors: asset?.floors || '',
    yearBuilt: asset?.yearBuilt || '',
    lastRenovationYear: asset?.lastRenovationYear || '',
    structureMaterial: asset?.structureMaterial || '',
    roofMaterial: asset?.roofMaterial || '',
    wallMaterial: asset?.wallMaterial || '',
    buildingFunction: asset?.buildingFunction || '',
    roomCount: asset?.roomCount || '',
    
    // Kendaraan
    vehicleType: asset?.vehicleType || '',
    brand: asset?.brand || '',
    model: asset?.model || '',
    licensePlate: asset?.licensePlate || '',
    chassisNumber: asset?.chassisNumber || '',
    engineNumber: asset?.engineNumber || '',
    yearManufactured: asset?.yearManufactured || '',
    bpkbNumber: asset?.bpkbNumber || '',
    stnkNumber: asset?.stnkNumber || '',
    stnkExpiryDate: asset?.stnkExpiryDate || '',
    engineCapacity: asset?.engineCapacity || '',
    fuelType: asset?.fuelType || '',
    
    // Mesin/Peralatan
    machineType: asset?.machineType || '',
    serialNumber: asset?.serialNumber || '',
    capacity: asset?.capacity || '',
    economicLifeYears: asset?.economicLifeYears || '',
    
    // Aset Tak Berwujud
    intangibleType: asset?.intangibleType || '',
    licensor: asset?.licensor || '',
    validFrom: asset?.validFrom || '',
    validTo: asset?.validTo || '',
    renewable: asset?.renewable || false,
    
    // Investasi Jangka Panjang
    longTermInvestmentType: asset?.longTermInvestmentType || '',
    investeeName: asset?.investeeName || '',
    ownershipPercentage: asset?.ownershipPercentage || '',
    investmentPurpose: asset?.investmentPurpose || '',
    
    photo: asset?.photo || null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [taxCalculation, setTaxCalculation] = useState<any>(null);

  // Calculate tax whenever relevant fields change
  useEffect(() => {
    const calculation = calculateAssetTax(formData);
    setTaxCalculation(calculation);
  }, [
    formData.assetType,
    formData.currentAssetType,
    formData.semiCurrentAssetType,
    formData.nonCurrentAssetType,
    formData.acquisitionValue,
    formData.certificateType,
    formData.landType,
    formData.buildingType,
    formData.structureMaterial,
    formData.vehicleType,
    formData.fuelType,
    formData.engineType,
    formData.ownershipStatus,
    formData.investmentType,
    formData.inventoryCategory,
    formData.receivableStatus,
    formData.intangibleAssetType,
  ]);

  const handleChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    
    // Reset conditional fields when parent field changes
    if (field === 'assetType') {
      newFormData.currentAssetType = '';
      newFormData.semiCurrentAssetType = '';
      newFormData.nonCurrentAssetType = '';
    }
    
    setFormData(newFormData);
    setErrors({ ...errors, [field]: '' });
  };

  const validateField = (field: string, value: any): string => {
    // Basic validation
    if (field === 'assetName') {
      if (!value || value.length < 3 || value.length > 100) {
        return 'Nama aset harus 3-100 karakter';
      }
      if (!/^[A-Za-z0-9.,()\-/\s]{3,100}$/.test(value)) {
        return 'Nama aset mengandung karakter tidak valid';
      }
    }
    
    if (field === 'acquisitionValue') {
      const numValue = Number(value);
      if (!value || numValue <= 0 || numValue > 9999999999999.99) {
        return 'Nilai aset tidak valid';
      }
    }
    
    if (field === 'acquisitionDate') {
      if (!value) return 'Tanggal perolehan harus diisi';
      const date = new Date(value);
      const year = date.getFullYear();
      if (year < 1900 || year > 2100) {
        return 'Tahun harus antara 1900-2100';
      }
    }
    
    // License Plate validation for Kendaraan
    if (field === 'licensePlate' && value) {
      if (!/^[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{1,3}$/i.test(value)) {
        return 'Format plat nomor tidak valid (contoh: B 1234 CD)';
      }
    }
    
    // Account Number validation
    if (field === 'accountNumber' && value) {
      if (!/^\d{6,30}$/.test(value)) {
        return 'Nomor rekening harus 6-30 digit';
      }
    }
    
    // Year validation
    if ((field === 'yearBuilt' || field === 'yearManufactured' || field === 'lastRenovationYear') && value) {
      const year = Number(value);
      if (year < 1900 || year > 2100) {
        return 'Tahun harus antara 1900-2100';
      }
    }
    
    return '';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.assetType) newErrors.assetType = 'Tipe aset harus dipilih';
    
    const assetNameError = validateField('assetName', formData.assetName);
    if (assetNameError) newErrors.assetName = assetNameError;
    
    const valueError = validateField('acquisitionValue', formData.acquisitionValue);
    if (valueError) newErrors.acquisitionValue = valueError;
    
    const dateError = validateField('acquisitionDate', formData.acquisitionDate);
    if (dateError) newErrors.acquisitionDate = dateError;

    // Conditional validations based on asset type
    if (formData.assetType === 'LANCAR') {
      if (!formData.currentAssetType) {
        newErrors.currentAssetType = 'Jenis aset lancar harus dipilih';
      }
      
      if (formData.currentAssetType === 'KAS_BANK') {
        if (!formData.cashBankType) newErrors.cashBankType = 'Jenis kas/bank harus dipilih';
        if (formData.cashBankType !== 'KAS_TUNAI') {
          if (!formData.bankName) newErrors.bankName = 'Nama bank harus diisi';
          if (!formData.accountNumber) {
            newErrors.accountNumber = 'Nomor rekening harus diisi';
          } else {
            const accError = validateField('accountNumber', formData.accountNumber);
            if (accError) newErrors.accountNumber = accError;
          }
        }
      }
      
      if (formData.currentAssetType === 'PIUTANG_USAHA') {
        if (!formData.debtorName) newErrors.debtorName = 'Nama debitur harus diisi';
        if (!formData.invoiceNumber) newErrors.invoiceNumber = 'Nomor invoice harus diisi';
        if (!formData.dueDate) newErrors.dueDate = 'Tanggal jatuh tempo harus diisi';
        if (!formData.receivableStatus) newErrors.receivableStatus = 'Status piutang harus dipilih';
      }
      
      if (formData.currentAssetType === 'PERSEDIAAN') {
        if (!formData.inventoryCategory) newErrors.inventoryCategory = 'Kategori harus dipilih';
        if (!formData.itemCode) newErrors.itemCode = 'Kode barang harus diisi';
        if (!formData.quantity || Number(formData.quantity) <= 0) {
          newErrors.quantity = 'Jumlah harus lebih dari 0';
        }
        if (!formData.unit) newErrors.unit = 'Satuan harus dipilih';
      }
    }
    
    if (formData.assetType === 'SEMI_LANCAR') {
      if (!formData.semiCurrentAssetType) {
        newErrors.semiCurrentAssetType = 'Jenis aset semi lancar harus dipilih';
      }
      
      if (formData.semiCurrentAssetType === 'INVESTASI_JANGKA_MENENGAH') {
        if (!formData.investmentType) newErrors.investmentType = 'Jenis investasi harus dipilih';
        if (!formData.issuer) newErrors.issuer = 'Penerbit harus diisi';
        if (!formData.maturityDate) newErrors.maturityDate = 'Tanggal jatuh tempo harus diisi';
      }
      
      if (formData.semiCurrentAssetType === 'SERTIFIKAT_DEPOSITO') {
        if (!formData.bankName) newErrors.bankName = 'Nama bank harus diisi';
        if (!formData.certificateNumber) newErrors.certificateNumber = 'Nomor sertifikat harus diisi';
        if (!formData.maturityDate) newErrors.maturityDate = 'Tanggal jatuh tempo harus diisi';
        if (!formData.interestRate) newErrors.interestRate = 'Suku bunga harus diisi';
      }
    }
    
    if (formData.assetType === 'TIDAK_LANCAR') {
      if (!formData.nonCurrentAssetType) {
        newErrors.nonCurrentAssetType = 'Jenis aset tidak lancar harus dipilih';
      }
      
      if (formData.nonCurrentAssetType === 'TANAH') {
        if (!formData.landType) newErrors.landType = 'Jenis tanah harus dipilih';
        if (!formData.fullAddress || formData.fullAddress.length < 5) {
          newErrors.fullAddress = 'Alamat lengkap harus diisi (min 5 karakter)';
        }
        if (!formData.landArea || Number(formData.landArea) <= 0) {
          newErrors.landArea = 'Luas tanah harus diisi';
        }
        if (!formData.ownershipStatus) newErrors.ownershipStatus = 'Status kepemilikan harus dipilih';
        if (!formData.certificateType) newErrors.certificateType = 'Jenis sertifikat harus dipilih';
        if (!formData.certificateNumber) newErrors.certificateNumber = 'Nomor sertifikat harus diisi';
      }
      
      if (formData.nonCurrentAssetType === 'BANGUNAN') {
        if (!formData.buildingType) newErrors.buildingType = 'Jenis bangunan harus dipilih';
        if (!formData.fullAddress || formData.fullAddress.length < 5) {
          newErrors.fullAddress = 'Alamat lengkap harus diisi (min 5 karakter)';
        }
        if (!formData.buildingArea || Number(formData.buildingArea) <= 0) {
          newErrors.buildingArea = 'Luas bangunan harus diisi';
        }
        if (!formData.floors || Number(formData.floors) < 1) {
          newErrors.floors = 'Jumlah lantai harus diisi';
        }
        if (!formData.yearBuilt) {
          newErrors.yearBuilt = 'Tahun dibangun harus diisi';
        } else {
          const yearError = validateField('yearBuilt', formData.yearBuilt);
          if (yearError) newErrors.yearBuilt = yearError;
        }
        if (formData.buildingType === 'HOTEL' && (!formData.roomCount || Number(formData.roomCount) < 1)) {
          newErrors.roomCount = 'Jumlah kamar harus diisi untuk hotel';
        }
      }
      
      if (formData.nonCurrentAssetType === 'KENDARAAN') {
        if (!formData.vehicleType) newErrors.vehicleType = 'Jenis kendaraan harus dipilih';
        if (!formData.brand) newErrors.brand = 'Merek harus diisi';
        if (!formData.model) newErrors.model = 'Model harus diisi';
        if (!formData.licensePlate) {
          newErrors.licensePlate = 'Nomor polisi harus diisi';
        } else {
          const plateError = validateField('licensePlate', formData.licensePlate);
          if (plateError) newErrors.licensePlate = plateError;
        }
        if (!formData.chassisNumber) newErrors.chassisNumber = 'Nomor rangka harus diisi';
        if (!formData.engineNumber) newErrors.engineNumber = 'Nomor mesin harus diisi';
        if (!formData.yearManufactured) {
          newErrors.yearManufactured = 'Tahun pembuatan harus diisi';
        }
        if (!formData.fuelType) newErrors.fuelType = 'Jenis bahan bakar harus dipilih';
        if (!formData.ownershipStatus) newErrors.ownershipStatus = 'Status kepemilikan harus dipilih';
      }
      
      if (formData.nonCurrentAssetType === 'MESIN_PERALATAN') {
        if (!formData.machineType) newErrors.machineType = 'Jenis mesin harus diisi';
        if (!formData.brand) newErrors.brand = 'Merek harus diisi';
        if (!formData.serialNumber) newErrors.serialNumber = 'Nomor seri harus diisi';
      }
      
      if (formData.nonCurrentAssetType === 'ASET_TAK_BERWUJUD') {
        if (!formData.intangibleType) newErrors.intangibleType = 'Jenis aset harus dipilih';
        if (!formData.registrationNumber) newErrors.registrationNumber = 'Nomor registrasi harus diisi';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation tidak didukung oleh browser Anda');
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGettingLocation(false);
      },
      (error) => {
        alert('Gagal mendapatkan lokasi: ' + error.message);
        setGettingLocation(false);
      }
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData({ ...formData, photo: null });
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        if (file.type === 'application/pdf') {
          const reader = new FileReader();
          reader.onloadend = () => {
            setFormData((prev) => ({
              ...prev,
              attachments: [
                ...prev.attachments,
                {
                  id: `att-${Date.now()}-${Math.random()}`,
                  name: file.name,
                  data: reader.result as string,
                  type: 'pdf',
                },
              ],
            }));
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const removeAttachment = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((att: any) => att.id !== id),
    }));
  };

  const handleGeneralPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setFormData((prev) => ({
              ...prev,
              photos: [
                ...prev.photos,
                {
                  id: `photo-${Date.now()}-${Math.random()}`,
                  name: file.name,
                  data: reader.result as string,
                  type: 'image',
                },
              ],
            }));
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const removeGeneralPhoto = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((photo: any) => photo.id !== id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    // Try to get location, but don't block form submission if it fails
    try {
      const location = await getCurrentLocation();
      saveUserLocation(user.id, location, 'form_submit');
    } catch (err) {
      // Location access denied - continue without tracking
    }

    setTimeout(() => {
      const allAssets = JSON.parse(localStorage.getItem('assets') || '[]');

      if (asset) {
        // Update existing asset
        const assetIndex = allAssets.findIndex((a: any) => a.id === asset.id);
        if (assetIndex !== -1) {
          allAssets[assetIndex] = {
            ...allAssets[assetIndex],
            ...formData,
            acquisitionValue: Number(formData.acquisitionValue),
            taxRate: taxCalculation?.totalRate || 0,
            taxAmount: taxCalculation?.taxAmount || 0,
            updatedAt: new Date().toISOString(),
          };
        }
      } else {
        // Create new asset
        const newAsset = {
          id: `asset-${Date.now()}`,
          userId: user.id,
          ...formData,
          acquisitionValue: Number(formData.acquisitionValue),
          taxRate: taxCalculation?.totalRate || 0,
          taxAmount: taxCalculation?.taxAmount || 0,
          createdAt: new Date().toISOString(),
        };
        allAssets.push(newAsset);

        // Create initial tax entry for the asset (if tax is applicable)
        if (taxCalculation && taxCalculation.taxAmount > 0) {
          const taxes = JSON.parse(localStorage.getItem('taxes') || '[]');
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + 1);

          const newTax = {
            id: `tax-${Date.now()}`,
            userId: user.id,
            assetId: newAsset.id,
            assetName: formData.assetName,
            taxNumber: `PJ-${Date.now()}`,
            amount: Math.round(taxCalculation.taxAmount),
            taxRate: taxCalculation.totalRate,
            dueDate: dueDate.toISOString().split('T')[0],
            status: 'unpaid',
            taxType: getTaxTypeName(formData),
            createdAt: new Date().toISOString(),
          };
          taxes.push(newTax);
          localStorage.setItem('taxes', JSON.stringify(taxes));
        }
      }

      localStorage.setItem('assets', JSON.stringify(allAssets));
      setLoading(false);
      onClose();
    }, 500);
  };

  const getTaxTypeName = (formData: any): string => {
    if (formData.nonCurrentAssetType === 'TANAH' || formData.nonCurrentAssetType === 'BANGUNAN') {
      return 'PBB (Pajak Bumi dan Bangunan)';
    } else if (formData.nonCurrentAssetType === 'KENDARAAN') {
      return 'PKB (Pajak Kendaraan Bermotor)';
    } else if (formData.currentAssetType || formData.semiCurrentAssetType) {
      return 'Pajak Aset Bergerak';
    }
    return 'Pajak Aset';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-gray-900">
            {asset ? 'Edit Aset' : 'Tambah Aset Baru'}
          </h1>
          <p className="text-gray-600">
            {asset ? 'Perbarui informasi aset' : 'Daftarkan aset baru Anda'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. ASSET TYPE SELECTION */}
          <div>
            <label className="block text-gray-700 mb-3">1. Tipe Aset *</label>
            <div className="grid grid-cols-1 gap-3">
              <label
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.assetType === 'LANCAR'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="assetType"
                  value="LANCAR"
                  checked={formData.assetType === 'LANCAR'}
                  onChange={(e) => handleChange('assetType', e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-gray-900">Aset Lancar</p>
                  <p className="text-gray-600">Aset yang dapat dengan cepat diubah menjadi uang tunai tanpa mengurangi nilainya secara signifikan</p>
                </div>
              </label>
              
              <label
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.assetType === 'SEMI_LANCAR'
                    ? 'border-yellow-600 bg-yellow-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="assetType"
                  value="SEMI_LANCAR"
                  checked={formData.assetType === 'SEMI_LANCAR'}
                  onChange={(e) => handleChange('assetType', e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-gray-900">Aset Semi Lancar</p>
                  <p className="text-gray-600">Aset yang likuiditasnya berada di antara aset lancar dan tidak lancar</p>
                </div>
              </label>
              
              <label
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.assetType === 'TIDAK_LANCAR'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="assetType"
                  value="TIDAK_LANCAR"
                  checked={formData.assetType === 'TIDAK_LANCAR'}
                  onChange={(e) => handleChange('assetType', e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-gray-900">Aset Tidak Lancar</p>
                  <p className="text-gray-600">Aset yang membutuhkan waktu lama untuk dicairkan menjadi uang tunai</p>
                </div>
              </label>
            </div>
            {errors.assetType && <p className="mt-2 text-red-600">{errors.assetType}</p>}
          </div>

          {/* Import and render conditional sections */}
          {formData.assetType && (
            <>
              {/* ASET LANCAR */}
              {formData.assetType === 'LANCAR' && (
                <AssetLancarFields
                  formData={formData}
                  errors={errors}
                  handleChange={handleChange}
                  validateField={validateField}
                />
              )}
              
              {/* ASET SEMI LANCAR */}
              {formData.assetType === 'SEMI_LANCAR' && (
                <AssetSemiLancarFields
                  formData={formData}
                  errors={errors}
                  handleChange={handleChange}
                />
              )}
              
              {/* ASET TIDAK LANCAR */}
              {formData.assetType === 'TIDAK_LANCAR' && (
                <AssetTidakLancarFields
                  formData={formData}
                  errors={errors}
                  handleChange={handleChange}
                  validateField={validateField}
                  getLocation={getLocation}
                  gettingLocation={gettingLocation}
                  handlePhotoUpload={handlePhotoUpload}
                  removePhoto={removePhoto}
                />
              )}
              
              {/* BASIC FIELDS (shown after asset type is selected) */}
              <BasicAssetFields
                formData={formData}
                errors={errors}
                handleChange={handleChange}
                handleAttachmentUpload={handleAttachmentUpload}
                removeAttachment={removeAttachment}
                handleGeneralPhotoUpload={handleGeneralPhotoUpload}
                removeGeneralPhoto={removeGeneralPhoto}
              />

              {/* TAX CALCULATION DISPLAY */}
              {taxCalculation && taxCalculation.totalRate > 0 && (
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    <h3 className="text-blue-900">Perhitungan Pajak Terutang</h3>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                      <span className="text-gray-700">Tarif Pajak Dasar:</span>
                      <span className="text-gray-900">{taxCalculation.baseRate.toFixed(2)}%</span>
                    </div>
                    
                    {taxCalculation.modifiers.length > 0 && (
                      <div className="space-y-1">
                        {taxCalculation.modifiers.map((mod: any, index: number) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{mod.name}:</span>
                            <span className={mod.rate >= 0 ? 'text-gray-700' : 'text-green-600'}>
                              {mod.rate >= 0 ? '+' : ''}{mod.rate.toFixed(2)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2 border-t-2 border-blue-200">
                      <span className="text-gray-900">Total Tarif Pajak:</span>
                      <span className="text-blue-600">{taxCalculation.totalRate.toFixed(2)}%</span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 mt-2 border-t-2 border-blue-300">
                      <span className="text-gray-900">Pajak Terutang:</span>
                      <span className="text-blue-600">{formatCurrency(taxCalculation.taxAmount)}</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 bg-white rounded p-2">
                    <p>💡 Perhitungan ini berdasarkan tarif pajak daerah yang berlaku. Pajak akan otomatis terdaftar dalam sistem.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Menyimpan...' : asset ? 'Perbarui Aset' : 'Simpan Aset'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                >
                  Batal
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

// Basic Asset Fields Component
function BasicAssetFields({ formData, errors, handleChange, handleAttachmentUpload, removeAttachment, handleGeneralPhotoUpload, removeGeneralPhoto }: any) {
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    // Convert from MM/DD/YYYY to YYYY-MM-DD for input[type="date"]
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-4 pt-4 border-t border-gray-200">
      <h3 className="text-gray-900">Informasi Dasar Aset</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Nama Aset *</label>
          <input
            type="text"
            value={formData.assetName}
            onChange={(e) => handleChange('assetName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.assetName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Contoh: Toyota Avanza 2020"
            maxLength={100}
          />
          {errors.assetName && <p className="mt-1 text-red-600">{errors.assetName}</p>}
          <p className="mt-1 text-gray-500">3-100 karakter, huruf, angka, dan simbol dasar</p>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">
            Nomor Registrasi/Sertifikat
            {(formData.nonCurrentAssetType === 'TANAH' || 
              formData.nonCurrentAssetType === 'BANGUNAN' || 
              formData.nonCurrentAssetType === 'KENDARAAN') && ' *'}
          </label>
          <input
            type="text"
            value={formData.registrationNumber}
            onChange={(e) => handleChange('registrationNumber', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.registrationNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="B 1234 XYZ / SHM No. 123/2023"
            maxLength={100}
          />
          {errors.registrationNumber && (
            <p className="mt-1 text-red-600">{errors.registrationNumber}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Nilai Aset (Rp) *</label>
          <input
            type="number"
            value={formData.acquisitionValue}
            onChange={(e) => handleChange('acquisitionValue', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.acquisitionValue ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
            min="0"
            step="0.01"
          />
          {errors.acquisitionValue && (
            <p className="mt-1 text-red-600">{errors.acquisitionValue}</p>
          )}
          <p className="mt-1 text-gray-500">Max: Rp 9.999.999.999.999,99</p>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Tanggal Perolehan *</label>
          <input
            type="date"
            value={formatDateForInput(formData.acquisitionDate)}
            onChange={(e) => handleChange('acquisitionDate', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.acquisitionDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.acquisitionDate && (
            <p className="mt-1 text-red-600">{errors.acquisitionDate}</p>
          )}
          <p className="mt-1 text-gray-500">Format: MM/DD/YYYY, Tahun 1900-2100</p>
        </div>
      </div>

      <div>
        <label className="block text-gray-700 mb-2">Lampiran (PDF)</label>
        <div className="space-y-3">
          <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
            <Upload className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-gray-600">Upload Lampiran PDF</span>
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleAttachmentUpload}
              className="hidden"
            />
          </label>

          {formData.attachments && formData.attachments.length > 0 && (
            <div className="space-y-2">
              {formData.attachments.map((attachment: any) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                      <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-gray-900">{attachment.name}</p>
                      <p className="text-gray-500 text-xs">PDF Document</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.id)}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-gray-700 mb-2">Foto (PNG/JPG/JPEG)</label>
        <div className="space-y-3">
          <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
            <Upload className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-gray-600">Upload Foto</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              multiple
              onChange={handleGeneralPhotoUpload}
              className="hidden"
            />
          </label>

          {formData.photos && formData.photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {formData.photos.map((photo: any) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.data}
                    alt={photo.name}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeGeneralPhoto(photo.id)}
                    className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <p className="mt-1 text-xs text-gray-600 truncate">{photo.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-gray-700 mb-2">Deskripsi / Catatan</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          maxLength={2000}
          placeholder="Catatan tambahan tentang aset (opsional)"
        />
        <p className="mt-1 text-gray-500">
          {formData.description.length}/2000 karakter
        </p>
      </div>
    </div>
  );
}

// Sub-components will be defined in separate files for cleaner code
// For now, let me create placeholder components that will be filled
function AssetLancarFields({ formData, errors, handleChange, validateField }: any) {
  return (
    <div className="space-y-4 pt-4 border-t border-gray-200">
      <h3 className="text-gray-900">2. Jenis Aset Lancar</h3>
      
      <div>
        <label className="block text-gray-700 mb-2">Pilih Jenis *</label>
        <select
          value={formData.currentAssetType}
          onChange={(e) => handleChange('currentAssetType', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.currentAssetType ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">-- Pilih Jenis Aset Lancar --</option>
          <option value="KAS_BANK">Kas & Bank</option>
          <option value="PIUTANG_USAHA">Piutang Usaha</option>
          <option value="PIUTANG_LAINNYA">Piutang Lainnya</option>
          <option value="PERSEDIAAN">Persediaan</option>
          <option value="DEPOSITO_JANGKA_PENDEK">Deposito Jangka Pendek</option>
          <option value="INVESTASI_LANCAR">Investasi Lancar</option>
        </select>
        {errors.currentAssetType && (
          <p className="mt-1 text-red-600">{errors.currentAssetType}</p>
        )}
      </div>

      {/* KAS & BANK */}
      {formData.currentAssetType === 'KAS_BANK' && (
        <KasBankFields formData={formData} errors={errors} handleChange={handleChange} validateField={validateField} />
      )}

      {/* PIUTANG USAHA */}
      {formData.currentAssetType === 'PIUTANG_USAHA' && (
        <PiutangUsahaFields formData={formData} errors={errors} handleChange={handleChange} />
      )}

      {/* PERSEDIAAN */}
      {formData.currentAssetType === 'PERSEDIAAN' && (
        <PersediaanFields formData={formData} errors={errors} handleChange={handleChange} />
      )}
    </div>
  );
}

function KasBankFields({ formData, errors, handleChange, validateField }: any) {
  return (
    <div className="pl-4 border-l-2 border-green-500 space-y-4">
      <h4 className="text-gray-800">Detail Kas & Bank</h4>
      
      <div>
        <label className="block text-gray-700 mb-2">Jenis Kas/Bank *</label>
        <select
          value={formData.cashBankType}
          onChange={(e) => handleChange('cashBankType', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.cashBankType ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">-- Pilih Jenis --</option>
          <option value="KAS_TUNAI">Kas Tunai</option>
          <option value="REKENING_GIRO">Rekening Giro</option>
          <option value="REKENING_TABUNGAN">Rekening Tabungan</option>
        </select>
        {errors.cashBankType && <p className="mt-1 text-red-600">{errors.cashBankType}</p>}
      </div>

      {formData.cashBankType && formData.cashBankType !== 'KAS_TUNAI' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Nama Bank *</label>
            <input
              type="text"
              value={formData.bankName}
              onChange={(e) => handleChange('bankName', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.bankName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Bank BCA / Bank Mandiri"
              maxLength={100}
            />
            {errors.bankName && <p className="mt-1 text-red-600">{errors.bankName}</p>}
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Nomor Rekening *</label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => handleChange('accountNumber', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.accountNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="1234567890"
              maxLength={30}
            />
            {errors.accountNumber && (
              <p className="mt-1 text-red-600">{errors.accountNumber}</p>
            )}
            <p className="mt-1 text-gray-500">6-30 digit angka</p>
          </div>
        </div>
      )}

      <div>
        <label className="block text-gray-700 mb-2">Mata Uang *</label>
        <select
          value={formData.currency}
          onChange={(e) => handleChange('currency', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="IDR">IDR - Rupiah</option>
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="SGD">SGD - Singapore Dollar</option>
        </select>
      </div>
    </div>
  );
}

function PiutangUsahaFields({ formData, errors, handleChange }: any) {
  return (
    <div className="pl-4 border-l-2 border-green-500 space-y-4">
      <h4 className="text-gray-800">Detail Piutang Usaha</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Nama Debitur *</label>
          <input
            type="text"
            value={formData.debtorName}
            onChange={(e) => handleChange('debtorName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.debtorName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="PT. Contoh Perusahaan"
            maxLength={100}
          />
          {errors.debtorName && <p className="mt-1 text-red-600">{errors.debtorName}</p>}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Nomor Invoice/Kontrak *</label>
          <input
            type="text"
            value={formData.invoiceNumber}
            onChange={(e) => handleChange('invoiceNumber', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.invoiceNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="INV/2024/001"
            maxLength={50}
          />
          {errors.invoiceNumber && (
            <p className="mt-1 text-red-600">{errors.invoiceNumber}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Tanggal Jatuh Tempo *</label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => handleChange('dueDate', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.dueDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.dueDate && <p className="mt-1 text-red-600">{errors.dueDate}</p>}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Status Piutang *</label>
          <select
            value={formData.receivableStatus}
            onChange={(e) => handleChange('receivableStatus', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.receivableStatus ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">-- Pilih Status --</option>
            <option value="BELUM_JATUH_TEMPO">Belum Jatuh Tempo</option>
            <option value="JATUH_TEMPO">Jatuh Tempo</option>
            <option value="MACET">Macet</option>
          </select>
          {errors.receivableStatus && (
            <p className="mt-1 text-red-600">{errors.receivableStatus}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PersediaanFields({ formData, errors, handleChange }: any) {
  return (
    <div className="pl-4 border-l-2 border-green-500 space-y-4">
      <h4 className="text-gray-800">Detail Persediaan</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Kategori Persediaan *</label>
          <select
            value={formData.inventoryCategory}
            onChange={(e) => handleChange('inventoryCategory', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.inventoryCategory ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">-- Pilih Kategori --</option>
            <option value="BAHAN_BAKU">Bahan Baku</option>
            <option value="BARANG_DALAM_PROSES">Barang Dalam Proses</option>
            <option value="BARANG_JADI">Barang Jadi</option>
            <option value="BARANG_DAGANG">Barang Dagang</option>
          </select>
          {errors.inventoryCategory && (
            <p className="mt-1 text-red-600">{errors.inventoryCategory}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Kode Barang</label>
          <input
            type="text"
            value={formData.itemCode}
            onChange={(e) => handleChange('itemCode', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.itemCode ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="SKU-001"
            maxLength={30}
          />
          {errors.itemCode && <p className="mt-1 text-red-600">{errors.itemCode}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Jumlah *</label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.quantity ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
            min="0"
            step="0.0001"
          />
          {errors.quantity && <p className="mt-1 text-red-600">{errors.quantity}</p>}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Satuan *</label>
          <select
            value={formData.unit}
            onChange={(e) => handleChange('unit', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.unit ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">-- Pilih Satuan --</option>
            <option value="PCS">PCS (Pieces)</option>
            <option value="KG">KG (Kilogram)</option>
            <option value="LITER">LITER</option>
            <option value="BOX">BOX</option>
            <option value="UNIT">UNIT</option>
            <option value="METER">METER</option>
          </select>
          {errors.unit && <p className="mt-1 text-red-600">{errors.unit}</p>}
        </div>
      </div>
    </div>
  );
}

// Continue in next file...
function AssetSemiLancarFields({ formData, errors, handleChange }: any) {
  return (
    <div className="space-y-4 pt-4 border-t border-gray-200">
      <h3 className="text-gray-900">2. Jenis Aset Semi Lancar</h3>
      
      <div>
        <label className="block text-gray-700 mb-2">Pilih Jenis *</label>
        <select
          value={formData.semiCurrentAssetType}
          onChange={(e) => handleChange('semiCurrentAssetType', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.semiCurrentAssetType ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">-- Pilih Jenis Aset Semi Lancar --</option>
          <option value="INVESTASI_JANGKA_MENENGAH">Investasi Jangka Menengah</option>
          <option value="SERTIFIKAT_DEPOSITO">Sertifikat Deposito</option>
          <option value="PIUTANG_JANGKA_MENENGAH">Piutang Jangka Menengah</option>
        </select>
        {errors.semiCurrentAssetType && (
          <p className="mt-1 text-red-600">{errors.semiCurrentAssetType}</p>
        )}
      </div>

      {formData.semiCurrentAssetType === 'INVESTASI_JANGKA_MENENGAH' && (
        <InvestasiJangkaMenengahFields formData={formData} errors={errors} handleChange={handleChange} />
      )}

      {formData.semiCurrentAssetType === 'SERTIFIKAT_DEPOSITO' && (
        <SertifikatDepositoFields formData={formData} errors={errors} handleChange={handleChange} />
      )}
    </div>
  );
}

function InvestasiJangkaMenengahFields({ formData, errors, handleChange }: any) {
  return (
    <div className="pl-4 border-l-2 border-yellow-500 space-y-4">
      <h4 className="text-gray-800">Detail Investasi Jangka Menengah</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Jenis Investasi *</label>
          <select
            value={formData.investmentType}
            onChange={(e) => handleChange('investmentType', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.investmentType ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">-- Pilih Jenis --</option>
            <option value="OBLIGASI">Obligasi</option>
            <option value="REKSADANA_PENDAPATAN_TETAP">Reksadana Pendapatan Tetap</option>
            <option value="DEPOSITO_BERJANGKA_1_3_TAHUN">Deposito Berjangka 1-3 Tahun</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
          {errors.investmentType && (
            <p className="mt-1 text-red-600">{errors.investmentType}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Penerbit / Manajer Investasi *</label>
          <input
            type="text"
            value={formData.issuer}
            onChange={(e) => handleChange('issuer', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.issuer ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="PT. Manajer Investasi"
            maxLength={100}
          />
          {errors.issuer && <p className="mt-1 text-red-600">{errors.issuer}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Nomor Kontrak</label>
          <input
            type="text"
            value={formData.contractNumber}
            onChange={(e) => handleChange('contractNumber', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="KONTR/2024/001"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Tanggal Jatuh Tempo *</label>
          <input
            type="date"
            value={formData.maturityDate}
            onChange={(e) => handleChange('maturityDate', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.maturityDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.maturityDate && (
            <p className="mt-1 text-red-600">{errors.maturityDate}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-gray-700 mb-2">Bunga / Return (%) per tahun</label>
        <input
          type="number"
          value={formData.couponOrExpectedReturn}
          onChange={(e) => handleChange('couponOrExpectedReturn', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="0.00"
          min="0"
          max="100"
          step="0.01"
        />
        <p className="mt-1 text-gray-500">0-100%, maksimal 2 desimal</p>
      </div>
    </div>
  );
}

function SertifikatDepositoFields({ formData, errors, handleChange }: any) {
  return (
    <div className="pl-4 border-l-2 border-yellow-500 space-y-4">
      <h4 className="text-gray-800">Detail Sertifikat Deposito</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Nama Bank *</label>
          <input
            type="text"
            value={formData.bankName}
            onChange={(e) => handleChange('bankName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.bankName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Bank BCA / Bank Mandiri"
            maxLength={100}
          />
          {errors.bankName && <p className="mt-1 text-red-600">{errors.bankName}</p>}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Nomor Sertifikat *</label>
          <input
            type="text"
            value={formData.certificateNumber}
            onChange={(e) => handleChange('certificateNumber', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.certificateNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="CERT/2024/001"
            maxLength={50}
          />
          {errors.certificateNumber && (
            <p className="mt-1 text-red-600">{errors.certificateNumber}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Tanggal Jatuh Tempo *</label>
          <input
            type="date"
            value={formData.maturityDate}
            onChange={(e) => handleChange('maturityDate', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.maturityDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.maturityDate && (
            <p className="mt-1 text-red-600">{errors.maturityDate}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Suku Bunga (%) *</label>
          <input
            type="number"
            value={formData.interestRate}
            onChange={(e) => handleChange('interestRate', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.interestRate ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0.00"
            min="0"
            max="100"
            step="0.01"
          />
          {errors.interestRate && (
            <p className="mt-1 text-red-600">{errors.interestRate}</p>
          )}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.earlyRedemptionPenalty}
            onChange={(e) => handleChange('earlyRedemptionPenalty', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-gray-700">Ada Penalti Pencairan Dini</span>
        </label>
      </div>
    </div>
  );
}

// Asset Tidak Lancar Fields - This will be split into multiple sub-components
function AssetTidakLancarFields({ formData, errors, handleChange, validateField, getLocation, gettingLocation, handlePhotoUpload, removePhoto }: any) {
  return (
    <div className="space-y-4 pt-4 border-t border-gray-200">
      <h3 className="text-gray-900">2. Jenis Aset Tidak Lancar</h3>
      
      <div>
        <label className="block text-gray-700 mb-2">Pilih Jenis *</label>
        <select
          value={formData.nonCurrentAssetType}
          onChange={(e) => handleChange('nonCurrentAssetType', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.nonCurrentAssetType ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">-- Pilih Jenis Aset Tidak Lancar --</option>
          <option value="TANAH">Tanah</option>
          <option value="BANGUNAN">Bangunan</option>
          <option value="KENDARAAN">Kendaraan</option>
          <option value="MESIN_PERALATAN">Mesin / Peralatan</option>
          <option value="PERABOT_KANTOR">Perabot Kantor</option>
          <option value="ASET_TAK_BERWUJUD">Aset Tak Berwujud</option>
          <option value="INVESTASI_JANGKA_PANJANG">Investasi Jangka Panjang</option>
        </select>
        {errors.nonCurrentAssetType && (
          <p className="mt-1 text-red-600">{errors.nonCurrentAssetType}</p>
        )}
      </div>

      {formData.nonCurrentAssetType === 'TANAH' && (
        <TanahFields formData={formData} errors={errors} handleChange={handleChange} getLocation={getLocation} gettingLocation={gettingLocation} />
      )}

      {formData.nonCurrentAssetType === 'BANGUNAN' && (
        <BangunanFields formData={formData} errors={errors} handleChange={handleChange} getLocation={getLocation} gettingLocation={gettingLocation} />
      )}

      {formData.nonCurrentAssetType === 'KENDARAAN' && (
        <KendaraanFields formData={formData} errors={errors} handleChange={handleChange} handlePhotoUpload={handlePhotoUpload} removePhoto={removePhoto} />
      )}

      {formData.nonCurrentAssetType === 'MESIN_PERALATAN' && (
        <MesinPeralatanFields formData={formData} errors={errors} handleChange={handleChange} />
      )}

      {formData.nonCurrentAssetType === 'ASET_TAK_BERWUJUD' && (
        <AsetTakBerwujudFields formData={formData} errors={errors} handleChange={handleChange} />
      )}
    </div>
  );
}

function TanahFields({ formData, errors, handleChange, getLocation, gettingLocation }: any) {
  return (
    <div className="pl-4 border-l-2 border-blue-500 space-y-4">
      <h4 className="text-gray-800">Detail Tanah</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Jenis Tanah *</label>
          <select
            value={formData.landType}
            onChange={(e) => handleChange('landType', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.landType ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">-- Pilih Jenis --</option>
            <option value="TANAH_KOSONG">Tanah Kosong</option>
            <option value="TANAH_DENGAN_BANGUNAN">Tanah dengan Bangunan</option>
            <option value="LAHAN_PERTANIAN">Lahan Pertanian</option>
            <option value="LAHAN_INDUSTRI">Lahan Industri</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
          {errors.landType && <p className="mt-1 text-red-600">{errors.landType}</p>}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Luas Tanah (m²) *</label>
          <input
            type="number"
            value={formData.landArea}
            onChange={(e) => handleChange('landArea', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.landArea ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
            min="0"
            step="0.01"
          />
          {errors.landArea && <p className="mt-1 text-red-600">{errors.landArea}</p>}
        </div>
      </div>

      <div>
        <label className="block text-gray-700 mb-2">Alamat Lengkap *</label>
        <textarea
          value={formData.fullAddress}
          onChange={(e) => handleChange('fullAddress', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.fullAddress ? 'border-red-500' : 'border-gray-300'
          }`}
          rows={3}
          maxLength={500}
          placeholder="Alamat lengkap lokasi tanah"
        />
        {errors.fullAddress && <p className="mt-1 text-red-600">{errors.fullAddress}</p>}
        <p className="mt-1 text-gray-500">5-500 karakter</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Status Kepemilikan *</label>
          <select
            value={formData.ownershipStatus}
            onChange={(e) => handleChange('ownershipStatus', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.ownershipStatus ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">-- Pilih Status --</option>
            <option value="MILIK">Milik</option>
            <option value="SEWA">Sewa</option>
            <option value="HAK_GUNA">Hak Guna</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
          {errors.ownershipStatus && (
            <p className="mt-1 text-red-600">{errors.ownershipStatus}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Jenis Sertifikat *</label>
          <select
            value={formData.certificateType}
            onChange={(e) => handleChange('certificateType', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.certificateType ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">-- Pilih Jenis --</option>
            <option value="SHM">SHM (Sertifikat Hak Milik)</option>
            <option value="HGB">HGB (Hak Guna Bangunan)</option>
            <option value="HGU">HGU (Hak Guna Usaha)</option>
            <option value="HP">HP (Hak Pakai)</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
          {errors.certificateType && (
            <p className="mt-1 text-red-600">{errors.certificateType}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-gray-700 mb-2">Nomor Sertifikat Tanah *</label>
        <input
          type="text"
          value={formData.certificateNumber}
          onChange={(e) => handleChange('certificateNumber', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.certificateNumber ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="SHM No. 123/2023"
          maxLength={50}
        />
        {errors.certificateNumber && (
          <p className="mt-1 text-red-600">{errors.certificateNumber}</p>
        )}
      </div>

      <div>
        <label className="block text-gray-700 mb-2">Lokasi (GPS)</label>
        <div className="space-y-3">
          <button
            type="button"
            onClick={getLocation}
            disabled={gettingLocation}
            className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {gettingLocation ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Mendapatkan Lokasi...
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5" />
                Dapatkan Lokasi Saat Ini
              </>
            )}
          </button>

          {formData.latitude && formData.longitude && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-900">
                Koordinat: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BangunanFields({ formData, errors, handleChange, getLocation, gettingLocation }: any) {
  return (
    <div className="pl-4 border-l-2 border-blue-500 space-y-4">
      <h4 className="text-gray-800">Detail Bangunan</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Jenis Bangunan *</label>
          <select
            value={formData.buildingType}
            onChange={(e) => handleChange('buildingType', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.buildingType ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">-- Pilih Jenis --</option>
            <option value="RUMAH">Rumah</option>
            <option value="APARTEMEN">Apartemen</option>
            <option value="RUKO">Ruko</option>
            <option value="KANTOR">Kantor</option>
            <option value="GUDANG">Gudang</option>
            <option value="PABRIK">Pabrik</option>
            <option value="HOTEL">Hotel</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
          {errors.buildingType && <p className="mt-1 text-red-600">{errors.buildingType}</p>}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Fungsi Bangunan</label>
          <select
            value={formData.buildingFunction}
            onChange={(e) => handleChange('buildingFunction', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Pilih Fungsi --</option>
            <option value="HUNIAN">Hunian</option>
            <option value="KOMERSIAL">Komersial</option>
            <option value="INDUSTRI">Industri</option>
            <option value="PERKANTORAN">Perkantoran</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-gray-700 mb-2">Alamat Lengkap *</label>
        <textarea
          value={formData.fullAddress}
          onChange={(e) => handleChange('fullAddress', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.fullAddress ? 'border-red-500' : 'border-gray-300'
          }`}
          rows={3}
          maxLength={500}
          placeholder="Alamat lengkap lokasi bangunan"
        />
        {errors.fullAddress && <p className="mt-1 text-red-600">{errors.fullAddress}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Luas Bangunan (m²) *</label>
          <input
            type="number"
            value={formData.buildingArea}
            onChange={(e) => handleChange('buildingArea', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.buildingArea ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
            min="0"
            step="0.01"
          />
          {errors.buildingArea && <p className="mt-1 text-red-600">{errors.buildingArea}</p>}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Luas Tanah (m²)</label>
          <input
            type="number"
            value={formData.landArea}
            onChange={(e) => handleChange('landArea', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Jumlah Lantai *</label>
          <input
            type="number"
            value={formData.floors}
            onChange={(e) => handleChange('floors', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.floors ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="1"
            min="1"
            max="200"
          />
          {errors.floors && <p className="mt-1 text-red-600">{errors.floors}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Tahun Dibangun *</label>
          <input
            type="number"
            value={formData.yearBuilt}
            onChange={(e) => handleChange('yearBuilt', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.yearBuilt ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="2020"
            min="1900"
            max="2100"
          />
          {errors.yearBuilt && <p className="mt-1 text-red-600">{errors.yearBuilt}</p>}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Tahun Renovasi Terakhir</label>
          <input
            type="number"
            value={formData.lastRenovationYear}
            onChange={(e) => handleChange('lastRenovationYear', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="2024"
            min="1900"
            max="2100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Material Struktur</label>
          <select
            value={formData.structureMaterial}
            onChange={(e) => handleChange('structureMaterial', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Pilih --</option>
            <option value="BETON">Beton</option>
            <option value="BAJA">Baja</option>
            <option value="KAYU">Kayu</option>
            <option value="KOMBINASI">Kombinasi</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Material Atap</label>
          <select
            value={formData.roofMaterial}
            onChange={(e) => handleChange('roofMaterial', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Pilih --</option>
            <option value="GENTENG">Genteng</option>
            <option value="METAL">Metal</option>
            <option value="BETON">Beton</option>
            <option value="ASBES">Asbes</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Material Dinding</label>
          <select
            value={formData.wallMaterial}
            onChange={(e) => handleChange('wallMaterial', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Pilih --</option>
            <option value="BATA">Bata</option>
            <option value="BETON">Beton</option>
            <option value="PANEL">Panel</option>
            <option value="KAYU">Kayu</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
        </div>
      </div>

      {formData.buildingType === 'HOTEL' && (
        <div>
          <label className="block text-gray-700 mb-2">Jumlah Kamar *</label>
          <input
            type="number"
            value={formData.roomCount}
            onChange={(e) => handleChange('roomCount', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.roomCount ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
            min="1"
            max="9999"
          />
          {errors.roomCount && <p className="mt-1 text-red-600">{errors.roomCount}</p>}
        </div>
      )}

      <div>
        <label className="block text-gray-700 mb-2">Lokasi (GPS)</label>
        <div className="space-y-3">
          <button
            type="button"
            onClick={getLocation}
            disabled={gettingLocation}
            className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {gettingLocation ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Mendapatkan Lokasi...
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5" />
                Dapatkan Lokasi Saat Ini
              </>
            )}
          </button>

          {formData.latitude && formData.longitude && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-900">
                Koordinat: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KendaraanFields({ formData, errors, handleChange, handlePhotoUpload, removePhoto }: any) {
  return (
    <div className="pl-4 border-l-2 border-blue-500 space-y-4">
      <h4 className="text-gray-800">Detail Kendaraan</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Jenis Kendaraan *</label>
          <select
            value={formData.vehicleType}
            onChange={(e) => handleChange('vehicleType', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.vehicleType ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">-- Pilih Jenis --</option>
            <option value="MOBIL_PENUMPANG">Mobil Penumpang</option>
            <option value="TRUK">Truk</option>
            <option value="MOTOR">Motor</option>
            <option value="BUS">Bus</option>
            <option value="ALAT_BERAT_BERJALAN">Alat Berat Berjalan</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
          {errors.vehicleType && <p className="mt-1 text-red-600">{errors.vehicleType}</p>}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Jenis Bahan Bakar *</label>
          <select
            value={formData.fuelType}
            onChange={(e) => handleChange('fuelType', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.fuelType ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">-- Pilih Jenis --</option>
            <option value="BENSIN">Bensin</option>
            <option value="DIESEL">Diesel</option>
            <option value="LISTRIK">Listrik</option>
            <option value="HYBRID">Hybrid</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
          {errors.fuelType && <p className="mt-1 text-red-600">{errors.fuelType}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Merek *</label>
          <input
            type="text"
            value={formData.brand}
            onChange={(e) => handleChange('brand', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.brand ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Toyota / Honda"
            maxLength={50}
          />
          {errors.brand && <p className="mt-1 text-red-600">{errors.brand}</p>}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Model *</label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => handleChange('model', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.model ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Avanza / Civic"
            maxLength={50}
          />
          {errors.model && <p className="mt-1 text-red-600">{errors.model}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Nomor Polisi *</label>
          <input
            type="text"
            value={formData.licensePlate}
            onChange={(e) => handleChange('licensePlate', e.target.value.toUpperCase())}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.licensePlate ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="B 1234 CD"
            maxLength={15}
          />
          {errors.licensePlate && <p className="mt-1 text-red-600">{errors.licensePlate}</p>}
          <p className="mt-1 text-gray-500">Format: AA 9999 AAA</p>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Tahun Pembuatan *</label>
          <input
            type="number"
            value={formData.yearManufactured}
            onChange={(e) => handleChange('yearManufactured', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.yearManufactured ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="2020"
            min="1900"
            max="2100"
          />
          {errors.yearManufactured && (
            <p className="mt-1 text-red-600">{errors.yearManufactured}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Nomor Rangka *</label>
          <input
            type="text"
            value={formData.chassisNumber}
            onChange={(e) => handleChange('chassisNumber', e.target.value.toUpperCase())}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.chassisNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="MH1XX123456789012"
            maxLength={30}
          />
          {errors.chassisNumber && <p className="mt-1 text-red-600">{errors.chassisNumber}</p>}
          <p className="mt-1 text-gray-500">5-30 karakter alfanumerik</p>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Nomor Mesin *</label>
          <input
            type="text"
            value={formData.engineNumber}
            onChange={(e) => handleChange('engineNumber', e.target.value.toUpperCase())}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.engineNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="XX1234567"
            maxLength={30}
          />
          {errors.engineNumber && <p className="mt-1 text-red-600">{errors.engineNumber}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Nomor BPKB</label>
          <input
            type="text"
            value={formData.bpkbNumber}
            onChange={(e) => handleChange('bpkbNumber', e.target.value.toUpperCase())}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="A123456789"
            maxLength={30}
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Nomor STNK</label>
          <input
            type="text"
            value={formData.stnkNumber}
            onChange={(e) => handleChange('stnkNumber', e.target.value.toUpperCase())}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="A123456789"
            maxLength={30}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Tanggal Kadaluarsa STNK</label>
          <input
            type="date"
            value={formData.stnkExpiryDate}
            onChange={(e) => handleChange('stnkExpiryDate', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Kapasitas Mesin (cc)</label>
          <input
            type="number"
            value={formData.engineCapacity}
            onChange={(e) => handleChange('engineCapacity', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="1500"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <label className="block text-gray-700 mb-2">Status Kepemilikan *</label>
        <select
          value={formData.ownershipStatus}
          onChange={(e) => handleChange('ownershipStatus', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.ownershipStatus ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">-- Pilih Status --</option>
          <option value="MILIK">Milik</option>
          <option value="LEASING">Leasing</option>
          <option value="SEWA">Sewa</option>
        </select>
        {errors.ownershipStatus && (
          <p className="mt-1 text-red-600">{errors.ownershipStatus}</p>
        )}
      </div>

      <div>
        <label className="block text-gray-700 mb-2">Foto Kendaraan</label>
        {formData.photo ? (
          <div className="relative">
            <img
              src={formData.photo}
              alt="Kendaraan"
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={removePhoto}
              className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-gray-600">Klik untuk upload foto</span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}

function MesinPeralatanFields({ formData, errors, handleChange }: any) {
  return (
    <div className="pl-4 border-l-2 border-blue-500 space-y-4">
      <h4 className="text-gray-800">Detail Mesin / Peralatan</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Jenis Mesin *</label>
          <input
            type="text"
            value={formData.machineType}
            onChange={(e) => handleChange('machineType', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.machineType ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Mesin Produksi / Generator"
            maxLength={100}
          />
          {errors.machineType && <p className="mt-1 text-red-600">{errors.machineType}</p>}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Merek *</label>
          <input
            type="text"
            value={formData.brand}
            onChange={(e) => handleChange('brand', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.brand ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Caterpillar / Komatsu"
            maxLength={50}
          />
          {errors.brand && <p className="mt-1 text-red-600">{errors.brand}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Model</label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => handleChange('model', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Model 2024"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Nomor Seri *</label>
          <input
            type="text"
            value={formData.serialNumber}
            onChange={(e) => handleChange('serialNumber', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.serialNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="SN123456789"
            maxLength={50}
          />
          {errors.serialNumber && <p className="mt-1 text-red-600">{errors.serialNumber}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Kapasitas</label>
          <input
            type="text"
            value={formData.capacity}
            onChange={(e) => handleChange('capacity', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="100 kW / 500 unit/jam"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Tahun Pembuatan</label>
          <input
            type="number"
            value={formData.yearManufactured}
            onChange={(e) => handleChange('yearManufactured', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="2020"
            min="1900"
            max="2100"
          />
        </div>
      </div>

      <div>
        <label className="block text-gray-700 mb-2">Umur Ekonomis (Tahun)</label>
        <input
          type="number"
          value={formData.economicLifeYears}
          onChange={(e) => handleChange('economicLifeYears', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="10"
          min="1"
          max="50"
        />
        <p className="mt-1 text-gray-500">Untuk perhitungan depresiasi</p>
      </div>
    </div>
  );
}

function AsetTakBerwujudFields({ formData, errors, handleChange }: any) {
  return (
    <div className="pl-4 border-l-2 border-blue-500 space-y-4">
      <h4 className="text-gray-800">Detail Aset Tak Berwujud</h4>
      
      <div>
        <label className="block text-gray-700 mb-2">Jenis Aset *</label>
        <select
          value={formData.intangibleType}
          onChange={(e) => handleChange('intangibleType', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.intangibleType ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">-- Pilih Jenis --</option>
          <option value="PATEN">Paten</option>
          <option value="MEREK_DAGANG">Merek Dagang</option>
          <option value="SOFTWARE">Software</option>
          <option value="FRANCHISE">Franchise</option>
          <option value="GOODWILL">Goodwill</option>
          <option value="LAINNYA">Lainnya</option>
        </select>
        {errors.intangibleType && (
          <p className="mt-1 text-red-600">{errors.intangibleType}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Nomor Registrasi *</label>
          <input
            type="text"
            value={formData.registrationNumber}
            onChange={(e) => handleChange('registrationNumber', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.registrationNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="PAT/2024/001"
            maxLength={50}
          />
          {errors.registrationNumber && (
            <p className="mt-1 text-red-600">{errors.registrationNumber}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Pemberi Hak / Licensor</label>
          <input
            type="text"
            value={formData.licensor}
            onChange={(e) => handleChange('licensor', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="PT. Pemegang Hak"
            maxLength={100}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Berlaku Dari</label>
          <input
            type="date"
            value={formData.validFrom}
            onChange={(e) => handleChange('validFrom', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Berlaku Sampai</label>
          <input
            type="date"
            value={formData.validTo}
            onChange={(e) => handleChange('validTo', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.renewable}
              onChange={(e) => handleChange('renewable', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700">Dapat Diperpanjang</span>
          </label>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Umur Ekonomis (Tahun)</label>
          <input
            type="number"
            value={formData.economicLifeYears}
            onChange={(e) => handleChange('economicLifeYears', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="10"
            min="1"
            max="50"
          />
          <p className="mt-1 text-gray-500">Untuk perhitungan amortisasi</p>
        </div>
      </div>
    </div>
  );
}
