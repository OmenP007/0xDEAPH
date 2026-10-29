import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/colors.dart';
import '../../../core/services/api_service.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/models/offer.dart';
import '../../../shared/widgets/trust_button.dart';
import '../../../shared/widgets/trust_card.dart';

class PaylinksScreen extends StatefulWidget {
  const PaylinksScreen({super.key});

  @override
  State<PaylinksScreen> createState() => _PaylinksScreenState();
}

class _PaylinksScreenState extends State<PaylinksScreen> {
  final _currencyFormat = NumberFormat.currency(locale: 'fr_FR', symbol: 'FCFA', decimalDigits: 0);

  bool _isLoading = true;
  List<Offer> _offers = [];

  @override
  void initState() {
    super.initState();
    _loadOffers();
  }

  Future<void> _loadOffers() async {
    setState(() => _isLoading = true);
    try {
      final api = context.read<ApiService>();
      final list = await api.getOffers();
      if (mounted) {
        setState(() {
          _offers = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showCreatePaylinkModal() {
    final titleController = TextEditingController();
    final amountController = TextEditingController(text: '50000');
    final descController = TextEditingController();
    final termsController = TextEditingController(text: 'Remise en main propre ou envoi express');
    bool isCreating = false;

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
                    'Nouveau Lien Paylink',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, color: TrustColors.textSecondary),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: titleController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Titre de l\'offre',
                  hintText: 'ex: Pack Coaching ou Vente Produit',
                  filled: true,
                  fillColor: TrustColors.card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  labelText: 'Prix de vente (FCFA)',
                  suffixText: 'FCFA',
                  filled: true,
                  fillColor: TrustColors.card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descController,
                maxLines: 2,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Description',
                  filled: true,
                  fillColor: TrustColors.card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: termsController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Modalités de remise',
                  filled: true,
                  fillColor: TrustColors.card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 20),
              TrustButton(
                text: 'Générer le Paylink',
                icon: LucideIcons.link,
                isLoading: isCreating,
                onPressed: () async {
                  if (titleController.text.trim().isEmpty) return;
                  setModalState(() => isCreating = true);
                  try {
                    final api = context.read<ApiService>();
                    final newOffer = await api.createOffer({
                      'title': titleController.text.trim(),
                      'amount': double.tryParse(amountController.text.trim()) ?? 0,
                      'description': descController.text.trim(),
                      'delivery_terms': termsController.text.trim(),
                    });
                    if (!ctx.mounted) return;
                    if (mounted) {
                      setState(() => _offers.insert(0, newOffer));
                    }
                    Navigator.pop(ctx);
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        backgroundColor: TrustColors.success,
                        content: Text('Lien de paiement créé avec succès !'),
                      ),
                    );
                  } catch (error) {
                    setModalState(() => isCreating = false);
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

  void _showQrDialog(Offer offer) {
    final payUrl = offer.resolvedPayUrl;

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: TrustColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                offer.title,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 4),
              Text(
                _currencyFormat.format(offer.amount),
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: TrustColors.primary),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: QrImageView(
                  data: payUrl,
                  version: QrVersions.auto,
                  size: 200.0,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Faites scanner ce code pour ouvrir le paiement sécurisé Wave ou Orange Money.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: TrustColors.textSecondary),
              ),
              const SizedBox(height: 20),
              TrustButton(
                text: 'Ouvrir le lien',
                icon: LucideIcons.externalLink,
                onPressed: () async {
                  final uri = Uri.tryParse(payUrl);
                  if (uri == null) return;
                  final opened = await launchUrl(
                    uri,
                    mode: LaunchMode.externalApplication,
                  );
                  if (!opened && ctx.mounted) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      const SnackBar(
                        backgroundColor: TrustColors.error,
                        content: Text('Impossible d\'ouvrir le lien.'),
                      ),
                    );
                  }
                },
              ),
              const SizedBox(height: 8),
              TrustButton(
                text: 'Copier le lien',
                icon: LucideIcons.copy,
                variant: TrustButtonVariant.secondary,
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: payUrl));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Lien copié dans le presse-papier !')),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().user;
    final canSell = user?.canSell == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Liens de Paiement'),
        actions: [
          if (canSell)
            IconButton(
              icon: const Icon(LucideIcons.plusCircle,
                  color: TrustColors.primary),
              onPressed: _showCreatePaylinkModal,
            ),
        ],
      ),
      body: !canSell
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(LucideIcons.lock,
                        size: 48, color: TrustColors.textSecondary),
                    const SizedBox(height: 12),
                    const Text(
                      'Les Paylinks sont réservés aux vendeurs et membres.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: TrustColors.textSecondary),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Votre rôle actuel : ${user?.role ?? 'client'}',
                      style: const TextStyle(
                        color: TrustColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            )
          : _isLoading
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
              onRefresh: _loadOffers,
              child: _offers.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(LucideIcons.link, size: 48, color: TrustColors.textSecondary),
                          const SizedBox(height: 12),
                          const Text(
                            'Aucun lien de paiement généré.',
                            style: TextStyle(color: TrustColors.textSecondary),
                          ),
                          const SizedBox(height: 16),
                          TrustButton(
                            text: 'Créer un Paylink',
                            icon: LucideIcons.plus,
                            onPressed: _showCreatePaylinkModal,
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(20),
                      itemCount: _offers.length,
                      itemBuilder: (ctx, idx) {
                        final offer = _offers[idx];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: TrustCard(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: TrustColors.primary.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        offer.code,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          fontFamily: 'monospace',
                                          color: TrustColors.primary,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      _currencyFormat.format(offer.amount),
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  offer.title,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                if (offer.description.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    offer.description,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 12, color: TrustColors.textSecondary),
                                  ),
                                ],
                                const Divider(color: TrustColors.border, height: 24),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    TextButton.icon(
                                      icon: const Icon(LucideIcons.qrCode, size: 16, color: TrustColors.cyan),
                                      label: const Text('QR Code', style: TextStyle(color: TrustColors.cyan, fontSize: 12)),
                                      onPressed: () => _showQrDialog(offer),
                                    ),
                                    const SizedBox(width: 8),
                                    TextButton.icon(
                                      icon: const Icon(LucideIcons.copy, size: 16, color: TrustColors.textSecondary),
                                      label: const Text('Copier', style: TextStyle(color: TrustColors.textSecondary, fontSize: 12)),
                                      onPressed: () {
                                        Clipboard.setData(ClipboardData(
                                            text: offer.resolvedPayUrl));
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Lien copié !')),
                                        );
                                      },
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
