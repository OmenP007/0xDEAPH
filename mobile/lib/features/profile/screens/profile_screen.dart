import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/colors.dart';
import '../../../core/services/auth_service.dart';
import '../../../shared/widgets/trust_button.dart';
import '../../../shared/widgets/trust_card.dart';
import 'kyc_verification_screen.dart';
import 'api_keys_screen.dart';
import 'security_screen.dart';
import 'support_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon Profil'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // User Card
          TrustCard(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: TrustColors.primary.withValues(alpha: 0.18),
                  child: Text(
                    user?.username.isNotEmpty == true ? user!.username[0].toUpperCase() : 'U',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: TrustColors.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.username ?? 'Utilisateur',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        user?.email ?? 'contact@trust.sn',
                        style: const TextStyle(fontSize: 12, color: TrustColors.textSecondary),
                      ),
                      const SizedBox(height: 8),
                      Builder(
                        builder: (_) {
                          final status = user?.kycStatus ?? 'UNVERIFIED';
                          final approved = user?.isKycApproved == true;
                          final Color color;
                          final String label;
                          switch (status) {
                            case 'APPROVED':
                              color = TrustColors.success;
                              label = 'KYC VÉRIFIÉ ✓';
                              break;
                            case 'PENDING':
                              color = TrustColors.warning;
                              label = 'KYC EN ATTENTE';
                              break;
                            case 'REJECTED':
                              color = TrustColors.error;
                              label = 'KYC REJETÉ';
                              break;
                            default:
                              color = approved
                                  ? TrustColors.success
                                  : TrustColors.warning;
                              label = approved
                                  ? 'KYC VÉRIFIÉ ✓'
                                  : 'KYC NON VÉRIFIÉ';
                          }
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              label,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: color,
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          const Text(
            'Sécurité & Confidentialité',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 12),

          TrustCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _buildMenuItem(
                  LucideIcons.shieldCheck,
                  'Vérification d\'identité (KYC)',
                  'CNI ou Passeport',
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const KycVerificationScreen())),
                ),
                if (user?.canManageApiKeys == true) ...[
                  const Divider(color: TrustColors.border, height: 1),
                  _buildMenuItem(
                    LucideIcons.key,
                    'Clés API Développeur',
                    'Intégration e-commerce',
                    () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ApiKeysScreen())),
                  ),
                ],
                const Divider(color: TrustColors.border, height: 1),
                _buildMenuItem(
                  LucideIcons.lock,
                  'Changer de mot de passe',
                  'Sécurité renforcée',
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SecurityScreen())),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          const Text(
            'Préférences',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 12),

          TrustCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _buildMenuItem(
                  LucideIcons.bell,
                  'Notifications & SMS',
                  'Alertes temps réel',
                  () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Notifications activées pour toutes les transactions.')),
                    );
                  },
                ),
                const Divider(color: TrustColors.border, height: 1),
                _buildMenuItem(
                  LucideIcons.globe,
                  'Devise principale',
                  'Franc CFA (XOF)',
                  () {
                    showDialog(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        backgroundColor: TrustColors.surface,
                        title: const Text('Devise principale', style: TextStyle(color: Colors.white)),
                        content: const Text('La devise par défaut est le Franc CFA (XOF / FCFA).', style: TextStyle(color: TrustColors.textSecondary)),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx),
                            child: const Text('OK', style: TextStyle(color: TrustColors.primary)),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const Divider(color: TrustColors.border, height: 1),
                _buildMenuItem(
                  LucideIcons.helpCircle,
                  'Aide & Support 24/7',
                  'Assistance médiation',
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SupportScreen())),
                ),
              ],
            ),
          ),

          const SizedBox(height: 32),

          TrustButton(
            text: 'Déconnexion',
            icon: LucideIcons.logOut,
            variant: TrustButtonVariant.secondary,
            onPressed: () async {
              // AuthGate affiche automatiquement LoginScreen après déconnexion.
              await auth.logout();
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem(IconData icon, String title, String subtitle, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, size: 20, color: TrustColors.primary),
      title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 11, color: TrustColors.textSecondary)),
      trailing: const Icon(LucideIcons.chevronRight, size: 16, color: TrustColors.textSecondary),
      onTap: onTap,
    );
  }
}
