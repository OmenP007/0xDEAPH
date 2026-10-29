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
import { KYCIdType } from '@/types/escrow';

const ID_TYPE_LABELS: Record<KYCIdType, string> = {
  cni: 'Carte Nationale d\'Identité (CNI)',
  passport: 'Passeport',
  driving_license: 'Permis de Conduire',
};

export const SecurityPage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [idType, setIdType] = useState<KYCIdType>('cni');
  const [idNumber, setIdNumber] = useState('');
  const [fullName, setFullName] = useState(user?.full_name || user?.username || '');
  const [docUrl, setDocUrl] = useState('');
  const [kycStatus, setKycStatus] = useState<'APPROVED' | 'PENDING' | 'UNVERIFIED' | 'REJECTED'>('UNVERIFIED');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchKyc = async () => {
      try {
        const res = await api.getKYC();
        if (res) {
          setKycStatus(res.status as any);
          if (res.id_type) setIdType(res.id_type);
          if (res.id_number) setIdNumber(res.id_number);
          if (res.full_name) setFullName(res.full_name);
          if (res.rejection_reason) setRejectionReason(res.rejection_reason);
        }
      } catch {
        // Unverified fallback
      }
    };
    fetchKyc();
  }, []);

  const handleSubmitKYC = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);
    setSubmitError(null);

    if (!docUrl.startsWith('https://')) {
      setSubmitError("L'URL du document doit commencer par https://");
      setSubmitting(false);
      return;
    }

    try {
      await api.submitKYC({
        id_type: idType,
        id_number: idNumber,
        full_name: fullName,
        document_url: docUrl,
      });

      setKycStatus('PENDING');
      await refreshUser();
      setSuccessMsg('Votre dossier KYC a été transmis avec succès aux équipes de conformité.');
    } catch (err: any) {
      setSubmitError(err.message || 'Erreur lors de la soumission KYC.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-page-enter max-w-4xl">
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
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              kycStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500'
              : kycStatus === 'REJECTED' ? 'bg-rose-500/10 text-rose-500'
              : kycStatus === 'PENDING' ? 'bg-blue-500/10 text-blue-500'
              : 'bg-amber-500/10 text-amber-500'
            }`}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-[#F4F6FC]">
                  Statut de Conformité KYC
                </h3>
                {kycStatus === 'APPROVED' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    VÉRIFIÉ ET APPROUVÉ
                  </span>
                )}
                {kycStatus === 'PENDING' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    EN EXAMEN
                  </span>
                )}
                {kycStatus === 'UNVERIFIED' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    NON VÉRIFIÉ
                  </span>
                )}
                {kycStatus === 'REJECTED' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    REFUSÉ
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {kycStatus === 'APPROVED' && "Votre identité a été validée selon les standards UEMOA. Vous pouvez effectuer des transactions sans limitation de volume."}
                {kycStatus === 'PENDING' && "Votre dossier est en cours d'examen par notre équipe de conformité."}
                {kycStatus === 'UNVERIFIED' && "Soumettez vos pièces d'identité pour débloquer les plafonds illimités."}
                {kycStatus === 'REJECTED' && "Votre dossier a été refusé. Veuillez soumettre un nouveau dossier avec des documents valides."}
              </p>
              {kycStatus === 'REJECTED' && rejectionReason && (
                <p className="text-xs text-rose-400 mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <strong>Motif du refus :</strong> {rejectionReason}
                </p>
              )}
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

        {submitError && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{submitError}</span>
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
                onChange={(e) => setIdType(e.target.value as KYCIdType)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2030] text-xs text-slate-900 dark:text-white"
              >
                {(Object.keys(ID_TYPE_LABELS) as KYCIdType[]).map((value) => (
                  <option key={value} value={value}>
                    {ID_TYPE_LABELS[value]}
                  </option>
                ))}
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
