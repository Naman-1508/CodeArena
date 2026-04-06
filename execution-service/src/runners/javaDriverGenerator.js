function mapToJavaType(lcType) {
    if (lcType === 'integer') return 'int';
    if (lcType === 'long') return 'long';
    if (lcType === 'double') return 'double';
    if (lcType === 'boolean') return 'boolean';
    if (lcType === 'string') return 'String';
    if (lcType.endsWith('[]')) {
        return mapToJavaType(lcType.slice(0, -2)) + '[]';
    }
    return 'Object';
}

function mapToGsonClass(lcType) {
    if (lcType === 'integer') return 'int.class';
    if (lcType === 'long') return 'long.class';
    if (lcType === 'double') return 'double.class';
    if (lcType === 'boolean') return 'boolean.class';
    if (lcType === 'string') return 'String.class';
    if (lcType.endsWith('[]')) {
        return mapToGsonClass(lcType.slice(0, -2)).replace('.class', '[]') + '.class';
    }
    return 'Object.class';
}

export function generateJavaDriver(metaData) {
    if (!metaData || !metaData.name) {
        throw new Error("Missing metaData for the problem.");
    }

    const { name: funcName, params, return: ret } = metaData;

    let paramParsing = '';
    let callArgs = '';
    params.forEach((p, i) => {
        let javaType = mapToJavaType(p.type);
        let gsonClass = mapToGsonClass(p.type);
        paramParsing += `                ${javaType} arg${i} = gson.fromJson(inputs.get(${i}), ${gsonClass});\n`;
        callArgs += `arg${i}${i < params.length - 1 ? ', ' : ''}`;
    });

    let returnType = ret && ret.type ? mapToJavaType(ret.type) : 'void';
    let returnClass = ret && ret.type ? mapToGsonClass(ret.type) : 'Object.class';
    
    let isPrimitive = ret && ret.type && !ret.type.endsWith('[]') && ['integer', 'long', 'double', 'boolean'].includes(ret.type);

    return `import com.google.gson.*;
import java.io.FileReader;
import java.util.*;

public class Main {
    public static void main(String[] args) {
        try {
            Gson gson = new Gson();
            JsonArray testCases = JsonParser.parseReader(new FileReader("testCases.json")).getAsJsonArray();
            JsonArray results = new JsonArray();
            
            Solution solution = new Solution();
            int successCount = 0;
            int total = testCases.size();
            
            for (int i = 0; i < total; i++) {
                JsonObject testMode = testCases.get(i).getAsJsonObject();
                JsonArray inputs = testMode.getAsJsonArray("input");
                JsonElement expectedJson = testMode.get("expectedOutput");
                boolean isHidden = testMode.has("isHidden") && testMode.get("isHidden").getAsBoolean();
                
                try {
${paramParsing}
                    
                    long start = System.nanoTime();
                    ${returnType !== 'void' ? `${returnType} result = ` : ''}solution.${funcName}(${callArgs});
                    long elapsed = System.nanoTime() - start;
                    double runtimeMs = elapsed / 1_000_000.0;
                    
                    boolean passed = false;
                    boolean hasPlaceholder = expectedJson != null && expectedJson.isJsonPrimitive() && expectedJson.getAsString().equals(":");
${returnType !== 'void' ? `
                    if (hasPlaceholder) {
                        passed = false;
                    } else {
                        ${returnType} expected = gson.fromJson(expectedJson, ${returnClass});
                        if (${ret.type && ret.type.endsWith('[]')} && result != null && expected != null) {
                            passed = Arrays.deepEquals(new Object[]{result}, new Object[]{expected});
                        } else if (${isPrimitive}) {
                            passed = result == expected;
                        } else {
                            passed = (result == null && expected == null) || (result != null && result.equals(expected));
                        }
                    }
` : `                    passed = true;`}
                    
                    if (passed) {
                        successCount++;
                    }
                    
                    JsonObject tcResult = new JsonObject();
                    tcResult.addProperty("index", i + 1);
                    tcResult.addProperty("passed", passed);
                    tcResult.add("input", isHidden ? null : inputs);
                    tcResult.add("expected", isHidden ? null : expectedJson);
                    tcResult.add("got", isHidden ? null : gson.toJsonTree(result));
                    tcResult.addProperty("isHidden", isHidden);
                    tcResult.addProperty("runtimeMs", runtimeMs);
                    results.add(tcResult);
                    
                } catch (Exception e) {
                    JsonObject tcResult = new JsonObject();
                    tcResult.addProperty("index", i + 1);
                    tcResult.addProperty("passed", false);
                    tcResult.add("input", isHidden ? null : inputs);
                    tcResult.add("expected", isHidden ? null : expectedJson);
                    tcResult.addProperty("error", e.toString());
                    tcResult.addProperty("isHidden", isHidden);
                    tcResult.addProperty("runtimeMs", 0);
                    results.add(tcResult);
                }
            }
            
            JsonObject finalResult = new JsonObject();
            finalResult.addProperty("success", successCount == total);
            finalResult.addProperty("output", successCount == total ? "All tests passed." : "Tests failed.");
            finalResult.addProperty("passed", successCount);
            finalResult.addProperty("total", total);
            finalResult.add("testResults", results);
            finalResult.addProperty("memoryKb", 0);
            
            System.out.println(gson.toJson(finalResult));
            
        } catch (Exception e) {
            JsonObject err = new JsonObject();
            err.addProperty("success", false);
            err.addProperty("output", "System Error: " + e.getMessage());
            err.addProperty("passed", 0);
            err.addProperty("total", 0);
            System.out.println(new Gson().toJson(err));
        }
    }
}
`;
}
