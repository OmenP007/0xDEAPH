import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  FileCheck,
  AlertCircle,
  CheckCircle,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export const SecurityPage: React.FC = () => {
  const { user, isDemoMode } = useAuth();

  const [idType, setIdType] = useState<'CNI' | 'PASSPORT' | 'PERMIS'>('CNI');
  const [idNumber, setIdNumber] = useState('SN-1992-8492019482');
  const [fullName, setFullName] = useState(user?.full_name || 'Abdoul Diallo');
  const [docUrl, setDocUrl] = useState('https://storage.trust.sn/kyc/cni_diallo.pdf');
  const [kycStatus, setKycStatus] = useState<'APPROVED' | 'PENDING' | 'UNVERIFIED'>('APPROVED');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmitKYC = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);

    try {
      if (isDemoMode) {
        setTimeout(() => {
          setKycStatus('PENDING');
          setSuccessMsg('Votre dossier KYC a été soumis pour revue de conformité.');
          setSubmitting(false);
        }, 600);
        return;
      }

      await api.submitKYC({
        id_type: idType,
        id_number: idNumber,
        full_name: fullName,
        document_url: docUrl,
      });

      setKycStatus('PENDING');
      setSuccessMsg('Votre dossier KYC a été transmis avec succès aux équipes de conformité.');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la soumission KYC.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F4F6FC]">
          Sécurité & Conformité KYC
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Validez votre identité légale pour débloquer les plafonds illimités et garantir la conformité financière.
        </p>
      </div>

      {/* KYC Status Banner */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-[#F4F6FC]">
                  Statut de Conformité KYC
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {kycStatus === 'APPROVED' ? 'VÉRIFIÉ ET APPROUVÉ' : 'EN COURS D\'EXAMEN'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Votre identité a été validée selon les standards UEMOA. Vous pouvez effectuer des transactions sans limitation de volume.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* KYC Document Submission Form */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base font-bold">Mise à jour des Pièces d'Identité</CardTitle>
          <p className="text-xs text-slate-400">
            Formats acceptés : CNI CEDEAO, Passeport biométrique ou Permis de conduire.
          </p>
        </CardHeader>

        {successMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
            <CheckCircle size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitKYC} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Type de Pièce
              </label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value as any)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2030] text-xs text-slate-900 dark:text-white"
              >
                <option value="CNI">Carte Nationale d'Identité (CNI)</option>
                <option value="PASSPORT">Passeport</option>
                <option value="PERMIS">Permis de Conduire</option>
              </select>
            </div>

            <Input
              label="Numéro de la Pièce"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="ex: SN-1992-..."
              required
            />
          </div>

          <Input
            label="Nom complet figurant sur le document"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            label="Lien HTTPS sécurisé du document numérisé"
            value={docUrl}
            onChange={(e) => setDocUrl(e.target.value)}
            placeholder="https://..."
            required
          />

          <div className="pt-2">
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Soumettre pour Vérification
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
