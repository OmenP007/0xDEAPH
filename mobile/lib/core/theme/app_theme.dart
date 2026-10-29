import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/colors.dart';

class AppTheme {
  static ThemeData get darkTheme {
    final baseTextTheme = GoogleFonts.plusJakartaSansTextTheme(ThemeData.dark().textTheme);

    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: TrustColors.primary,
      scaffoldBackgroundColor: TrustColors.darkBg,
      cardColor: TrustColors.darkSurface,
      dividerColor: TrustColors.darkBorder,
      colorScheme: const ColorScheme.dark(
        primary: TrustColors.primary,
        secondary: TrustColors.cyan,
        surface: TrustColors.darkSurface,
        error: TrustColors.error,
      ),
      textTheme: baseTextTheme.apply(
        bodyColor: TrustColors.textDark,
        displayColor: TrustColors.textDark,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: TrustColors.darkBg,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.plusJakartaSans(
          color: TrustColors.textDark,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        iconTheme: const IconThemeData(color: TrustColors.textDark),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: TrustColors.darkSurface2,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: TrustColors.darkBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: TrustColors.darkBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: TrustColors.primary, width: 2),
        ),
        labelStyle: const TextStyle(color: TrustColors.textMuted, fontSize: 13),
        hintStyle: const TextStyle(color: TrustColors.textMuted, fontSize: 13),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: TrustColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          padding: const EdgeInsets.symmetric(vertical: 16),
          elevation: 0,
          textStyle: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  static ThemeData get lightTheme {
    final baseTextTheme = GoogleFonts.plusJakartaSansTextTheme(ThemeData.light().textTheme);

    return ThemeData(
      brightness: Brightness.light,
      primaryColor: TrustColors.primary,
      scaffoldBackgroundColor: TrustColors.lightBg,
      cardColor: TrustColors.lightSurface,
      dividerColor: TrustColors.lightBorder,
      colorScheme: const ColorScheme.light(
        primary: TrustColors.primary,
        secondary: TrustColors.cyan,
        surface: TrustColors.lightSurface,
        error: TrustColors.error,
      ),
      textTheme: baseTextTheme.apply(
        bodyColor: TrustColors.textLight,
        displayColor: TrustColors.textLight,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: TrustColors.lightBg,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.plusJakartaSans(
          color: TrustColors.textLight,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        iconTheme: const IconThemeData(color: TrustColors.textLight),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: TrustColors.lightBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: TrustColors.lightBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: TrustColors.primary, width: 2),
        ),
      ),
    );
  }
}
