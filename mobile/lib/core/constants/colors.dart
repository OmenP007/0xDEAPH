import 'package:flutter/material.dart';

class TrustColors {
  // Brand Signatures
  static const Color primary = Color(0xFF7B3DFF);      // Violet TRUST
  static const Color primaryLight = Color(0xFFA277FF); // Violet clair
  static const Color cyan = Color(0xFF00E5FF);         // Cyan électrique
  static const Color accent = Color(0xFF00E5FF);

  // Dark Theme Surfaces (FinTech High-End)
  static const Color darkBg = Color(0xFF0B0F14);        // Fond principal sombre
  static const Color darkSurface = Color(0xFF131820);   // Cartes / Modales sombres
  static const Color darkSurface2 = Color(0xFF1A2030);  // Inputs sombres
  static const Color darkBorder = Color(0xFF1E2638);    // Bordures sombres

  // Light Theme Surfaces
  static const Color lightBg = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightBorder = Color(0xFFE2E8F0);

  // Status & Feedback
  static const Color success = Color(0xFF10B981);       // Emerald
  static const Color warning = Color(0xFFF59E0B);       // Amber
  static const Color error = Color(0xFFEF4444);         // Rose / Rouge
  static const Color info = Color(0xFF3B82F6);          // Blue

  // Text Colors
  static const Color textDark = Color(0xFFF4F6FC);
  static const Color textLight = Color(0xFF0F172A);
  static const Color textMuted = Color(0xFF94A3B8);

  // Alias sémantiques utilisés par les écrans (thème sombre par défaut)
  static const Color background = darkBg;
  static const Color surface = darkSurface;
  static const Color card = darkSurface2;
  static const Color cardBackground = darkSurface2;
  static const Color border = darkBorder;
  static const Color textSecondary = textMuted;

  // Brand Gradient
  static const LinearGradient brandGradient = LinearGradient(
    colors: [primary, cyan],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFF1A1528), Color(0xFF0D1117)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
