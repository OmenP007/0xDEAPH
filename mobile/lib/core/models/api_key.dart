class ApiKey {
  final int id;
  final String name;
  final String prefix;
  final List<String> scopes;
  final bool isActive;
  final DateTime? expiresAt;
  final DateTime? lastUsed;
  final DateTime? createdAt;

  /// Secret en clair, renvoyé uniquement à la création.
  final String? secret;

  ApiKey({
    required this.id,
    required this.name,
    required this.prefix,
    required this.scopes,
    required this.isActive,
    this.expiresAt,
    this.lastUsed,
    this.createdAt,
    this.secret,
  });

  static DateTime? _asDate(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value.toString());
  }

  factory ApiKey.fromJson(Map<String, dynamic> json) {
    return ApiKey(
      id: json['id'] is int
          ? json['id'] as int
          : int.tryParse('${json['id']}') ?? 0,
      name: json['name']?.toString() ?? 'Clé sans nom',
      prefix: json['prefix']?.toString() ?? '',
      scopes: json['scopes'] is List
          ? (json['scopes'] as List).map((e) => e.toString()).toList()
          : const [],
      isActive: json['is_active'] != false,
      expiresAt: _asDate(json['expires_at']),
      lastUsed: _asDate(json['last_used']),
      createdAt: _asDate(json['created_at']),
      secret: json['secret']?.toString(),
    );
  }

  bool get isExpired {
    final expiry = expiresAt;
    return expiry != null && expiry.isBefore(DateTime.now());
  }

  String get maskedKey => prefix.isEmpty ? '••••••••' : '$prefix••••••••';
}
