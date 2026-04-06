function mapToCppType(lcType) {
    if (lcType === 'integer') return 'int';
    if (lcType === 'long') return 'long long';
    if (lcType === 'double') return 'double';
    if (lcType === 'boolean') return 'bool';
    if (lcType === 'string') return 'std::string';
    if (lcType.endsWith('[]')) {
        return 'std::vector<' + mapToCppType(lcType.slice(0, -2)) + '>';
    }
    return 'std::string'; // Fallback
}

export function generateCppDriver(metaData) {
    if (!metaData || !metaData.name) {
        throw new Error("Missing metaData for the C++ problem.");
    }

    const { name: funcName, params, return: ret } = metaData;

    let paramParsing = '';
    let callArgs = '';
    params.forEach((p, i) => {
        let cppType = mapToCppType(p.type);
        paramParsing += `                ${cppType} arg${i} = inputs[${i}].get<${cppType}>();\n`;
        callArgs += `arg${i}${i < params.length - 1 ? ', ' : ''}`;
    });

    let returnType = ret && ret.type ? mapToCppType(ret.type) : 'void';

    return `#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <chrono>
#include "json.hpp"
#include "solution.cpp"

using json = nlohmann::json;

int main() {
    try {
        std::ifstream f("testCases.json");
        json testCases = json::parse(f);
        json results = json::array();
        
        Solution solution;
        int successCount = 0;
        int total = testCases.size();
        
        for (int i = 0; i < total; i++) {
            json tcResult;
            json testMode = testCases[i];
            json inputs = testMode["input"];
            json expectedJson = testMode["expectedOutput"];
            bool isHidden = testMode.contains("isHidden") && testMode["isHidden"].get<bool>();
            
            try {
${paramParsing}
                
                auto start = std::chrono::high_resolution_clock::now();
                ${returnType !== 'void' ? `${returnType} result = ` : ''}solution.${funcName}(${callArgs});
                auto elapsed = std::chrono::high_resolution_clock::now() - start;
                double runtimeMs = std::chrono::duration<double, std::milli>(elapsed).count();
                
                bool passed = false;
                bool hasPlaceholder = expectedJson.is_string() && expectedJson.get<std::string>() == ":";
${returnType !== 'void' ? `
                if (hasPlaceholder) {
                    passed = false;
                } else {
                    ${returnType} expected = expectedJson.get<${returnType}>();
                    passed = (result == expected);
                }
` : `                passed = true;`}
                
                if (passed) {
                    successCount++;
                }
                
                tcResult["index"] = i + 1;
                tcResult["passed"] = passed;
                tcResult["input"] = isHidden ? json() : inputs;
                tcResult["expected"] = isHidden ? json() : expectedJson;
${returnType !== 'void' ? `                tcResult["got"] = isHidden ? json() : result;` : `                tcResult["got"] = json();`}
                tcResult["isHidden"] = isHidden;
                tcResult["runtimeMs"] = runtimeMs;
                results.push_back(tcResult);
            } catch (const std::exception& e) {
                tcResult["index"] = i + 1;
                tcResult["passed"] = false;
                tcResult["input"] = isHidden ? json() : inputs;
                tcResult["expected"] = isHidden ? json() : expectedJson;
                tcResult["error"] = e.what();
                tcResult["isHidden"] = isHidden;
                tcResult["runtimeMs"] = 0.0;
                results.push_back(tcResult);
            }
        }
        
        json finalResult;
        finalResult["success"] = (successCount == total);
        finalResult["output"] = (successCount == total) ? "All tests passed." : "Tests failed.";
        finalResult["passed"] = successCount;
        finalResult["total"] = total;
        finalResult["testResults"] = results;
        finalResult["memoryKb"] = 0;
        
        std::cout << finalResult.dump() << std::endl;
        
    } catch (const std::exception& e) {
        json err;
        err["success"] = false;
        err["output"] = std::string("System Error: ") + e.what();
        err["passed"] = 0;
        err["total"] = 0;
        std::cout << err.dump() << std::endl;
    }
    return 0;
}
`;
}
