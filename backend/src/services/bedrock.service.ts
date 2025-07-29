import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  QuizQuestion,
  QuizDifficulty,
  BedrockRequest,
  BedrockResponse,
} from "../types/quiz.types";
import { AWS_CONFIG, ERROR_CODES } from "../utils/constants";
import { logger } from "../utils/logger";

export class BedrockService {
  private client: BedrockRuntimeClient;
  private readonly modelId = AWS_CONFIG.BEDROCK_MODEL_ID;
  private readonly region = AWS_CONFIG.REGION;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: this.region,
    });
    logger.info("BedrockService initialized", {
      region: this.region,
      modelId: this.modelId,
    });
  }

  /**
   * Generate a quiz question using Claude 3.5 Sonnet
   */
  async generateQuestion(request: BedrockRequest): Promise<BedrockResponse> {
    const startTime = Date.now();
    logger.info("Generating question", {
      difficulty: request.difficulty,
      topic: request.topic,
    });

    try {
      const prompt = this.buildPrompt(request);

      const input = {
        modelId: this.modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: AWS_CONFIG.MAX_TOKENS,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: AWS_CONFIG.TEMPERATURE,
          top_p: AWS_CONFIG.TOP_P,
        }),
      };

      const command = new InvokeModelCommand(input);
      const response = await this.client.send(command);

      // Add detailed logging for debugging
      logger.info("Raw Bedrock response received", {
        statusCode: response.$metadata?.httpStatusCode,
        bodyLength: response.body?.length,
        bodyType: typeof response.body,
      });

      let responseBody;
      try {
        responseBody = JSON.parse(new TextDecoder().decode(response.body));
        logger.info("Parsed Bedrock response body", {
          hasContent: !!responseBody.content,
          contentLength: responseBody.content?.length,
          contentType: typeof responseBody.content?.[0]?.text,
        });
      } catch (parseError) {
        logger.error("Failed to parse Bedrock response body", parseError, {
          bodyPreview: new TextDecoder().decode(response.body).substring(0, 500),
        });
        throw new Error(
          `Failed to parse Bedrock response: ${
            parseError instanceof Error ? parseError.message : "Unknown error"
          }`
        );
      }

      if (
        !responseBody.content ||
        !responseBody.content[0] ||
        !responseBody.content[0].text
      ) {
        logger.error("Invalid Bedrock response structure", { responseBody });
        throw new Error("Invalid response structure from Bedrock");
      }

      const questionData = this.parseResponse(responseBody.content[0].text);

      const generationTime = Date.now() - startTime;
      logger.info("Question generated successfully", {
        questionId: questionData.id,
        generationTime,
        difficulty: questionData.difficulty,
      });

      return {
        question: questionData,
        confidence: 0.95, // Claude generally produces high-quality responses
        generationTime,
      };
    } catch (error) {
      const generationTime = Date.now() - startTime;
      logger.error("Error generating question with Bedrock", error, {
        difficulty: request.difficulty,
        generationTime,
      });
      throw new Error(
        `${ERROR_CODES.BEDROCK_CONNECTION_FAILED}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Build the prompt for Claude based on difficulty and context
   */
  private buildPrompt(request: BedrockRequest): string {
    const basePrompt = `You are an expert AWS AI Practitioner certification instructor. Generate a multiple-choice quiz question for the AWS AI Practitioner certification exam.

Requirements:
- Difficulty level: ${request.difficulty}
- Question must be relevant to AWS AI/ML services and practices
- Provide exactly 4 answer options (A, B, C, D)
- Only ONE option should be correct
- Include a detailed explanation for why the correct answer is right
- Focus on practical, real-world scenarios

`;

    let difficultyGuidance = "";
    switch (request.difficulty) {
      case QuizDifficulty.BEGINNER:
        difficultyGuidance = `
For BEGINNER level:
- Focus on basic AWS AI service concepts and terminology
- Cover fundamental features of services like Amazon SageMaker, Amazon Bedrock, Amazon Rekognition
- Include basic best practices and service selection criteria
`;
        break;
      case QuizDifficulty.INTERMEDIATE:
        difficultyGuidance = `
For INTERMEDIATE level:
- Focus on implementation details and configuration options
- Cover integration patterns and architectural considerations
- Include cost optimization and performance tuning concepts
`;
        break;
      case QuizDifficulty.ADVANCED:
        difficultyGuidance = `
For ADVANCED level:
- Focus on complex scenarios and edge cases
- Cover advanced architectural patterns and troubleshooting
- Include deep technical details and optimization strategies
`;
        break;
    }

    const formatInstructions = `
Please respond in this exact JSON format:
{
  "question": "Your question here",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Detailed explanation of why the correct answer is right and why other options are wrong",
  "topic": "Main AWS service or concept covered",
  "aiPractitionerDomain": "One of: Machine Learning Fundamentals, AI Services, Responsible AI, or Generative AI"
}

CRITICAL JSON FORMATTING RULES:
- The correctAnswer should be the index (0-3) of the correct option in the options array
- IMPORTANT: Vary the position of the correct answer - don't always put it first! The correct answer can be at any position (0, 1, 2, or 3)
- In the explanation field, use \\n for line breaks (double backslash n), NOT literal newlines
- Ensure all JSON string values are properly escaped (use \\" for quotes, \\\\ for backslashes)
- Do not include any control characters or unescaped special characters in string values`;

    const excludeInstructions =
      request.excludeQuestionIds && request.excludeQuestionIds.length > 0
        ? `\nAvoid creating questions similar to these previously asked topics: ${request.excludeQuestionIds.join(
            ", "
          )}`
        : "";

    const topicFocus = request.topic
      ? `\nFocus specifically on: ${request.topic}`
      : "";

    return (
      basePrompt +
      difficultyGuidance +
      formatInstructions +
      excludeInstructions +
      topicFocus
    );
  }

  /**
   * Parse Claude's response and extract question data
   */
  private parseResponse(responseText: string): QuizQuestion {
    try {
      logger.info("Parsing Claude response", {
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 200)
      });

      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error("No JSON found in Claude response", { responseText });
        throw new Error("No JSON found in response");
      }

      logger.info("JSON extracted from response", {
        jsonPreview: jsonMatch[0].substring(0, 300)
      });

      // Sanitize the JSON string before parsing to handle control characters
      let jsonText = jsonMatch[0];
      
      // Replace unescaped newlines and other control characters
      jsonText = jsonText.replace(/([^\\])\\n/g, '$1\\\\n'); // Fix unescaped \n
      jsonText = jsonText.replace(/([^\\])\\r/g, '$1\\\\r'); // Fix unescaped \r
      jsonText = jsonText.replace(/([^\\])\\t/g, '$1\\\\t'); // Fix unescaped \t
      jsonText = jsonText.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' '); // Remove other control chars
      
      // Also handle case where string starts with unescaped newline
      jsonText = jsonText.replace(/^(.*"[^"]*?)\\n/g, '$1\\\\n');
      
      logger.info("JSON sanitized for parsing", {
        originalLength: jsonMatch[0].length,
        sanitizedLength: jsonText.length,
        sanitizedPreview: jsonText.substring(0, 300)
      });

      let questionData;
      try {
        questionData = JSON.parse(jsonText);
      } catch (jsonError) {
        logger.error("Failed to parse sanitized JSON", jsonError, {
          originalJsonText: jsonMatch[0].substring(0, 1000),
          sanitizedJsonText: jsonText.substring(0, 1000)
        });
        throw new Error(`JSON parsing failed: ${jsonError instanceof Error ? jsonError.message : "Unknown error"}`);
      }

      // Validate required fields
      if (
        !questionData.question ||
        !questionData.options ||
        !Array.isArray(questionData.options) ||
        questionData.options.length !== 4 ||
        typeof questionData.correctAnswer !== "number" ||
        questionData.correctAnswer < 0 ||
        questionData.correctAnswer > 3
      ) {
        throw new Error("Invalid question format received from Claude");
      }

      // Shuffle the options to randomize answer positions
      const { shuffledOptions, newCorrectAnswer } = this.shuffleOptions(
        questionData.options,
        questionData.correctAnswer
      );

      logger.info("Options shuffled", {
        originalCorrectAnswer: questionData.correctAnswer,
        newCorrectAnswer: newCorrectAnswer,
        originalOptions: questionData.options,
        shuffledOptions: shuffledOptions,
      });

      return {
        id: this.generateQuestionId(),
        question: questionData.question,
        options: shuffledOptions,
        correctAnswer: newCorrectAnswer,
        explanation: questionData.explanation || "No explanation provided",
        difficulty:
          this.mapToDifficulty(questionData.difficulty) ||
          QuizDifficulty.INTERMEDIATE,
        topic: questionData.topic || "AWS AI Services",
        aiPractitionerDomain:
          questionData.aiPractitionerDomain || "AI Services",
      };
    } catch (error) {
      console.error("Error parsing Claude response:", error);
      throw new Error(
        `Failed to parse question response: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate a unique question ID
   */
  private generateQuestionId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map string difficulty to enum
   */
  private mapToDifficulty(difficulty: string): QuizDifficulty | undefined {
    const mapping: { [key: string]: QuizDifficulty } = {
      beginner: QuizDifficulty.BEGINNER,
      intermediate: QuizDifficulty.INTERMEDIATE,
      advanced: QuizDifficulty.ADVANCED,
    };
    return mapping[difficulty?.toLowerCase()];
  }

  /**
   * Test connection to Bedrock
   */
  async testConnection(): Promise<boolean> {
    try {
      const testRequest: BedrockRequest = {
        difficulty: QuizDifficulty.BEGINNER,
      };

      await this.generateQuestion(testRequest);
      return true;
    } catch (error) {
      console.error("Bedrock connection test failed:", error);
      return false;
    }
  }

  /**
   * Shuffle the answer options and update the correct answer index
   */
  private shuffleOptions(
    options: string[],
    correctAnswerIndex: number
  ): { shuffledOptions: string[]; newCorrectAnswer: number } {
    // Create array of indices to track original positions
    const indices = [0, 1, 2, 3];
    
    // Fisher-Yates shuffle algorithm
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    // Create shuffled options based on shuffled indices
    const shuffledOptions = indices.map(index => options[index]);
    
    // Find where the correct answer ended up
    const newCorrectAnswer = indices.indexOf(correctAnswerIndex);
    
    return {
      shuffledOptions,
      newCorrectAnswer
    };
  }
}
