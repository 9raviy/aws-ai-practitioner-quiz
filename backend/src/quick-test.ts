import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

async function quickBedrockTest() {
  console.log("🚀 Quick Bedrock Connection Test");

  try {
    const client = new BedrockRuntimeClient({ region: "us-west-2" });

    const input = {
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: 'Say "Hello World" and confirm you are Claude 3.5 Sonnet.',
          },
        ],
      }),
    };

    console.log("📡 Sending request to Bedrock...");
    const command = new InvokeModelCommand(input);
    const response = await client.send(command);

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log("✅ Bedrock Response:", responseBody.content[0].text);
    console.log("🎉 Connection successful!");
  } catch (error) {
    console.error("❌ Connection failed:", error);
  }
}

quickBedrockTest();
