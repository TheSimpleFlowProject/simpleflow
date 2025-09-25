import json
import boto3

def issue_writer(content):
    model_id = "anthropic.claude-3-haiku-20240307-v1:0"
    aws_region = "eu-west-3"

    bedrock_runtime_client = boto3.client(
        service_name="bedrock-runtime", 
        region_name=aws_region
    )

    prompt = f"""
    You are a senior product manager at a tech company.  
    Your task is to generate a GitHub issue in Markdown format based on the provided input.  

    The issue must include:  
    - A clear and concise **title** starting with an emoji.  
    - A **description** explaining the feature, user need, or problem.  
    - A list of **acceptance criteria** in checklist format (`- [ ]`).  

    Tone: professional, precise, and action-oriented.  
    Output: Return only the issue in Markdown, do not wrap it in triple backticks.
    Input: {content}
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

def issue_title_generator(issue_content):
    model_id = "anthropic.claude-3-haiku-20240307-v1:0"
    aws_region = "eu-west-3"

    bedrock_runtime_client = boto3.client(
        service_name="bedrock-runtime", 
        region_name=aws_region
    )

    prompt = f"""
    You are a senior product manager. 
    Your task is to generate a clear, concise, and professional GitHub issue title. 
    The title should summarize the content of the issue in one short sentence. 
    Do not return anything except the title itself (no description, no formatting).  
    
    Input: {issue_content}
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
    if "content" not in body:
        return {
            'statusCode': 404,
            'body': "not found"
        }

    issue_body = issue_writer(body['content'])
    return {
        'statusCode': 200,
        'body': {
            'title': issue_title_generator(issue_body), 
            'body': issue_body
        }
    }
