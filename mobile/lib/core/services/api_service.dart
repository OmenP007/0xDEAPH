import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/api_endpoints.dart';
import '../models/escrow_transaction.dart';
import '../models/api_key.dart';
import '../models/kyc_record.dart';
import '../models/offer.dart';
import '../models/user_profile.dart';
import '../models/wallet_transaction.dart';

/// Erreur lisible pour l'UI à partir d'une réponse backend.
String describeApiError(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map) {
      for (final key in const ['detail', 'message', 'error']) {
        final value = data[key];
        if (value is String && value.isNotEmpty) return value;
        if (value is List && value.isNotEmpty) return value.first.toString();
      }
      for (final value in data.values) {
        if (value is String && value.isNotEmpty) return value;
        if (value is List && value.isNotEmpty) return value.first.toString();
      }
    }
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      return 'Le serveur met trop de temps à répondre.';
    }
    if (error.type == DioExceptionType.connectionError) {
      return 'Serveur inaccessible. Vérifiez votre connexion.';
    }
  }
  return error.toString().replaceFirst('Exception: ', '').trim();
}

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio dio;
  late final Dio _refreshDio;
  final FlutterSecureStorage storage = const FlutterSecureStorage();

  static const String keyAccessToken = 'trust_access_token';
  static const String keyRefreshToken = 'trust_refresh_token';
  static const String keyUserData = 'trust_user_data';

  /// Appelé quand la session ne peut plus être rafraîchie (401 définitif).
  void Function()? onSessionExpired;

  Future<bool>? _refreshInFlight;

  /// Exposé uniquement pour les tests (adaptateur HTTP mocké).
  @visibleForTesting
  Dio get refreshDio => _refreshDio;

  ApiService._internal() {
    final options = BaseOptions(
      baseUrl: ApiEndpoints.defaultBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );

    dio = Dio(options);
    _refreshDio = Dio(options);

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await storage.read(key: keyAccessToken);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Seul un 401 invalide la session. Les 429/5xx restent transitoires.
          if (error.response?.statusCode != 401) {
            return handler.next(error);
          }

          final path = error.requestOptions.path;
          if (path.contains('/api/token/') ||
              path.contains('/api/developer/token/')) {
            return handler.next(error);
          }

          if (error.requestOptions.extra['auth_retry'] == true) {
            await _expireSession();
            return handler.next(error);
          }

          final refreshed = await _refreshAccessToken();
          if (!refreshed) {
            await _expireSession();
            return handler.next(error);
          }

          final token = await storage.read(key: keyAccessToken);
          final options = error.requestOptions;
          options.extra['auth_retry'] = true;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          try {
            final response = await dio.fetch(options);
            return handler.resolve(response);
          } on DioException catch (retryError) {
            return handler.next(retryError);
          }
        },
      ),
    );
  }

  void updateBaseUrl(String newBaseUrl) {
    dio.options.baseUrl = newBaseUrl;
    _refreshDio.options.baseUrl = newBaseUrl;
  }

  Future<void> saveTokens({required String access, String? refresh}) async {
    await storage.write(key: keyAccessToken, value: access);
    if (refresh != null && refresh.isNotEmpty) {
      await storage.write(key: keyRefreshToken, value: refresh);
    }
  }

  Future<String?> getAccessToken() async {
    return await storage.read(key: keyAccessToken);
  }

  Future<String?> getRefreshToken() async {
    return await storage.read(key: keyRefreshToken);
  }

  Future<void> clearAuth() async {
    await storage.delete(key: keyAccessToken);
    await storage.delete(key: keyRefreshToken);
    await storage.delete(key: keyUserData);
  }

  Future<bool> _refreshAccessToken() {
    final inFlight = _refreshInFlight;
    if (inFlight != null) return inFlight;

    final future = _doRefresh();
    _refreshInFlight = future;
    future.whenComplete(() {
      if (identical(_refreshInFlight, future)) _refreshInFlight = null;
    });
    return future;
  }

  Future<bool> _doRefresh() async {
    final refresh = await getRefreshToken();
    if (refresh == null || refresh.isEmpty) return false;

    try {
      final response = await _refreshDio.post(
        ApiEndpoints.refreshToken,
        data: {'refresh': refresh},
      );
      final access = response.data is Map ? response.data['access'] : null;
      if (access is! String || access.isEmpty) return false;
      final rotated = response.data is Map ? response.data['refresh'] : null;
      await saveTokens(
        access: access,
        refresh: rotated is String ? rotated : null,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _expireSession() async {
    await clearAuth();
    onSessionExpired?.call();
  }

  // ─── Profil ────────────────────────────────────────────────────────────────

  Future<UserProfile> getMe() async {
    final response = await dio.get(ApiEndpoints.me);
    return UserProfile.fromJson(_asMap(response.data));
  }

  Future<UserProfile> updateMe(Map<String, dynamic> data) async {
    final response = await dio.patch(ApiEndpoints.me, data: data);
    return UserProfile.fromJson(_asMap(response.data));
  }

  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
    required String newPassword2,
  }) async {
    await dio.post(
      ApiEndpoints.changePassword,
      data: {
        'old_password': oldPassword,
        'new_password': newPassword,
        'new_password2': newPassword2,
      },
    );
  }

  // ─── KYC ───────────────────────────────────────────────────────────────────

  Future<KycRecord> getKyc() async {
    final response = await dio.get(ApiEndpoints.kyc);
    return KycRecord.fromJson(_asMap(response.data));
  }

  Future<KycRecord> submitKyc({
    required String idType,
    required String idNumber,
    required String fullName,
    String documentUrl = '',
  }) async {
    final response = await dio.post(
      ApiEndpoints.kyc,
      data: {
        'id_type': idType,
        'id_number': idNumber,
        'full_name': fullName,
        'document_url': documentUrl,
      },
    );
    return KycRecord.fromJson(_asMap(response.data));
  }

  // ─── Clés API développeur ──────────────────────────────────────────────────

  Future<List<ApiKey>> getApiKeys() async {
    final response = await dio.get(ApiEndpoints.apiKeys);
    final data = response.data;
    final results = data is Map ? data['results'] : data;
    if (results is! List) return const [];
    return results
        .whereType<Map>()
        .map((e) => ApiKey.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<ApiKey> createApiKey({
    required String name,
    required List<String> scopes,
    DateTime? expiresAt,
  }) async {
    final response = await dio.post(
      ApiEndpoints.apiKeys,
      data: {
        'name': name,
        'scopes': scopes,
        if (expiresAt != null) 'expires_at': expiresAt.toUtc().toIso8601String(),
      },
    );
    return ApiKey.fromJson(_asMap(response.data));
  }

  Future<void> revokeApiKey(int id) async {
    await dio.delete(ApiEndpoints.apiKeyRevoke(id));
  }

  // ─── Paiements ─────────────────────────────────────────────────────────────

  /// Récupère tous les paiements de l'utilisateur, en gérant la pagination DRF.
  Future<List<EscrowTransaction>> getPayments() async {
    final items = <EscrowTransaction>[];
    var page = 1;

    while (page <= 20) {
      final response = await dio.get(
        ApiEndpoints.payments,
        queryParameters: {'page': page},
      );
      final data = response.data;
      final results = data is Map ? data['results'] : data;
      if (results is! List) break;

      items.addAll(
        results
            .whereType<Map>()
            .map((e) => EscrowTransaction.fromJson(Map<String, dynamic>.from(e))),
      );

      final hasNext = data is Map && data['next'] != null;
      if (!hasNext) break;
      page++;
    }

    return items;
  }

  Future<EscrowTransaction> getPayment(int id) async {
    final response = await dio.get(ApiEndpoints.paymentDetail(id));
    return EscrowTransaction.fromJson(_asMap(response.data));
  }

  Future<EscrowTransaction> createPayment(Map<String, dynamic> data) async {
    final response = await dio.post(ApiEndpoints.payments, data: data);
    return EscrowTransaction.fromJson(_asMap(response.data));
  }

  Future<EscrowTransaction> confirmDelivery(int id, String otp) async {
    final response = await dio.post(
      ApiEndpoints.paymentConfirmDelivery(id),
      data: {'otp': otp},
    );
    return EscrowTransaction.fromJson(_asMap(response.data));
  }

  // ─── Offres / Paylinks ─────────────────────────────────────────────────────

  Future<List<Offer>> getOffers() async {
    final response = await dio.get(ApiEndpoints.offers);
    final data = response.data;
    final results = data is Map ? data['results'] : data;
    if (results is! List) return const [];
    return results
        .whereType<Map>()
        .map((e) => Offer.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Offer> createOffer(Map<String, dynamic> data) async {
    final response = await dio.post(ApiEndpoints.offers, data: data);
    return Offer.fromJson(_asMap(response.data));
  }

  // ─── Portefeuille ──────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getWallet() async {
    final response = await dio.get(ApiEndpoints.wallet);
    return _asMap(response.data);
  }

  Future<WalletOverview> getWalletOverview() async {
    return WalletOverview.fromJson(await getWallet());
  }

  Future<Map<String, dynamic>> walletTopup({
    required double amount,
    required String method,
    required String phone,
  }) async {
    final response = await dio.post(
      ApiEndpoints.walletTopup,
      data: {'amount': amount, 'method': method, 'phone': phone},
    );
    return _asMap(response.data);
  }

  Future<Map<String, dynamic>> walletWithdraw({
    required double amount,
    required String method,
    required String phone,
  }) async {
    final response = await dio.post(
      ApiEndpoints.walletWithdraw,
      data: {'amount': amount, 'method': method, 'phone': phone},
    );
    return _asMap(response.data);
  }

  // ─── Configuration plateforme ──────────────────────────────────────────────

  Future<Map<String, dynamic>> getPlatformSettings() async {
    final response = await dio.get(ApiEndpoints.platformSettings);
    return _asMap(response.data);
  }

  static Map<String, dynamic> _asMap(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    throw const FormatException('Réponse serveur inattendue.');
  }
}
