import json
import boto3

def doc_generator(id):
    s3_bucket_name = "simpleflowdata"
    model_id = "anthropic.claude-3-haiku-20240307-v1:0"
    aws_region = "eu-west-3"

    s3_client = boto3.client("s3")
    bedrock_runtime_client = boto3.client(
        service_name="bedrock-runtime", 
        region_name=aws_region
    )

    try:
        s3_object = s3_client.get_object(Bucket=s3_bucket_name, Key=id)
        file_content = s3_object["Body"].read().decode("utf-8")
    except Exception as e:
        print(f"Error: Could not read S3 file : {e}")
        exit()

    print(file_content)

    prompt = f"""
    Act as a senior software engineer at Amazon, tasked with writing a concise yet comprehensive summary for a pull request description. Your goal is to help reviewers quickly understand the purpose, design, and impact of the code.

    Based on the file content below, generate a summary in Markdown format that includes:
    1.  **High-Level Purpose:** A brief, one-sentence explanation of the file's primary role.
    2.  **Implementation Details:** A bulleted list outlining the key components (classes, functions), their responsibilities, and any important logic or algorithms used.
    3.  **Context & Usage:** A short note on how this code is expected to be used or what other parts of the system it interacts with.

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
    if "file_id" not in body:
        return {
            'statusCode': 404,
            'body': "not found"
        }
    return {
        'statusCode': 200,
        'body': doc_generator(body['file_id'])
    }
