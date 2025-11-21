import React from 'react';
import { Calculator, Info } from 'lucide-react';

interface TaxCalculationInfoProps {
  taxRate: number;
  taxAmount: number;
  acquisitionValue: number;
}

export function TaxCalculationInfo({ taxRate, taxAmount, acquisitionValue }: TaxCalculationInfoProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-2 mb-2">
        <Calculator className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-blue-900 mb-1">Informasi Pajak Terutang</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Nilai Aset:</span>
              <span className="text-gray-900">{formatCurrency(acquisitionValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Tarif Pajak:</span>
              <span className="text-blue-600">{taxRate.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-blue-200">
              <span className="text-gray-900">Pajak per Tahun:</span>
              <span className="text-blue-600">{formatCurrency(taxAmount)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-start gap-1 text-xs text-gray-600 bg-white/50 rounded p-2">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
        <span>Pajak dihitung berdasarkan tarif daerah yang berlaku dan karakteristik aset</span>
      </div>
    </div>
  );
}
