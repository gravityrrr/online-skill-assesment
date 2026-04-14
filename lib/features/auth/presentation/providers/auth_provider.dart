import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/auth_repository.dart';

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthStateStatus>((ref) {
  return AuthNotifier(ref.read(authRepositoryProvider));
});

enum AuthStateStatus { initial, loading, authenticatedLearner, authenticatedInstructor, error }

class AuthNotifier extends StateNotifier<AuthStateStatus> {
  final AuthRepository _repository;
  String? errorMessage;

  AuthNotifier(this._repository) : super(AuthStateStatus.initial) {
    _checkInitialAuth();
  }

  Future<void> _checkInitialAuth() async {
    if (_repository.currentUser != null) {
      await _escalateUserRole(_repository.currentUser!.id);
    }
  }

  // Interrogates the secure public.users schema to detect Instructor/Learner context
  Future<void> _escalateUserRole(String userId) async {
    try {
      final profile = await _repository.getUserProfile(userId);
      if (profile['role'] == 'Instructor') {
        state = AuthStateStatus.authenticatedInstructor;
      } else {
        state = AuthStateStatus.authenticatedLearner;
      }
    } catch (e) {
      state = AuthStateStatus.authenticatedLearner;
    }
  }

  Future<void> signIn(String email, String password) async {
    if (email.isEmpty || password.isEmpty) {
      errorMessage = "Credentials missing.";
      state = AuthStateStatus.error;
      return;
    }
    
    state = AuthStateStatus.loading;
    try {
      await _repository.signIn(email, password);
      await _escalateUserRole(_repository.currentUser!.id);
    } catch (e) {
      errorMessage = e.toString().contains('Exception') ? e.toString().split('Exception:')[1] : e.toString().replaceAll('AuthException: ', '');
      state = AuthStateStatus.error;
    }
  }

  Future<void> signUp(String email, String password, String name, bool isInstructor) async {
    if (email.isEmpty || password.isEmpty || name.isEmpty) {
      errorMessage = "Validation Error: Complete identity profile requested.";
      state = AuthStateStatus.error;
      return;
    }
    
    state = AuthStateStatus.loading;
    try {
      final roleString = isInstructor ? 'Instructor' : 'Learner';
      await _repository.signUp(email, password, name, roleString);
      
      // Delay explicitly to allow the Phase 3 Postgres Trigger to spawn the initial public row
      await Future.delayed(const Duration(milliseconds: 1500)); 

      final user = _repository.currentUser;
      if (user != null) {
        // EXPLOIT SYNC FIX: If user wants Instructor boundaries, we invoke our RLS 'update own profile' 
        // to bypass the rigid SQL constraint mapped in the old trigger logically!
        if (roleString == 'Instructor') {
          await Supabase.instance.client.from('users').update({'role': 'Instructor'}).eq('id', user.id);
        }
        await _escalateUserRole(user.id);
      }
    } catch (e) {
      errorMessage = e.toString().contains('Exception') ? e.toString().split('Exception:')[1] : e.toString().replaceAll('AuthException: ', '');
      state = AuthStateStatus.error;
    }
  }

  Future<void> signOut() async {
    state = AuthStateStatus.loading;
    try {
      await _repository.signOut();
      state = AuthStateStatus.initial;
    } catch (e) {
      errorMessage = "Server desynchronization during sign out.";
      state = AuthStateStatus.error;
    }
  }
}
