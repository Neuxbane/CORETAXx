import React, { useState } from 'react';
import { X, CreditCard, CheckCircle } from 'lucide-react';

interface PaymentModalProps {
  tax: any;
  onClose: () => void;
  onComplete: () => void;
}

export function PaymentModal({ tax, onClose, onComplete }: PaymentModalProps) {
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handlePayment = () => {
    setProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      const allTaxes = JSON.parse(localStorage.getItem('taxes') || '[]');
      const taxIndex = allTaxes.findIndex((t: any) => t.id === tax.id);

      if (taxIndex !== -1) {
        allTaxes[taxIndex].status = 'paid';
        allTaxes[taxIndex].paidDate = new Date().toISOString().split('T')[0];
        localStorage.setItem('taxes', JSON.stringify(allTaxes));

        // Create transaction record
        const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        const newTransaction = {
          id: `trx-${Date.now()}`,
          userId: tax.userId,
          taxId: tax.id,
          assetName: tax.assetName,
          taxNumber: tax.taxNumber,
          amount: tax.amount,
          paymentDate: new Date().toISOString(),
          paymentMethod: 'simulation',
        };
        transactions.push(newTransaction);
        localStorage.setItem('transactions', JSON.stringify(transactions));
      }

      setProcessing(false);
      setSuccess(true);

      setTimeout(() => {
        onComplete();
      }, 2000);
    }, 1500);
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-gray-900 mb-2">Pembayaran Berhasil!</h2>
          <p className="text-gray-600">
            Pajak Anda telah berhasil dibayar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-gray-900">Pembayaran Pajak</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900 mb-1">Ini adalah simulasi pembayaran</p>
            <p className="text-blue-700">
              Dalam sistem sebenarnya, ini akan terintegrasi dengan payment gateway
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Nama Aset:</span>
              <span className="text-gray-900">{tax.assetName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">No. Pajak:</span>
              <span className="text-gray-900 font-mono">{tax.taxNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Jatuh Tempo:</span>
              <span className="text-gray-900">{formatDate(tax.dueDate)}</span>
            </div>
            <div className="pt-3 border-t border-gray-200 flex justify-between">
              <span className="text-gray-900">Total Pembayaran:</span>
              <span className="text-gray-900">{formatCurrency(tax.amount)}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3 p-4 border-2 border-blue-600 rounded-lg bg-blue-50">
              <CreditCard className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-gray-900">Pembayaran Simulasi</p>
                <p className="text-gray-600">Klik bayar untuk melanjutkan</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={handlePayment}
            disabled={processing}
            className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Memproses...' : 'Bayar Sekarang'}
          </button>
          <button
            onClick={onClose}
            disabled={processing}
            className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
