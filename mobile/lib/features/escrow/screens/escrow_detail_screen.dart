import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/models/escrow_transaction.dart';
import '../../../core/services/api_service.dart';
import '../../../shared/widgets/trust_card.dart';
import '../../../shared/widgets/trust_badge.dart';
import '../../../shared/widgets/trust_button.dart';

class EscrowDetailScreen extends StatefulWidget {
  final int escrowId;

  const EscrowDetailScreen({super.key, required this.escrowId});

  @override
  State<EscrowDetailScreen> createState() => _EscrowDetailScreenState();
}

class _EscrowDetailScreenState extends State<EscrowDetailScreen> {
  final ApiService _api = ApiService();
  final NumberFormat _currencyFormat = NumberFormat("#,##0", "fr_FR");
  final _otpController = TextEditingController();

  EscrowTransaction? _escrow;
  bool _loading = true;
  bool _submittingOtp = false;
  bool _confirmingReception = false;

  @override
  void initState() {
    super.initState();
    _fetchDetail();
  }

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _fetchDetail() async {
    setState(() => _loading = true);
    try {
      final res = await _api.dio.get(ApiEndpoints.paymentDetail(widget.escrowId));
      setState(() {
        _escrow = EscrowTransaction.fromJson(res.data);
      });
    } catch (_) {
      // Error handling
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _confirmOtp() async {
    final otp = _otpController.text.trim();
    if (otp.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Le code OTP doit contenir 6 chiffres.')),
      );
      return;
    }

    setState(() => _submittingOtp = true);
    try {
      await _api.confirmDelivery(widget.escrowId, otp);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Code validé ! La livraison est confirmée.'),
          backgroundColor: TrustColors.success,
        ),
      );
      await _fetchDetail();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(describeApiError(error)),
          backgroundColor: TrustColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _submittingOtp = false);
    }
  }

  Future<void> _confirmReception() async {
    setState(() => _confirmingReception = true);
    try {
      await _api.confirmDelivery(widget.escrowId, '');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Réception confirmée. Les fonds sont libérés.'),
          backgroundColor: TrustColors.success,
        ),
      );
      await _fetchDetail();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(describeApiError(error)),
          backgroundColor: TrustColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _confirmingReception = false);
    }
  }

  void _showDisputeDialog() {
    final detailsController = TextEditingController();
    String reason = 'Article non conforme ou défectueux';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: TrustColors.darkSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text('Déclarer un Litige', style: TextStyle(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Les fonds resteront bloqués sous séquestre jusqu\'à la décision d\'un arbitre TRUST.',
              style: TextStyle(fontSize: 12, color: TrustColors.textMuted),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: detailsController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Expliquez en détail le problème rencontré...',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: TrustColors.error),
            onPressed: () async {
              try {
                await _api.dio.post(
                  ApiEndpoints.paymentDispute(widget.escrowId),
                  data: {'reason': reason, 'details': detailsController.text},
                );
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
                _fetchDetail();
              } catch (error) {
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
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
            child: const Text('Confirmer le Litige'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _escrow == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: TrustColors.primary)),
      );
    }

    final escrow = _escrow!;

    return Scaffold(
      appBar: AppBar(
        title: Text(escrow.reference),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: Center(child: TrustBadge(status: escrow.status)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title & Amount Card
            TrustCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    escrow.itemTitle,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${_currencyFormat.format(escrow.amount)} FCFA',
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: TrustColors.primaryLight,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Frais TRUST ${(escrow.commissionRate * 100).toStringAsFixed(2)}% : '
                    '${_currencyFormat.format(escrow.feeAmount)} FCFA • '
                    'Net vendeur : ${_currencyFormat.format(escrow.netAmount)} FCFA',
                    style: const TextStyle(fontSize: 11, color: TrustColors.textMuted),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // OTP Delivery Box
            if (escrow.isBlocked)
              TrustCard(
                border: Border.all(color: TrustColors.primary.withValues(alpha: 0.4)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.key, color: TrustColors.cyan, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Code de Livraison Sécurisé (OTP)',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    if (escrow.isBuyer) ...[
                      const Text(
                        'Voici votre code unique secret. Ne le donnez au vendeur qu\'une fois votre article vérifié :',
                        style: TextStyle(fontSize: 12, color: TrustColors.textMuted),
                      ),
                      const SizedBox(height: 14),
                      Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.black,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: TrustColors.cyan.withValues(alpha: 0.4)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                escrow.deliveryOtp ?? '------',
                                style: const TextStyle(
                                  fontFamily: 'monospace',
                                  fontSize: 26,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 6,
                                  color: TrustColors.cyan,
                                ),
                              ),
                              const SizedBox(width: 12),
                              IconButton(
                                icon: const Icon(Icons.copy, size: 18, color: Colors.white70),
                                onPressed: () {
                                  if (escrow.deliveryOtp != null) {
                                    Clipboard.setData(ClipboardData(text: escrow.deliveryOtp!));
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Code OTP copié !')),
                                    );
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TrustButton(
                        text: 'Confirmer la réception',
                        icon: Icons.check_circle_outline,
                        isLoading: _confirmingReception,
                        onPressed: _confirmingReception ? null : _confirmReception,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'La libération effective dépend de GeniusPay. '
                        'Si le payout n\'est pas disponible, le backend renverra une erreur explicite.',
                        style: TextStyle(fontSize: 10, color: TrustColors.textMuted),
                      ),
                    ] else ...[
                      const Text(
                        'Demandez le code secret à l\'acheteur lors de la remise pour déclencher le paiement immédiat :',
                        style: TextStyle(fontSize: 12, color: TrustColors.textMuted),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _otpController,
                              keyboardType: TextInputType.number,
                              maxLength: 6,
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontFamily: 'monospace', letterSpacing: 4, fontWeight: FontWeight.bold),
                              decoration: const InputDecoration(hintText: '000000', counterText: ''),
                            ),
                          ),
                          const SizedBox(width: 10),
                          ElevatedButton(
                            onPressed: _submittingOtp ? null : _confirmOtp,
                            child: _submittingOtp
                                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                                : const Text('Valider'),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),

            const SizedBox(height: 16),

            // Parties & Terms
            TrustCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Détails des Parties', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: TrustColors.textMuted)),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Acheteur : ', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      Text('@${escrow.buyerUsername ?? 'acheteur'}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Vendeur : ', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      Text('@${escrow.sellerUsername ?? 'vendeur'}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                    ],
                  ),
                  const Divider(height: 24, color: TrustColors.darkBorder),
                  const Text('Modalités convenues :', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: TrustColors.textMuted)),
                  const SizedBox(height: 4),
                  Text(escrow.deliveryTerms, style: const TextStyle(color: Colors.white, fontSize: 12)),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Dispute Action button
            if (escrow.isBlocked)
              TrustButton(
                text: 'Signaler un Litige',
                isSecondary: true,
                icon: Icons.warning_amber_outlined,
                onPressed: _showDisputeDialog,
              ),
          ],
        ),
      ),
    );
  }
}
