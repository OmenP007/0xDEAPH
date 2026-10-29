import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/colors.dart';
import '../../../core/services/api_service.dart';
import '../../../shared/widgets/trust_button.dart';
import '../../../shared/widgets/trust_card.dart';

class SecurityScreen extends StatefulWidget {
  const SecurityScreen({super.key});

  @override
  State<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends State<SecurityScreen> {
  final _formKey = GlobalKey<FormState>();
  final _oldPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    if (!_formKey.currentState!.validate()) return;
    if (_newPasswordController.text != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: TrustColors.error,
          content: Text('Les nouveaux mots de passe ne correspondent pas.'),
        ),
      );
      return;
    }

    final api = context.read<ApiService>();
    setState(() => _isLoading = true);

    try {
      await api.changePassword(
        oldPassword: _oldPasswordController.text,
        newPassword: _newPasswordController.text,
        newPassword2: _confirmPasswordController.text,
      );
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: TrustColors.success,
          content: Text('Mot de passe mis à jour avec succès.'),
        ),
      );
      Navigator.pop(context);
    } catch (error) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: TrustColors.error,
          content: Text(describeApiError(error)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sécurité & Mot de passe'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const TrustCard(
            padding: EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(LucideIcons.shieldCheck, color: TrustColors.success, size: 28),
                SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Protection du Compte',
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Modifiez votre mot de passe régulièrement et activez la double authentification pour une sécurité maximale.',
                        style: TextStyle(color: TrustColors.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const TrustCard(
            padding: EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Double Authentification (2FA)', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14)),
                    SizedBox(height: 2),
                    Text('Bientôt disponible', style: TextStyle(color: TrustColors.textMuted, fontSize: 11)),
                  ],
                ),
                Switch(
                  value: false,
                  activeThumbColor: TrustColors.primary,
                  onChanged: null,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text('Modifier le mot de passe', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14)),
          const SizedBox(height: 12),
          Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Mot de passe actuel', style: TextStyle(fontSize: 12, color: TrustColors.textSecondary)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _oldPasswordController,
                  obscureText: true,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: TrustColors.cardBackground,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: TrustColors.border)),
                  ),
                  validator: (v) => v?.isEmpty == true ? 'Champ requis' : null,
                ),
                const SizedBox(height: 16),
                const Text('Nouveau mot de passe', style: TextStyle(fontSize: 12, color: TrustColors.textSecondary)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _newPasswordController,
                  obscureText: true,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: TrustColors.cardBackground,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: TrustColors.border)),
                  ),
                  validator: (v) => (v?.length ?? 0) < 6 ? 'Minimum 6 caractères' : null,
                ),
                const SizedBox(height: 16),
                const Text('Confirmer le nouveau mot de passe', style: TextStyle(fontSize: 12, color: TrustColors.textSecondary)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: true,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: TrustColors.cardBackground,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: TrustColors.border)),
                  ),
                  validator: (v) => v?.isEmpty == true ? 'Champ requis' : null,
                ),
                const SizedBox(height: 32),
                TrustButton(
                  text: 'Mettre à jour le mot de passe',
                  icon: LucideIcons.lock,
                  isLoading: _isLoading,
                  onPressed: _changePassword,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
