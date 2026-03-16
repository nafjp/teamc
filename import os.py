import azure.functions as func
import json
import os
import re
import uuid
from datetime import datetime
from openai import AzureOpenAI

# 1. アプリの初期化（V2モデル）
app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# 2. HTTPトリガーとCosmos DB出力の設定を一括定義
@app.route(route="AoiChat", methods=["POST"])
@app.cosmos_db_output(arg_name="outputDocument", 
                      database_name="FoodDiaryDB", 
                      container_name="MealRecords", 
                      connection="CosmosDbConnectionString")
def aoi_diet_function(req: func.HttpRequest, outputDocument: func.Out[func.Document]) -> func.HttpResponse:
    
    # Azure OpenAIの設定（環境変数から読み込み）
    client = AzureOpenAI(
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version="2024-02-15-preview"
    )
    deployment_name = "gpt-4o"

    try:
        req_body = req.get_json()
        mood = req_body.get('mood', '不明')
        image_base64 = req_body.get('image')
        timestamp = req_body.get('timestamp', datetime.utcnow().isoformat())

        # あおいの性格とJSON形式の定義
        system_prompt = """
        あなたは「あおい」という20代女性の栄養士AIです。友達みたいなフレンドリーな口調で話します。
        「〜だよね」「わかる〜」「それはしょうがないよ！」などを使います。
        ジャッジしない。共感を最優先にする。絵文字を積極的に使う。150字以内で返答。

        食事が特定できたら、必ず最後に以下のJSONを <FOOD_DATA> タグで囲んで出力してね。
        {"foods": [{"name": "料理名", "group": "...", "amount": "..."}], "meal_date_hint": "...", "meal_type": "...", "location": "...", "eating_companions": "...", "emotion_raw": "...", "trigger_raw": "...", "debq_signals": {"emotional": bool, "external": bool, "restrained": bool}, "extraction_confidence": 1.0, "dietitian_memo": "..."}
        """

        # GPT-4o へのリクエスト構築
        content_list = [{"type": "text", "text": f"時刻: {timestamp}\n今の気分: {mood}"}]
        if image_base64:
            content_list.append({"type": "image_url", "image_url": {"url": image_base64}})

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content_list}
        ]

        response = client.chat.completions.create(
            model=deployment_name,
            messages=messages,
            max_tokens=800
        )

        reply_text = response.choices[0].message.content

        # 3. JSONデータの抽出とCosmos DBへのADD
        json_match = re.search(r'<FOOD_DATA>(.*?)</FOOD_DATA>', reply_text, re.DOTALL)
        if json_match:
            try:
                food_data = json.loads(json_match.group(1))
                # 必須フィールドの付与
                food_data['id'] = str(uuid.uuid4())
                food_data['user_id'] = "user_test_001" # 実際はログインユーザーID
                food_data['timestamp'] = timestamp
                
                # Cosmos DB へ保存
                outputDocument.set(func.Document.from_dict(food_data))
            except Exception as e:
                print(f"JSON保存失敗: {e}")

        return func.HttpResponse(
            json.dumps({"reply": reply_text}, ensure_ascii=False),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        return func.HttpResponse(f"Error: {str(e)}", status_code=500)
