import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/colors.dart';
import '../../../core/services/api_service.dart';
import '../../../core/models/wallet_transaction.dart';
import '../../../shared/widgets/trust_button.dart';
import '../../../shared/widgets/trust_card.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  final _currencyFormat = NumberFormat.currency(locale: 'fr_FR', symbol: 'FCFA', decimalDigits: 0);

  bool _isLoading = true;
  double _balance = 0;
  String? _error;
  WalletOverview? _wallet;

  @override
  void initState() {
    super.initState();
    _loadWallet();
  }

  Future<void> _loadWallet() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final wallet = await context.read<ApiService>().getWalletOverview();

      if (mounted) {
        setState(() {
          _wallet = wallet;
          _balance = wallet.availableBalance;
          _isLoading = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = describeApiError(error);
        });
      }
    }
  }

  static String _methodCode(String label) {
    switch (label) {
      case 'Orange':
        return 'ORANGE_MONEY';
      case 'MTN MoMo':
        return 'MTN_MOMO';
      default:
        return 'WAVE';
    }
  }

  void _showDepositModal() {
    final amountController = TextEditingController(text: '25000');
    final phoneController = TextEditingController(text: '77 123 45 67');
    String selectedMethod = 'Wave';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: TrustColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Approvisionner le Solde',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, color: TrustColors.textSecondary),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                'Opérateur Mobile Money',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: TrustColors.textSecondary),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildOperatorChoice('Wave', const Color(0xFF1EA7FD), selectedMethod, (val) => setModalState(() => selectedMethod = val)),
                  const SizedBox(width: 8),
                  _buildOperatorChoice('Orange', const Color(0xFFFF7900), selectedMethod, (val) => setModalState(() => selectedMethod = val)),
                  const SizedBox(width: 8),
                  _buildOperatorChoice('MTN MoMo', const Color(0xFFFFCC00), selectedMethod, (val) => setModalState(() => selectedMethod = val)),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  labelText: 'Montant (FCFA)',
                  suffixText: 'FCFA',
                  filled: true,
                  fillColor: TrustColors.card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Numéro Mobile Money (+221)',
                  filled: true,
                  fillColor: TrustColors.card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 20),
              TrustButton(
                text: 'Confirmer le Rechargement',
                icon: LucideIcons.check,
                onPressed: () async {
                  final added = double.tryParse(amountController.text.trim()) ?? 0;
                  if (added < 1000) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        backgroundColor: TrustColors.error,
                        content: Text('Le montant minimum est de 1 000 FCFA.'),
                      ),
                    );
                    return;
                  }

                  try {
                    await context.read<ApiService>().walletTopup(
                          amount: added,
                          method: _methodCode(selectedMethod),
                          phone: phoneController.text.trim(),
                        );
                    if (!ctx.mounted) return;
                    Navigator.pop(ctx);
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        backgroundColor: TrustColors.success,
                        content: Text(
                          'Demande de rechargement enregistrée. '
                          'Le crédit interviendra après confirmation du fournisseur.',
                        ),
                      ),
                    );
                    _loadWallet();
                  } catch (error) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          backgroundColor: TrustColors.error,
                          content: Text(describeApiError(error)),
                        ),
                      );
                    }
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showWithdrawModal() {
    final amountController = TextEditingController(text: _balance > 0 ? _balance.toInt().toString() : '10000');
    final phoneController = TextEditingController(text: '77 123 45 67');
    String selectedMethod = 'Wave';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: TrustColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Retrait vers Mobile Money',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, color: TrustColors.textSecondary),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Solde disponible : ${_currencyFormat.format(_balance)}',
                style: const TextStyle(fontSize: 12, color: TrustColors.cyan, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _buildOperatorChoice('Wave', const Color(0xFF1EA7FD), selectedMethod, (val) => setModalState(() => selectedMethod = val)),
                  const SizedBox(width: 8),
                  _buildOperatorChoice('Orange', const Color(0xFFFF7900), selectedMethod, (val) => setModalState(() => selectedMethod = val)),
                  const SizedBox(width: 8),
                  _buildOperatorChoice('MTN MoMo', const Color(0xFFFFCC00), selectedMethod, (val) => setModalState(() => selectedMethod = val)),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  labelText: 'Montant à retirer (FCFA)',
                  suffixText: 'FCFA',
                  filled: true,
                  fillColor: TrustColors.card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Numéro du bénéficiaire (+221)',
                  filled: true,
                  fillColor: TrustColors.card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 20),
              TrustButton(
                text: 'Confirmer le Retrait',
                icon: LucideIcons.arrowUpRight,
                onPressed: () async {
                  final withdraw = double.tryParse(amountController.text.trim()) ?? 0;
                  if (withdraw > _balance) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        backgroundColor: TrustColors.error,
                        content: Text('Solde insuffisant pour ce montant.'),
                      ),
                    );
                    return;
                  }
                  if (withdraw < 1000) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        backgroundColor: TrustColors.error,
                        content: Text('Le montant minimum est de 1 000 FCFA.'),
                      ),
                    );
                    return;
                  }

                  try {
                    await context.read<ApiService>().walletWithdraw(
                          amount: withdraw,
                          method: _methodCode(selectedMethod),
                          phone: phoneController.text.trim(),
                        );
                    if (!ctx.mounted) return;
                    Navigator.pop(ctx);
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        backgroundColor: TrustColors.success,
                        content: Text(
                          'Demande de retrait enregistrée. '
                          'Elle sera traitée après confirmation du fournisseur.',
                        ),
                      ),
                    );
                    _loadWallet();
                  } catch (error) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          backgroundColor: TrustColors.error,
                          content: Text(describeApiError(error)),
                        ),
                      );
                    }
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMiniStat(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 9,
              color: TrustColors.textSecondary,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOperatorChoice(String name, Color brandColor, String selected, ValueChanged<String> onSelect) {
    final isSelected = selected == name;
    return Expanded(
      child: InkWell(
        onTap: () => onSelect(name),
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? brandColor.withValues(alpha: 0.15) : TrustColors.card,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isSelected ? brandColor : TrustColors.border,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  color: brandColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                name,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : TrustColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Portefeuille'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: _loadWallet,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadWallet,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  // Balance Card
                  TrustCard(
                    padding: const EdgeInsets.all(22),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1E1235), Color(0xFF0E0920)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
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
                                letterSpacing: 1.2,
                                color: TrustColors.primary,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: TrustColors.success.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                'Actif ✓',
                                style: TextStyle(
                                  color: TrustColors.success,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _currencyFormat.format(_balance),
                          style: const TextStyle(
                            fontSize: 34,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Fonds garantis et prêts à être virés instantanément.',
                          style: TextStyle(fontSize: 12, color: TrustColors.textSecondary),
                        ),
                        if (_wallet != null) ...[
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: _buildMiniStat(
                                  'Retraits en attente',
                                  _currencyFormat.format(
                                    _wallet!.pendingWithdrawals,
                                  ),
                                  TrustColors.warning,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildMiniStat(
                                  'Crédits séquestres',
                                  _currencyFormat.format(_wallet!.escrowCredits),
                                  TrustColors.success,
                                ),
                              ),
                            ],
                          ),
                        ],
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            Expanded(
                              child: TrustButton(
                                text: 'Déposer',
                                icon: LucideIcons.arrowDownLeft,
                                onPressed: _showDepositModal,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TrustButton(
                                text: 'Retirer',
                                icon: LucideIcons.arrowUpRight,
                                variant: TrustButtonVariant.secondary,
                                onPressed: _showWithdrawModal,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      style: const TextStyle(
                        color: TrustColors.error,
                        fontSize: 11,
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),

                  const Text(
                    'Mouvements Récents',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 12),

                  if ((_wallet?.transactions ?? const []).isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: Center(
                        child: Text(
                          'Aucun mouvement de portefeuille enregistré.',
                          style: TextStyle(color: TrustColors.textSecondary, fontSize: 13),
                        ),
                      ),
                    )
                  else
                    ...(_wallet?.transactions ?? const []).map((tx) {
                      final color = tx.isFailed
                          ? TrustColors.error
                          : tx.isPending
                              ? TrustColors.warning
                              : (tx.isTopup
                                  ? TrustColors.success
                                  : TrustColors.cyan);
                      final date = tx.createdAt;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: TrustCard(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(
                                  tx.isTopup
                                      ? LucideIcons.arrowDownLeft
                                      : LucideIcons.arrowUpRight,
                                  color: color,
                                  size: 18,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      tx.typeLabel.isNotEmpty
                                          ? tx.typeLabel
                                          : tx.directionLabel,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      [
                                        if (date != null)
                                          DateFormat('dd MMM yyyy, HH:mm', 'fr_FR')
                                              .format(date.toLocal()),
                                        if (tx.methodLabel.isNotEmpty)
                                          tx.methodLabel,
                                        if (tx.statusLabel.isNotEmpty)
                                          tx.statusLabel,
                                      ].join(' • '),
                                      style: const TextStyle(
                                        fontSize: 10,
                                        color: TrustColors.textSecondary,
                                      ),
                                    ),
                                    if (tx.isFailed &&
                                        (tx.failureReason?.isNotEmpty ?? false)) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        tx.failureReason!,
                                        style: const TextStyle(
                                          fontSize: 10,
                                          color: TrustColors.error,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              Text(
                                '${tx.isTopup ? '+' : '-'}${_currencyFormat.format(tx.amount)}',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: tx.isTopup ? TrustColors.success : Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}
