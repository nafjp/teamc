import os
import json
import azure.functions as func
from openai import AzureOpenAI

# 環境変数の取得
endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
api_key = os.getenv("AZURE_OPENAI_API_KEY")
deployment_name = "gpt-4o" # デプロイしたモデル名

client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    api_version="2024-02-15-preview"
)

def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        req_body = req.get_json()
        mood = req_body.get('mood')
        image_base64 = req_body.get('image') # Base64形式の画像
        timestamp = req_body.get('timestamp')

        # システムプロンプト（あおいの性格とJSON定義）
        system_prompt = """
        あなたは「あおい」という20代女性の栄養士AIです。友達みたいなフレンドリーな口調で話します。
        「〜だよね」「わかる〜」「それはしょうがないよ！」などを使います。
        ジャッジしない。共感を最優先にする。絵文字を積極的に使う。150字以内で返答。

        食事内容を特定したら、必ず最後に以下のJSON形式を <FOOD_DATA> タグで囲んで出力してください。
        {
          "foods": [{"name": "料理名", "group": "主食/肉類/魚介/野菜/乳類/油脂/果物/その他", "amount": "量の目安"}],
          "meal_date_hint": "YYYY-MM-DD",
          "meal_type": "朝食/昼食/間食/夕食/夜食",
          "location": "自宅/外食/職場/不明",
          "eating_companions": "一人/家族/同僚/友人/不明",
          "emotion_raw": "感情をそのまま転記",
          "trigger_raw": "きっかけをそのまま転記",
          "debq_signals": {"emotional": bool, "external": bool, "restrained": bool},
          "extraction_confidence": 0.0-1.0,
          "dietitian_memo": "30字以内"
        }
        複数の食事が送られたら「一個ずつ確認させてね！」と返し、JSONは出さないこと。
        一日の終わり（夕食後など）は「おつかれ〜！」と締めること。
        """

        # GPT-4oへのメッセージ構築
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": [
                {"type": "text", "text": f"時刻: {timestamp}\n気分・きっかけ: {mood}"},
                {"type": "image_url", "image_url": {"url": image_base64}} if image_base64 else None
            ]}
        ]
        # None要素を除去
        messages[1]["content"] = [c for c in messages[1]["content"] if c is not None]

        response = client.chat.completions.create(
            model=deployment_name,
            messages=messages,
            max_tokens=800
        )

        reply_text = response.choices[0].message.content

        return func.HttpResponse(
            json.dumps({"reply": reply_text}),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        return func.HttpResponse(f"Error: {str(e)}", status_code=500)