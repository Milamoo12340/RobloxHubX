import requests
import json

def try_scanner_request():
    url = "https://hyperium-scanner.vercel.app/api/search"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://hyperium-scanner.vercel.app/",
        "Cache-Control": "no-cache"
    }
    
    params = {
        "query": "13365322"  # The Roblox developer ID
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(json.dumps(data, indent=2))
            except:
                print("Failed to parse JSON")
                print(response.text[:500])  # Print first 500 chars of response
        else:
            print("Response content:")
            print(response.text[:500])  # Print first 500 chars of response
            
    except Exception as e:
        print(f"Error occurred: {str(e)}")

if __name__ == "__main__":
    try_scanner_request()