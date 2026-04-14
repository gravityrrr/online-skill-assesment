import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:skill_assessment/core/theme/app_theme.dart';
import 'package:skill_assessment/features/auth/presentation/providers/auth_provider.dart';

class WebNavbar extends ConsumerWidget implements PreferredSizeWidget {
  final String title;
  
  const WebNavbar({super.key, required this.title});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      width: double.infinity,
      height: 80,
      padding: const EdgeInsets.symmetric(horizontal: 48),
      decoration: BoxDecoration(
        color: const Color(0xFF07080A), // Emits an extremely sleek black glass header specifically designed for high-resolution Desktop constraints
        border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.05), width: 1.5)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.4), blurRadius: 20)],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(Icons.blur_on, color: AppTheme.neonAccent, size: 36),
              const SizedBox(width: 16),
              Text(
                title.toUpperCase(), 
                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: 2)
              ),
            ],
          ),
          
          MouseRegion(
            cursor: SystemMouseCursors.click,
            child: GestureDetector(
              onTap: () {
                ref.read(authStateProvider.notifier).signOut();
                Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.redAccent.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.redAccent.withOpacity(0.5)),
                ),
                child: const Text("DISCONNECT HUB", style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
              ),
            ),
          )
        ],
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(80);
}
