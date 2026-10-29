class UserProfile {
  final int id;
  final String username;
  final String email;
  final String role; // 'client', 'seller', 'member', 'developer', 'deaph'
  final bool isKycApproved;
  final String kycStatus;
  final bool isStaff;
  final String? phone;
  final String? fullName;

  UserProfile({
    required this.id,
    required this.username,
    required this.email,
    required this.role,
    this.isKycApproved = false,
    this.kycStatus = 'UNVERIFIED',
    this.isStaff = false,
    this.phone,
    this.fullName,
  });

  static int _asInt(dynamic value) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: _asInt(json['id'] ?? json['user_id']),
      username: json['username']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? 'client',
      isKycApproved: json['is_kyc_approved'] == true,
      kycStatus: json['kyc_status']?.toString() ?? 'UNVERIFIED',
      isStaff: json['is_staff'] == true,
      phone: json['phone']?.toString(),
      fullName: json['full_name']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'role': role,
      'is_kyc_approved': isKycApproved,
      'kyc_status': kycStatus,
      'is_staff': isStaff,
      'phone': phone,
      'full_name': fullName,
    };
  }

  bool get isAdmin => role == 'deaph' || isStaff;
  bool get isDeveloper => role == 'developer' || isAdmin;

  /// Les offres / paylinks sont réservés aux vendeurs et membres.
  bool get canSell => role == 'seller' || role == 'member' || isAdmin;

  /// Seul un client peut initier un séquestre direct.
  bool get canCreateEscrow => role == 'client';

  bool get canManageApiKeys => isDeveloper;
}
