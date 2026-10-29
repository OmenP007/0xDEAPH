import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/colors.dart';
import '../../../core/services/api_service.dart';
import '../../../core/services/auth_service.dart';
import '../../../shared/widgets/trust_button.dart';
import '../../../shared/widgets/trust_card.dart';

class NewEscrowScreen extends StatefulWidget {
  const NewEscrowScreen({super.key});

  @override
  State<NewEscrowScreen> createState() => _NewEscrowScreenState();
}

class _NewEscrowScreenState extends State<NewEscrowScreen> {
  int _currentStep = 0;
  final _currencyFormat = NumberFormat.currency(locale: 'fr_FR', symbol: 'FCFA', decimalDigits: 0);

  // Form controllers
  final _sellerController = TextEditingController();
  final _amountController = TextEditingController(text: '50000');
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _deliveryTermsController = TextEditingController(
    text: 'Remise en main propre contre code OTP ou expédition avec suivi.',
  );

  bool _isSubmitting = false;
  String? _errorMessage;

  double _commissionRate = 0.01;
  double _minAmount = 500;

  double get _amount => double.tryParse(_amountController.text.trim()) ?? 0;
  double get _commission => _amount * _commissionRate;
  double get _sellerNet => _amount - _commission;

  @override
  void initState() {
    super.initState();
    _loadPlatformSettings();
  }

  Future<void> _loadPlatformSettings() async {
    try {
      final settings = await context.read<ApiService>().getPlatformSettings();
      final rate = double.tryParse(
        settings['commission_rate_percent']?.toString() ?? '',
      );
      final minAmount = double.tryParse(
        settings['min_escrow_amount']?.toString() ?? '',
      );
      if (!mounted) return;
      setState(() {
        if (rate != null && rate >= 0 && rate <= 100) {
          _commissionRate = rate / 100;
        }
        if (minAmount != null && minAmount > 0) _minAmount = minAmount;
      });
    } catch (_) {
      // On conserve les valeurs par défaut si les réglages sont indisponibles.
    }
  }

  @override
  void dispose() {
    _sellerController.dispose();
    _amountController.dispose();
    _titleController.dispose();
    _descriptionController.dispose();
    _deliveryTermsController.dispose();
    super.dispose();
  }

