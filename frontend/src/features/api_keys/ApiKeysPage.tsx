import React, { useState, useEffect } from 'react';
import {
  Key,
  PlusCircle,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { MOCK_API_KEYS } from '@/lib/mock-data';
import { APIKeyItem } from '@/types/escrow';

export const ApiKeysPage: React.FC = () => {
  const { isDemoMode } = useAuth();

  const [keys, setKeys] = useState<APIKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read', 'payments']);
  const [creating, setCreating] = useState(false);

  // Secret revelation modal
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    const fetchKeys = async () => {
      setLoading(true);
      try {
        if (isDemoMode) {
          setKeys(MOCK_API_KEYS);
        } else {
          const res = await api.getAPIKeys();
          setKeys(res.length > 0 ? res : MOCK_API_KEYS);
        }
      } catch {
        setKeys(MOCK_API_KEYS);
      } finally {
        setLoading(false);
      }
    };
    fetchKeys();
  }, [isDemoMode]);

  const handleToggleScope = (scope: string) => {
    if (scopes.includes(scope)) {
      setScopes(scopes.filter((s) => s !== scope));
    } else {
      setScopes([...scopes, scope]);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      if (isDemoMode) {
        const mockSecret = `tr_live_sk_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
        const newKey: APIKeyItem = {
          id: Date.now(),
          name,
          prefix: mockSecret.substring(0, 16),
          scopes,
          is_active: true,
          created_at: new Date().toISOString(),
          secret: mockSecret,
        };
        setKeys([newKey, ...keys]);
        setRevealedSecret(mockSecret);
        setShowModal(false);
        setCreating(false);
        return;
      }

      const res = await api.createAPIKey({ name, scopes });
      setKeys([res, ...keys]);
      if (res.secret) {
        setRevealedSecret(res.secret);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création de la clé.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string | number) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer cette clé d\'API immédiatement ?')) return;
    try {
      if (isDemoMode) {
        setKeys(keys.filter((k) => k.id !== id));
        return;
      }
      await api.revokeAPIKey(id);
      setKeys(keys.filter((k) => k.id !== id));
    } catch (err: any) {
      alert(err.message || 'Impossible de révoquer la clé.');
    }
  };

  const copySecret = () => {
    if (!revealedSecret) return;
    navigator.clipboard.writeText(revealedSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F4F6FC]">
            Clés d'API & Développeurs
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Générez des clés d'accès sécurisées pour intégrer TRUST dans vos applications tierces.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowModal(true)}
          className="text-xs gap-1.5"
        >
          <PlusCircle size={14} />
          Générer une Clé API
        </Button>
      </div>

      {/* Secret Revelation Alert Modal */}
      {revealedSecret && (
        <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 text-amber-500 font-bold text-sm">
            <AlertTriangle size={18} />
            <span>Conservez précieusement votre clé secrète !</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Cette clé d'API ne sera <strong>plus jamais réaffichée en clair</strong>. Si vous la perdez, vous devrez la révoquer et en générer une nouvelle.
          </p>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#0B0F14] border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white">
            <span className="flex-1 truncate">{revealedSecret}</span>
            <Button variant="outline" size="sm" onClick={copySecret} className="h-8 px-2.5 text-xs gap-1">
              {copiedSecret ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedSecret ? 'Copié' : 'Copier'}</span>
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setRevealedSecret(null)} className="text-xs">
            J'ai sauvegardé ma clé, fermer cet encadré
          </Button>
        </div>
      )}

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Clés d'API Actives</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 dark:border-slate-800/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Nom</th>
                  <th className="py-3 px-3">Préfixe de Clé</th>
                  <th className="py-3 px-3">Permissions (Scopes)</th>
                  <th className="py-3 px-3">Dernière Utilisation</th>
                  <th className="py-3 px-3">Créée le</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-3 font-semibold text-slate-900 dark:text-[#F4F6FC]">
                      {k.name}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-500">
                      {k.prefix}...
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded bg-[#7B3DFF]/10 text-[#7B3DFF] dark:text-[#a277ff] text-[10px] font-mono font-bold"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-slate-400">
                      {formatDate(k.last_used)}
                    </td>

                    <td className="py-3.5 px-3 text-slate-400">
                      {formatDate(k.created_at)}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Révoquer cette clé"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131820] max-w-md w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Générer une Nouvelle Clé d'API
            </h3>

            <form onSubmit={handleCreateKey} className="space-y-4">
              <Input
                label="Nom de l'application / Service"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Serveur E-commerce Prestashop"
                required
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Permissions autorisées
                </label>
                <div className="space-y-2 text-xs">
                  {[
                    { id: 'read', label: 'read — Lecture des transactions & séquestres' },
                    { id: 'write', label: 'write — Modification et création d\'offres' },
                    { id: 'payments', label: 'payments — Déclenchement de paiements séquestrés' },
                    { id: 'webhooks', label: 'webhooks — Gestion des flux webhook' },
                  ].map((sc) => (
                    <label key={sc.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scopes.includes(sc.id)}
                        onChange={() => handleToggleScope(sc.id)}
                        className="rounded border-slate-300 text-[#7B3DFF] focus:ring-[#7B3DFF]"
                      />
                      <span className="text-slate-600 dark:text-slate-300">{sc.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowModal(false)}>
                  Annuler
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={creating}>
                  Créer la clé
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
