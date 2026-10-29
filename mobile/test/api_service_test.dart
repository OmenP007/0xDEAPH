import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trust_mobile/core/services/api_service.dart';
import 'package:trust_mobile/core/services/auth_service.dart';

typedef _Handler = Future<ResponseBody> Function(RequestOptions options);

class _FakeAdapter implements HttpClientAdapter {
  _FakeAdapter(this.handler);

  final _Handler handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) {
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _json(Object data, {int status = 200}) {
  return ResponseBody.fromString(
    jsonEncode(data),
    status,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );
}

Map<String, dynamic> _payment(int id, {String status = 'BLOCKED'}) {
  return {
    'id': id,
    'reference': 'TR-$id',
    'item_title': 'Article $id',
    'item_description': 'Description',
    'delivery_terms': 'Remise en main propre',
    'amount': 50000,
    'fee_amount': 500,
    'net_amount': 49500,
    'commission_rate': 0.01,
    'currency': 'XOF',
    'status': status,
    'buyer_username': 'alice',
    'seller_username': 'bob',
    'role_current_user': 'buyer',
    'created_at': '2026-10-29T10:00:00Z',
  };
}

void main() {
  final api = ApiService();

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    api.onSessionExpired = null;
  });

  test('getPayments() agrège les pages DRF', () async {
    var calls = 0;
    api.dio.httpClientAdapter = _FakeAdapter((options) async {
      calls++;
      final page = options.queryParameters['page'];
      if (page == 1) {
        return _json({
          'count': 3,
          'next': 'http://server/api/payments/?page=2',
          'previous': null,
          'results': [_payment(1), _payment(2)],
        });
      }
      return _json({
        'count': 3,
        'next': null,
        'previous': null,
        'results': [_payment(3, status: 'RELEASED')],
      });
    });

    final payments = await api.getPayments();

    expect(payments, hasLength(3));
    expect(calls, 2);
    expect(payments.first.reference, 'TR-1');
    expect(payments.last.status, 'RELEASED');
    expect(payments.first.createdAt.year, 2026);
  });

  test('login() utilise le profil renvoyé par le backend', () async {
    api.dio.httpClientAdapter = _FakeAdapter((options) async {
      expect(options.path, '/api/token/');
      return _json({
        'access': 'access-token',
        'refresh': 'refresh-token',
        'role': 'client',
        'user_id': 42,
        'user': {
          'id': 42,
          'username': 'alice',
          'email': 'alice@example.com',
          'role': 'client',
          'is_kyc_approved': false,
          'kyc_status': 'UNVERIFIED',
        },
      });
    });

    final auth = AuthService(api: api);
    final ok = await auth.login('alice', 'secret123');

    expect(ok, isTrue);
    expect(auth.user, isNotNull);
    expect(auth.user!.id, 42);
    expect(auth.user!.email, 'alice@example.com');
    expect(auth.user!.isKycApproved, isFalse);
    expect(await api.getAccessToken(), 'access-token');
    expect(await api.getRefreshToken(), 'refresh-token');
  });

  test('un 401 déclenche le refresh puis rejoue la requête', () async {
    await api.saveTokens(access: 'expired', refresh: 'refresh-token');
    var paymentCalls = 0;
    var refreshCalls = 0;

    final adapter = _FakeAdapter((options) async {
      if (options.path == '/api/token/refresh/') {
        refreshCalls++;
        return _json({'access': 'new-access'});
      }
      if (options.path == '/api/payments/') {
        paymentCalls++;
        if (paymentCalls == 1) {
          return _json({'detail': 'Token expiré.'}, status: 401);
        }
        return _json({
          'count': 1,
          'next': null,
          'previous': null,
          'results': [_payment(1)],
        });
      }
      throw StateError('Requête inattendue: ${options.path}');
    });
    api.dio.httpClientAdapter = adapter;
    api.refreshDio.httpClientAdapter = adapter;

    final payments = await api.getPayments();

    expect(payments, hasLength(1));
    expect(paymentCalls, 2);
    expect(refreshCalls, 1);
    expect(await api.getAccessToken(), 'new-access');
  });

  test('un 429 ne supprime pas la session', () async {
    await api.saveTokens(access: 'still-valid', refresh: 'refresh-token');
    api.dio.httpClientAdapter = _FakeAdapter(
      (_) async => _json({'detail': 'Trop de requêtes.'}, status: 429),
    );

    await expectLater(
      api.dio.get('/api/payments/'),
      throwsA(isA<DioException>()),
    );

    expect(await api.getAccessToken(), 'still-valid');
  });

  test('submitKyc() envoie le contrat backend et renvoie le statut', () async {
    api.dio.httpClientAdapter = _FakeAdapter((options) async {
      expect(options.path, '/api/kyc/');
      expect(options.method, 'POST');
      final data = Map<String, dynamic>.from(options.data as Map);
      expect(data['id_type'], 'cni');
      expect(data['id_number'], 'SN-123');
      expect(data['full_name'], 'Alice Doe');
      expect(data['document_url'], 'https://example.com/doc.pdf');
      return _json({
        'id': 5,
        'status': 'PENDING',
        'id_type': 'cni',
        'id_number': 'SN-123',
        'full_name': 'Alice Doe',
        'document_url': 'https://example.com/doc.pdf',
        'rejection_reason': '',
        'submitted_at': '2026-10-29T10:00:00Z',
      }, status: 201);
    });

    final kyc = await api.submitKyc(
      idType: 'cni',
      idNumber: 'SN-123',
      fullName: 'Alice Doe',
      documentUrl: 'https://example.com/doc.pdf',
    );

    expect(kyc.isPending, isTrue);
    expect(kyc.id, 5);
    expect(kyc.submittedAt?.year, 2026);
  });

  test('createApiKey() expose le secret une seule fois', () async {
    api.dio.httpClientAdapter = _FakeAdapter((options) async {
      expect(options.path, '/api/keys/');
      final data = Map<String, dynamic>.from(options.data as Map);
      expect(data['name'], 'Boutique');
      expect(data['scopes'], ['payments:read']);
      return _json({
        'id': 7,
        'name': 'Boutique',
        'prefix': '0xs_live_abcd',
        'scopes': ['payments:read'],
        'is_active': true,
        'secret': '0xs_live_secret_value',
        'created_at': '2026-10-29T10:00:00Z',
      }, status: 201);
    });

    final key = await api.createApiKey(
      name: 'Boutique',
      scopes: const ['payments:read'],
    );

    expect(key.id, 7);
    expect(key.secret, '0xs_live_secret_value');
    expect(key.isActive, isTrue);
  });

  test('getWalletOverview() expose le solde et les mouvements', () async {
    api.dio.httpClientAdapter = _FakeAdapter((options) async {
      expect(options.path, '/api/wallet/');
      return _json({
        'balance': 15000,
        'available_balance': 10000,
        'pending_withdrawals': 5000,
        'escrow_credits': 15000,
        'topups': 0,
        'withdrawals': 0,
        'wallet_id': 'TRUST-ALICE-01',
        'transactions': [
          {
            'id': 1,
            'reference': 'WDR-1',
            'type': 'WITHDRAWAL',
            'type_label': 'Retrait',
            'amount': 5000,
            'fee': 0,
            'method': 'WAVE',
            'method_label': 'Wave',
            'status': 'PENDING',
            'status_label': 'En attente',
            'created_at': '2026-10-29T10:00:00Z',
          },
        ],
      });
    });

    final wallet = await api.getWalletOverview();

    expect(wallet.availableBalance, 10000);
    expect(wallet.pendingWithdrawals, 5000);
    expect(wallet.transactions, hasLength(1));
    expect(wallet.transactions.single.isTopup, isFalse);
    expect(wallet.transactions.single.isPending, isTrue);
  });

  test('changePassword() appelle /api/me/password/', () async {
    api.dio.httpClientAdapter = _FakeAdapter((options) async {
      expect(options.path, '/api/me/password/');
      final data = Map<String, dynamic>.from(options.data as Map);
      expect(data['old_password'], 'ancien');
      expect(data['new_password'], 'nouveau123');
      expect(data['new_password2'], 'nouveau123');
      return _json({'detail': 'Mot de passe mis à jour avec succès.'});
    });

    await api.changePassword(
      oldPassword: 'ancien',
      newPassword: 'nouveau123',
      newPassword2: 'nouveau123',
    );
  });
}
