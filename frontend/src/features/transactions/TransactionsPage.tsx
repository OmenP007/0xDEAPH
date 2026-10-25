import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  PlusCircle,
  ShieldCheck,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatFCFA, formatDate } from '@/lib/utils';
import { MOCK_TRANSACTIONS } from '@/lib/mock-data';
import { EscrowTransaction, EscrowStatus } from '@/types/escrow';

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDemoMode } = useAuth();

  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'buyer' | 'seller'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        if (isDemoMode) {
          setTransactions(MOCK_TRANSACTIONS);
        } else {
          const res = await api.getPayments();
          setTransactions(res.length > 0 ? res : MOCK_TRANSACTIONS);
        }
      } catch {
        setTransactions(MOCK_TRANSACTIONS);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [isDemoMode]);

  // Filtering logic
  const filtered = transactions.filter((t) => {
    const matchesSearch =
      (t.item_title && t.item_title.toLowerCase().includes(search.toLowerCase())) ||
      (t.reference && t.reference.toLowerCase().includes(search.toLowerCase())) ||
      (t.seller_username && t.seller_username.toLowerCase().includes(search.toLowerCase())) ||
      (t.buyer_username && t.buyer_username.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesRole = roleFilter === 'ALL' || t.role_current_user === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F4F6FC]">
            Transactions & Séquestres
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Consultez l'historique complet de vos achats, ventes et garanties financières.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/escrow/new')}
          className="text-xs"
        >
          <PlusCircle size={14} />
          Nouveau Séquestre
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par référence, titre d'article, utilisateur..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A2030] text-xs sm:text-sm text-slate-900 dark:text-[#F4F6FC] focus:outline-none focus:ring-2 focus:ring-[#7B3DFF]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Status Tabs */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A2030] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#7B3DFF]"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="BLOCKED">Fonds Séquestrés (Actif)</option>
              <option value="RELEASED">Fonds Libérés (Terminé)</option>
              <option value="REFUNDED">Remboursés</option>
              <option value="DISPUTED">En Litige</option>
              <option value="CREATED">Créés</option>
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A2030] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#7B3DFF]"
            >
              <option value="ALL">Tous les rôles</option>
              <option value="buyer">Mes Achats</option>
              <option value="seller">Mes Ventes</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 dark:border-slate-800/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider bg-slate-50/50 dark:bg-[#0E131C]">
                <tr>
                  <th className="py-3.5 px-4">Référence</th>
                  <th className="py-3.5 px-4">Objet & Prestation</th>
                  <th className="py-3.5 px-4">Rôle</th>
                  <th className="py-3.5 px-4">Contrepartie</th>
                  <th className="py-3.5 px-4">Date de Création</th>
                  <th className="py-3.5 px-4">Montant Net / Brut</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Aucune transaction trouvée pour ces critères de recherche.
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => {
                    const counterpart =
                      t.role_current_user === 'buyer' ? t.seller_username : t.buyer_username;

                    return (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/escrow/${t.id}`)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-4 font-mono font-semibold text-slate-900 dark:text-[#F4F6FC]">
                          {t.reference || `ID #${t.id}`}
                        </td>

                        <td className="py-4 px-4 max-w-xs truncate">
                          <span className="font-semibold text-slate-900 dark:text-[#F4F6FC]">
                            {t.item_title || 'Sans titre'}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              t.role_current_user === 'buyer'
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            {t.role_current_user === 'buyer' ? 'Acheteur' : 'Vendeur'}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                          @{counterpart || 'partenaire'}
                        </td>

                        <td className="py-4 px-4 text-slate-400 whitespace-nowrap">
                          {formatDate(t.created_at)}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {formatFCFA(t.amount)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Frais 1%: {formatFCFA(t.fee_amount || Math.round(t.amount * 0.01))}
                          </p>
                        </td>

                        <td className="py-4 px-4">
                          <Badge status={t.status} />
                        </td>

                        <td className="py-4 px-4 text-right">
                          <span className="text-[#7B3DFF] group-hover:translate-x-1 inline-block transition-transform font-bold text-xs">
                            Ouvrir →
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Mobile Card View (optimized for mobile screens per spec) */}
      <div className="md:hidden space-y-3">
        {filtered.map((t) => {
          const counterpart =
            t.role_current_user === 'buyer' ? t.seller_username : t.buyer_username;

          return (
            <Card
              key={t.id}
              onClick={() => navigate(`/escrow/${t.id}`)}
              className="p-4 cursor-pointer hover:border-[#7B3DFF]/40 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[11px] text-slate-400 font-bold">
                    {t.reference || `ID #${t.id}`}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-[#F4F6FC] mt-0.5">
                    {t.item_title}
                  </h4>
                </div>
                <Badge status={t.status} />
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Partie adverse</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    @{counterpart || 'partenaire'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Montant</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {formatFCFA(t.amount)}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
