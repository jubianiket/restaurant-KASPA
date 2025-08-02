import json

def handler(request, context):
    # Example: return a simple JSON response
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"message": "Hello from Vercel Python Serverless Function!"})
    }
