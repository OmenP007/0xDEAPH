import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/colors.dart';
import '../../../core/models/escrow_transaction.dart';
import '../../../core/services/api_service.dart';
import '../../../shared/widgets/trust_card.dart';
import '../../../shared/widgets/trust_badge.dart';
import 'escrow_detail_screen.dart';
import 'new_escrow_screen.dart';

class EscrowListScreen extends StatefulWidget {
  const EscrowListScreen({super.key});

  @override
  State<EscrowListScreen> createState() => _EscrowListScreenState();
}

class _EscrowListScreenState extends State<EscrowListScreen> {
  final ApiService _api = ApiService();
  final NumberFormat _currencyFormat = NumberFormat("#,##0", "fr_FR");

  List<EscrowTransaction> _escrows = [];
  bool _loading = true;
  String? _error;
  String _filter = 'ALL'; // 'ALL', 'BLOCKED', 'RELEASED', 'DISPUTED'

  @override
  void initState() {
    super.initState();
    _fetchEscrows();
  }

  Future<void> _fetchEscrows() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final payments = await _api.getPayments();
      if (mounted) setState(() => _escrows = payments);
    } catch (error) {
      if (mounted) setState(() => _error = describeApiError(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filter == 'ALL'
        ? _escrows
        : _escrows.where((e) => e.status == _filter).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Contrats de Séquestre'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline, color: TrustColors.primary),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const NewEscrowScreen()),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _buildFilterChip('Tous', 'ALL'),
                _buildFilterChip('Séquestrés (En cours)', 'BLOCKED'),
                _buildFilterChip('Libérés', 'RELEASED'),
                _buildFilterChip('Litiges', 'DISPUTED'),
              ],
            ),
          ),

          const SizedBox(height: 8),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: TrustColors.primary))
                : filtered.isEmpty
                    ? Center(
                        child: Text(
                          _error ??
                              'Aucun contrat en statut « $_filter »',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: _error != null
                                ? TrustColors.error
                                : TrustColors.textMuted,
                            fontSize: 13,
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        color: TrustColors.primary,
                        onRefresh: _fetchEscrows,
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final item = filtered[index];
                            return TrustCard(
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => EscrowDetailScreen(escrowId: item.id),
                                  ),
                                );
                              },
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        item.reference,
                                        style: const TextStyle(
                                          fontFamily: 'monospace',
                                          color: TrustColors.primary,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        ),
                                      ),
                                      TrustBadge(status: item.status),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    item.itemTitle,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Partenaire : @${item.isBuyer ? item.sellerUsername ?? 'vendeur' : item.buyerUsername ?? 'acheteur'}',
                                    style: const TextStyle(fontSize: 12, color: TrustColors.textMuted),
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        '${_currencyFormat.format(item.amount)} FCFA',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 16,
                                          color: Colors.white,
                                        ),
                                      ),
                                      const Row(
                                        children: [
                                          Text(
                                            'Détails',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                              color: TrustColors.cyan,
                                            ),
                                          ),
                                          Icon(Icons.chevron_right, size: 16, color: TrustColors.cyan),
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
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
    final selected = _filter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => setState(() => _filter = value),
        selectedColor: TrustColors.primary,
        backgroundColor: TrustColors.darkSurface,
        labelStyle: TextStyle(
          color: selected ? Colors.white : TrustColors.textMuted,
          fontSize: 12,
          fontWeight: selected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
    );
  }
}
