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
        print(f"An error occured when reading S3 file : {e}")
        exit()

    print(file_content)

    prompt = f"""
    You are a senior software engineer at Amazon. Your task is to add inline documentation.

    Return the original file content with inline comments added. The comments should:
    - Explain the role of each function and major code block.
    - Clarify important logic decisions and exception handling.
    - Be concise, technical, and helpful for future developers reading the code.

    Tone: professional, technical, and developer-oriented.  
    Output: Return only the fully commented code. Do not wrap it in Markdown or use triple backticks. The response must be plain code only.

    File content:
    {file_content}
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
            # 'body': json.dumps('Hello from Lambda!')
            'body': "not found"
        }
    return {
        'statusCode': 200,
        'body': doc_generator(body['file_id'])
    }
