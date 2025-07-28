# API Design Document

## RESTful API Endpoints for AWS AI Practitioner Quiz

### Base URL: `/api/v1`

### Authentication
- For now: No authentication (development phase)
- Future: JWT tokens or AWS Cognito integration

### Endpoints

#### 1. Quiz Session Management

**POST `/api/v1/quiz/start`**
- **Purpose**: Initialize a new quiz session
- **Request Body**:
  ```json
  {
    "difficulty?": "beginner" | "intermediate" | "advanced",
    "userId?": "string",
    "preferences?": {
      "domains": ["AI Services", "Machine Learning Fundamentals"],
      "timeLimit": 1800
    }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "session_12345",
      "totalQuestions": 10,
      "timeLimit": 1800,
      "firstQuestion": {
        "id": "q_1234567890_abc123",
        "question": "Which AWS service...",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "difficulty": "beginner",
        "topic": "Amazon SageMaker",
        "questionNumber": 1
      }
    }
  }
  ```

**GET `/api/v1/quiz/session/:sessionId`**
- **Purpose**: Get current session status
- **Response**: Session progress and current state

#### 2. Question Management

**GET `/api/v1/quiz/question/:sessionId`**
- **Purpose**: Get next question (with adaptive difficulty)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "question": {
        "id": "q_1234567890_abc123",
        "question": "Which AWS service is primarily used for...",
        "options": ["Amazon SageMaker", "Amazon Bedrock", "Amazon Rekognition", "Amazon Textract"],
        "difficulty": "intermediate",
        "topic": "AI Services",
        "aiPractitionerDomain": "AI Services",
        "questionNumber": 5
      },
      "progress": {
        "currentQuestion": 5,
        "totalQuestions": 10,
        "correctAnswers": 3,
        "timeRemaining": 1200
      }
    }
  }
  ```

#### 3. Answer Submission

**POST `/api/v1/quiz/answer`**
- **Purpose**: Submit answer and get feedback
- **Request Body**:
  ```json
  {
    "sessionId": "session_12345",
    "questionId": "q_1234567890_abc123",
    "selectedAnswer": 1,
    "timeSpent": 45
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "isCorrect": false,
      "correctAnswer": 0,
      "explanation": "The correct answer is Amazon SageMaker because...",
      "score": {
        "current": 3,
        "total": 5,
        "percentage": 60
      },
      "nextQuestion": {
        "id": "q_1234567890_def456",
        "question": "Next question...",
        "options": ["A", "B", "C", "D"],
        "difficulty": "beginner",
        "questionNumber": 6
      },
      "isQuizComplete": false
    }
  }
  ```

#### 4. Quiz Results

**GET `/api/v1/quiz/results/:sessionId`**
- **Purpose**: Get final quiz results
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "session_12345",
      "finalScore": {
        "correct": 7,
        "total": 10,
        "percentage": 70,
        "passed": true
      },
      "timeSpent": 1200,
      "domainBreakdown": {
        "AI Services": { "correct": 3, "total": 4 },
        "Machine Learning Fundamentals": { "correct": 2, "total": 3 },
        "Responsible AI": { "correct": 1, "total": 2 },
        "Generative AI": { "correct": 1, "total": 1 }
      },
      "difficultyBreakdown": {
        "beginner": { "correct": 3, "total": 3 },
        "intermediate": { "correct": 3, "total": 4 },
        "advanced": { "correct": 1, "total": 3 }
      }
    }
  }
  ```

#### 5. Progress Tracking

**GET `/api/v1/quiz/progress/:sessionId`**
- **Purpose**: Get current progress without next question
- **Response**: Current session state and statistics

#### 6. Health Check

**GET `/api/v1/health`**
- **Purpose**: API health check
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "timestamp": "2025-07-27T22:30:00Z",
      "version": "1.0.0",
      "bedrock": "connected"
    }
  }
  ```

### Error Responses

All endpoints return consistent error format:
```json
{
  "success": false,
  "error": {
    "code": "BEDROCK_CONNECTION_FAILED",
    "message": "Unable to generate question",
    "details": "Connection timeout to AWS Bedrock"
  },
  "timestamp": "2025-07-27T22:30:00Z"
}
```

### HTTP Status Codes
- `200 OK`: Success
- `201 Created`: Resource created (new session)
- `400 Bad Request`: Invalid request
- `404 Not Found`: Session/resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
