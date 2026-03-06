import requests
import json
import os

# LeetCode GraphQL API Endpoint
URL = "https://leetcode.com/graphql/"

query = """
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          acRate
          difficulty
          freqBar
          frontendQuestionId: questionFrontendId
          isFavor
          paidOnly: isPaidOnly
          status
          title
          titleSlug
          topicTags {
            name
            id
            slug
          }
          hasSolution
          hasVideoSolution
        }
      }
    }
"""

variables = {
    "categorySlug": "",
    "skip": 0,
    "limit": 3500, # Try to fetch up to 3500 problems in one go
    "filters": {}
}

def fetch_leetcode_problems():
    print("Fetching problems from LeetCode GraphQL API...")
    
    all_free_questions = []
    target_total = 3200
    limit = 100
    
    try:
        for skip in range(0, target_total, limit):
            variables["skip"] = skip
            variables["limit"] = limit
            print(f"Fetching {skip} to {skip + limit}...")
            
            response = requests.post(URL, json={'query': query, 'variables': variables}, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
            response.raise_for_status()
            data = response.json()
            
            questions = data.get('data', {}).get('problemsetQuestionList', {}).get('questions', [])
            if not questions:
                break
                
            free_batch = [q for q in questions if not q.get('paidOnly')]
            all_free_questions.extend(free_batch)
            
        print(f"Fetched {len(all_free_questions)} free/publicly-accessible problems total.")
        
        formatted_problems = []
        for q in all_free_questions:
            tags = [tag['name'] for tag in q.get('topicTags', [])]
            formatted_problems.append({
                "title": f"{q['frontendQuestionId']}. {q['title']}",
                "slug": q['titleSlug'],
                "difficulty": q['difficulty'],
                "description": f"<p>This is a placeholder description for {q['title']}. To view the full problem description and submit code, please view the actual problem on LeetCode.</p>",
                "tags": tags,
                "initialCode": "function solution() {\n    // Write your code here\n}",
                "solutionTemplate": "module.exports = solution;",
                "testCases": []
            })
            
        output_file = 'leetcode_problems.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(formatted_problems, f, indent=2)
            
        print(f"Saved {len(formatted_problems)} formatted problems to {output_file}")
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from LeetCode API: {e}")

if __name__ == "__main__":
    fetch_leetcode_problems()
