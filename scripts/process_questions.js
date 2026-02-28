const fs = require('fs');
const path = require('path');

/**
 * Script to process and merge quiz JSON files.
 * This script is designed to handle exports from AvtoQuiz and prepare them for Avtotest Samandar.
 * 
 * Features:
 * 1. Merges multiple 10-question JSON files into a single collection.
 * 2. Automatically replaces "avtoquiz" with "Avtotest Samandar" in all text fields (questions, options, explanations).
 * 3. Re-indexes the IDs and order numbers starting from 1.
 * 
 * Usage:
 * node scripts/process_questions.js <file1.json> <file2.json> ...
 */

const args = process.argv.slice(2);

if (args.length === 0) {
    console.log("\x1b[33mUsage:\x1b[0m node scripts/process_questions.js <file1.json> <file2.json> ...");
    console.log("Example: node scripts/process_questions.js bilet1_part1.json bilet1_part2.json");
    process.exit(1);
}

let allQuestions = [];
let currentIndex = 1;

console.log(`\n\x1b[36mProcessing ${args.length} files...\x1b[0m\n`);

args.forEach((filePath) => {
    try {
        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            console.error(`\x1b[31mFile not found:\x1b[0m ${filePath}`);
            return;
        }

        const fileContent = fs.readFileSync(absolutePath, 'utf8');
        let data;
        try {
            data = JSON.parse(fileContent);
        } catch (e) {
            console.error(`\x1b[31mInvalid JSON in file:\x1b[0m ${filePath}`);
            return;
        }

        // Ensure it's an array
        const questionsArray = Array.isArray(data) ? data : [data];

        // Process each question
        const processedData = questionsArray.map((q) => {
            // Replace source name in all text fields
            const replaceText = (text) => {
                if (!text || typeof text !== 'string') return text;
                return text.replace(/avtoquiz/gi, "Avtotest Samandar");
            };

            const newQ = {
                question_text: replaceText(q.question || q.question_text || ""),
                image_url: q.image || q.image_url || null,
                options: (q.options || []).map(replaceText),
                correct_answer: replaceText(q.correct_answer || ""),
                explanation: replaceText(q.explanation || ""),
                order_num: currentIndex // Re-index for the merged set
            };

            currentIndex++;
            return newQ;
        });

        allQuestions = allQuestions.concat(processedData);
        console.log(`\x1b[32m✓\x1b[0m Added ${processedData.length} questions from ${path.basename(filePath)}`);
    } catch (error) {
        console.error(`\x1b[31mError processing ${filePath}:\x1b[0m`, error.message);
    }
});

if (allQuestions.length === 0) {
    console.log("\n\x1b[31mNo questions were processed.\x1b[0m");
    process.exit(1);
}

// Save merged JSON
const outJsonPath = path.join(process.cwd(), 'processed_questions_merged.json');
fs.writeFileSync(outJsonPath, JSON.stringify(allQuestions, null, 2));

// Generate SQL for direct DB import if needed
const generateSQL = (questions) => {
    let sql = "-- SQL Export for Avtotest Samandar\n";
    sql += "-- Generated on: " + new Date().toLocaleString() + "\n";
    sql += "-- Total Questions: " + questions.length + "\n";
    sql += "-- IMPORTANT: Replace 'YOUR_TICKET_ID_HERE' with the actual UUID from your 'tickets' table.\n\n";

    questions.forEach((q) => {
        const escape = (str) => {
            if (!str) return 'NULL';
            return `'${str.replace(/'/g, "''")}'`;
        };

        const optionsJson = JSON.stringify(q.options).replace(/'/g, "''");

        sql += `INSERT INTO public.questions (ticket_id, question_text, image_url, options, correct_answer, explanation, order_num)\n`;
        sql += `VALUES ('YOUR_TICKET_ID_HERE', ${escape(q.question_text)}, ${escape(q.image_url)}, '${optionsJson}', ${escape(q.correct_answer)}, ${escape(q.explanation)}, ${q.order_num});\n\n`;
    });

    return sql;
};

const outSqlPath = path.join(process.cwd(), 'import_questions.sql');
fs.writeFileSync(outSqlPath, generateSQL(allQuestions));

console.log(`\n\x1b[32mSUCCESS!\x1b[0m`);
console.log(`-----------------------------------------------`);
console.log(`Total questions merged: \x1b[1m${allQuestions.length}\x1b[0m`);
console.log(`JSON result: \x1b[34m${outJsonPath}\x1b[0m (Can be pasted into the Admin Panel)`);
console.log(`SQL result:  \x1b[34m${outSqlPath}\x1b[0m (Direct database import)`);
console.log(`-----------------------------------------------\n`);
console.log(`\x1b[90mTip: You can now copy the content of processed_questions_merged.json and paste it into the "JSON orqali import" field in your Admin Dashboard.\x1b[0m\n`);
