class EscrowTransaction {
  final int id;
  final String reference;
  final String? offerCode;
  final String itemTitle;
  final String itemDescription;
  final String deliveryTerms;
  final double amount;
  final double feeAmount;
  final double netAmount;
  final double commissionRate;
  final String currency;
  final String status; // 'CREATED', 'BLOCKED', 'RELEASED', 'REFUNDED', 'DISPUTED'
  final String? buyerUsername;
  final String? sellerUsername;
  final String? buyerName;
  final String? sellerName;
  final String? roleCurrentUser; // 'buyer' or 'seller'
  final String? deliveryOtp;
  final String? checkoutUrl;
  final String? providerReference;
  final String? disputeReason;
  final DateTime? autoReleaseAt;
  final DateTime? blockedAt;
  final DateTime createdAt;

  EscrowTransaction({
    required this.id,
    required this.reference,
    this.offerCode,
    required this.itemTitle,
    required this.itemDescription,
    required this.deliveryTerms,
    required this.amount,
    required this.feeAmount,
    required this.netAmount,
    this.commissionRate = 0.01,
    required this.currency,
    required this.status,
    this.buyerUsername,
    this.sellerUsername,
    this.buyerName,
    this.sellerName,
    this.roleCurrentUser,
    this.deliveryOtp,
    this.checkoutUrl,
    this.providerReference,
    this.disputeReason,
    this.autoReleaseAt,
    this.blockedAt,
    required this.createdAt,
  });

  static double _asDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0.0;
  }

  static DateTime? _asDate(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value.toString());
  }

  factory EscrowTransaction.fromJson(Map<String, dynamic> json) {
    return EscrowTransaction(
      id: json['id'] is int ? json['id'] as int : int.tryParse('${json['id']}') ?? 0,
      reference: json['reference']?.toString() ?? 'TR-${json['id']}',
      offerCode: json['offer_code']?.toString(),
      itemTitle: json['item_title']?.toString() ?? 'Transaction Sécurisée',
      itemDescription: json['item_description']?.toString() ?? '',
      deliveryTerms: json['delivery_terms']?.toString() ??
          'Remise en main propre contre code OTP',
      amount: _asDouble(json['amount']),
      feeAmount: _asDouble(json['fee_amount']),
      netAmount: _asDouble(json['net_amount']),
      commissionRate: _asDouble(json['commission_rate']),
      currency: json['currency']?.toString() ?? 'XOF',
      status: json['status']?.toString() ?? 'CREATED',
      buyerUsername: json['buyer_username']?.toString(),
      sellerUsername: json['seller_username']?.toString(),
      buyerName: json['buyer_name']?.toString(),
      sellerName: json['seller_name']?.toString(),
      roleCurrentUser: json['role_current_user']?.toString(),
      deliveryOtp: json['delivery_otp']?.toString(),
      checkoutUrl: json['checkout_url']?.toString(),
      providerReference: json['provider_reference']?.toString(),
      disputeReason: json['dispute_reason']?.toString(),
      autoReleaseAt: _asDate(json['auto_release_at']),
      blockedAt: _asDate(json['blocked_at']),
      createdAt: _asDate(json['created_at']) ?? DateTime.now(),
    );
  }

  bool get isBuyer => roleCurrentUser == 'buyer';
  bool get isSeller => roleCurrentUser == 'seller';
  bool get isBlocked => status == 'BLOCKED';
  bool get isReleased => status == 'RELEASED';
  bool get isDisputed => status == 'DISPUTED';
  bool get isRefunded => status == 'REFUNDED';
}
