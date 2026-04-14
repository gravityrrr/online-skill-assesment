import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color darkBackground = Color(0xFF0A0C10);
  static const Color neonAccent = Color(0xFF00FFCC);
  static const Color secondaryAccent = Color(0xFFFF007F);
  static const Color surfaceColor = Color(0xFF13151A);
  static const Color textMain = Colors.white;
  static const Color textMuted = Color(0xFF8E92A4);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBackground,
      primaryColor: neonAccent,
      colorScheme: const ColorScheme.dark(
        primary: neonAccent,
        secondary: secondaryAccent,
        surface: surfaceColor,
        background: darkBackground,
      ),
      textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme).copyWith(
        displayLarge: GoogleFonts.outfit(color: textMain, fontWeight: FontWeight.bold),
        bodyLarge: GoogleFonts.outfit(color: textMuted),
      ),
    );
  }
}
