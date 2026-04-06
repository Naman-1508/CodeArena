import requests
import json
import re
import html
import concurrent.futures
import time

INPUT_FILE = "leetcode_problems.json"
OUTPUT_FILE = "leetcode_problems_enriched.json"

q = """
query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    content
    metaData
    codeSnippets {
      langSlug
      code
    }
    exampleTestcaseList
  }
}
"""

def fetch_problem(problem):
    slug = problem["slug"]
    try:
        res = requests.post("https://leetcode.com/graphql", json={"query": q, "variables": {"titleSlug": slug}}, timeout=10)
        res.raise_for_status()
        data = res.json().get("data", {}).get("question")
        
        if not data or not data.get("content"):
            return None # Premium or inaccessible
            
        content = data["content"]
        meta_str = data.get("metaData", "{}")
        try:
            metaData = json.loads(meta_str)
        except:
            metaData = {}
            
        code_snippets = data.get("codeSnippets", [])
        snippets_map = {}
        if code_snippets:
            for snip in code_snippets:
                if snip["langSlug"] in ["javascript", "python", "python3", "java", "cpp"]:
                    lang = "node" if snip["langSlug"] == "javascript" else ("python" if snip["langSlug"].startswith("python") else snip["langSlug"])
                    snippets_map[lang] = snip["code"]
                    
        testcases_raw = data.get("exampleTestcaseList", [])
        
        # Parse outputs
        text = html.unescape(content)
        outputs_raw = re.findall(r"Output(?:</strong>|:)?\s*([^\n<]+)", text, re.IGNORECASE)
        outputs = [val.strip() for val in outputs_raw if val.strip() and "Explanation" not in val][:len(testcases_raw)]
        
        testCases = []
        for i in range(len(testcases_raw)):
            raw_input_str = testcases_raw[i]
            inputs = raw_input_str.split('\n')
            
            parsed_inputs = []
            for inp in inputs:
                try:
                    parsed_inputs.append(json.loads(inp))
                except:
                    parsed_inputs.append(inp)
                    
            expected = None
            if i < len(outputs):
                out_str = outputs[i]
                # fix output formatting like boolean
                if out_str.lower() == "true": expected = True
                elif out_str.lower() == "false": expected = False
                else:
                    try:
                        expected = json.loads(out_str)
                    except:
                        expected = out_str
            else:
                expected = "Unknown"
                
            testCases.append({
                "input": parsed_inputs,
                "expectedOutput": expected,
                "isHidden": False,
                "ignoreOrder": False
            })
            
        problem["description"] = content
        problem["codeSnippets"] = snippets_map
        problem["metaData"] = metaData
        problem["testCases"] = testCases
        
        del problem["initialCode"]
        del problem["solutionTemplate"]
        return problem
    except Exception as e:
        print(f"Error for {slug}: {str(e)}")
        return None

def main():
    print("Loading initial problems...")
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        problems = json.load(f)
        
    enriched = []
    print(f"Fetching full metadata for {len(problems)} problems (skipping premium)...")
    
    # Process concurrent
    start_t = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        # submit all
        futures = {executor.submit(fetch_problem, p): p for p in problems}
        count = 0
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            count += 1
            if count % 100 == 0:
                print(f"Processed {count}/{len(problems)}...")
            if res and res.get("testCases") and len(res["testCases"]) > 0:
                enriched.append(res)
                
    end_t = time.time()
    print(f"Completed in {end_t - start_t:.1f}s. Managed to fully enrich {len(enriched)} problems.")
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, indent=2)

if __name__ == "__main__":
    main()
