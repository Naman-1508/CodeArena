// Temporary runner script placed inside Docker volume
const fs = require('fs');

try {
    const userCode = fs.readFileSync('userCode.js', 'utf8');
    const testCasesStr = fs.readFileSync('testCases.json', 'utf8');
    const tests = JSON.parse(testCasesStr);

    let successCount = 0;
    let totalTests = tests.length;
    let consoleOutput = '';
    const testResults = [];

    // Capture console.log
    const originalLog = console.log;
    console.log = (...args) => {
        consoleOutput += args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n';
    };

    const wrappedCode = `
    const module = { exports: {} };
    ${userCode};
    return module.exports;
  `;

    const runSolution = new Function(wrappedCode)();

    if (typeof runSolution !== 'function') {
        throw new Error('Code must export a function via module.exports = functionName');
    }

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const startTime = process.hrtime.bigint();
        try {
            const result = runSolution(...test.input);
            const elapsed = Number(process.hrtime.bigint() - startTime) / 1e6; // ms

            let passed = false;
            if (test.ignoreOrder && Array.isArray(result) && Array.isArray(test.expectedOutput)) {
                passed = JSON.stringify([...result].sort()) === JSON.stringify([...test.expectedOutput].sort());
            } else {
                passed = JSON.stringify(result) === JSON.stringify(test.expectedOutput);
            }

            if (passed) {
                successCount++;
            }

            // Emit structured result for each test case
            testResults.push({
                index: i + 1,
                passed,
                input: test.isHidden ? null : test.input,        // hide inputs for hidden cases
                expected: test.isHidden ? null : test.expectedOutput,
                got: test.isHidden ? null : result,
                isHidden: !!test.isHidden,
                runtimeMs: Math.round(elapsed * 100) / 100
            });
        } catch (err) {
            testResults.push({
                index: i + 1,
                passed: false,
                input: test.isHidden ? null : test.input,
                expected: test.isHidden ? null : test.expectedOutput,
                got: null,
                error: err.message,
                isHidden: !!test.isHidden,
                runtimeMs: 0
            });
        }
    }

    console.log = originalLog;

    // Build a human-readable summary for the output field (backwards compat)
    let outputStr = '';
    if (consoleOutput.trim()) {
        outputStr += `Console output:\n${consoleOutput.trim()}\n\n`;
    }
    const firstFailed = testResults.find(r => !r.passed && !r.isHidden);
    if (firstFailed) {
        if (firstFailed.error) {
            outputStr += `Runtime Error on Case ${firstFailed.index}: ${firstFailed.error}`;
        } else {
            outputStr += `First failure at Case ${firstFailed.index}:\n`;
            outputStr += `  Input:    ${JSON.stringify(firstFailed.input)}\n`;
            outputStr += `  Expected: ${JSON.stringify(firstFailed.expected)}\n`;
            outputStr += `  Got:      ${JSON.stringify(firstFailed.got)}`;
        }
    }

    process.stdout.write(JSON.stringify({
        success: successCount === totalTests,
        output: outputStr.trim() || (successCount === totalTests ? 'All tests passed.' : 'Tests failed.'),
        passed: successCount,
        total: totalTests,
        testResults,    // ← structured per-test breakdown
        memoryKb: Math.round(process.memoryUsage().heapUsed / 1024)
    }));

} catch (error) {
    process.stdout.write(JSON.stringify({
        success: false,
        output: 'System Error: ' + error.message,
        passed: 0,
        total: 0,
        testResults: [],
        memoryKb: 0
    }));
}
