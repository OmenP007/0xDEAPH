import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/colors.dart';
import '../../../core/models/api_key.dart';
import '../../../core/services/api_service.dart';
import '../../../core/services/auth_service.dart';
import '../../../shared/widgets/trust_card.dart';

class ApiKeysScreen extends StatefulWidget {
  const ApiKeysScreen({super.key});

  @override
  State<ApiKeysScreen> createState() => _ApiKeysScreenState();
}

class _ApiKeysScreenState extends State<ApiKeysScreen> {
  static const _scopeOptions = <String, String>{
    'payments:read': 'Lire les paiements',
    'payments:create': 'Créer des paiements',
    'payments:refund': 'Rembourser des paiements',
  };

  bool _isLoading = true;
  String? _error;
  List<ApiKey> _keys = const [];

  @override
  void initState() {
    super.initState();
    _loadKeys();
  }

  Future<void> _loadKeys() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final keys = await context.read<ApiService>().getApiKeys();
      if (!mounted) return;
      setState(() {
        _keys = keys;
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

  Future<void> _showCreateDialog() async {
    final nameController = TextEditingController();
    final selectedScopes = <String>{'payments:read'};
    var isCreating = false;
    String? formError;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          Future<void> create() async {
            final name = nameController.text.trim();
            if (name.isEmpty) {
              setDialogState(() => formError = 'Le nom de la clé est requis.');
              return;
            }
            if (selectedScopes.isEmpty) {
              setDialogState(
                () => formError = 'Sélectionnez au moins un scope.',
              );
              return;
            }

            setDialogState(() {
              isCreating = true;
              formError = null;
            });

            try {
              final created =
                  await context.read<ApiService>().createApiKey(
                        name: name,
                        scopes: selectedScopes.toList(),
                      );
              if (!ctx.mounted) return;
              Navigator.pop(ctx);
              if (!mounted) return;
              await _showSecretDialog(created);
              _loadKeys();
            } catch (error) {
              if (!ctx.mounted) return;
              setDialogState(() {
                isCreating = false;
                formError = describeApiError(error);
              });
            }
          }

          return AlertDialog(
            backgroundColor: TrustColors.surface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            title: const Text(
              'Nouvelle clé API',
              style: TextStyle(color: Colors.white),
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: nameController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Nom de la clé',
                      hintText: 'Ex: Boutique en ligne',
                      filled: true,
                      fillColor: TrustColors.card,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Scopes autorisés',
                    style: TextStyle(
                      color: TrustColors.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ..._scopeOptions.entries.map(
                    (entry) => CheckboxListTile(
                      value: selectedScopes.contains(entry.key),
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      activeColor: TrustColors.primary,
                      title: Text(
                        entry.value,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                        ),
                      ),
                      subtitle: Text(
                        entry.key,
                        style: const TextStyle(
                          color: TrustColors.textMuted,
                          fontSize: 10,
                        ),
                      ),
                      onChanged: (checked) {
                        setDialogState(() {
                          if (checked == true) {
                            selectedScopes.add(entry.key);
                          } else {
                            selectedScopes.remove(entry.key);
                          }
                        });
                      },
                    ),
                  ),
                  if (formError != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      formError!,
                      style: const TextStyle(
                        color: TrustColors.error,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: isCreating ? null : () => Navigator.pop(ctx),
                child: const Text(
                  'Annuler',
                  style: TextStyle(color: TrustColors.textSecondary),
                ),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: TrustColors.primary,
                ),
                onPressed: isCreating ? null : create,
                child: isCreating
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Créer'),
              ),
            ],
          );
        },
      ),
    );

