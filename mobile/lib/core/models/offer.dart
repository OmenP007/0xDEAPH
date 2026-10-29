class Offer {
  final int id;
  final String code;
  final String title;
  final String description;
  final double amount;
  final String currency;
  final String? deliveryTerms;
  final String sellerUsername;
  final bool sellerKycApproved;
  final String sellerKycStatus;
  final String? payUrl;
  final bool isActive;
  final DateTime createdAt;

  Offer({
    required this.id,
    required this.code,
    required this.title,
    required this.description,
    required this.amount,
    required this.currency,
    this.deliveryTerms,
    required this.sellerUsername,
    this.sellerKycApproved = false,
    this.sellerKycStatus = 'UNVERIFIED',
    this.payUrl,
    required this.isActive,
    required this.createdAt,
  });

  factory Offer.fromJson(Map<String, dynamic> json) {
    final code = json['code']?.toString() ?? '';
    return Offer(
      id: json['id'] is int ? json['id'] as int : int.tryParse('${json['id']}') ?? 0,
      code: code,
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      amount: json['amount'] is num
          ? (json['amount'] as num).toDouble()
          : double.tryParse(json['amount']?.toString() ?? '') ?? 0.0,
      currency: json['currency']?.toString() ?? 'XOF',
      deliveryTerms: json['delivery_terms']?.toString(),
      sellerUsername: json['seller_username']?.toString() ?? '',
      sellerKycApproved: json['seller_kyc_approved'] == true,
      sellerKycStatus: json['seller_kyc_status']?.toString() ?? 'UNVERIFIED',
      payUrl: json['pay_url']?.toString(),
      isActive: json['is_active'] != false,
      createdAt:
          DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  /// URL fournie par le backend (`pay_url`) ou fallback local.
  String get resolvedPayUrl =>
      (payUrl != null && payUrl!.isNotEmpty) ? payUrl! : 'https://trust.sn/pay/$code';
}
