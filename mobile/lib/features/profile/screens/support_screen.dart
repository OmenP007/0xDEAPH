import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/colors.dart';
import '../../../shared/widgets/trust_card.dart';

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Aide & Support 24/7'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const TrustCard(
            padding: EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(LucideIcons.headphones, color: TrustColors.primary, size: 28),
                SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Centre d\'Assistance Trust',
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Notre équipe de médiation et de support technique est disponible 24h/24 et 7j/7 pour vous aider.',
                        style: TextStyle(color: TrustColors.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text('Canaux de contact rapides', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14)),
          const SizedBox(height: 12),
          TrustCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(LucideIcons.messageSquare, color: TrustColors.success),
                  title: const Text('Chat WhatsApp Direct', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  subtitle: const Text('Réponse moyenne en 5 minutes', style: TextStyle(color: TrustColors.textSecondary, fontSize: 11)),
                  trailing: const Icon(LucideIcons.externalLink, size: 16, color: TrustColors.textSecondary),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Ouverture de WhatsApp support...')),
                    );
                  },
                ),
                const Divider(color: TrustColors.border, height: 1),
                ListTile(
                  leading: const Icon(LucideIcons.mail, color: TrustColors.primary),
                  title: const Text('Support par Email', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  subtitle: const Text('support@trust.sn', style: TextStyle(color: TrustColors.textSecondary, fontSize: 11)),
                  trailing: const Icon(LucideIcons.chevronRight, size: 16, color: TrustColors.textSecondary),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Email copié : support@trust.sn')),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text('Foire Aux Questions (FAQ)', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14)),
          const SizedBox(height: 12),
          const TrustCard(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Comment fonctionne le séquestre ?', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13)),
                SizedBox(height: 4),
                Text('L\'acheteur dépose les fonds. Trust les bloque en toute sécurité. Le vendeur livre le bien/service. L\'acheteur valide avec son code OTP, les fonds sont libérés instantanément.', style: TextStyle(color: TrustColors.textSecondary, fontSize: 12)),
                SizedBox(height: 16),
                Text('Que se passe-t-il en cas de litige ?', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13)),
                SizedBox(height: 4),
                Text('En cas de désaccord, notre équipe d\'arbitrage examine les preuves fournies par les deux parties sous 48h.', style: TextStyle(color: TrustColors.textSecondary, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
