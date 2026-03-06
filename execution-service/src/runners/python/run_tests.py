import json
import sys
import io
import time
from contextlib import redirect_stdout

try:
    with open('userCode.py', 'r') as f:
        user_code = f.read()
    
    with open('testCases.json', 'r') as f:
        test_cases = json.load(f)
    
    success_count = 0
    total_tests = len(test_cases)
    console_output = ""
    test_results = []
    
    namespace = {}
    
    # Execute the user code to define functions
    f_stdout = io.StringIO()
    with redirect_stdout(f_stdout):
        exec(user_code, namespace)
    init_out = f_stdout.getvalue()
    if init_out:
        console_output += init_out
    
    # Find the user's solution function
    user_funcs = {k: v for k, v in namespace.items() if callable(v) and not k.startswith('__')}
    if not user_funcs:
        raise ValueError("Code must define at least one valid function.")
    
    func_name = list(user_funcs.keys())[-1]
    run_solution = user_funcs[func_name]
    
    for i, test in enumerate(test_cases):
        try:
            inputs = test['input']
            expected = test['expectedOutput']
            is_hidden = test.get('isHidden', False)
            
            start = time.perf_counter()
            f_stdout = io.StringIO()
            with redirect_stdout(f_stdout):
                result = run_solution(*inputs) if isinstance(inputs, list) else run_solution(inputs)
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            
            print_out = f_stdout.getvalue()
            if print_out:
                console_output += print_out
            
            # Equality check
            if test.get('ignoreOrder', False) and isinstance(result, list) and isinstance(expected, list):
                try:
                    passed = sorted(result) == sorted(expected)
                except:
                    passed = result == expected
            else:
                passed = result == expected
            
            if passed:
                success_count += 1
            
            test_results.append({
                "index": i + 1,
                "passed": passed,
                "input": None if is_hidden else inputs,
                "expected": None if is_hidden else expected,
                "got": None if is_hidden else result,
                "isHidden": is_hidden,
                "runtimeMs": elapsed_ms
            })
        except Exception as e:
            test_results.append({
                "index": i + 1,
                "passed": False,
                "input": None if test.get('isHidden') else test.get('input'),
                "expected": None if test.get('isHidden') else test.get('expectedOutput'),
                "got": None,
                "error": str(e),
                "isHidden": test.get('isHidden', False),
                "runtimeMs": 0
            })
    
    # Human-readable output (backwards compat)
    output_str = ""
    if console_output.strip():
        output_str += f"Console output:\n{console_output.strip()}\n\n"
    
    first_failed = next((r for r in test_results if not r['passed'] and not r['isHidden']), None)
    if first_failed:
        if first_failed.get('error'):
            output_str += f"Runtime Error on Case {first_failed['index']}: {first_failed['error']}"
        else:
            output_str += f"First failure at Case {first_failed['index']}:\n"
            output_str += f"  Input:    {json.dumps(first_failed['input'])}\n"
            output_str += f"  Expected: {json.dumps(first_failed['expected'])}\n"
            output_str += f"  Got:      {json.dumps(first_failed['got'])}"
    
    result_obj = {
        "success": success_count == total_tests,
        "output": output_str.strip() or ("All tests passed." if success_count == total_tests else "Tests failed."),
        "passed": success_count,
        "total": total_tests,
        "testResults": test_results,
        "memoryKb": 0
    }
    
    print(json.dumps(result_obj))
    
except Exception as e:
    print(json.dumps({
        "success": False,
        "output": f"System Error: {str(e)}",
        "passed": 0,
        "total": 0,
        "testResults": [],
        "memoryKb": 0
    }))
