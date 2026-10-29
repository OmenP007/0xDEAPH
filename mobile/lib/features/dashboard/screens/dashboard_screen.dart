import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/colors.dart';
import '../../../core/models/escrow_transaction.dart';
import '../../../core/services/api_service.dart';
import '../../../core/services/auth_service.dart';
import '../../../shared/widgets/trust_card.dart';
import '../../../shared/widgets/trust_badge.dart';
import '../../escrow/screens/escrow_detail_screen.dart';
import '../../escrow/screens/new_escrow_screen.dart';
import '../../transactions/screens/transactions_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ApiService _api = ApiService();
  final NumberFormat _currencyFormat = NumberFormat("#,##0", "fr_FR");

  List<EscrowTransaction> _transactions = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchDashboardData();
  }

  Future<void> _fetchDashboardData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final payments = await _api.getPayments();
      if (mounted) setState(() => _transactions = payments);
    } catch (error) {
      if (mounted) setState(() => _error = describeApiError(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().user;

    final blockedAmount = _transactions
        .where((t) => t.status == 'BLOCKED')
        .fold(0.0, (sum, t) => sum + t.amount);

    final releasedAmount = _transactions
        .where((t) => t.status == 'RELEASED')
        .fold(0.0, (sum, t) => sum + (t.netAmount > 0 ? t.netAmount : t.amount * (1 - t.commissionRate)));

    final activeCount = _transactions.where((t) => t.status == 'BLOCKED').length;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          color: TrustColors.primary,
          onRefresh: _fetchDashboardData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top user greetings
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Bonjour, ${user?.username ?? 'Utilisateur'} 👋',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Vos fonds sont protégés par séquestre',
                          style: TextStyle(fontSize: 12, color: TrustColors.textMuted),
                        ),
                      ],
                    ),
                    Container(
                      width: 42,
                      height: 42,
                      decoration: const BoxDecoration(
                        gradient: TrustColors.brandGradient,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          (user?.username.isNotEmpty == true)
                              ? user!.username.substring(0, 2).toUpperCase()
                              : 'TR',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Main Financial Balance Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF26134D), Color(0xFF131820)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: TrustColors.primary.withValues(alpha: 0.3)),
                    boxShadow: [
                      BoxShadow(
                        color: TrustColors.primary.withValues(alpha: 0.15),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'SOLDE DISPONIBLE',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1,
                              color: TrustColors.textMuted,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: TrustColors.success.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text(
                              'Libéré & Prêt',
                              style: TextStyle(
                                color: TrustColors.success,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        '${_currencyFormat.format(releasedAmount)} FCFA',
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 18),

                      // In-escrow secondary stat
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.lock_clock, color: TrustColors.cyan, size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Fonds sous séquestre actif',
                                    style: TextStyle(fontSize: 11, color: TrustColors.textMuted),
                                  ),
                                  Text(
                                    '${_currencyFormat.format(blockedAmount)} FCFA ($activeCount contrat${activeCount > 1 ? 's' : ''})',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: TrustColors.cyan,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Quick Action Bar — seuls les clients peuvent initier un séquestre.
                if (user?.canCreateEscrow == true)
                  Row(
                    children: [
                      Expanded(
                        child: TrustCard(
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => const NewEscrowScreen(),
                              ),
                            );
                          },
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.add_circle_outline,
                                  color: TrustColors.primary, size: 18),
                              SizedBox(width: 8),
                              Text(
                                'Nouveau Séquestre',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),

                if (user?.canSell == true)
                  TrustCard(
                    color: TrustColors.primary.withValues(alpha: 0.08),
                    child: const Row(
                      children: [
                        Icon(Icons.link, color: TrustColors.cyan, size: 18),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Créez un Paylink depuis l\'onglet Paylinks pour vendre.',
                            style: TextStyle(
                              fontSize: 11,
                              color: TrustColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _error!,
                    style: const TextStyle(color: TrustColors.error, fontSize: 11),
                  ),
                ],

                const SizedBox(height: 28),

                // Section Title: Recent Transactions
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Séquestres récents',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const TransactionsScreen()),
                        );
                      },
                      child: Row(
                        children: [
                          Text(
                            '${_transactions.length} total',
                            style: const TextStyle(fontSize: 12, color: TrustColors.primary, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.arrow_forward_ios, size: 10, color: TrustColors.primary),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                if (_loading)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: CircularProgressIndicator(color: TrustColors.primary),
                    ),
                  )
                else if (_transactions.isEmpty)
                  TrustCard(
                    padding: const EdgeInsets.all(32),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(Icons.shield_outlined, size: 40, color: TrustColors.textMuted.withValues(alpha: 0.5)),
                          const SizedBox(height: 12),
                          const Text(
                            'Aucune transaction sous séquestre',
                            style: TextStyle(color: TrustColors.textMuted, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _transactions.take(5).length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final item = _transactions[index];
                      return TrustCard(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => EscrowDetailScreen(escrowId: item.id),
                            ),
                          );
                        },
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: TrustColors.primary.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: const Icon(
                                Icons.shield_outlined,
                                color: TrustColors.primary,
                                size: 22,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.itemTitle,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: Colors.white,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${item.reference} • ${item.isBuyer ? 'Achat' : 'Vente'}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: TrustColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '${_currencyFormat.format(item.amount)} F',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 14,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                TrustBadge(status: item.status),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
