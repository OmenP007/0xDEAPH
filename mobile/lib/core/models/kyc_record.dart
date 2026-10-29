class KycRecord {
  final int? id;
  final String status; // NONE, PENDING, APPROVED, REJECTED
  final String idType;
  final String idNumber;
  final String fullName;
  final String documentUrl;
  final String rejectionReason;
  final DateTime? submittedAt;
  final DateTime? reviewedAt;

  KycRecord({
    this.id,
    required this.status,
    this.idType = 'cni',
    this.idNumber = '',
    this.fullName = '',
    this.documentUrl = '',
    this.rejectionReason = '',
    this.submittedAt,
    this.reviewedAt,
  });

  static DateTime? _asDate(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value.toString());
  }

  factory KycRecord.fromJson(Map<String, dynamic> json) {
    return KycRecord(
      id: json['id'] is int
          ? json['id'] as int
          : int.tryParse('${json['id']}'),
      status: json['status']?.toString() ?? 'NONE',
      idType: json['id_type']?.toString() ?? 'cni',
      idNumber: json['id_number']?.toString() ?? '',
      fullName: json['full_name']?.toString() ?? '',
      documentUrl: json['document_url']?.toString() ?? '',
      rejectionReason: json['rejection_reason']?.toString() ?? '',
      submittedAt: _asDate(json['submitted_at']),
      reviewedAt: _asDate(json['reviewed_at']),
    );
  }

  bool get isApproved => status == 'APPROVED';
  bool get isPending => status == 'PENDING';
  bool get isRejected => status == 'REJECTED';
  bool get hasRecord => status != 'NONE';
}