    nameController.dispose();
  }

  Future<void> _showSecretDialog(ApiKey key) async {
    final secret = key.secret ?? '';
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: TrustColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Clé créée',
          style: TextStyle(color: Colors.white),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Copiez cette clé maintenant : elle ne sera plus jamais affichée.',
              style: TextStyle(
                color: TrustColors.warning,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: TrustColors.cardBackground,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: TrustColors.border),
              ),
              child: SelectableText(
                secret,
                style: const TextStyle(
                  color: TrustColors.cyan,
                  fontFamily: 'monospace',
                  fontSize: 11,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: secret));
              if (!ctx.mounted) return;
              Navigator.pop(ctx);
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Clé copiée dans le presse-papier.')),
              );
            },
            child: const Text('Copier et fermer'),
          ),
        ],
      ),
    );
  }

  Future<void> _revoke(ApiKey key) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: TrustColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Révoquer cette clé ?',
          style: TextStyle(color: Colors.white),
        ),
        content: Text(
          'La clé « ${key.name} » cessera immédiatement de fonctionner sur vos intégrations.',
          style: const TextStyle(
            color: TrustColors.textSecondary,
            fontSize: 13,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text(
              'Annuler',
              style: TextStyle(color: TrustColors.textSecondary),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: TrustColors.error,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Révoquer'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      await context.read<ApiService>().revokeApiKey(key.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: TrustColors.success,
          content: Text('Clé API révoquée.'),
        ),
      );
      _loadKeys();
    } catch (error) {
      if (!mounted) return;
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
    final user = context.watch<AuthService>().user;
    final allowed = user?.canManageApiKeys == true;

    if (!allowed) {
      return Scaffold(
        appBar: AppBar(title: const Text('Clés API Développeur')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(32),
            child: Text(
              'Les clés API sont réservées aux comptes développeurs.',
              textAlign: TextAlign.center,
              style: TextStyle(color: TrustColors.textSecondary),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Clés API Développeur'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: _loadKeys,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateDialog,
        backgroundColor: TrustColors.primary,
        icon: const Icon(Icons.add),
        label: const Text('Créer une clé'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadKeys,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 90),
                children: [
                  const TrustCard(
                    padding: EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Icon(
                          LucideIcons.code,
                          color: TrustColors.primary,
                          size: 28,
                        ),
                        SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Intégration Paiement & Escrow',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  fontSize: 14,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Utilisez ces clés pour intégrer le séquestre '
                                'Trust sur votre site ou votre boutique.',
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
                  const SizedBox(height: 20),
                  if (_keys.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 50),
                      child: Center(
                        child: Text(
                          'Aucune clé API. Créez-en une pour démarrer votre intégration.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: TrustColors.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    )
                  else
                    ..._keys.map(_buildKeyCard),
                ],
              ),
            ),
    );
  }

  Widget _buildKeyCard(ApiKey key) {
    final created = key.createdAt;
    final lastUsed = key.lastUsed;
    final statusColor = key.isActive
        ? (key.isExpired ? TrustColors.warning : TrustColors.success)
        : TrustColors.textMuted;
    final statusLabel = !key.isActive
        ? 'RÉVOQUÉE'
        : (key.isExpired ? 'EXPIRÉE' : 'ACTIVE');

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TrustCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    key.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      fontSize: 14,
                    ),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              key.maskedKey,
              style: const TextStyle(
                color: TrustColors.cyan,
                fontFamily: 'monospace',
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: key.scopes
                  .map(
                    (scope) => Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: TrustColors.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        scope,
                        style: const TextStyle(
                          color: TrustColors.primary,
                          fontSize: 9,
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 10),
            Text(
              [
                if (created != null)
                  'Créée le ${DateFormat('dd/MM/yyyy', 'fr_FR').format(created.toLocal())}',
                if (lastUsed != null)
                  'Dernier usage ${DateFormat('dd/MM/yyyy', 'fr_FR').format(lastUsed.toLocal())}'
                else
                  'Jamais utilisée',
              ].join(' • '),
              style: const TextStyle(
                color: TrustColors.textMuted,
                fontSize: 10,
              ),
            ),
            if (key.isActive) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: () => _revoke(key),
                  icon: const Icon(
                    LucideIcons.trash2,
                    size: 14,
                    color: TrustColors.error,
                  ),
                  label: const Text(
                    'Révoquer',
                    style: TextStyle(
                      color: TrustColors.error,
                      fontSize: 11,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
