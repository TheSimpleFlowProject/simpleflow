import json
import boto3

def doc_generator(file_content):
    model_id = "anthropic.claude-3-haiku-20240307-v1:0"
    aws_region = "eu-west-3"

    s3_client = boto3.client("s3")
    bedrock_runtime_client = boto3.client(
        service_name="bedrock-runtime", 
        region_name=aws_region
    )

    print(file_content)

    prompt = f"""
    Act as a senior software engineer, tasked with writing a concise yet comprehensive summary for a pull request description. Your goal is to help reviewers quickly understand the purpose, design, and impact of the changes across multiple files.

    Based on the file changes below, generate a summary in Markdown format. The input is a stringified dictionary where each key is a file name and each value is a brief summary of the changes in that file. Your summary must synthesize these individual changes into a coherent pull request description that includes:

    1.  **High-Level Purpose:** A brief, one-sentence explanation of the overall goal of the pull request. For example: "This PR introduces a new feature for user authentication."
    2.  **Implementation Details:** A bulleted list outlining the key changes made in each file. Use the provided summaries to create a cohesive narrative.
    3.  **Context & Usage:** A short note on how these changes fit into the broader system and any important new interactions, configurations, or dependencies.

    The tone should be professional and technical. The output should be ready to be copy-pasted directly into a GitHub pull request body.
    ---
    {file_content}
    ---
    """

    request_body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4096,
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": prompt}],
            }
        ],
    }

    try:
        response = bedrock_runtime_client.invoke_model(
            modelId=model_id,
            body=json.dumps(request_body),
        )

        response_body = json.loads(response.get("body").read())
        
        model_commentary = response_body["content"][0]["text"]
        return model_commentary

    except Exception as e:
        print(f"Erreur lors de l'appel à Bedrock : {e}")

def lambda_handler(event, context):
    body = json.loads(event['body'])
    if "summaries" not in body:
        return {
            'statusCode': 404,
            # 'body': json.dumps('Hello from Lambda!')
            'body': "not found"
        }
    return {
        'statusCode': 200,
        'body': doc_generator(body['summaries'])
    }
