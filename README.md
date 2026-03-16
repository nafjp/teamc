# Meal API for Azure Functions

Deploy this package to your Azure Function App.

## Required app settings

- AZURE_OPENAI_ENDPOINT
- AZURE_OPENAI_API_KEY
- AZURE_OPENAI_API_VERSION
- AZURE_OPENAI_CHAT_DEPLOYMENT
- AZURE_OPENAI_EXTRACT_DEPLOYMENT
- COSMOS_DB_ENDPOINT
- COSMOS_DB_KEY
- COSMOS_DB_DATABASE_ID
- COSMOS_DB_MEAL_CONTAINER_ID

## HTTP endpoint

- POST /api/analyze-meal

## Notes

- This package stores extracted meal data in Cosmos DB.
- `photoBlobPath` is stored in Cosmos DB.
- `photoUrlForModel` is only used to send the image to Azure OpenAI.
- Do not commit secrets into the zip.
