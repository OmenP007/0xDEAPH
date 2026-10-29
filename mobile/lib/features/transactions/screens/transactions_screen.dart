import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/colors.dart';
import '../../../core/models/escrow_transaction.dart';
import '../../../core/services/api_service.dart';
import '../../../shared/widgets/trust_badge.dart';
import '../../../shared/widgets/trust_card.dart';
import '../../escrow/screens/escrow_detail_screen.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  final ApiService _api = ApiService();
  final NumberFormat _currencyFormat = NumberFormat("#,##0", "fr_FR");
  List<EscrowTransaction> _transactions = [];
  bool _isLoading = true;
  String? _error;
  String _filter = 'ALL';
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchTransactions();
  }

  Future<void> _fetchTransactions() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final payments = await _api.getPayments();
      if (mounted) setState(() => _transactions = payments);
    } catch (error) {
      if (mounted) setState(() => _error = describeApiError(error));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _transactions.where((t) {
      if (_filter != 'ALL' && t.status != _filter) return false;
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        return t.itemTitle.toLowerCase().contains(query) ||
            t.reference.toLowerCase().contains(query) ||
            t.id.toString().contains(query) ||
            (t.buyerUsername ?? '').toLowerCase().contains(query);
      }
      return true;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Historique des Transactions'),
      ),
      body: Column(
        children: [
          // Search & Filter Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  onChanged: (v) => setState(() => _searchQuery = v),
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Rechercher une transaction...',
                    hintStyle: const TextStyle(color: TrustColors.textMuted),
                    prefixIcon: const Icon(LucideIcons.search, color: TrustColors.textSecondary),
                    filled: true,
                    fillColor: TrustColors.cardBackground,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: TrustColors.border)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: TrustColors.border)),
                  ),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('Tous', 'ALL'),
                      const SizedBox(width: 8),
                      _buildFilterChip('Bloqués', 'BLOCKED'),
                      const SizedBox(width: 8),
                      _buildFilterChip('Libérés', 'RELEASED'),
                      const SizedBox(width: 8),
                      _buildFilterChip('Remboursés', 'REFUNDED'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: TrustColors.primary))
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(LucideIcons.receipt,
                                size: 48, color: TrustColors.textMuted),
                            const SizedBox(height: 12),
                            Text(
                              _error ?? 'Aucune transaction trouvée',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: _error != null
                                    ? TrustColors.error
                                    : TrustColors.textSecondary,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        color: TrustColors.primary,
                        onRefresh: _fetchTransactions,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            final tx = filtered[index];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: TrustCard(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => EscrowDetailScreen(escrowId: tx.id)),
                                  );
                                },
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: TrustColors.primary.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Icon(LucideIcons.shield, color: TrustColors.primary, size: 20),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            tx.itemTitle,
                                            style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 3),
                                          Text(
                                            'Acheteur : ${tx.buyerUsername ?? '—'}',
                                            style: const TextStyle(color: TrustColors.textSecondary, fontSize: 11),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          '${_currencyFormat.format(tx.amount)} FCFA',
                                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
                                        ),
                                        const SizedBox(height: 4),
                                        TrustBadge(status: tx.status),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _filter == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: TrustColors.primary,
      backgroundColor: TrustColors.cardBackground,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : TrustColors.textSecondary,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
      onSelected: (selected) {
        if (selected) setState(() => _filter = value);
      },
    );
  }
}
