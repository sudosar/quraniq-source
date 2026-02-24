import urllib.request
import json

def fetch_data():
    url = "https://quraniq-30f8c-default-rtdb.asia-southeast1.firebasedatabase.app/users.json"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            for user_id, user_data in data.items():
                if 'displayName' in user_data and user_data['displayName'] == 'Aray':
                    print(f"Found user Aray: {user_id}")
                    print(json.dumps(user_data.get('scores', {}), indent=2))
    except Exception as e:
        print(f"Error fetching data: {e}")

fetch_data()
