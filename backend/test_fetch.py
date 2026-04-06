import requests, json

q = """
query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    content
  }
}
"""

res = requests.post("https://leetcode.com/graphql", json={"query": q, "variables": {"titleSlug": "two-sum"}})
data = res.json()["data"]["question"]
print(data["content"][:800])
