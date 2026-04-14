class Question {
  final String id;
  final String assessmentId;
  final String text;
  final List<String> options;

  Question({
    required this.id, 
    required this.assessmentId, 
    required this.text, 
    required this.options,
  });

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['question_id'],
      assessmentId: json['assessment_id'],
      text: json['question_text'],
      // Map options explicitly from JSONB Array Format
      options: List<String>.from(json['options'] ?? []),
    );
  }
}