  void _nextStep() {
    setState(() => _errorMessage = null);
    final authUser = context.read<AuthService>().user?.username;

    if (_currentStep == 0) {
      if (_sellerController.text.trim().isEmpty) {
        setState(() => _errorMessage = 'Veuillez saisir le nom d\'utilisateur du vendeur.');
        return;
      }
      if (authUser != null && _sellerController.text.trim().toLowerCase() == authUser.toLowerCase()) {
        setState(() => _errorMessage = 'Vous ne pouvez pas être à la fois acheteur et vendeur.');
        return;
      }
    } else if (_currentStep == 1) {
      if (_amount < _minAmount) {
        setState(() => _errorMessage =
            'Le montant minimum est de ${_currencyFormat.format(_minAmount)}.');
        return;
      }
    } else if (_currentStep == 2) {
      if (_titleController.text.trim().isEmpty) {
        setState(() => _errorMessage = 'Veuillez spécifier le titre de l\'article ou service.');
        return;
      }
    }

    if (_currentStep < 3) {
      setState(() => _currentStep++);
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() {
        _errorMessage = null;
        _currentStep--;
      });
    } else {
      Navigator.pop(context);
    }
  }

  Future<void> _submitEscrow() async {
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final auth = context.read<AuthService>();
    if (auth.user?.canCreateEscrow != true) {
      setState(() {
        _isSubmitting = false;
        _errorMessage = 'Seul un compte client peut initier un séquestre.';
      });
      return;
    }

    try {
      final api = context.read<ApiService>();
      final payment = await api.createPayment({
        'seller_username': _sellerController.text.trim(),
        'amount': _amount,
        'item_title': _titleController.text.trim(),
        'item_description': _descriptionController.text.trim(),
        'delivery_terms': _deliveryTermsController.text.trim(),
      });

      if (!mounted) return;

      final checkoutUrl = payment.checkoutUrl;
      if (checkoutUrl != null && checkoutUrl.isNotEmpty) {
        await _showCheckoutDialog(checkoutUrl, payment.reference);
        if (!mounted) return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: TrustColors.success,
          content: Text(
            'Séquestre ${payment.reference} créé. '
            'Finalisez le règlement pour bloquer les fonds.',
          ),
        ),
      );
      Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        setState(() => _errorMessage = describeApiError(error));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _showCheckoutDialog(String url, String reference) async {
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: TrustColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Finaliser le règlement',
          style: TextStyle(color: Colors.white),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Séquestre $reference créé. Ouvrez ce lien sécurisé pour bloquer les fonds :',
              style: const TextStyle(
                color: TrustColors.textSecondary,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 12),
            SelectableText(
              url,
              style: const TextStyle(
                color: TrustColors.cyan,
                fontSize: 11,
                fontFamily: 'monospace',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: url));
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Copier le lien'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: TrustColors.primary,
            ),
            onPressed: () async {
              final uri = Uri.tryParse(url);
              if (uri == null) return;
              final opened = await launchUrl(
                uri,
                mode: LaunchMode.externalApplication,
              );
              if (!ctx.mounted) return;
              if (!opened) {
                ScaffoldMessenger.of(ctx).showSnackBar(
                  const SnackBar(
                    backgroundColor: TrustColors.error,
                    content: Text(
                      'Impossible d\'ouvrir le lien. Copiez-le manuellement.',
                    ),
                  ),
                );
              }
            },
            child: const Text('Ouvrir'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouveau Séquestre'),
        leading: IconButton(
          icon: const Icon(LucideIcons.chevronLeft),
          onPressed: _prevStep,
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Progress Bar
            LinearProgressIndicator(
              value: (_currentStep + 1) / 4,
              backgroundColor: TrustColors.surface,
              valueColor: const AlwaysStoppedAnimation<Color>(TrustColors.primary),
              minHeight: 4,
            ),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Étape ${_currentStep + 1} sur 4',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: TrustColors.primary,
                    ),
                  ),
                  Text(
                    _getStepTitle(_currentStep),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: TrustColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),

            if (_errorMessage != null)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: TrustColors.error.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: TrustColors.error.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.alertCircle, color: TrustColors.error, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: TrustColors.error, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),

            // Step Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20.0),
                child: _buildCurrentStepContent(),
              ),
            ),

            // Bottom Buttons
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: TrustColors.surface,
                border: Border(
                  top: BorderSide(color: TrustColors.border.withValues(alpha: 0.4)),
                ),
              ),
              child: Row(
                children: [
                  if (_currentStep > 0) ...[
                    Expanded(
                      flex: 1,
                      child: TrustButton(
                        text: 'Précédent',
                        variant: TrustButtonVariant.secondary,
                        onPressed: _prevStep,
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    flex: 2,
                    child: TrustButton(
                      text: _currentStep == 3 ? 'Confirmer & Séquestrer' : 'Continuer',
                      icon: _currentStep == 3 ? LucideIcons.shieldCheck : LucideIcons.arrowRight,
                      isLoading: _isSubmitting,
                      onPressed: _currentStep == 3 ? _submitEscrow : _nextStep,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getStepTitle(int step) {
    switch (step) {
      case 0:
        return 'Partie Vendeur';
      case 1:
        return 'Montant';
      case 2:
        return 'Objet & Modalités';
      case 3:
        return 'Confirmation';
      default:
        return '';
    }
  }

  Widget _buildCurrentStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildStep0Seller();
      case 1:
        return _buildStep1Amount();
      case 2:
        return _buildStep2Details();
      case 3:
        return _buildStep3Recap();
      default:
        return const SizedBox();
    }
  }

  Widget _buildStep0Seller() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Qui est le vendeur ?',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 6),
        const Text(
          'Indiquez le nom d\'utilisateur TRUST du vendeur pour le lier au contrat.',
          style: TextStyle(fontSize: 13, color: TrustColors.textSecondary),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _sellerController,
          decoration: InputDecoration(
            labelText: 'Nom d\'utilisateur du vendeur',
            hintText: 'ex: mamadou_pro',
            prefixIcon: const Icon(LucideIcons.userCheck, color: TrustColors.primary),
            filled: true,
            fillColor: TrustColors.card,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
        const SizedBox(height: 20),
        TrustCard(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: TrustColors.cyan.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(LucideIcons.shield, color: TrustColors.cyan, size: 20),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Le vendeur sera notifié dès que vos fonds seront sécurisés sous séquestre.',
                  style: TextStyle(fontSize: 12, color: TrustColors.textSecondary),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStep1Amount() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Montant de la transaction',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 6),
        Text(
          'Définissez la valeur en Francs CFA (XOF). Commission TRUST de ${(_commissionRate * 100).toStringAsFixed(2)}%.',
          style: const TextStyle(fontSize: 13, color: TrustColors.textSecondary),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _amountController,
          keyboardType: TextInputType.number,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            labelText: 'Montant (FCFA)',
            suffixText: 'FCFA',
            prefixIcon: const Icon(LucideIcons.banknote, color: TrustColors.primary),
            filled: true,
            fillColor: TrustColors.card,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
        const SizedBox(height: 20),
        // Fee Breakdown Card
        TrustCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              _buildFeeRow('Montant débité (Acheteur)', _currencyFormat.format(_amount), isBold: true),
              const Divider(color: TrustColors.border, height: 20),
              _buildFeeRow(
                'Frais de garantie TRUST (${(_commissionRate * 100).toStringAsFixed(2)}%)',
                _currencyFormat.format(_commission),
              ),
              const SizedBox(height: 8),
              _buildFeeRow('Montant perçu par le vendeur', _currencyFormat.format(_sellerNet), isHighlight: true),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStep2Details() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Objet & Modalités',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 6),
        const Text(
          'Décrivez clairement ce qui est acheté et les conditions de livraison.',
          style: TextStyle(fontSize: 13, color: TrustColors.textSecondary),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _titleController,
          decoration: InputDecoration(
            labelText: 'Titre de l\'article ou service',
            hintText: 'ex: MacBook Air M2 256GB Gris Sidéral',
            prefixIcon: const Icon(LucideIcons.package, color: TrustColors.primary),
            filled: true,
            fillColor: TrustColors.card,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _descriptionController,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: 'Description détaillée',
            hintText: 'État, accessoires inclus, numéro de série...',
            filled: true,
            fillColor: TrustColors.card,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _deliveryTermsController,
          maxLines: 2,
          decoration: InputDecoration(
            labelText: 'Modalités de livraison',
            filled: true,
            fillColor: TrustColors.card,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
      ],
    );
  }

  Widget _buildStep3Recap() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Récapitulatif du Séquestre',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 6),
        const Text(
          'Vérifiez tous les éléments avant de bloquer les fonds.',
          style: TextStyle(fontSize: 13, color: TrustColors.textSecondary),
        ),
        const SizedBox(height: 24),
        TrustCard(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildRecapItem('Vendeur', _sellerController.text.trim(), LucideIcons.user),
              const Divider(color: TrustColors.border, height: 24),
              _buildRecapItem('Article', _titleController.text.trim(), LucideIcons.package),
              const Divider(color: TrustColors.border, height: 24),
              _buildRecapItem('Montant total', _currencyFormat.format(_amount), LucideIcons.shieldCheck, isPrimary: true),
              const Divider(color: TrustColors.border, height: 24),
              _buildRecapItem('Modalités', _deliveryTermsController.text.trim(), LucideIcons.truck),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: TrustColors.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: TrustColors.primary.withValues(alpha: 0.2)),
          ),
          child: const Row(
            children: [
              Icon(LucideIcons.lock, color: TrustColors.primary, size: 20),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Vos fonds seront conservés en coffre-fort numérique jusqu\'à confirmation OTP de la bonne réception.',
                  style: TextStyle(fontSize: 11, color: TrustColors.textSecondary, height: 1.4),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFeeRow(String label, String value, {bool isBold = false, bool isHighlight = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: isHighlight ? TrustColors.cyan : TrustColors.textSecondary,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: isHighlight ? TrustColors.cyan : Colors.white,
          ),
        ),
      ],
    );
  }

  Widget _buildRecapItem(String label, String value, IconData icon, {bool isPrimary = false}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: isPrimary ? TrustColors.primary : TrustColors.textSecondary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 11, color: TrustColors.textSecondary),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontSize: isPrimary ? 17 : 14,
                  fontWeight: FontWeight.bold,
                  color: isPrimary ? TrustColors.primary : Colors.white,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
