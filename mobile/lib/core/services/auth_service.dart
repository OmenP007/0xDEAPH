import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../constants/api_endpoints.dart';
import '../models/user_profile.dart';
import 'api_service.dart';

class AuthService extends ChangeNotifier {
  AuthService({ApiService? api}) : _api = api ?? ApiService() {
    _api.onSessionExpired = _handleSessionExpired;
  }

  final ApiService _api;

  UserProfile? _user;
  bool _isLoading = true;
  String? _errorMessage;

  UserProfile? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  /// Restaure la session puis valide le token auprès de `/api/me/`.
  Future<void> initAuth() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _api.getAccessToken();
      if (token == null || token.isEmpty) {
        _user = null;
        return;
      }

      final cached = await _api.storage.read(key: ApiService.keyUserData);
      if (cached != null && cached.isNotEmpty) {
        try {
          _user = UserProfile.fromJson(jsonDecode(cached));
        } catch (_) {
          _user = null;
        }
      }

      try {
        final fresh = await _api.getMe();
        _user = fresh;
        await _persist(fresh);
      } on DioException catch (error) {
        // 401 => le refresh a déjà échoué, la session est invalide.
        if (error.response?.statusCode == 401) {
          _user = null;
        }
        // Erreur réseau : on conserve le profil en cache (mode hors-ligne).
      }
    } catch (_) {
      _user = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _api.dio.post(
        ApiEndpoints.login,
        data: {'username': username, 'password': password},
      );

      final access = response.data is Map ? response.data['access'] : null;
      final refresh = response.data is Map ? response.data['refresh'] : null;
      if (access is! String || access.isEmpty) {
        throw const FormatException('Réponse de connexion invalide.');
      }
      await _api.saveTokens(
        access: access,
        refresh: refresh is String ? refresh : null,
      );

      UserProfile profile;
      final userData = response.data is Map ? response.data['user'] : null;
      if (userData is Map) {
        profile = UserProfile.fromJson(Map<String, dynamic>.from(userData));
      } else {
        // Repli si une ancienne version du backend ne renvoie pas `user`.
        profile = UserProfile(
          id: _asInt(response.data['user_id']),
          username: response.data['username']?.toString() ?? username,
          email: response.data['email']?.toString() ?? '',
          role: response.data['role']?.toString() ?? 'client',
          isKycApproved: response.data['is_kyc_approved'] == true,
        );
        profile = await _api.getMe();
      }

      _user = profile;
      await _persist(profile);
      _isLoading = false;
      notifyListeners();
      return true;
    } on DioException catch (error) {
      _isLoading = false;
      _errorMessage = describeApiError(error);
      notifyListeners();
      return false;
    } catch (error) {
      _isLoading = false;
      _errorMessage = describeApiError(error);
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String username,
    required String email,
    required String password,
    required String password2,
    String role = 'client',
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _api.dio.post(
        ApiEndpoints.register,
        data: {
          'username': username,
          'email': email,
          'password': password,
          'password2': password2,
          'role': role,
        },
      );

      return await login(username, password);
    } on DioException catch (error) {
      _isLoading = false;
      _errorMessage = describeApiError(error);
      notifyListeners();
      return false;
    } catch (error) {
      _isLoading = false;
      _errorMessage = describeApiError(error);
      notifyListeners();
      return false;
    }
  }

  /// Recharge le profil depuis le backend.
  Future<void> refreshProfile() async {
    try {
      final profile = await _api.getMe();
      _user = profile;
      await _persist(profile);
      notifyListeners();
    } on DioException catch (error) {
      if (error.response?.statusCode == 401) {
        _user = null;
        notifyListeners();
      }
    }
  }

  /// Met à jour les champs autorisés (nom complet, téléphone).
  Future<bool> updateProfile({
    String? fullName,
    String? phone,
  }) async {
    try {
      final profile = await _api.updateMe({
        if (fullName != null) 'full_name': fullName,
        if (phone != null) 'phone': phone,
      });
      _user = profile;
      await _persist(profile);
      notifyListeners();
      return true;
    } catch (error) {
      _errorMessage = describeApiError(error);
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _api.clearAuth();
    _user = null;
    _errorMessage = null;
    notifyListeners();
  }

  void clearError() {
    if (_errorMessage == null) return;
    _errorMessage = null;
    notifyListeners();
  }

  void _handleSessionExpired() {
    if (_user == null) return;
    _user = null;
    notifyListeners();
  }

  Future<void> _persist(UserProfile profile) async {
    await _api.storage.write(
      key: ApiService.keyUserData,
      value: jsonEncode(profile.toJson()),
    );
  }

  static int _asInt(dynamic value) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
