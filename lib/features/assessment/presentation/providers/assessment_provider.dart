import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/question_model.dart';

final assessmentProvider = StateNotifierProvider.family<AssessmentNotifier, AssessmentState, String>((ref, assessmentId) {
  return AssessmentNotifier(assessmentId);
});

class AssessmentState {
  final bool isLoading;
  final List<Question> questions;
  final int currentIndex;
  final Map<String, String> selectedAnswers; 
  final int timeRemaining;
  final bool isSubmitting;

  AssessmentState({
    required this.isLoading,
    this.questions = const [],
    this.currentIndex = 0,
    this.selectedAnswers = const {},
    this.timeRemaining = 3600, 
    this.isSubmitting = false,
  });

  AssessmentState copyWith({
    bool? isLoading,
    List<Question>? questions,
    int? currentIndex,
    Map<String, String>? selectedAnswers,
    int? timeRemaining,
    bool? isSubmitting,
  }) {
    return AssessmentState(
      isLoading: isLoading ?? this.isLoading,
      questions: questions ?? this.questions,
      currentIndex: currentIndex ?? this.currentIndex,
      selectedAnswers: selectedAnswers ?? this.selectedAnswers,
      timeRemaining: timeRemaining ?? this.timeRemaining,
      isSubmitting: isSubmitting ?? this.isSubmitting,
    );
  }
}

class AssessmentNotifier extends StateNotifier<AssessmentState> {
  final String assessmentId;
  final _supabase = Supabase.instance.client;
  
  AssessmentNotifier(this.assessmentId) : super(AssessmentState(isLoading: true)) {
    _loadAssessment();
  }

  Future<void> _loadAssessment() async {
    try {
      // 1. Fetch time limitations and constraints reliably
      final meta = await _supabase.from('assessments').select('time_limit').eq('assessment_id', assessmentId).single();
      final timeLimit = (meta['time_limit'] as int) * 60; // minutes -> seconds

      // 2. Fetch Questions (Will only succeed returning authorized columns due to RLS setup in Phase 1)
      final List<dynamic> qData = await _supabase.from('questions').select('question_id, assessment_id, question_text, options').eq('assessment_id', assessmentId);
      final questions = qData.map((e) => Question.fromJson(e)).toList();

      state = state.copyWith(isLoading: false, questions: questions, timeRemaining: timeLimit);
    } catch (e) {
      state = state.copyWith(isLoading: false);
    }
  }

  void selectAnswer(String questionId, String answer) {
    if (state.isSubmitting) return; // Freeze states dynamically if already transacting network payload
    final updated = Map<String, String>.from(state.selectedAnswers);
    updated[questionId] = answer;
    state = state.copyWith(selectedAnswers: updated);
  }

  void setIndex(int index) {
    if (index >= 0 && index < state.questions.length && !state.isSubmitting) {
      state = state.copyWith(currentIndex: index);
    }
  }

  void decrementTimer() {
    if (state.timeRemaining > 0 && !state.isSubmitting) {
      state = state.copyWith(timeRemaining: state.timeRemaining - 1);
    } else if (state.timeRemaining == 0 && !state.isSubmitting) {
      submitAssessment(); // Time expiry forces immutable submission
    }
  }

  Future<Map<String, dynamic>> submitAssessment() async {
    if (state.isSubmitting) return {'status': 'error', 'message': 'Transacting in progress...'};
    state = state.copyWith(isSubmitting: true);
    
    try {
      // Secure Grade Evaluation: Offloading heavy validation mapping to Deno Edge Infrastructure
      final response = await _supabase.functions.invoke(
        'evaluate_assessment',
        body: {
          'assessment_id': assessmentId,
          'answers': state.selectedAnswers,
        },
      );
      
      return {
        'status': 'success',
        'score': response.data['score'],
        'result_status': response.data['status']
      };
    } catch(e) {
      state = state.copyWith(isSubmitting: false);
      return {'status': 'error', 'message': e.toString()};
    }
  }
}
