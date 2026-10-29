class ApiEndpoints {
  // Surchargeable au build :
  // flutter run --dart-define=API_BASE_URL=http://192.168.1.10:8000
  // Émulateur Android par défaut : 10.0.2.2:8000
  static const String defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000',
  );

  static const String login = '/api/token/';
  static const String register = '/api/register/';
  static const String refreshToken = '/api/token/refresh/';
  static const String me = '/api/me/';
  static const String changePassword = '/api/me/password/';

  static const String payments = '/api/payments/';
  static String paymentDetail(int id) => '/api/payments/$id/';
  static String paymentConfirmDelivery(int id) =>
      '/api/payments/$id/confirm-delivery/';
  static String paymentRelease(int id) => '/api/payments/$id/release/';
  static String paymentRefund(int id) => '/api/payments/$id/refund/';
  static String paymentDispute(int id) => '/api/payments/$id/dispute/';
  static const String autoRelease = '/api/payments/auto-release/';

  static const String offers = '/api/offers/';
  static String offerDetail(String code) => '/api/offers/$code/';
  static String offerCheckout(String code) => '/api/offers/$code/checkout/';

  static const String wallet = '/api/wallet/';
  static const String walletTopup = '/api/wallet/topup/';
  static const String walletWithdraw = '/api/wallet/withdraw/';

  static const String platformSettings = '/api/platform/settings/';

  static const String kyc = '/api/kyc/';
  static const String apiKeys = '/api/keys/';
  static String apiKeyRevoke(int id) => '/api/keys/$id/revoke/';
}
