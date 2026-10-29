import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/colors.dart';
import '../../../core/models/kyc_record.dart';
import '../../../core/services/api_service.dart';
import '../../../core/services/auth_service.dart';
import '../../../shared/widgets/trust_button.dart';
import '../../../shared/widgets/trust_card.dart';

class KycVerificationScreen extends StatefulWidget {
  const KycVerificationScreen({super.key});

  @override
  State<KycVerificationScreen> createState() => _KycVerificationScreenState();
}

class _KycVerificationScreenState extends State<KycVerificationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _idNumberController = TextEditingController();
  final _documentUrlController = TextEditingController();

  String _docType = 'cni';
  KycRecord? _kyc;
  bool _isLoading = true;
  bool _isSubmitting = false;
  bool _prefilled = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadKyc();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_prefilled) return;
    _prefilled = true;
    final user = context.read<AuthService>().user;
    if (user?.fullName != null && user!.fullName!.isNotEmpty) {
      _fullNameController.text = user.fullName!;
    }
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _idNumberController.dispose();
    _documentUrlController.dispose();
    super.dispose();
  }

  Future<void> _loadKyc() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final kyc = await context.read<ApiService>().getKyc();
      if (!mounted) return;
      setState(() {
        _kyc = kyc;
        _docType = const ['cni', 'passport', 'driving_license']
                .contains(kyc.idType)
            ? kyc.idType
            : 'cni';
        if (kyc.idNumber.isNotEmpty) _idNumberController.text = kyc.idNumber;
        if (kyc.fullName.isNotEmpty) _fullNameController.text = kyc.fullName;
        if (kyc.documentUrl.isNotEmpty) {
          _documentUrlController.text = kyc.documentUrl;
        }
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = describeApiError(error);
        _isLoading = false;
      });
    }
  }

  Future<void> _submitKyc() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final kyc = await context.read<ApiService>().submitKyc(
            idType: _docType,
            idNumber: _idNumberController.text.trim(),
            fullName: _fullNameController.text.trim(),
            documentUrl: _documentUrlController.text.trim(),
          );
      if (!mounted) return;
      await context.read<AuthService>().refreshProfile();
      if (!mounted) return;
      setState(() {
        _kyc = kyc;
        _isSubmitting = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: TrustColors.success,
          content: Text(
            'Dossier KYC soumis. Il est en attente de vérification.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = describeApiError(error);
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Vérification d\'identité (KYC)')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadKyc,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  _buildIntroCard(),
                  const SizedBox(height: 16),
                  if (_error != null) ...[
                    _buildErrorBanner(_error!),
                    const SizedBox(height: 16),
                  ],
                  if (_kyc?.isApproved == true)
                    _buildStatusView(
                      icon: LucideIcons.shieldCheck,
                      color: TrustColors.success,
                      title: 'Identité vérifiée',
                      message:
                          'Votre dossier a été approuvé. Les limites de votre compte sont débloquées.',
                    )
                  else if (_kyc?.isPending == true)
                    _buildStatusView(
                      icon: LucideIcons.clock,
                      color: TrustColors.warning,
                      title: 'Dossier en cours de vérification',
                      message:
                          'Notre équipe de conformité examine votre pièce d\'identité. '
                          'Vous serez notifié dès qu\'une décision sera prise.',
                    )
                  else ...[
                    if (_kyc?.isRejected == true) ...[
                      _buildStatusView(
                        icon: LucideIcons.xCircle,
                        color: TrustColors.error,
                        title: 'Dossier rejeté',
                        message: _kyc!.rejectionReason.isNotEmpty
                            ? _kyc!.rejectionReason
                            : 'Votre dossier a été rejeté. Corrigez les informations puis soumettez à nouveau.',
                      ),
                      const SizedBox(height: 20),
                    ],
                    _buildForm(),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildIntroCard() {
    return const TrustCard(
      padding: EdgeInsets.all(16),
      child: Row(
        children: [
          Icon(LucideIcons.shieldAlert,
              color: TrustColors.primary, size: 28),
          SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Sécurité & Conformité',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'La vérification d\'identité garantit des transactions de '
                  'séquestre sécurisées et conformes à la réglementation.',
                  style: TextStyle(
                    color: TrustColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusView({
    required IconData icon,
    required Color color,
    required String title,
    required String message,
  }) {
    return TrustCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 40),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: TrustColors.textSecondary,
              fontSize: 12,
            ),
          ),
          if (_kyc?.submittedAt != null) ...[
            const SizedBox(height: 12),
            Text(
              'Soumis le ${_formatDate(_kyc!.submittedAt!)}',
              style: const TextStyle(
                color: TrustColors.textMuted,
                fontSize: 11,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Type de document',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: Colors.white,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _docType,
            dropdownColor: TrustColors.surface,
            style: const TextStyle(color: Colors.white),
            decoration: _inputDecoration(),
            items: const [
              DropdownMenuItem(
                value: 'cni',
                child: Text('Carte Nationale d\'Identité (CNI)'),
              ),
              DropdownMenuItem(
                value: 'passport',
                child: Text('Passeport biométrique'),
              ),
              DropdownMenuItem(
                value: 'driving_license',
                child: Text('Permis de conduire'),
              ),
            ],
            onChanged: (val) => setState(() => _docType = val ?? 'cni'),
          ),
          const SizedBox(height: 16),
          const Text(
            'Nom complet (tel qu\'il figure sur le document)',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: Colors.white,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _fullNameController,
            style: const TextStyle(color: Colors.white),
            textCapitalization: TextCapitalization.words,
            decoration: _inputDecoration(hint: 'Ex: Amadou Diallo'),
            validator: (v) => (v?.trim().isEmpty ?? true)
                ? 'Veuillez entrer votre nom complet'
                : null,
          ),
          const SizedBox(height: 16),
          const Text(
            'Numéro du document',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: Colors.white,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _idNumberController,
            style: const TextStyle(color: Colors.white),
            decoration: _inputDecoration(hint: 'Ex: 1234567892024'),
            validator: (v) => (v?.trim().isEmpty ?? true)
                ? 'Veuillez entrer le numéro de pièce'
                : null,
          ),
          const SizedBox(height: 16),
          const Text(
            'Lien du document (optionnel)',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: Colors.white,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _documentUrlController,
            style: const TextStyle(color: Colors.white),
            keyboardType: TextInputType.url,
            decoration: _inputDecoration(
              hint: 'https://storage.example.com/ma-piece.pdf',
            ),
            validator: (value) {
              final v = value?.trim() ?? '';
              if (v.isEmpty) return null;
              if (!v.startsWith('https://') && !v.startsWith('/media/')) {
                return 'Le lien doit commencer par https:// ou /media/';
              }
              return null;
            },
          ),
          const SizedBox(height: 8),
          const Text(
            'Le backend accepte uniquement un lien sécurisé HTTPS vers le '
            'document. L\'envoi direct de fichiers sera ajouté ultérieurement.',
            style: TextStyle(color: TrustColors.textMuted, fontSize: 10),
          ),
          const SizedBox(height: 28),
          TrustButton(
            text: 'Soumettre pour vérification',
            icon: LucideIcons.checkCircle,
            isLoading: _isSubmitting,
            onPressed: _isSubmitting ? null : _submitKyc,
          ),
        ],
      ),
    );
  }

  Widget _buildErrorBanner(String message) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: TrustColors.error.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: TrustColors.error.withValues(alpha: 0.3)),
      ),
      child: Text(
        message,
        style: const TextStyle(color: TrustColors.error, fontSize: 11),
      ),
    );
  }

  InputDecoration _inputDecoration({String? hint}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: TrustColors.textMuted),
      filled: true,
      fillColor: TrustColors.cardBackground,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: TrustColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: TrustColors.border),
      ),
    );
  }

  static String _formatDate(DateTime date) {
    final local = date.toLocal();
    final d = local.day.toString().padLeft(2, '0');
    final m = local.month.toString().padLeft(2, '0');
    final h = local.hour.toString().padLeft(2, '0');
    final min = local.minute.toString().padLeft(2, '0');
    return '$d/$m/${local.year} à $h:$min';
  }
}
