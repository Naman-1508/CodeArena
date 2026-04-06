import requests
import time
import json

base_url = "http://localhost:5000/api/v1"

# create dummy user
res = requests.post(f"{base_url}/auth/register", json={"username": "testuser_langsuite", "email": "test@langsuite.com", "password": "password123"})
if res.status_code == 201:
    token = res.json()["token"]
else:
    # login if exists
    res = requests.post(f"{base_url}/auth/login", json={"email": "test@langsuite.com", "password": "password123"})
    token = res.json()["token"]

headers = {"Authorization": f"Bearer {token}"}

# get first problem
probs = requests.get(f"{base_url}/problems", headers=headers).json()
two_sum = next(p for p in probs["problems"] if p["slug"] == "two-sum")

# Submit C++
cpp_code = """
#include <vector>
using namespace std;
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        return {0, 1}; // hardcode for test
    }
};
"""
print("Submitting C++")
res = requests.post(f"{base_url}/submissions", json={
    "problemId": two_sum["_id"],
    "code": cpp_code,
    "language": "cpp",
    "isRun": True
}, headers=headers)
sub_id = res.json()["_id"]

# Poll
for i in range(10):
    time.sleep(2)
    s = requests.get(f"{base_url}/submissions/{sub_id}", headers=headers).json()
    print(f"C++ Status: {s['status']}")
    if s['status'] in ['Pass', 'Fail', 'Error']:
        print("C++ Results:", json.dumps(s.get("testResults")[:1], indent=2))
        print("C++ Output:", s.get("output"))
        print("C++ Runtime:", s.get("runtimeMs"))
        break

# Submit Java
java_code = """
class Solution {
    public int[] twoSum(int[] nums, int target) {
        return new int[]{0, 1}; // hardcode for test
    }
}
"""
print("\nSubmitting Java")
res = requests.post(f"{base_url}/submissions", json={
    "problemId": two_sum["_id"],
    "code": java_code,
    "language": "java",
    "isRun": True
}, headers=headers)
sub_id = res.json()["_id"]

for i in range(10):
    time.sleep(2)
    s = requests.get(f"{base_url}/submissions/{sub_id}", headers=headers).json()
    print(f"Java Status: {s['status']}")
    if s['status'] in ['Pass', 'Fail', 'Error']:
        print("Java Results:", json.dumps(s.get("testResults")[:1], indent=2))
        print("Java Output:", s.get("output"))
        print("Java Runtime:", s.get("runtimeMs"))
        break
