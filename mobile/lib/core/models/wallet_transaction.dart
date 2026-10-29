class WalletTransaction {
  final int id;
  final String reference;
  final String type; // TOPUP, WITHDRAWAL
  final String typeLabel;
  final double amount;
  final double fee;
  final String method;
  final String methodLabel;
  final String phone;
  final String beneficiaryName;
  final String status; // PENDING, COMPLETED, FAILED
  final String statusLabel;
  final String? failureReason;
  final DateTime? createdAt;
  final DateTime? completedAt;

  WalletTransaction({
    required this.id,
    required this.reference,
    required this.type,
    required this.typeLabel,
    required this.amount,
    required this.fee,
    required this.method,
    required this.methodLabel,
    required this.phone,
    required this.beneficiaryName,
    required this.status,
    required this.statusLabel,
    this.failureReason,
    this.createdAt,
    this.completedAt,
  });

  static double _asDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  static DateTime? _asDate(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value.toString());
  }

  factory WalletTransaction.fromJson(Map<String, dynamic> json) {
    return WalletTransaction(
      id: json['id'] is int
          ? json['id'] as int
          : int.tryParse('${json['id']}') ?? 0,
      reference: json['reference']?.toString() ?? '',
      type: json['type']?.toString() ?? 'TOPUP',
      typeLabel: json['type_label']?.toString() ?? '',
      amount: _asDouble(json['amount']),
      fee: _asDouble(json['fee']),
      method: json['method']?.toString() ?? '',
      methodLabel: json['method_label']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      beneficiaryName: json['beneficiary_name']?.toString() ?? '',
      status: json['status']?.toString() ?? 'PENDING',
      statusLabel: json['status_label']?.toString() ?? '',
      failureReason: json['failure_reason']?.toString(),
      createdAt: _asDate(json['created_at']),
      completedAt: _asDate(json['completed_at']),
    );
  }

  bool get isTopup => type == 'TOPUP';
  bool get isCompleted => status == 'COMPLETED';
  bool get isPending => status == 'PENDING';
  bool get isFailed => status == 'FAILED';
  String get directionLabel =>
      isTopup ? 'Rechargement' : 'Retrait';
}

class WalletOverview {
  final double balance;
  final double availableBalance;
  final double pendingWithdrawals;
  final double escrowCredits;
  final double topups;
  final double withdrawals;
  final String walletId;
  final List<WalletTransaction> transactions;

  WalletOverview({
    required this.balance,
    required this.availableBalance,
    required this.pendingWithdrawals,
    required this.escrowCredits,
    required this.topups,
    required this.withdrawals,
    required this.walletId,
    required this.transactions,
  });

  static double _asDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  factory WalletOverview.fromJson(Map<String, dynamic> json) {
    final rawTransactions = json['transactions'];
    return WalletOverview(
      balance: _asDouble(json['balance']),
      availableBalance: _asDouble(json['available_balance']),
      pendingWithdrawals: _asDouble(json['pending_withdrawals']),
      escrowCredits: _asDouble(json['escrow_credits']),
      topups: _asDouble(json['topups']),
      withdrawals: _asDouble(json['withdrawals']),
      walletId: json['wallet_id']?.toString() ?? '',
      transactions: rawTransactions is List
          ? rawTransactions
              .whereType<Map>()
              .map((e) => WalletTransaction.fromJson(
                    Map<String, dynamic>.from(e),
                  ))
              .toList()
          : const [],
    );
  }
}
