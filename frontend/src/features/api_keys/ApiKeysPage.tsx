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
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { APIKeyItem } from '@/types/escrow';
import { useAuth } from '@/context/AuthContext';
import { canManageApiKeys } from '@/lib/roles';

export const ApiKeysPage: React.FC = () => {
  const { user } = useAuth();
  const allowed = canManageApiKeys(user);
  const [keys, setKeys] = useState<APIKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['payments:read']);
  const [creating, setCreating] = useState(false);

  // Secret revelation modal
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | number | null>(null);

  // Auto-hide revealed secret after 60 seconds
  useEffect(() => {
    if (!revealedSecret) return;
    const timer = setTimeout(() => setRevealedSecret(null), 60000);
    return () => clearTimeout(timer);
  }, [revealedSecret]);

  useEffect(() => {
    if (!allowed) {
      setKeys([]);
      setLoading(false);
      return;
    }
    const fetchKeys = async () => {
      setLoading(true);
      try {
        const res = await api.getAPIKeys();
        setKeys(Array.isArray(res) ? res : []);
      } catch {
        setKeys([]);
      } finally {
        setLoading(false);
      }
    };
    fetchKeys();
  }, [allowed]);

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
      const res = await api.createAPIKey({ name, scopes });
      setKeys([res, ...keys]);
      if (res.secret) {
        setRevealedSecret(res.secret);
      }
      setShowModal(false);
      setName('');
    } catch (err: any) {
      setCreateError(err.message || 'Erreur lors de la création de la clé.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string | number) => {
    setConfirmRevokeId(id);
  };

  const confirmRevoke = async () => {
    if (confirmRevokeId === null) return;
    const id = confirmRevokeId;
    setConfirmRevokeId(null);
    try {
      await api.revokeAPIKey(id);
      setKeys(keys.filter((k) => k.id !== id));
    } catch (err: any) {
      setRevokeError(err.message || 'Impossible de révoquer la clé.');
    }
  };

  const copySecret = () => {
    if (!revealedSecret) return;
    navigator.clipboard.writeText(revealedSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  if (!allowed) {
    return (
      <div className="space-y-6 animate-page-enter max-w-3xl">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F4F6FC]">
            Clés d'API & Développeurs
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Intégrez TRUST dans vos applications tierces via l'API sécurisée.
          </p>
        </div>
        <Card className="p-8 text-center space-y-3">
          <ShieldAlert size={32} className="mx-auto text-amber-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Accès réservé aux comptes développeur
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Les clés API sont réservées aux comptes de rôle « développeur » et aux administrateurs.
            Votre compte actuel ({user?.role || 'membre'}) ne peut pas générer de clé.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-enter max-w-5xl">
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

      {/* Inline error banners */}
      {createError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{createError}</span>
          </div>
          <button onClick={() => setCreateError(null)} className="text-slate-400 hover:text-white ml-4">✕</button>
        </div>
      )}

      {revokeError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{revokeError}</span>
          </div>
          <button onClick={() => setRevokeError(null)} className="text-slate-400 hover:text-white ml-4">✕</button>
        </div>
      )}

      {/* Secret Revelation Alert Modal */}
      {revealedSecret && (
        <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-4 animate-modal-enter">
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
                {keys.map((k, idx) => (
                  <tr
                    key={k.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 opacity-0 animate-enter"
                    style={{
                      animationFillMode: 'forwards',
                      animationDelay: `${idx * 60}ms`,
                    }}
                  >
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
          <div className="bg-white dark:bg-[#131820] max-w-md w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl animate-modal-enter">
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
                    { id: 'payments:read', label: 'payments:read — Lire les paiements & séquestres' },
                    { id: 'payments:create', label: 'payments:create — Créer des paiements séquestrés' },
                    { id: 'payments:refund', label: 'payments:refund — Rembourser des paiements' },
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

      {/* Confirmation Modal for Revoke */}
      {confirmRevokeId !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131820] max-w-sm w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl animate-modal-enter">
            <div className="flex items-center gap-3 text-rose-500">
              <ShieldAlert size={20} />
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F4F6FC]">Révoquer la clé d'API ?</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cette action est <strong>irréversible</strong>. La clé sera immédiatement désactivée et toute intégration utilisant cette clé cessera de fonctionner.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmRevokeId(null)} className="text-xs">
                Annuler
              </Button>
              <Button variant="danger" size="sm" onClick={confirmRevoke} className="text-xs">
                Confirmer la Révocation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
